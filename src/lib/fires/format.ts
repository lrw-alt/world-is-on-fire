export function formatAcres(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "Size unknown";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M acres`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k acres`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k acres`;
  return `${Math.round(n)} acres`;
}

export function formatUtc(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }) + " UTC"
  );
}

export function formatDay(iso: string) {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function relativeHours(hoursOld: number) {
  if (hoursOld < 1) return "just now";
  if (hoursOld < 24) return `${Math.max(1, Math.round(hoursOld))}h ago`;
  const days = hoursOld / 24;
  if (days < 2) return "yesterday";
  return `${Math.round(days)}d ago`;
}
