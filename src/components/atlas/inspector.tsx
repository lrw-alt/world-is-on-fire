import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Bookmark,
  ExternalLink,
  Flame,
  LoaderCircle,
  MapPin,
  Newspaper,
  Radio,
  Send,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebase } from "@/lib/firebase/context";
import {
  subscribeIncidentReports,
  addCommunityReport,
  type CommunityReport,
} from "@/lib/firebase/firestore-service";
import { formatAcres, formatUtc, relativeHours } from "@/lib/fires/format";
import { cn } from "@/lib/utils";
import type { FactCheck, FactVerdict, FireIncident, NewsItem, ThermalHotspot } from "@/lib/fires/types";

type Props = {
  incident: FireIncident | null;
  hotspot: ThermalHotspot | null;
  news: NewsItem[];
  newsLoading: boolean;
  check: FactCheck | null;
  checkLoading: boolean;
  checkError: string | null;
  onCrossCheck: () => void;
  onClose: () => void;
};

const verdictCopy: Record<FactVerdict, { label: string; variant: "success" | "warning" | "danger" | "secondary" }> = {
  corroborated: { label: "Corroborated", variant: "success" },
  partial: { label: "Partially confirmed", variant: "warning" },
  disputed: { label: "Disputed", variant: "danger" },
  unverified: { label: "Unverified", variant: "secondary" },
};

