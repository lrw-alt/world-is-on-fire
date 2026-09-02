import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type {
  AtlasPayload,
  FactCheck,
  FireIncident,
  HotspotPayload,
  NewsItem,
  PlaceHit,
  SourceLink,
  ThermalHotspot,
} from "./types";

const UA = "Mozilla/5.0 (compatible; EmberAtlas/1.0; fire intelligence)";

/**
 * Bounded TTL Cache to prevent memory growth under heavy querying or varied coordinates.
 */
class BoundedTtlCache {
  private store = new Map<string, { at: number; value: unknown }>();
  constructor(private maxEntries = 300) {}

  get<T>(key: string, ttlMs: number): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at > ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  set<T>(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest 20% entries
      const countToEvict = Math.max(1, Math.floor(this.maxEntries * 0.2));
      let evicted = 0;
      for (const k of this.store.keys()) {
        this.store.delete(k);
        evicted++;
        if (evicted >= countToEvict) break;
      }
    }
    this.store.set(key, { at: Date.now(), value });
  }
}

const serverCache = new BoundedTtlCache(400);

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = serverCache.get<T>(key, ttlMs);
  if (hit !== undefined) return hit;
  const value = await fn();
  serverCache.set(key, value);
  return value;
}

async function fetchOk(url: string, timeoutMs = 14000, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "*/*", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

type EonetGeom = {
  date?: string;
  type?: string;
  magnitudeValue?: number | null;
  magnitudeUnit?: string | null;
  coordinates?: unknown;
};

type EonetEvent = {
  id: string;
  title: string;
  description?: string | null;
  closed?: string | null;
  sources?: { id: string; url: string }[];
  geometry?: EonetGeom[];
};

function coordsOf(geom: EonetGeom | undefined): { lat: number; lng: number } | null {
  if (!geom?.coordinates) return null;
  const c = geom.coordinates;
  if (geom.type === "Point" && Array.isArray(c) && typeof c[0] === "number") {
    const lng = c[0] as number;
    const lat = c[1] as number;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const walk = (node: unknown): { lat: number; lng: number } | null => {
    if (!Array.isArray(node) || node.length === 0) return null;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      return { lng: node[0], lat: node[1] };
    }
    return walk(node[0]);
  };
  return walk(c);
}

function toAcres(value: number | null | undefined, unit: string | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const u = (unit ?? "").toLowerCase();
  if (u.includes("acre")) return value;
  if (u.includes("km") || u.includes("sq km") || u.includes("square km")) return value * 247.105;
  if (u.includes("ha") || u.includes("hectare")) return value * 2.47105;
  return value;
}

function compactEvent(ev: EonetEvent): FireIncident | null {
  const geoms = ev.geometry ?? [];
  if (geoms.length === 0) return null;
  const first = geoms[0];
  const last = geoms[geoms.length - 1];
  const point = coordsOf(last) ?? coordsOf(first);
  if (!point) return null;
  const acres = toAcres(last?.magnitudeValue ?? first?.magnitudeValue, last?.magnitudeUnit ?? first?.magnitudeUnit);
  const sources: SourceLink[] = (ev.sources ?? [])
    .filter((s) => s.url)
    .slice(0, 6)
    .map((s) => ({ id: s.id || "source", url: s.url }));
  return {
    id: ev.id,
    title: ev.title.replace(/^Wildfire\s+/i, ""),
    lat: point.lat,
    lng: point.lng,
    acres,
    started: first?.date ?? new Date().toISOString(),
    closed: ev.closed ?? null,
    description: ev.description ?? null,
    sources,
  };
}

async function loadIncidents(): Promise<FireIncident[]> {
  return cached("eonet-year", 8 * 60 * 1000, async () => {
    const [openRes, yearRes] = await Promise.all([
      fetchOk("https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=500", 16000),
      fetchOk("https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=all&days=365&limit=500", 16000),
    ]);
    const openBody = (await openRes.json()) as { events?: EonetEvent[] };
    const yearBody = (await yearRes.json()) as { events?: EonetEvent[] };
    const seen = new Set<string>();
    const compacted: FireIncident[] = [];
    for (const ev of [...(openBody.events ?? []), ...(yearBody.events ?? [])]) {
      if (seen.has(ev.id)) continue;
      const row = compactEvent(ev);
      if (!row) continue;
      seen.add(ev.id);
      compacted.push(row);
    }
    compacted.sort((a, b) => (b.acres ?? 180) - (a.acres ?? 180));
    return compacted.slice(0, 2800);
  });
}

export const getIncidents = createServerFn({ method: "GET" }).handler(async (): Promise<AtlasPayload> => {
  const incidents = await loadIncidents();
  return { incidents, fetchedAt: new Date().toISOString() };
});

type ArcgisFeature = {
  attributes?: {
    latitude?: number;
    longitude?: number;
    frp?: number;
    confidence?: string;
    hours_old?: number;
    acq_date?: number | string;
    daynight?: string;
  };
};

function parseAcquired(value: number | string | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

async function loadArcGis(hours: number, bbox?: [number, number, number, number]): Promise<ThermalHotspot[]> {
  const where = hours <= 24 ? "hours_old<=24 AND confidence<>'low'" : "confidence<>'low'";
  const params = new URLSearchParams({
    where,
    outFields: "latitude,longitude,frp,acq_date,confidence,hours_old,daynight",
    orderByFields: "frp DESC",
    resultRecordCount: "1800",
    outSR: "4326",
    f: "json",
  });
  if (bbox) {
    params.set("geometry", bbox.join(","));
    params.set("geometryType", "esriGeometryEnvelope");
    params.set("inSR", "4326");
    params.set("spatialRel", "esriSpatialRelIntersects");
  }
  const url = `https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Satellite_VIIRS_Thermal_Hotspots_and_Fire_Activity/FeatureServer/0/query?${params}`;
  const res = await fetchOk(url, 16000);
  const body = (await res.json()) as { features?: ArcgisFeature[] };
  const points: ThermalHotspot[] = [];
  for (const feat of body.features ?? []) {
    const a = feat.attributes ?? {};
    const lat = a.latitude;
    const lng = a.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const hoursOld = typeof a.hours_old === "number" ? a.hours_old : 0;
    if (hoursOld > hours) continue;
    points.push({
      lat: lat as number,
      lng: lng as number,
      frp: typeof a.frp === "number" ? a.frp : 0,
      confidence: String(a.confidence ?? "nominal"),
      hoursOld,
      acquired: parseAcquired(a.acq_date),
      dayNight: String(a.daynight ?? ""),
    });
  }
  return points;
}

async function loadFirmsCsv(): Promise<ThermalHotspot[]> {
  const res = await fetchOk(
    "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv",
    20000,
  );
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  const out: ThermalHotspot[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(",");
    if (cols.length < 13) continue;
    const lat = Number(cols[0]);
    const lng = Number(cols[1]);
    const confidence = cols[8] ?? "nominal";
    if (confidence === "low") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const date = cols[5];
    const time = (cols[6] ?? "0000").padStart(4, "0");
    const acquired = `${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`;
    out.push({
      lat,
      lng,
      frp: Number(cols[11]) || 0,
      confidence,
      hoursOld: 12,
      acquired,
      dayNight: cols[12] ?? "",
    });
  }
  out.sort((a, b) => b.frp - a.frp);
  return out.slice(0, 1800);
}

const hotspotInput = z.object({
  hours: z.number().min(1).max(200).default(24),
  west: z.number().optional(),
  south: z.number().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
});

export const getHotspots = createServerFn({ method: "POST" })
  .validator((input: unknown) => hotspotInput.parse(input))
  .handler(async ({ data }): Promise<HotspotPayload> => {
    const hours = data.hours;
    const bbox =
      data.west != null && data.south != null && data.east != null && data.north != null
        ? ([data.west, data.south, data.east, data.north] as [number, number, number, number])
        : undefined;
    const key = `hotspots:${hours}:${bbox?.join(",") ?? "world"}`;
    const points = await cached(key, 6 * 60 * 1000, async () => {
      try {
        const fromGis = await loadArcGis(hours, bbox);
        if (fromGis.length > 40) return fromGis;
      } catch {
        /* fall through to FIRMS CSV */
      }
      if (hours <= 36 && !bbox) return loadFirmsCsv();
      try {
        return await loadArcGis(200, bbox);
      } catch {
        return loadFirmsCsv();
      }
    });
    return { points, fetchedAt: new Date().toISOString(), windowHours: hours };
  });

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m?.[1] ? decodeXml(m[1].trim()) : null;
}

function parseRss(xml: string, fallbackOutlet: string): NewsItem[] {
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  const items: NewsItem[] = [];
  for (const chunk of chunks) {
    const titleRaw = tag(chunk, "title");
    const link = tag(chunk, "link") ?? chunk.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "";
    if (!titleRaw || !link) continue;
    let outlet = fallbackOutlet;
    let title = titleRaw.replace(/<\/?[^>]+>/g, "").trim();
    const source = tag(chunk, "source");
    if (source) outlet = source;
    const dash = title.lastIndexOf(" - ");
    if (dash > 12 && !source) {
      outlet = title.slice(dash + 3).trim();
      title = title.slice(0, dash).trim();
    }
    const published = tag(chunk, "pubDate") ?? tag(chunk, "updated") ?? tag(chunk, "dc:date");
    const summary = tag(chunk, "description");
    items.push({
      id: link,
      title,
      url: link,
      outlet,
      published: published ? new Date(published).toISOString() : null,
      summary: summary ? decodeXml(summary.replace(/<[^>]+>/g, "")).slice(0, 240) : null,
    });
  }
  return items;
}

async function rssFeed(url: string, outlet: string): Promise<NewsItem[]> {
  try {
    const res = await fetchOk(url, 10000);
    const xml = await res.text();
    return parseRss(xml, outlet);
  } catch {
    return [];
  }
}

function newsQuery(q: string) {
  return encodeURIComponent(q);
}

export const getNews = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ query: z.string().min(2).max(180) }).parse(input))
  .handler(async ({ data }): Promise<{ items: NewsItem[] }> => {
    const q = data.query.trim();
    return cached(`news:${q.toLowerCase()}`, 5 * 60 * 1000, async () => {
      const google = `https://news.google.com/rss/search?q=${newsQuery(q)}&hl=en-US&gl=US&ceid=US:en`;
      const [gItems, guardian, inciweb] = await Promise.all([
        rssFeed(google, "Google News"),
        q.toLowerCase().includes("wildfire") || q.toLowerCase() === "global"
          ? rssFeed("https://www.theguardian.com/world/wildfires/rss", "The Guardian")
          : Promise.resolve([] as NewsItem[]),
        q.toLowerCase() === "global"
          ? rssFeed("https://inciweb.wildfire.gov/incidents/rss.xml", "InciWeb")
          : Promise.resolve([] as NewsItem[]),
      ]);
      const seen = new Set<string>();
      const merged: NewsItem[] = [];
      for (const item of [...gItems, ...guardian, ...inciweb]) {
        const key = item.title.toLowerCase().slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
      merged.sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
      return { items: merged.slice(0, 28) };
    });
  });

export const searchPlace = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ q: z.string().min(2).max(120) }).parse(input))
  .handler(async ({ data }): Promise<{ hits: PlaceHit[] }> => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(data.q)}`;
    const res = await fetchOk(url, 8000);
    const body = (await res.json()) as { display_name?: string; lat?: string; lon?: string }[];
    return {
      hits: body
        .map((row) => ({
          label: row.display_name ?? data.q,
          lat: Number(row.lat),
          lng: Number(row.lon),
        }))
        .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng)),
    };
  });

const checkInput = z.object({
  title: z.string(),
  lat: z.number(),
  lng: z.number(),
  acres: z.number().nullable(),
  started: z.string(),
  closed: z.string().nullable(),
  description: z.string().nullable(),
  sources: z.array(z.object({ id: z.string(), url: z.string() })),
  headlines: z.array(z.string()).max(12),
});

type XaiOutputItem = {
  type?: string;
  content?: { type?: string; text?: string }[] | string;
};

function extractXaiText(body: { output?: XaiOutputItem[]; citations?: unknown }): string {
  const chunks: string[] = [];
  for (const item of body.output ?? []) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (part.text) chunks.push(part.text);
      }
    }
  }
  if (chunks.length) return chunks.join("\n");
  return "";
}

function extractXPosts(body: { citations?: unknown; output?: unknown }): FactCheck["xPosts"] {
  const posts: FactCheck["xPosts"] = [];
  const seen = new Set<string>();
  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node !== "object") return;
    const rec = node as Record<string, unknown>;
    const url = typeof rec.url === "string" ? rec.url : "";
    if (/x\.com\/|twitter\.com\//i.test(url) && !seen.has(url)) {
      seen.add(url);
      const handle =
        (typeof rec.author === "string" && rec.author) ||
        url.match(/x\.com\/([^/]+)/i)?.[1] ||
        "unknown";
      const text =
        (typeof rec.content === "string" && rec.content) ||
        (typeof rec.text === "string" && rec.text) ||
        (typeof rec.title === "string" && rec.title) ||
        url;
      posts.push({
        handle: String(handle).replace(/^@/, ""),
        text: String(text).slice(0, 280),
        url,
        date: typeof rec.timestamp === "string" ? rec.timestamp : undefined,
      });
    }
    for (const v of Object.values(rec)) {
      if (typeof v === "object") visit(v);
    }
  };
  visit(body.citations);
  visit(body.output);
  return posts.slice(0, 8);
}

function parseFactCheck(text: string, fallbackPosts: FactCheck["xPosts"]): FactCheck {
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  const jsonSlice = start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;
  let parsed: Partial<FactCheck> = {};
  try {
    parsed = JSON.parse(jsonSlice) as Partial<FactCheck>;
  } catch {
    parsed = { summary: stripped.slice(0, 800), verdict: "unverified" };
  }
  const verdict = parsed.verdict;
  const okVerdict =
    verdict === "corroborated" || verdict === "partial" || verdict === "disputed" || verdict === "unverified"
      ? verdict
      : "unverified";
  return {
    verdict: okVerdict,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.4)),
    summary: parsed.summary || "No structured summary returned.",
    claims: Array.isArray(parsed.claims) ? parsed.claims.slice(0, 8) : [],
    news: Array.isArray(parsed.news) ? parsed.news.slice(0, 8) : [],
    xPosts: Array.isArray(parsed.xPosts) && parsed.xPosts.length ? parsed.xPosts.slice(0, 8) : fallbackPosts,
    conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts.slice(0, 6) : [],
    checkedAt: new Date().toISOString(),
  };
}

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return geminiClient;
}

export const crossCheckIncident = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; check: FactCheck } | { ok: false; error: string }> => {
      const gemini = getGemini();
      const xaiKey = process.env.XAI_API_KEY;
      if (!gemini && !xaiKey) {
        return { ok: false, error: "AI is not configured. Add GEMINI_API_KEY to environment." };
      }

      const cacheKey = `check:${data.title}:${data.lat.toFixed(2)}:${data.lng.toFixed(2)}:${data.started.slice(0, 10)}`;
      const hit = serverCache.get<FactCheck>(cacheKey, 30 * 60 * 1000);
      if (hit !== undefined) {
        return { ok: true, check: hit };
      }

      const fromDate = data.started.slice(0, 10);
      const prompt = `You are a fire-intelligence analyst. Cross-check this incident using live web news and eyewitness discussion.

