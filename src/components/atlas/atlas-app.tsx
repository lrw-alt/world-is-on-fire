import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Inspector } from "@/components/atlas/inspector";
import { Hud } from "@/components/atlas/hud";
import type { FireMapProps, MapView } from "@/components/map/fire-map";
import type { SavedIncident } from "@/lib/firebase/firestore-service";
import { isIncidentActiveOn, nearestIncident } from "@/lib/fires/geo";
import { addDaysISO, todayISO } from "@/lib/fires/format";
import {
  crossCheckIncident,
  getHotspots,
  getIncidents,
  getNews,
  searchPlace,
} from "@/lib/fires/server";
import type { FactCheck, FireIncident, ThermalHotspot, TimeMode } from "@/lib/fires/types";
import { cn } from "@/lib/utils";

const FACT_STORE = "ember-atlas-factchecks-v1";

function readFacts(): Record<string, FactCheck> {
  try {
    return JSON.parse(localStorage.getItem(FACT_STORE) ?? "{}") as Record<string, FactCheck>;
  } catch {
    return {};
  }
}

function writeFacts(map: Record<string, FactCheck>) {
  const entries = Object.entries(map).slice(-30);
  localStorage.setItem(FACT_STORE, JSON.stringify(Object.fromEntries(entries)));
}

function hoursFor(mode: TimeMode) {
  if (mode === "live") return 24;
  if (mode === "48h") return 48;
  return 168;
}

