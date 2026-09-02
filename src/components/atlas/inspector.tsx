import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Globe2,
  LoaderCircle,
  MapPin,
  Newspaper,
  Radio,
  Satellite,
  Send,
  ShieldAlert,
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

const verdictCopy: Record<FactVerdict, { label: string; variant: "success" | "warning" | "danger" | "secondary"; icon: typeof ShieldAlert }> = {
  corroborated: { label: "Corroborated by News & Agency", variant: "success", icon: BadgeCheck },
  partial: { label: "Partially Confirmed", variant: "warning", icon: AlertTriangle },
  disputed: { label: "Conflicting Reports", variant: "danger", icon: ShieldAlert },
  unverified: { label: "Unverified / Sensor Only", variant: "secondary", icon: Satellite },
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
  const [copiedCoords, setCopiedCoords] = useState(false);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

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

  const title = incident?.title ?? (hotspot ? "Thermal Hotspot Detection" : "Global Reconnaissance Briefing");
  const coords = incident
    ? `${incident.lat.toFixed(4)}°, ${incident.lng.toFixed(4)}°`
    : hotspot
      ? `${hotspot.lat.toFixed(4)}°, ${hotspot.lng.toFixed(4)}°`
      : null;

  const handleCopyCoords = () => {
    if (!coords) return;
    navigator.clipboard?.writeText(coords);
    setCopiedCoords(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedCoords(false), 2000);
  };

  const openSources = useMemo(() => incident?.sources ?? [], [incident]);

  return (
    <aside
      className={cn(
        "panel tactical-corner pointer-events-auto flex w-full flex-col overflow-hidden border border-border/80 shadow-2xl",
        "h-[min(54vh,36rem)] md:h-full md:max-h-none",
      )}
    >
      {/* Header */}
      <header className="relative flex items-start gap-3 p-4 pb-3 border-b border-border/60 bg-card/90">
        <div className={cn(
          "relative flex size-10 shrink-0 items-center justify-center rounded-lg border shadow-xs",
          incident
            ? "bg-primary/15 border-primary/30 text-primary"
            : hotspot
              ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
              : "bg-sky-500/15 border-sky-500/30 text-sky-400"
        )}>
          {incident ? (
            <Flame className="size-5 animate-pulse" />
          ) : hotspot ? (
            <Satellite className="size-5" />
          ) : (
            <Globe2 className="size-5" />
          )}
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {incident
                ? (incident.closed ? "Contained Incident" : "Active Agency Incident")
                : hotspot
                  ? "NASA VIIRS Thermal Spot"
                  : "Global Telemetry Feed"}
            </p>
            {incident?.closed && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold uppercase text-emerald-400 border border-emerald-500/20">
                Contained
              </span>
            )}
          </div>
          <h2 className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground truncate mt-0.5" title={title}>
            {title}
          </h2>
          {coords ? (
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCoords}
                className="group flex items-center gap-1.5 text-xs tabular-nums font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Click to copy coordinates"
              >
                <MapPin className="size-3 text-primary" />
                <span>{coords}</span>
                {copiedCoords ? (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                    <Check className="size-3" /> Copied
                  </span>
                ) : (
                  <Copy className="size-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
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
              className="size-8"
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
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel" className="size-8">
            <X className="size-4" />
          </Button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pt-2.5 pb-1 border-b border-border/40 bg-secondary/20">
          <TabsList className="w-full grid grid-cols-4 h-9 bg-card/60 p-0.5 border border-border/60">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="news" className="text-xs">News</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs relative">
              Reports
              {reports.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/20 px-1 text-[9px] font-bold text-primary">
                  {reports.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="check" className="text-xs">Cross-check</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-4 pb-4 pt-3">
          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="flex flex-col gap-3 mt-0">
            {incident ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Reported Acreage" value={formatAcres(incident.acres)} accent="fire" />
                  <Stat label="First Detected" value={formatUtc(incident.started)} />
                </div>
                {incident.description ? (
                  <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                    <p className="text-xs leading-relaxed text-foreground/90 font-sans">{incident.description}</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Official wildfire record from NASA Earth Observatory Natural Event Tracker (EONET). Active updates synchronized with agency perimeters.
                    </p>
                  </div>
                )}
                {openSources.length > 0 ? (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Official Source Dispatches
                    </p>
                    {openSources.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-10 items-center justify-between rounded-lg border border-border/80 bg-secondary/50 px-3 text-xs hover:bg-accent hover:border-primary/40 transition-colors"
                      >
                        <span className="truncate font-medium text-foreground">{s.id}</span>
                        <ExternalLink className="size-3 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </>
            ) : hotspot ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Fire Radiative Power" value={`${Math.round(hotspot.frp)} MW`} accent="power" />
                  <Stat label="Detection Age" value={relativeHours(hotspot.hoursOld)} />
                  <Stat label="Confidence Score" value={hotspot.confidence.toUpperCase()} />
                  <Stat label="Satellite Pass" value={hotspot.dayNight === "N" ? "Night pass" : "Day pass"} />
                </div>
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">VIIRS 375m Thermal Anomaly</p>
                  High-resolution infrared sensor anomaly recorded by Suomi-NPP / NOAA-20. Represents instantaneous thermal emission; cross-reference with official reports or local news before classifying as a declared incident.
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground text-sm mb-1">Ember Atlas Wildfire Intelligence</p>
                  Click any named fire icon or thermal hotspot cluster on the interactive globe to open its live incident telemetry, NASA sensor data, community ground-truth reports, and AI news cross-checking.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Sensing Constellation" value="VIIRS & MODIS" />
                  <Stat label="Incident Registry" value="NASA EONET v3" />
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: NEWS */}
          <TabsContent value="news" className="flex flex-col gap-2 mt-0">
            {newsLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : news.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <Newspaper className="size-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-foreground">No recent news dispatches</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Try running an AI Cross-check in the next tab to search real-time feeds and local coverage.
                </p>
              </div>
            ) : (
              news.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border/80 bg-secondary/40 p-3 transition-colors duration-150 hover:bg-secondary/80 hover:border-primary/40 block"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase font-bold tracking-[0.12em] text-primary">
                    <span className="truncate">{item.outlet}</span>
                    {item.published ? <span className="tabular-nums text-muted-foreground font-mono">{formatUtc(item.published)}</span> : null}
                  </div>
                  <p className="mt-1 text-xs font-medium leading-snug text-foreground/95 hover:text-primary transition-colors">
                    {item.title}
                  </p>
                </a>
              ))
            )}
          </TabsContent>

          {/* TAB 3: COMMUNITY REPORTS */}
          <TabsContent value="reports" className="flex flex-col gap-3 mt-0">
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-2.5">
              <p className="text-xs font-semibold text-foreground">Community Ground Truth</p>
              <p className="text-[11px] text-muted-foreground">
                Crowdsourced field observations and smoke condition reports synced in Firebase Firestore.
              </p>
            </div>

            {user ? (
              <form onSubmit={handlePostReport} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  File observation as <span className="text-foreground">{user.displayName || "Observer"}</span>
                </p>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Local smoke visibility, spot fires, active firefighting operations, or evacuation orders…"
                  maxLength={1000}
                  rows={2}
                  className="w-full resize-none rounded-md border border-input bg-secondary/40 p-2 text-xs placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
                <div className="flex items-center justify-between pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={smokeObserved}
                      onChange={(e) => setSmokeObserved(e.target.checked)}
                      className="size-3.5 accent-primary cursor-pointer"
                    />
                    Heavy smoke plume visible
                  </label>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingReport || !reportNote.trim()}
                    className="h-8 gap-1.5 px-3 text-xs"
                  >
                    {submittingReport ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    Submit Report
                  </Button>
                </div>
                {reportError ? <p className="text-xs text-destructive">{reportError}</p> : null}
              </form>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-3.5 text-center bg-secondary/20">
                <p className="text-xs text-muted-foreground">
                  Sign in with Google to post field observations or sync bookmarked fires to your watchlist.
                </p>
                <Button variant="outline" size="sm" onClick={signIn} className="h-8 text-xs font-medium border-primary/30 text-foreground">
                  Sign in with Google
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Verified Reports ({reports.length})
              </p>
              {reports.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No community reports logged yet for this location.
                </p>
              ) : (
                reports.map((rep) => (
                  <div key={rep.id} className="flex flex-col gap-1 rounded-lg border border-border/80 bg-secondary/40 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{rep.userDisplayName || "Field Observer"}</span>
                      <span className="tabular-nums font-mono">{formatUtc(rep.createdAt)}</span>
                    </div>
                    <p className="text-foreground/90 leading-relaxed text-xs">{rep.notes}</p>
                    {rep.smokeObserved ? (
                      <span className="mt-1 inline-flex w-fit items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-amber-400">
                        Dense smoke plume reported
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 4: CROSS-CHECK */}
          <TabsContent value="check" className="flex flex-col gap-3 mt-0">
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-2.5 text-xs text-muted-foreground leading-relaxed">
              Synthesizes real-time reports and cross-examines social/news statements against satellite measurements.
            </div>

            <Button
              onClick={onCrossCheck}
              disabled={checkLoading || (!incident && !hotspot)}
              className="h-10 gap-2 font-medium text-xs shadow-xs"
            >
              {checkLoading ? <LoaderCircle className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
              {checkLoading ? "Reconciling live intelligence…" : "Perform AI Cross-Check"}
            </Button>

            {checkLoading ? (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-center">
                <p className="shimmer-text text-xs font-semibold text-primary">Scanning publishers, feeds, and satellite logs…</p>
              </div>
            ) : null}

            {checkError ? <p className="text-xs text-destructive">{checkError}</p> : null}
            {check ? <FactBody check={check} /> : null}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "fire" | "power" }) {
  return (
    <div className="rounded-lg border border-border/80 bg-secondary/50 px-3 py-2">
      <p className="text-[10px] uppercase font-bold tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-0.5 text-xs font-semibold tabular-nums font-mono",
        accent === "fire" ? "text-primary" : accent === "power" ? "text-amber-400" : "text-foreground"
      )}>
        {value}
      </p>
    </div>
  );
}

function FactBody({ check }: { check: FactCheck }) {
  const meta = verdictCopy[check.verdict] || verdictCopy.unverified;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border bg-secondary/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={meta.variant} className="gap-1 text-[11px] font-semibold py-0.5">
            <Icon className="size-3" />
            {meta.label}
          </Badge>
          <span className="text-[11px] tabular-nums font-mono text-muted-foreground">
            {Math.round(check.confidence * 100)}% confidence
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-foreground/90 font-sans">{check.summary}</p>
      </div>

      {check.conflicts.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-destructive">Disputed Points</p>
          {check.conflicts.map((c) => (
            <p key={c} className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
              {c}
            </p>
          ))}
        </div>
      ) : null}

      {check.claims.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Claim Breakdown</p>
          {check.claims.map((claim) => (
            <div key={claim.claim} className="rounded-md border border-border/80 bg-secondary/30 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{claim.claim}</p>
                <Badge
                  variant={
                    claim.status === "supported" ? "success" : claim.status === "contradicted" ? "danger" : "secondary"
                  }
                  className="text-[9px] py-0 px-1.5"
                >
                  {claim.status}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{claim.evidence}</p>
            </div>
          ))}
        </div>
      ) : null}

      {check.news.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Newspaper className="size-3 text-primary" /> Sources Cross-Checked
          </p>
          {check.news.map((n) => (
            <a
              key={n.url}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-xs text-foreground/90 hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              {n.outlet ? <span className="font-semibold text-primary">{n.outlet}: </span> : ""}
              {n.title}
            </a>
          ))}
        </div>
      ) : null}

      {check.xPosts.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Radio className="size-3 text-sky-400" /> Real-Time Dispatches
          </p>
          {check.xPosts.map((p) => (
            <a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border/80 bg-secondary/40 p-2.5 hover:bg-secondary/70 transition-colors"
            >
              <p className="text-xs font-semibold text-primary">@{p.handle}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-foreground/90">{p.text}</p>
            </a>
          ))}
        </div>
      ) : null}

      <p className="text-[10px] text-muted-foreground font-mono">Cross-check run at {formatUtc(check.checkedAt)}</p>
    </div>
  );
}
