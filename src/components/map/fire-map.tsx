import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cellSizeForZoom, gridCluster } from "@/lib/fires/geo";
import { formatAcres, relativeHours } from "@/lib/fires/format";
import type { FireIncident, ThermalHotspot } from "@/lib/fires/types";

export type MapView = { lat: number; lng: number; zoom: number };

export type FireMapProps = {
  incidents: FireIncident[];
  hotspots: ThermalHotspot[];
  selectedId: string | null;
  showHotspots: boolean;
  showIncidents: boolean;
  basemap: "dark" | "satellite";
  satelliteDay: string;
  flyTo: MapView | null;
  onSelectIncident: (incident: FireIncident) => void;
  onSelectHotspot: (hotspot: ThermalHotspot) => void;
  onViewChange: (view: MapView) => void;
};

let cachedPaints: ReturnType<typeof computePaints> | null = null;

function computePaints() {
  const getVar = (name: string, fallback: string) => {
    if (typeof document === "undefined") return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  return {
    ember: getVar("--color-ember", "#e85d04"),
    hot: getVar("--color-ember-hot", "#ff8a3d"),
    dim: getVar("--color-ember-dim", "#a33f08"),
    fg: getVar("--color-foreground", "#f4ebe3"),
    bg: getVar("--color-card", "#1c1714"),
    muted: getVar("--color-muted-foreground", "#9c9086"),
  };
}

function paints() {
  if (!cachedPaints && typeof document !== "undefined") {
    cachedPaints = computePaints();
  }
  return cachedPaints || {
    ember: "#e85d04",
    hot: "#ff8a3d",
    dim: "#a33f08",
    fg: "#f4ebe3",
    bg: "#1c1714",
    muted: "#9c9086",
  };
}

function HotspotLayer({
  hotspots,
  enabled,
  onSelect,
}: {
  hotspots: ThermalHotspot[];
  enabled: boolean;
  onSelect: (h: ThermalHotspot) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    const c = paints();
    const renderer = L.canvas({ padding: 0.5 });
    const group = L.layerGroup().addTo(map);
    for (const p of hotspots) {
      const r = p.frp > 400 ? 6 : p.frp > 120 ? 4.2 : p.frp > 30 ? 3 : 2;
      const color = p.frp > 250 ? c.hot : p.frp > 40 ? c.ember : c.dim;
      const marker = L.circleMarker([p.lat, p.lng], {
        renderer,
        radius: r,
        color,
        fillColor: color,
        fillOpacity: p.frp > 80 ? 0.85 : 0.55,
        weight: 0,
        opacity: 1,
      });
      marker.bindTooltip(
        `${Math.round(p.frp)} MW · ${relativeHours(p.hoursOld)} · ${p.confidence}`,
        { className: "ember-tip", direction: "top", opacity: 1 },
      );
      marker.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        onSelect(p);
      });
      marker.addTo(group);
    }
    return () => {
      map.removeLayer(group);
    };
  }, [map, hotspots, enabled, onSelect]);
  return null;
}

