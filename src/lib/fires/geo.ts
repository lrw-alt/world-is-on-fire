import type { FireIncident } from "./types";

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestIncident(incidents: FireIncident[], lat: number, lng: number, maxKm: number) {
  let best: FireIncident | null = null;
  let bestKm = maxKm;
  for (const incident of incidents) {
    const km = haversineKm(lat, lng, incident.lat, incident.lng);
    if (km < bestKm) {
      best = incident;
      bestKm = km;
    }
  }
  return best ? { incident: best, km: bestKm } : null;
}

export type Cluster<T> = {
  lat: number;
  lng: number;
  count: number;
  items: T[];
};

export function gridCluster<T extends { lat: number; lng: number }>(
  points: T[],
  cellDeg: number,
): Cluster<T>[] {
  if (cellDeg <= 0) {
    return points.map((p) => ({ lat: p.lat, lng: p.lng, count: 1, items: [p] }));
  }
  const buckets = new Map<string, Cluster<T>>();
  for (const p of points) {
    const lat = Math.round(p.lat / cellDeg) * cellDeg;
    const lng = Math.round(p.lng / cellDeg) * cellDeg;
    const key = `${lat}:${lng}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.items.push(p);
      existing.count += 1;
      existing.lat += (p.lat - existing.lat) / existing.count;
      existing.lng += (p.lng - existing.lng) / existing.count;
    } else {
      buckets.set(key, { lat: p.lat, lng: p.lng, count: 1, items: [p] });
    }
  }
  return [...buckets.values()];
}

export function cellSizeForZoom(zoom: number) {
  if (zoom <= 2) return 8;
  if (zoom <= 3) return 5;
  if (zoom <= 4) return 2.4;
  if (zoom <= 5) return 1.1;
  if (zoom <= 6) return 0.45;
  return 0;
}

export function isIncidentActiveOn(incident: FireIncident, isoDay: string) {
  const day = isoDay.slice(0, 10);
  const started = incident.started.slice(0, 10);
  if (started > day) return false;
  if (!incident.closed) return true;
  return incident.closed.slice(0, 10) >= day;
}