export function Inspector({
  incident,
  hotspot,
  news,
  newsLoading,
  check,
  checkLoading,
  checkError,
  onCrossCheck,
  onClose,
}: Props) {
  const { user, isSaved, toggleSaveIncident, signIn } = useFirebase();
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [reportNote, setReportNote] = useState("");
  const [smokeObserved, setSmokeObserved] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const incidentId = incident?.id ?? (hotspot ? `viirs_${hotspot.lat.toFixed(2)}_${hotspot.lng.toFixed(2)}` : null);

  useEffect(() => {
    if (!incidentId) {
      setReports([]);
      return;
    }
    const unsub = subscribeIncidentReports(
      incidentId,
      (data) => setReports(data),
      (err) => console.warn("Failed to stream incident reports", err)
    );
    return () => unsub();
  }, [incidentId]);

  const handleToggleBookmark = async () => {
    if (!incident) return;
    try {
      await toggleSaveIncident({
        id: incident.id,
        incidentTitle: incident.title,
        lat: incident.lat,
        lng: incident.lng,
        acres: incident.acres ?? undefined,
        notes: incident.description ?? "",
      });
    } catch (err) {
      console.error("Bookmark toggle failed:", err);
    }
  };

  const handlePostReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentId || !reportNote.trim()) return;
    setSubmittingReport(true);
    setReportError(null);
    try {
      await addCommunityReport(incidentId, {
        notes: reportNote.trim(),
        smokeObserved,
      });
      setReportNote("");
      setSmokeObserved(false);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Could not post report");
    } finally {
      setSubmittingReport(false);
    }
  };

  const title = incident?.title ?? (hotspot ? "Thermal detection" : "World briefing");
  const coords = incident
    ? `${incident.lat.toFixed(3)}°, ${incident.lng.toFixed(3)}°`
    : hotspot
      ? `${hotspot.lat.toFixed(3)}°, ${hotspot.lng.toFixed(3)}°`
      : null;

  const openSources = useMemo(() => incident?.sources ?? [], [incident]);

  return (
    <aside
      className={cn(
        "panel pointer-events-auto flex w-full flex-col overflow-hidden",
        "h-[min(52vh,34rem)] md:h-full md:max-h-none",
      )}
    >
      <header className="flex items-start gap-3 p-4 pb-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Flame className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {incident ? (incident.closed ? "Contained / closed" : "Named incident") : hotspot ? "VIIRS hotspot" : "Feed"}
          </p>
          <h2 className="font-display text-xl font-medium leading-snug tracking-tight text-foreground">{title}</h2>
          {coords ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
              <MapPin className="size-3.5" />
              {coords}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {incident ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleToggleBookmark}
              title={isSaved(incident.id) ? "Remove from watchlist (Firebase)" : "Save to watchlist (Firebase)"}
              aria-label="Save to watchlist"
            >
              <Bookmark
                className={cn(
                  "size-4 transition-colors",
                  isSaved(incident.id)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground hover:text-foreground",
                )}
              />
            </Button>
          ) : null}
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
            <X className="size-4" />
          </Button>
        </div>
      </header>

      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <div className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="reports">
              Reports {reports.length > 0 ? `(${reports.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="check">Cross-check</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-4 pb-4 pt-3">
          <TabsContent value="overview" className="flex flex-col gap-3">
            {incident ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Reported size" value={formatAcres(incident.acres)} />
                  <Stat label="First detected" value={formatUtc(incident.started)} />
                </div>
                {incident.description ? (
                  <p className="text-sm leading-relaxed text-foreground/90">{incident.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Named wildfire from NASA EONET. Size and perimeter come from agency reports when available.
                  </p>
                )}
                {openSources.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Official sources
                    </p>
                    {openSources.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-11 items-center justify-between rounded-md border border-border bg-secondary/60 px-3 text-sm hover:bg-accent"
                      >
                        <span className="truncate">{s.id}</span>
                        <ExternalLink className="size-3.5 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </>
            ) : hotspot ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Radiative power" value={`${Math.round(hotspot.frp)} MW`} />
                  <Stat label="Age" value={relativeHours(hotspot.hoursOld)} />
                  <Stat label="Confidence" value={hotspot.confidence} />
                  <Stat label="Pass" value={hotspot.dayNight === "N" ? "Night" : "Day"} />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  VIIRS 375m thermal anomaly — heat, not a confirmed wildfire. Gas flares, volcanoes, and agricultural
                  burns also light up this layer. Cross-check against named incidents and news before treating it as a
                  fire.
                </p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Global wildfire briefing. Open the News tab for live headlines, or tap a named fire or satellite
                detection on the map. Cross-check uses Grok to reconcile agency data, news, and X.
              </p>
            )}
          </TabsContent>

          <TabsContent value="news" className="flex flex-col gap-2">
            {newsLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </>
            ) : news.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching headlines yet. Try the AI cross-check for a wider sweep.</p>
            ) : (
              news.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border bg-secondary/40 p-3 transition-colors duration-150 hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span className="truncate">{item.outlet}</span>
                    {item.published ? <span className="tabular-nums">{formatUtc(item.published)}</span> : null}
                  </div>
                  <p className="mt-1 text-sm font-medium leading-snug">{item.title}</p>
                </a>
              ))
            )}
          </TabsContent>

          <TabsContent value="reports" className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-xs font-medium text-foreground">Community Ground Truth</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Crowdsourced field observations and condition reports verified and stored in Firebase.
              </p>
            </div>

            {user ? (
              <form onSubmit={handlePostReport} className="flex flex-col gap-2 rounded-lg border border-border/80 bg-card p-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  File observation as {user.displayName || "Observer"}
                </p>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Local visibility, wind direction, active spot fires, or evacuation notes…"
                  maxLength={1000}
                  rows={2}
                  className="w-full resize-none rounded-md border border-input bg-transparent p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="flex items-center justify-between pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={smokeObserved}
                      onChange={(e) => setSmokeObserved(e.target.checked)}
                      className="size-3.5 accent-primary"
                    />
                    Heavy smoke plume visible
                  </label>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingReport || !reportNote.trim()}
                    className="h-8 gap-1 px-3 text-xs"
                  >
                    {submittingReport ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    Post
                  </Button>
                </div>
                {reportError ? <p className="text-xs text-destructive">{reportError}</p> : null}
              </form>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Sign in with Google to post field observations or bookmark this fire.
                </p>
                <Button variant="secondary" size="sm" onClick={signIn} className="h-8 text-xs font-medium">
                  Sign in with Google
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Recent Reports ({reports.length})
              </p>
              {reports.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No community reports yet for this incident.
                </p>
              ) : (
                reports.map((rep) => (
                  <div key={rep.id} className="flex flex-col gap-1 rounded-lg border border-border bg-secondary/40 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{rep.userDisplayName || "Field Observer"}</span>
                      <span className="tabular-nums">{formatUtc(rep.createdAt)}</span>
                    </div>
                    <p className="text-foreground/90 leading-relaxed">{rep.notes}</p>
                    {rep.smokeObserved ? (
                      <span className="mt-1 inline-flex w-fit items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                        Dense smoke plume
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="check" className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Grok searches live news and X, then reconciles those claims with the satellite / agency record. Runs only
              when you ask — it spends API quota.
            </p>
            <Button onClick={onCrossCheck} disabled={checkLoading || (!incident && !hotspot)} className="h-11">
              {checkLoading ? <LoaderCircle className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
              {checkLoading ? "Checking news and X" : "Cross-check with news and X"}
            </Button>
            {checkLoading ? <p className="shimmer-text text-sm">Searching outlets and X, then scoring claims…</p> : null}
            {checkError ? <p className="text-sm text-destructive">{checkError}</p> : null}
            {check ? <FactBody check={check} /> : null}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

function FactBody({ check }: { check: FactCheck }) {
  const meta = verdictCopy[check.verdict];
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border bg-secondary/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(check.confidence * 100)}% confidence
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{check.summary}</p>
      </div>

      {check.conflicts.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Conflicts</p>
          {check.conflicts.map((c) => (
            <p key={c} className="text-sm text-warning">
              {c}
            </p>
          ))}
        </div>
      ) : null}

      {check.claims.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Claims</p>
          {check.claims.map((claim) => (
            <div key={claim.claim} className="rounded-md border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{claim.claim}</p>
                <Badge
                  variant={
                    claim.status === "supported" ? "success" : claim.status === "contradicted" ? "danger" : "secondary"
                  }
                >
                  {claim.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{claim.evidence}</p>
            </div>
          ))}
        </div>
      ) : null}

      {check.news.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Newspaper className="size-3.5" /> News cited
          </p>
          {check.news.map((n) => (
            <a
              key={n.url}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm text-foreground underline-offset-4 hover:underline"
            >
              {n.outlet ? `${n.outlet}: ` : ""}
              {n.title}
            </a>
          ))}
        </div>
      ) : null}

      {check.xPosts.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Radio className="size-3.5" /> X discussion
          </p>
          {check.xPosts.map((p) => (
            <a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border bg-secondary/40 p-3"
            >
              <p className="text-xs font-medium text-primary">@{p.handle}</p>
              <p className="mt-1 text-sm leading-relaxed">{p.text}</p>
            </a>
          ))}
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground">Checked {formatUtc(check.checkedAt)}</p>
    </div>
  );
}
