import { useEffect, useState, type ReactNode } from "react";
import {
  Clock3,
  Flame,
  Globe2,
  Layers,
  Locate,
  Minus,
  Plus,
  Satellite,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAcres, formatDay } from "@/lib/fires/format";
import { cn } from "@/lib/utils";
import type { TimeMode } from "@/lib/fires/types";

const modes: { id: TimeMode; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "48h", label: "48h" },
  { id: "7d", label: "7 days" },
  { id: "history", label: "History" },
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
};

export function Hud(props: Props) {
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 16));
  useEffect(() => {
    const id = setInterval(() => setUtc(new Date().toISOString().slice(11, 16)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:flex-row md:items-start md:justify-between">
        <div className="panel pointer-events-auto flex items-center gap-3 px-4 py-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15">
            <Flame className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-display text-xl leading-none tracking-tight">
              <span className="italic">Ember</span> Atlas
            </p>
            <p className="mt-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span className="live-dot live-dot-core" />
              {props.mode === "live" ? "Live satellite" : "Historical"}
              <span className="tabular-nums text-foreground/80">{utc} UTC</span>
            </p>
          </div>
        </div>

        <form
          className="panel pointer-events-auto flex w-full items-center gap-2 p-2 md:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            props.onSearch();
          }}
        >
          <Search className="ml-2 size-4 shrink-0 text-muted-foreground" />
          <Input
            value={props.query}
            onChange={(e) => props.onQuery(e.target.value)}
            placeholder="Search a fire, city, or region"
            className="h-11 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
            aria-label="Search places and fires"
          />
        </form>

        <div className="panel pointer-events-auto hidden items-center gap-4 px-4 py-3 md:flex">
          <Metric label="Named fires" value={String(props.incidentCount)} />
          <Metric label="Detections" value={String(props.hotspotCount)} />
          <Metric label="Reported acres" value={formatAcres(props.acres).replace(" acres", "")} />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex-row md:items-end md:justify-between">
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="panel flex flex-wrap gap-1 p-1">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => props.onMode(m.id)}
                className={cn(
                  "h-10 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                  props.mode === m.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          {props.mode === "history" ? (
            <div className="panel flex items-center gap-3 px-4 py-3">
              <Clock3 className="size-4 text-muted-foreground" />
              <input
                type="range"
                min={0}
                max={dayIndex(props.minDay, props.maxDay)}
                value={dayIndex(props.minDay, props.historyDay)}
                onChange={(e) => props.onHistoryDay(indexToDay(props.minDay, Number(e.target.value)))}
                className="h-11 w-44 accent-primary md:w-64"
                aria-label="History date"
              />
              <span className="text-sm tabular-nums">{formatDay(props.historyDay)}</span>
            </div>
          ) : null}
          <div className="panel flex flex-wrap gap-1 p-1">
            <Toggle
              active={props.showIncidents}
              onClick={props.onToggleIncidents}
              icon={<Flame className="size-3.5" />}
              label="Incidents"
            />
            <Toggle
              active={props.showHotspots}
              onClick={props.onToggleHotspots}
              icon={<Satellite className="size-3.5" />}
              label="Detections"
            />
            <Toggle
              active={props.includeSmall}
              onClick={props.onToggleSmall}
              icon={<Layers className="size-3.5" />}
              label="Small fires"
            />
            <Toggle
              active={props.basemap === "satellite"}
              onClick={() => props.onBasemap(props.basemap === "dark" ? "satellite" : "dark")}
              icon={<Globe2 className="size-3.5" />}
              label={props.basemap === "dark" ? "Night map" : "Satellite"}
            />
          </div>
        </div>

        <div className="pointer-events-auto hidden max-w-xs text-[11px] leading-relaxed text-muted-foreground md:block">
          <p>
            Detections are NASA VIIRS thermal anomalies (last 7 days). Named incidents are NASA EONET wildfires,
            including history. News from publishers; X and fact-check run through Grok on demand.
          </p>
        </div>

        <div className="pointer-events-auto ml-auto flex flex-col gap-1">
          <Button variant="secondary" size="icon" onClick={props.onLocate} aria-label="Locate me">
            <Locate className="size-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={props.onZoomIn} aria-label="Zoom in">
            <Plus className="size-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={props.onZoomOut} aria-label="Zoom out">
            <Minus className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-lg font-medium tabular-nums leading-tight">{value}</p>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
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