function IncidentLayer({
  incidents,
  selectedId,
  enabled,
  onSelect,
}: {
  incidents: FireIncident[];
  selectedId: string | null;
  enabled: boolean;
  onSelect: (incident: FireIncident) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });
  const cell = cellSizeForZoom(zoom);

  const clusters = useMemo(
    () => (enabled ? gridCluster(incidents, cell) : []),
    [incidents, cell, enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    const c = paints();
    const renderer = L.canvas({ padding: 0.4 });
    const group = L.layerGroup().addTo(map);

    for (const cluster of clusters) {
      if (cluster.count > 1 && cell > 0) {
        const size = Math.min(46, 24 + Math.log2(cluster.count) * 6);
        const icon = L.divIcon({
          className: "",
          iconSize: [size, size],
          html: `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:999px;background:color-mix(in oklab, ${c.ember} 88%, #000);border:1.5px solid color-mix(in oklab, ${c.hot} 80%, #fff 20%);box-shadow:0 0 14px color-mix(in oklab, ${c.ember} 60%, transparent);display:flex;align-items:center;justify-content:center;">
              <span style="font-family:Outfit,sans-serif;font-weight:700;font-size:${size > 36 ? '12px' : '11px'};color:${c.fg};letter-spacing:-0.02em;">${cluster.count}</span>
            </div>
            <div style="position:absolute;inset:-4px;border-radius:999px;border:1px dashed color-mix(in oklab, ${c.hot} 40%, transparent);pointer-events:none;"></div>
          </div>`,
        });
        const m = L.marker([cluster.lat, cluster.lng], { icon, zIndexOffset: 400 });
        m.on("click", (ev) => {
          L.DomEvent.stopPropagation(ev);
          map.setView([cluster.lat, cluster.lng], Math.min(13, map.getZoom() + 2));
        });
        m.addTo(group);
        continue;
      }
      const incident = cluster.items[0];
      const selected = incident.id === selectedId;
      if (selected) continue;
      const marker = L.circleMarker([incident.lat, incident.lng], {
        renderer,
        radius: incident.acres && incident.acres > 5000 ? 7.5 : 5.5,
        color: "#ffffff",
        fillColor: c.ember,
        fillOpacity: 0.95,
        weight: 1.5,
      });
      marker.bindTooltip(
        `<div style="display:flex;flex-direction:column;gap:2px;">
          <div style="font-weight:600;color:${c.fg};">${incident.title}</div>
          <div style="font-size:11px;color:${c.muted};">${formatAcres(incident.acres)} · ${incident.closed ? 'Contained' : 'Active'}</div>
        </div>`,
        {
          className: "ember-tip",
          direction: "top",
          opacity: 1,
        },
      );
      marker.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        onSelect(incident);
      });
      marker.addTo(group);
    }

    const selected = incidents.find((i) => i.id === selectedId);
    if (selected) {
      const icon = L.divIcon({
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:999px;border:1.5px solid ${c.hot};box-shadow:0 0 16px ${c.ember};animation:ember-ring 2s ease-out infinite;"></div>
          <div style="position:absolute;inset:3px;border-radius:999px;border:1px dashed color-mix(in oklab, ${c.hot} 80%, white);opacity:0.8;"></div>
          <div style="width:10px;height:10px;border-radius:999px;background:${c.hot};box-shadow:0 0 12px ${c.ember};border:1.5px solid #fff;"></div>
          <div style="position:absolute;top:-4px;left:13px;width:2px;height:5px;background:${c.hot};"></div>
          <div style="position:absolute;bottom:-4px;left:13px;width:2px;height:5px;background:${c.hot};"></div>
          <div style="position:absolute;left:-4px;top:13px;width:5px;height:2px;background:${c.hot};"></div>
          <div style="position:absolute;right:-4px;top:13px;width:5px;height:2px;background:${c.hot};"></div>
        </div>`,
      });
      const m = L.marker([selected.lat, selected.lng], { icon, zIndexOffset: 900 });
      m.bindTooltip(
        `<div style="font-weight:600;color:${c.fg};font-size:12px;">🔥 ${selected.title}</div>`,
        { className: "ember-tip", direction: "top", opacity: 1, permanent: true },
      );
      m.on("click", () => onSelect(selected));
      m.addTo(group);
    }

    return () => {
      map.removeLayer(group);
    };
  }, [map, clusters, incidents, selectedId, enabled, onSelect, cell]);

  return null;
}

function MapEvents({
  flyTo,
  onViewChange,
}: {
  flyTo: MapView | null;
  onViewChange: (view: MapView) => void;
}) {
  const map = useMap();
  const lastFly = useRef<string>("");

  useMapEvents({
    moveend() {
      const c = map.getCenter();
      onViewChange({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    },
    zoomend() {
      const c = map.getCenter();
      onViewChange({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    },
  });

  useEffect(() => {
    const c = map.getCenter();
    onViewChange({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
  }, [map, onViewChange]);

  useEffect(() => {
    if (!flyTo) return;
    const key = `${flyTo.lat}:${flyTo.lng}:${flyTo.zoom}`;
    if (lastFly.current === key) return;
    lastFly.current = key;
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { duration: 0.8 });
  }, [flyTo, map]);

  return null;
}

export function FireMap(props: FireMapProps) {
  const satelliteUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${props.satelliteDay}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

  return (
    <MapContainer
      center={[20, 8]}
      zoom={3}
      minZoom={2}
      maxZoom={13}
      worldCopyJump
      zoomControl={false}
      attributionControl={false}
      preferCanvas
      className="absolute inset-0 z-0 h-full w-full bg-background"
    >
      {props.basemap === "dark" ? (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          attribution="CARTO, OSM"
        />
      ) : (
        <TileLayer
          key={satelliteUrl}
          url={satelliteUrl}
          maxNativeZoom={9}
          attribution="NASA GIBS / VIIRS"
        />
      )}
      <HotspotLayer
        hotspots={props.hotspots}
        enabled={props.showHotspots}
        onSelect={props.onSelectHotspot}
      />
      <IncidentLayer
        incidents={props.incidents}
        selectedId={props.selectedId}
        enabled={props.showIncidents}
        onSelect={props.onSelectIncident}
      />
      <MapEvents flyTo={props.flyTo} onViewChange={props.onViewChange} />
    </MapContainer>
  );
}
