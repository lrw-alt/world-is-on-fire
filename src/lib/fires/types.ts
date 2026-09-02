export type TimeMode = "live" | "48h" | "7d" | "history";

export type SourceLink = {
  id: string;
  url: string;
};

export type FireIncident = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  acres: number | null;
  started: string;
  closed: string | null;
  description: string | null;
  sources: SourceLink[];
};

export type ThermalHotspot = {
  lat: number;
  lng: number;
  frp: number;
  confidence: string;
  hoursOld: number;
  acquired: string;
  dayNight: string;
};

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  outlet: string;
  published: string | null;
  summary: string | null;
};

export type ClaimStatus = "supported" | "contradicted" | "unverified";

export type FactClaim = {
  claim: string;
  status: ClaimStatus;
  evidence: string;
};

export type XPost = {
  handle: string;
  text: string;
  url: string;
  date?: string;
};

export type FactVerdict = "corroborated" | "partial" | "disputed" | "unverified";

export type FactCheck = {
  verdict: FactVerdict;
  confidence: number;
  summary: string;
  claims: FactClaim[];
  news: { title: string; url: string; outlet: string }[];
  xPosts: XPost[];
  conflicts: string[];
  checkedAt: string;
};

export type PlaceHit = {
  label: string;
  lat: number;
  lng: number;
};

export type AtlasPayload = {
  incidents: FireIncident[];
  fetchedAt: string;
};

export type HotspotPayload = {
  points: ThermalHotspot[];
  fetchedAt: string;
  windowHours: number;
};