Official / satellite record:
- Name: ${data.title}
- Coordinates: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}
- Reported size: ${data.acres == null ? "unknown" : `${Math.round(data.acres)} acres`}
- First detected: ${data.started}
- Closed: ${data.closed ?? "still open"}
- Notes: ${data.description ?? "none"}
- Official source URLs: ${data.sources.map((s) => `${s.id} ${s.url}`).join(" | ") || "none"}
- Headlines already on file: ${data.headlines.join(" | ") || "none"}

Tasks:
1. Search recent news for this fire (location + name). Prefer Reuters, AP, AFP, BBC, Guardian, ABC, local emergency agencies, InciWeb, CAL FIRE, NIFC, Copernicus, NASA FIRMS.
2. Search web for eyewitness and official accounts about this fire.
3. Fact-check: is the fire real, is the location right, is acreage current, are viral claims exaggerated, is it a volcano/gas flare/ag burn misread as a wildfire?
4. Flag conflicts between official data, news, and reports.

Return ONLY valid JSON (no markdown fences, no extra text) with this exact shape:
{
  "verdict": "corroborated" | "partial" | "disputed" | "unverified",
  "confidence": 0-1,
  "summary": "2-4 sentences",
  "claims": [{"claim":"...","status":"supported"|"contradicted"|"unverified","evidence":"..."}],
  "news": [{"title":"...","url":"...","outlet":"..."}],
  "xPosts": [{"handle":"...","text":"...","url":"https://x.com/...","date":"..."}],
  "conflicts": ["..."]
}`;

      if (gemini) {
        try {
          const response = await gemini.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              responseMimeType: "application/json",
            },
          });
          const text = response.text;
          if (text) {
            const check = parseFactCheck(text, []);
            // Extract grounding citations if news is empty
            const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
            const citations: { title: string; url: string; outlet: string }[] = [];
            for (const chunk of searchChunks) {
              const uri = (chunk as { web?: { uri?: string; title?: string } }).web?.uri;
              const title = (chunk as { web?: { uri?: string; title?: string } }).web?.title || "Web report";
              if (uri) {
                try {
                  const outlet = new URL(uri).hostname.replace(/^www\./, "");
                  citations.push({ title, url: uri, outlet });
                } catch {
                  citations.push({ title, url: uri, outlet: "News" });
                }
              }
            }
            if (citations.length > 0 && check.news.length === 0) {
              check.news = citations.slice(0, 8);
            }
            serverCache.set(cacheKey, check);
            return { ok: true, check };
          }
        } catch (err: unknown) {
          console.warn("[gemini] cross-check query failed, checking fallback:", err);
          if (!xaiKey) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, error: `Gemini cross-check error: ${msg.slice(0, 180)}` };
          }
        }
      }

      if (xaiKey) {
        const call = async (model: string) =>
          fetch("https://api.x.ai/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${xaiKey}`,
            },
            body: JSON.stringify({
              model,
              input: [{ role: "user", content: prompt }],
              tools: [{ type: "web_search" }, { type: "x_search", from_date: fromDate }],
              max_output_tokens: 1600,
            }),
          });

        let res = await call("grok-4.5");
        if (res.status === 400 || res.status === 404) {
          res = await call("grok-4.6");
        }
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          return { ok: false, error: `xAI API error ${res.status}${errText ? `: ${errText.slice(0, 180)}` : ""}` };
        }
        const body = (await res.json()) as { output?: XaiOutputItem[]; citations?: unknown };
        const text = extractXaiText(body);
        if (!text) return { ok: false, error: "Empty model response" };
        const check = parseFactCheck(text, extractXPosts(body));
        serverCache.set(cacheKey, check);
        return { ok: true, check };
      }

      return { ok: false, error: "No AI provider configured" };
    },
  );