export function AtlasApp() {
  const [MapEl, setMapEl] = useState<ComponentType<FireMapProps> | null>(null);
  const [mode, setMode] = useState<TimeMode>("live");
  const maxDay = todayISO();
  const minDay = addDaysISO(maxDay, -365);
  const [historyDay, setHistoryDay] = useState(addDaysISO(maxDay, -1));
  const [query, setQuery] = useState("");
  const [basemap, setBasemap] = useState<"dark" | "satellite">("dark");
  const [showHotspots, setShowHotspots] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [includeSmall, setIncludeSmall] = useState(false);
  const [selected, setSelected] = useState<FireIncident | null>(null);
  const [hotspot, setHotspot] = useState<ThermalHotspot | null>(null);
  const [flyTo, setFlyTo] = useState<MapView | null>(null);
  const [view, setView] = useState<MapView>({ lat: 20, lng: 8, zoom: 3 });
  const [facts, setFacts] = useState<Record<string, FactCheck>>({});
  const [checkError, setCheckError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    void import("@/components/map/fire-map").then((m) => setMapEl(() => m.FireMap));
    setFacts(readFacts());
  }, []);

  const incidentsQ = useQuery({
    queryKey: ["incidents"],
    queryFn: () => getIncidents(),
    staleTime: 5 * 60 * 1000,
  });

  const hotspotHours = hoursFor(mode);
  const wantHotspots = mode !== "history" || Date.parse(`${historyDay}T00:00:00Z`) > Date.now() - 8 * 86400000;

  const hotspotsQ = useQuery({
    queryKey: ["hotspots", hotspotHours],
    queryFn: () => getHotspots({ data: { hours: hotspotHours } }),
    enabled: wantHotspots,
    staleTime: 5 * 60 * 1000,
  });

  const visibleIncidents = useMemo(() => {
    const allIncidents = incidentsQ.data?.incidents ?? [];
    const day = mode === "history" ? historyDay : maxDay;
    return allIncidents.filter((inc) => {
      if (mode === "history") return isIncidentActiveOn(inc, day);
      if (mode === "live") return !inc.closed;
      if (!includeSmall && inc.acres != null && inc.acres < 100) return false;
      if (mode === "48h") {
        const age = Date.now() - Date.parse(inc.started);
        return !inc.closed || age < 48 * 3600000;
      }
      return true;
    }).filter((inc) => includeSmall || inc.acres == null || inc.acres >= 100);
  }, [incidentsQ.data, includeSmall, mode, historyDay, maxDay]);

  const visibleHotspots = useMemo(() => {
    const pts = hotspotsQ.data?.points ?? [];
    if (mode !== "history") return pts;
    return pts.filter((p) => p.acquired.slice(0, 10) === historyDay);
  }, [hotspotsQ.data, mode, historyDay]);

  const acres = useMemo(
    () => visibleIncidents.reduce((sum, i) => sum + (i.acres ?? 0), 0),
    [visibleIncidents],
  );

  const newsQuery = selected
    ? `${selected.title} wildfire OR bushfire`
    : hotspot
      ? `wildfire ${hotspot.lat.toFixed(1)} ${hotspot.lng.toFixed(1)}`
      : "wildfire OR bushfire OR forest fire when:7d";

  const newsQ = useQuery({
    queryKey: ["news", newsQuery],
    queryFn: () => getNews({ data: { query: newsQuery } }),
    staleTime: 5 * 60 * 1000,
  });

  const factKey = selected?.id ?? (hotspot ? `hs:${hotspot.lat.toFixed(2)},${hotspot.lng.toFixed(2)}` : "");
  const currentCheck = factKey ? facts[factKey] ?? null : null;

  const checkMut = useMutation({
    mutationFn: async () => {
      const target = selected;
      const hs = hotspot;
      if (!target && !hs) throw new Error("Select a fire first");
      const headlines = (newsQ.data?.items ?? []).slice(0, 8).map((n) => n.title);
      return crossCheckIncident({
        data: {
          title: target?.title ?? `Thermal anomaly ${hs!.lat.toFixed(2)}, ${hs!.lng.toFixed(2)}`,
          lat: target?.lat ?? hs!.lat,
          lng: target?.lng ?? hs!.lng,
          acres: target?.acres ?? null,
          started: target?.started ?? hs!.acquired,
          closed: target?.closed ?? null,
          description: target?.description ?? "VIIRS thermal detection; not a confirmed wildfire.",
          sources: target?.sources ?? [],
          headlines,
        },
      });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        setCheckError(res.error);
        return;
      }
      setCheckError(null);
      if (!factKey) return;
      setFacts((prev) => {
        const next = { ...prev, [factKey]: res.check };
        writeFacts(next);
        return next;
      });
    },
    onError: (err: Error) => setCheckError(err.message),
  });

  const onSelectIncident = useCallback((incident: FireIncident) => {
    setSelected(incident);
    setHotspot(null);
    setPanelOpen(true);
    setCheckError(null);
  }, []);

  const onSelectHotspot = useCallback(
    (h: ThermalHotspot) => {
      const near = nearestIncident(visibleIncidents, h.lat, h.lng, 40);
      if (near) {
        setSelected(near.incident);
        setHotspot(null);
      } else {
        setSelected(null);
        setHotspot(h);
      }
      setPanelOpen(true);
      setCheckError(null);
    },
    [visibleIncidents],
  );

  const onSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) return;
    const named = visibleIncidents.find((i) => i.title.toLowerCase().includes(q.toLowerCase()));
    if (named) {
      onSelectIncident(named);
      setFlyTo({ lat: named.lat, lng: named.lng, zoom: 7 });
      return;
    }
    try {
      const res = await searchPlace({ data: { q } });
      const hit = res.hits[0];
      if (hit) setFlyTo({ lat: hit.lat, lng: hit.lng, zoom: 6 });
    } catch {
      /* ignore geocode misses */
    }
  }, [query, visibleIncidents, onSelectIncident]);

  const onLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setFlyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 7 });
    });
  }, []);

  const onSelectSaved = useCallback(
    (saved: SavedIncident) => {
      setFlyTo({ lat: saved.lat, lng: saved.lng, zoom: 8 });
      const match = (incidentsQ.data?.incidents ?? []).find((i: FireIncident) => i.id === saved.id);
      if (match) {
        setSelected(match);
      } else {
        setSelected({
          id: saved.id,
          title: saved.incidentTitle,
          lat: saved.lat,
          lng: saved.lng,
          started: saved.savedAt,
          acres: saved.acres ?? null,
          closed: null,
          description: saved.notes ?? null,
          sources: [],
        });
      }
      setHotspot(null);
      setPanelOpen(true);
    },
    [incidentsQ.data?.incidents],
  );

  const satelliteDay = mode === "history" ? historyDay : addDaysISO(maxDay, -1);

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      {MapEl ? (
        <MapEl
          incidents={visibleIncidents}
          hotspots={showHotspots && wantHotspots ? visibleHotspots : []}
          selectedId={selected?.id ?? null}
          showHotspots={showHotspots && wantHotspots}
          showIncidents={showIncidents}
          basemap={basemap}
          satelliteDay={satelliteDay}
          flyTo={flyTo}
          onSelectIncident={onSelectIncident}
          onSelectHotspot={onSelectHotspot}
          onViewChange={setView}
        />
      ) : (
        <div className="absolute inset-0 bg-background" />
      )}

      <div className="atlas-vignette" />

      <Hud
        mode={mode}
        historyDay={historyDay}
        minDay={minDay}
        maxDay={maxDay}
        query={query}
        basemap={basemap}
        showHotspots={showHotspots}
        showIncidents={showIncidents}
        includeSmall={includeSmall}
        incidentCount={visibleIncidents.length}
        hotspotCount={visibleHotspots.length}
        acres={acres}
        onMode={setMode}
        onHistoryDay={setHistoryDay}
        onQuery={setQuery}
        onSearch={() => void onSearch()}
        onBasemap={setBasemap}
        onToggleHotspots={() => setShowHotspots((v) => !v)}
        onToggleIncidents={() => setShowIncidents((v) => !v)}
        onToggleSmall={() => setIncludeSmall((v) => !v)}
        onZoomIn={() => setFlyTo({ ...view, zoom: Math.min(13, view.zoom + 1) })}
        onZoomOut={() => setFlyTo({ ...view, zoom: Math.max(2, view.zoom - 1) })}
        onLocate={onLocate}
        onFlyToRegion={(region) => setFlyTo(region)}
        onSelectSaved={onSelectSaved}
      />

      <div
        className={cn(
          "pointer-events-none absolute z-30 inset-x-3 bottom-[max(5.5rem,env(safe-area-inset-bottom))]",
          "md:inset-auto md:top-24 md:right-3 md:bottom-24 md:w-[380px]",
        )}
      >
        {panelOpen ? (
          <Inspector
            incident={selected}
            hotspot={hotspot}
            news={newsQ.data?.items ?? []}
            newsLoading={newsQ.isLoading}
            check={currentCheck}
            checkLoading={checkMut.isPending}
            checkError={checkError}
            onCrossCheck={() => checkMut.mutate()}
            onClose={() => {
              setPanelOpen(false);
              setSelected(null);
              setHotspot(null);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="panel pointer-events-auto ml-auto hidden h-11 px-4 text-sm font-medium md:block"
          >
            Open briefing
          </button>
        )}
      </div>

      {incidentsQ.isLoading ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="shimmer-text font-display text-2xl italic">Acquiring satellite feed</p>
        </div>
      ) : null}

      {incidentsQ.isError ? (
        <div className="absolute bottom-28 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-border bg-card px-4 py-2 text-sm">
          Could not load NASA EONET. Retrying from cache if available.
        </div>
      ) : null}
    </div>
  );
}
