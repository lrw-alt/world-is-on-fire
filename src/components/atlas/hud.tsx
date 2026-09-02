import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bookmark,
  Clock3,
  Compass,
  Flame,
  Globe2,
  Info,
  Layers,
  Locate,
  LogIn,
  LogOut,
  Minus,
  Navigation2,
  Plus,
  Satellite,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/lib/firebase/context";
import type { SavedIncident } from "@/lib/firebase/firestore-service";
import { formatAcres, formatDay } from "@/lib/fires/format";
import { cn } from "@/lib/utils";
import type { TimeMode } from "@/lib/fires/types";

const modes: { id: TimeMode; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "48h", label: "48h" },
  { id: "7d", label: "7 days" },
  { id: "history", label: "History" },
];

export type RegionPreset = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
};

export const REGION_PRESETS: RegionPreset[] = [
  { id: "global", name: "Global", lat: 20, lng: 8, zoom: 3 },
  { id: "na", name: "North America", lat: 39.5, lng: -115, zoom: 5 },
  { id: "sa", name: "Amazon Basin", lat: -9.5, lng: -56.5, zoom: 5 },
  { id: "eu", name: "Mediterranean", lat: 39.5, lng: 18.0, zoom: 5 },
  { id: "af", name: "Central Africa", lat: -2.5, lng: 22.0, zoom: 5 },
  { id: "as", name: "SE Asia", lat: 13.5, lng: 104.0, zoom: 5 },
  { id: "au", name: "Australia", lat: -25.5, lng: 134.0, zoom: 5 },
];

type Props = {
  mode: TimeMode;
  historyDay: string;
  minDay: string;
  maxDay: string;
  query: string;
  basemap: "dark" | "satellite";
  showHotspots: boolean;
  showIncidents: boolean;
  includeSmall: boolean;
  incidentCount: number;
  hotspotCount: number;
  acres: number;
  onMode: (mode: TimeMode) => void;
  onHistoryDay: (day: string) => void;
  onQuery: (q: string) => void;
  onSearch: () => void;
  onBasemap: (b: "dark" | "satellite") => void;
  onToggleHotspots: () => void;
  onToggleIncidents: () => void;
  onToggleSmall: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onFlyToRegion?: (region: { lat: number; lng: number; zoom: number }) => void;
  onSelectSaved?: (saved: SavedIncident) => void;
};

