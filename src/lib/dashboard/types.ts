export type ViewId = "overview" | "rooms" | "guests" | "alerts";
export type RangeId = "today" | "7d" | "30d";
export type RoomStatus =
  | "occupied"
  | "vacant-clean"
  | "vacant-dirty"
  | "in-progress"
  | "inspected"
  | "ooo";
export type RoomType = "King" | "Queen" | "Suite" | "Twin";
export type StayStatus = "expected" | "checked-in" | "in-house" | "due-out" | "departed";
export type AlertSeverity = "info" | "warn" | "critical";

export type Property = {
  id: string;
  name: string;
  city: string;
  region: string;
  keys: number;
  opened: number;
  manager: string;
  adr: number;
};

export type Room = {
  id: string;
  propertyId: string;
  number: string;
  type: RoomType;
  floor: number;
  status: RoomStatus;
  guestName?: string;
};

export type Stay = {
  id: string;
  guest: string;
  propertyId: string;
  room: string;
  nights: number;
  party: number;
  rate: number;
  status: StayStatus;
  time: string;
  vip: boolean;
  note?: string;
};

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  propertyId?: string;
  time: string;
};

export type DayPoint = {
  iso: string;
  label: string;
  occupancy: number;
  revenue: number;
  adr: number;
};