export function Hud(props: Props) {
  const { user, savedIncidents, removeSavedIncident, signIn, signOut } = useFirebase();
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [watchlistSearch, setWatchlistSearch] = useState("");
  const [activeRegion, setActiveRegion] = useState("global");
  const [utc, setUtc] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUtc(new Date().toISOString().slice(11, 19));
    const id = setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredSaved = savedIncidents.filter((inc) =>
    inc.incidentTitle.toLowerCase().includes(watchlistSearch.toLowerCase()) ||
    (inc.notes && inc.notes.toLowerCase().includes(watchlistSearch.toLowerCase()))
  );

  return (
    <>
      {/* Top Telemetry & Control Bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:flex-row md:items-start md:justify-between">
        {/* Brand, Live Telemetry & Login Section */}
        <div className="panel tactical-corner pointer-events-auto flex items-center gap-3 px-3.5 py-2.5">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 border border-primary/25 shadow-xs">
            <Flame className="size-5 text-primary animate-pulse" />
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-xl leading-none tracking-tight">
                <span className="italic font-semibold text-primary">Ember</span> Atlas
              </p>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider text-primary">
                PRO
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span className="live-dot live-dot-core" />
              {props.mode === "live" ? "Live VIIRS/EONET" : "Historical"}
              <span className="tabular-nums text-foreground/90 font-mono text-[10px]" suppressHydrationWarning>
                {utc ? `${utc} UTC` : "— UTC"}
              </span>
            </p>
          </div>

          <div className="h-7 w-px bg-border/80 mx-0.5" />

          {/* User Sign-in / Identity Section */}
          {user ? (
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="size-7 rounded-full border border-primary/40 shadow-xs shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary border border-primary/30 shrink-0">
                  {user.displayName?.slice(0, 1) || "U"}
                </div>
              )}
              <div className="hidden sm:flex flex-col">
                <span className="max-w-[95px] truncate text-xs font-medium text-foreground leading-tight">
                  {user.displayName || user.email?.split("@")[0]}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={signOut}
                title="Sign out from Firebase"
                aria-label="Sign out"
                className="size-7 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={signIn}
              className="h-8 gap-1.5 px-2.5 text-xs font-medium border-primary/30 text-foreground hover:bg-primary/10 shadow-xs"
            >
              <LogIn className="size-3.5 text-primary" />
              <span>Sign in</span>
            </Button>
          )}
        </div>

        {/* Global Search Center with Watchlist & Sensor Legend */}
        <div className="flex flex-col gap-1.5 w-full md:max-w-xl pointer-events-auto">
          <div className="panel relative flex w-full items-center gap-1.5 px-2.5 py-1.5 border border-border/80">
            <form
              className="flex flex-1 items-center gap-1.5 min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                props.onSearch();
              }}
            >
              <Search className="size-4 shrink-0 text-muted-foreground ml-1" />
              <Input
                ref={searchInputRef}
                value={props.query}
                onChange={(e) => props.onQuery(e.target.value)}
                placeholder="Search wildfire, county, coordinate…"
                className="h-8 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
                aria-label="Search places and fires"
              />
              {props.query ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => props.onQuery("")}
                  className="size-7 text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </Button>
              ) : (
                <kbd className="hidden sm:inline-flex select-none items-center gap-1 rounded border border-border bg-secondary/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                  /
                </kbd>
              )}
            </form>

            <div className="h-5 w-px bg-border/80 shrink-0 mx-1" />

            {/* Fire Watchlist Trigger */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWatchlistOpen(true)}
              className="relative flex items-center gap-1.5 h-8 px-2 text-xs font-medium shrink-0 hover:bg-primary/10"
              title="Your Fire Watchlist"
            >
              <Bookmark
                className={cn("size-3.5", savedIncidents.length > 0 && "fill-amber-400 text-amber-400")}
              />
              <span className="hidden sm:inline">Watchlist</span>
              {savedIncidents.length > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/25 border border-primary/40 text-[10px] font-bold text-primary">
                  {savedIncidents.length}
                </span>
              )}
            </Button>

            {/* Sensor & Telemetry Legend Trigger */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setLegendOpen(true)}
              title="Sensor & Telemetry Legend"
              aria-label="Open Legend"
              className="size-8 text-muted-foreground hover:text-foreground shrink-0"
            >
              <Info className="size-3.5" />
            </Button>
          </div>

          {/* Quick Region Presets Bar */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80 px-1">
              Jump:
            </span>
            {REGION_PRESETS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setActiveRegion(r.id);
                  props.onFlyToRegion?.({ lat: r.lat, lng: r.lng, zoom: r.zoom });
                }}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors duration-150 border whitespace-nowrap",
                  activeRegion === r.id
                    ? "bg-primary/20 border-primary/40 text-primary font-semibold"
                    : "bg-card/80 border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/70",
                )}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        {/* Live Metrics Ribbons */}
        <div className="panel pointer-events-auto hidden items-center gap-4 px-4 py-2.5 md:flex border border-border/80">
          <Metric label="Incidents" value={String(props.incidentCount)} spark="🔥" />
          <div className="h-6 w-px bg-border/60" />
          <Metric label="Thermal Spots" value={String(props.hotspotCount)} spark="🛰️" />
          <div className="h-6 w-px bg-border/60" />
          <Metric label="Burned Area" value={formatAcres(props.acres).replace(" acres", " ac")} spark="📐" />
        </div>
      </div>

      {/* Floating Quick Action Map Controls (Floating above bottom dock on right) */}
      <div className="pointer-events-none absolute right-3 bottom-[130px] sm:bottom-[120px] md:bottom-3 z-20 flex flex-col gap-1.5">
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <Button
            variant="secondary"
            size="icon"
            onClick={props.onLocate}
            aria-label="Locate me"
            title="Locate my current position"
            className="size-10 rounded-lg shadow-md hover:border-primary/40"
          >
            <Locate className="size-4 text-primary" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => props.onFlyToRegion?.(REGION_PRESETS[0])}
            aria-label="Reset global view"
            title="Reset to global view"
            className="size-10 rounded-lg shadow-md"
          >
            <Navigation2 className="size-4 text-foreground/80" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={props.onZoomIn}
            aria-label="Zoom in"
            title="Zoom in"
            className="size-10 rounded-lg shadow-md"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={props.onZoomOut}
            aria-label="Zoom out"
            title="Zoom out"
            className="size-10 rounded-lg shadow-md"
          >
            <Minus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Bottom Command Dock & Layer Controls (Positioned below) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex-row md:items-end md:justify-between md:pr-16">
        <div className="pointer-events-auto flex flex-col gap-2 max-w-full">
          {/* Timeline Modes Switcher */}
          <div className="panel flex flex-wrap gap-1 p-1">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => props.onMode(m.id)}
                className={cn(
                  "h-9 rounded-lg px-3 text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
                  props.mode === m.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {m.id === "live" && <span className="size-1.5 rounded-full bg-white animate-pulse" />}
                {m.label}
              </button>
            ))}
          </div>

          {/* Historical Date Scrub Slider */}
          {props.mode === "history" ? (
            <div className="panel flex items-center gap-3 px-4 py-2.5 border border-border/80">
              <Clock3 className="size-4 text-primary" />
              <input
                type="range"
                min={0}
                max={dayIndex(props.minDay, props.maxDay)}
                value={dayIndex(props.minDay, props.historyDay)}
                onChange={(e) => props.onHistoryDay(indexToDay(props.minDay, Number(e.target.value)))}
                className="h-8 w-44 accent-primary md:w-64 cursor-pointer"
                aria-label="History date"
              />
              <span className="text-xs font-semibold tabular-nums text-foreground">{formatDay(props.historyDay)}</span>
            </div>
          ) : null}

          {/* Layer Toggles Pill Bar */}
          <div className="panel flex flex-wrap gap-1 p-1">
            <Toggle
              active={props.showIncidents}
              onClick={props.onToggleIncidents}
              icon={<Flame className="size-3.5 text-primary" />}
              label="Incidents"
              count={props.incidentCount}
            />
            <Toggle
              active={props.showHotspots}
              onClick={props.onToggleHotspots}
              icon={<Satellite className="size-3.5 text-amber-400" />}
              label="Detections"
              count={props.hotspotCount}
            />
            <Toggle
              active={props.includeSmall}
              onClick={props.onToggleSmall}
              icon={<Layers className="size-3.5 text-emerald-400" />}
              label="Small fires"
            />
            <Toggle
              active={props.basemap === "satellite"}
              onClick={() => props.onBasemap(props.basemap === "dark" ? "satellite" : "dark")}
              icon={<Globe2 className="size-3.5 text-sky-400" />}
              label={props.basemap === "dark" ? "Night map" : "Satellite"}
            />
          </div>
        </div>

        {/* Telemetry Attribution Footnote */}
        <div className="pointer-events-auto hidden max-w-xs text-[11px] leading-relaxed text-muted-foreground/80 md:block bg-card/60 p-2.5 rounded-lg border border-border/40 backdrop-blur-xs">
          <p>
            Sensors: <span className="text-foreground/90 font-medium">NASA VIIRS 375m & MODIS</span> thermal detections. Incidents: <span className="text-foreground/90 font-medium">NASA EONET</span>. Intelligence cross-checked with news and real-time feeds.
          </p>
        </div>
      </div>

      {/* Sensor Legend Dialog */}
      {legendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="panel tactical-corner flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden shadow-2xl border border-primary/30">
            <div className="flex items-center justify-between border-b border-border p-4 bg-card/90">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="font-display text-base font-semibold text-foreground">Sensor & Telemetry Legend</h3>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setLegendOpen(false)}
                aria-label="Close legend"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 text-xs leading-relaxed text-muted-foreground">
              <div>
                <p className="font-semibold uppercase tracking-wider text-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" /> Named Wildfire Incidents (NASA EONET)
                </p>
                <p>
                  Official agency-reported fires including name, first observed date, reported acreage, active containment perimeters, and links to local emergency response agencies.
                </p>
              </div>

              <div className="border-t border-border/60 pt-3">
                <p className="font-semibold uppercase tracking-wider text-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-400" /> Thermal Hotspots (NASA VIIRS 375m)
                </p>
                <p>
                  Infrared thermal anomalies captured by S-NPP and NOAA-20 satellites. FRP (Fire Radiative Power) measured in MegaWatts (MW) indicates instantaneous heat output.
                </p>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded bg-secondary/50 border border-border">
                    <span className="text-amber-500 font-bold">&gt;250 MW</span>
                    <p className="text-[10px] text-muted-foreground">High Intensity</p>
                  </div>
                  <div className="p-2 rounded bg-secondary/50 border border-border">
                    <span className="text-primary font-bold">40–250 MW</span>
                    <p className="text-[10px] text-muted-foreground">Moderate Flame</p>
                  </div>
                  <div className="p-2 rounded bg-secondary/50 border border-border">
                    <span className="text-orange-700 font-bold">&lt;40 MW</span>
                    <p className="text-[10px] text-muted-foreground">Low / Smolder</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 pt-3">
                <p className="font-semibold uppercase tracking-wider text-foreground mb-1">
                  Crowdsourced Ground Truth
                </p>
                <p>
                  Real-time field observations from verified local observers stored in Firebase Firestore with smoke plume visibility reports.
                </p>
              </div>
            </div>

            <div className="border-t border-border p-3 bg-secondary/40 flex justify-end">
              <Button size="sm" onClick={() => setLegendOpen(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist Dialog */}
      {watchlistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="panel tactical-corner flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden shadow-2xl border border-primary/30">
            <div className="flex items-center justify-between border-b border-border p-4 bg-card/90">
              <div className="flex items-center gap-2">
                <Bookmark className="size-4 fill-amber-400 text-amber-400" />
                <h3 className="font-display text-base font-semibold">Your Fire Watchlist</h3>
                <span className="rounded-full bg-primary/20 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {savedIncidents.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setWatchlistOpen(false)}
                aria-label="Close watchlist"
              >
                <X className="size-4" />
              </Button>
            </div>

            {savedIncidents.length > 0 && (
              <div className="px-4 pt-3 pb-1 border-b border-border/60">
                <Input
                  value={watchlistSearch}
                  onChange={(e) => setWatchlistSearch(e.target.value)}
                  placeholder="Filter saved fires…"
                  className="h-8 text-xs bg-secondary/40"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {!user ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Sign in with Google to sync your saved fires across devices in Firebase Firestore.
                  </p>
                  <Button variant="secondary" size="sm" onClick={signIn} className="mt-3 text-xs">
                    Sign in with Google
                  </Button>
                </div>
              ) : filteredSaved.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {savedIncidents.length === 0 ? "No fires bookmarked yet" : "No matching bookmarks"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Select any wildfire on the map and click the bookmark button in the briefing panel to track it here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredSaved.map((inc) => (
                    <div
                      key={inc.id}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-secondary/40 p-3 transition-colors hover:bg-secondary/70 hover:border-primary/40"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          props.onSelectSaved?.(inc);
                          setWatchlistOpen(false);
                        }}
                        className="flex-1 text-left cursor-pointer"
                      >
                        <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                          {inc.incidentTitle}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums font-mono text-muted-foreground">
                          {inc.acres ? `${formatAcres(inc.acres)} · ` : ""}
                          {inc.lat.toFixed(2)}°, {inc.lng.toFixed(2)}°
                        </p>
                      </button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            props.onSelectSaved?.(inc);
                            setWatchlistOpen(false);
                          }}
                          title="Fly to fire"
                          aria-label="Fly to fire"
                        >
                          <Compass className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeSavedIncident(inc.id)}
                          title="Remove bookmark"
                          aria-label="Remove bookmark"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ label, value, spark }: { label: string; value: string; spark?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground flex items-center gap-1">
        {spark && <span className="text-[11px]">{spark}</span>}
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums font-mono leading-tight text-foreground">{value}</p>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all duration-150 cursor-pointer",
        active
          ? "bg-accent/90 text-foreground border border-border/80 shadow-xs"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
      )}
    >
      {icon}
      <span>{label}</span>
      {count != null && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
            active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function dayIndex(min: string, day: string) {
  const a = Date.parse(`${min}T00:00:00Z`);
  const b = Date.parse(`${day}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function indexToDay(min: string, index: number) {
  const d = new Date(`${min}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + index);
  return d.toISOString().slice(0, 10);
}
