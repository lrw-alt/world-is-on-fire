import type {
  AlertItem,
  DayPoint,
  Property,
  RangeId,
  Room,
  RoomStatus,
  RoomType,
  Stay,
} from "./types";

export const AS_OF_LABEL = "Tuesday, 1 Sep";
export const AS_OF_ISO = "2026-09-01";

export const PROPERTIES: Property[] = [
  {
    id: "marlowe",
    name: "The Marlowe",
    city: "Portland",
    region: "Pearl District",
    keys: 48,
    opened: 2019,
    manager: "Elena Voss",
    adr: 312,
  },
  {
    id: "cedar",
    name: "Cedar House",
    city: "Hood River",
    region: "Columbia Gorge",
    keys: 22,
    opened: 2016,
    manager: "Jonah Hale",
    adr: 428,
  },
  {
    id: "solace",
    name: "Solace",
    city: "Dundee",
    region: "Willamette Valley",
    keys: 36,
    opened: 2021,
    manager: "Priya Raman",
    adr: 365,
  },
  {
    id: "harbor",
    name: "Harbor Court",
    city: "Astoria",
    region: "Pacific Coast",
    keys: 64,
    opened: 2014,
    manager: "Marcus Chen",
    adr: 248,
  },
];

const OCCUPANCY: Record<string, number> = {
  marlowe: 0.88,
  cedar: 0.94,
  solace: 0.81,
  harbor: 0.76,
};

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roomType(index: number): RoomType {
  if (index % 11 === 0) return "Suite";
  if (index % 5 === 0) return "Twin";
  if (index % 2 === 0) return "King";
  return "Queen";
}

function buildRooms(): Room[] {
  const rooms: Room[] = [];
  for (const property of PROPERTIES) {
    const rand = mulberry32(property.keys * 97 + property.opened);
    const occ = OCCUPANCY[property.id] ?? 0.8;
    const names = GUEST_POOL[property.id] ?? GUEST_POOL.marlowe;
    let guestCursor = 0;
    for (let i = 0; i < property.keys; i += 1) {
      const floor = Math.floor(i / 10) + 1;
      const num = (i % 10) + 1;
      const number = `${floor}${String(num).padStart(2, "0")}`;
      const roll = rand();
      let status: RoomStatus;
      if (roll < occ * 0.92) status = "occupied";
      else if (roll < occ) status = "in-progress";
      else if (roll < occ + 0.06) status = "vacant-dirty";
      else if (roll < occ + 0.12) status = "vacant-clean";
      else if (roll < occ + 0.16) status = "inspected";
      else status = "ooo";

      const guestName =
        status === "occupied" ? names[guestCursor++ % names.length] : undefined;
      rooms.push({
        id: `${property.id}-${number}`,
        propertyId: property.id,
        number,
        type: roomType(i),
        floor,
        status,
        guestName,
      });
    }
  }
  return rooms;
}

const GUEST_POOL: Record<string, string[]> = {
  marlowe: [
    "A. Okonkwo",
    "S. Lindgren",
    "M. Cho",
    "R. Patel",
    "H. Adler",
    "C. Nguyen",
    "L. Moreau",
    "J. Whitaker",
    "N. Ibarra",
    "T. Berg",
    "K. Saito",
    "D. Flores",
    "E. Quinn",
    "P. Rahman",
    "B. Ellis",
    "Y. Kovacs",
    "F. Duarte",
    "G. Singh",
    "I. Walsh",
    "O. Bennett",
  ],
  cedar: [
    "M. Harlan",
    "J. Peck",
    "A. Solis",
    "R. Keene",
    "S. Vogel",
    "C. Ames",
    "L. Ortiz",
    "N. Brooks",
    "T. Inoue",
    "K. Dahl",
  ],
  solace: [
    "P. Laurent",
    "E. Marsh",
    "V. Shah",
    "H. Cole",
    "D. Rossi",
    "A. Kim",
    "S. Hale",
    "M. Costa",
    "J. Reed",
    "L. Park",
    "C. Bishop",
    "N. Grant",
  ],
  harbor: [
    "R. MacLeod",
    "T. Jensen",
    "A. Cruz",
    "M. Okafor",
    "S. Byrne",
    "K. Novak",
    "J. Hale",
    "L. Chen",
    "P. Doyle",
    "E. Frost",
    "C. Alvarez",
    "N. Bergstrom",
    "D. Wu",
    "H. Lang",
    "G. Patel",
    "I. Moore",
    "O. Silva",
    "B. Knight",
    "Y. Tanaka",
    "F. Hughes",
  ],
};

export const ROOMS: Room[] = buildRooms();

export const STAYS: Stay[] = [
  {
    id: "s1",
    guest: "Amara Okonkwo",
    propertyId: "marlowe",
    room: "412",
    nights: 3,
    party: 2,
    rate: 328,
    status: "expected",
    time: "14:00",
    vip: true,
    note: "Late arrival · king extra pillows",
  },
  {
    id: "s2",
    guest: "Soren Lindgren",
    propertyId: "marlowe",
    room: "305",
    nights: 2,
    party: 1,
    rate: 298,
    status: "expected",
    time: "15:30",
    vip: false,
  },
  {
    id: "s3",
    guest: "Mina Cho",
    propertyId: "cedar",
    room: "208",
    nights: 4,
    party: 2,
    rate: 462,
    status: "expected",
    time: "16:00",
    vip: true,
    note: "Anniversary · champagne in room",
  },
  {
    id: "s4",
    guest: "Ravi Patel",
    propertyId: "solace",
    room: "110",
    nights: 2,
    party: 2,
    rate: 355,
    status: "expected",
    time: "14:30",
    vip: false,
  },
  {
    id: "s5",
    guest: "Helen Adler",
    propertyId: "harbor",
    room: "512",
    nights: 1,
    party: 1,
    rate: 236,
    status: "expected",
    time: "17:00",
    vip: false,
  },
  {
    id: "s6",
    guest: "Carlos Nguyen",
    propertyId: "marlowe",
    room: "218",
    nights: 5,
    party: 3,
    rate: 348,
    status: "in-house",
    time: "In house",
    vip: false,
  },
  {
    id: "s7",
    guest: "Leah Moreau",
    propertyId: "solace",
    room: "204",
    nights: 3,
    party: 2,
    rate: 410,
    status: "in-house",
    time: "In house",
    vip: true,
    note: "Wine club member",
  },
  {
    id: "s8",
    guest: "Jonah Whitaker",
    propertyId: "cedar",
    room: "104",
    nights: 2,
    party: 2,
    rate: 428,
    status: "in-house",
    time: "In house",
    vip: false,
  },
  {
    id: "s9",
    guest: "Nadia Ibarra",
    propertyId: "harbor",
    room: "306",
    nights: 4,
    party: 2,
    rate: 268,
    status: "in-house",
    time: "In house",
    vip: false,
  },
  {
    id: "s10",
    guest: "Theo Berg",
    propertyId: "marlowe",
    room: "401",
    nights: 1,
    party: 1,
    rate: 312,
    status: "due-out",
    time: "11:00",
    vip: false,
  },
  {
    id: "s11",
    guest: "Keiko Saito",
    propertyId: "harbor",
    room: "214",
    nights: 3,
    party: 2,
    rate: 248,
    status: "due-out",
    time: "11:00",
    vip: false,
  },
  {
    id: "s12",
    guest: "Diego Flores",
    propertyId: "solace",
    room: "318",
    nights: 2,
    party: 2,
    rate: 365,
    status: "due-out",
    time: "12:00",
    vip: true,
    note: "Request late checkout to 13:00",
  },
  {
    id: "s13",
    guest: "Eva Quinn",
    propertyId: "cedar",
    room: "201",
    nights: 3,
    party: 1,
    rate: 398,
    status: "due-out",
    time: "11:00",
    vip: false,
  },
  {
    id: "s14",
    guest: "Priya Rahman",
    propertyId: "marlowe",
    room: "109",
    nights: 2,
    party: 2,
    rate: 289,
    status: "expected",
    time: "18:30",
    vip: false,
    note: "Airline delay — hold room",
  },
  {
    id: "s15",
    guest: "Bennett Ellis",
    propertyId: "harbor",
    room: "401",
    nights: 2,
    party: 4,
    rate: 312,
    status: "expected",
    time: "15:00",
    vip: false,
  },
];

export const ALERTS: AlertItem[] = [
  {
    id: "a1",
    severity: "critical",
    title: "Elevator 2 out of service",
    detail: "Harbor Court · technician ETA 11:40. Guests on floors 4–6 being walked.",
    propertyId: "harbor",
    time: "08:12",
  },
  {
    id: "a2",
    severity: "warn",
    title: "Late checkout pending",
    detail: "Solace 318 · Flores party asked to hold until 13:00. Housekeeping stacked.",
    propertyId: "solace",
    time: "07:48",
  },
  {
    id: "a3",
    severity: "warn",
    title: "Room 214 maintenance",
    detail: "The Marlowe · HVAC noise reported overnight. Engineering on site.",
    propertyId: "marlowe",
    time: "06:55",
  },
  {
    id: "a4",
    severity: "info",
    title: "VIP arrival this afternoon",
    detail: "Cedar House · Cho, anniversary stay. Champagne and note from GM.",
    propertyId: "cedar",
    time: "07:10",
  },
  {
    id: "a5",
    severity: "info",
    title: "Weekend pace is light",
    detail: "Harbor Court Saturday occupancy tracking 61%. Consider a walk-in rate.",
    propertyId: "harbor",
    time: "Yesterday",
  },
  {
    id: "a6",
    severity: "warn",
    title: "Review reply needed",
    detail: "The Marlowe · 3-star note about slow breakfast. Draft waiting in inbox.",
    propertyId: "marlowe",
    time: "Yesterday",
  },
  {
    id: "a7",
    severity: "info",
    title: "Wine dinner covers",
    detail: "Solace restaurant is 92% booked Friday. Hold two 2-tops for in-house.",
    propertyId: "solace",
    time: "Yesterday",
  },
];

function buildSeries(): Record<string, DayPoint[]> {
  const out: Record<string, DayPoint[]> = { all: [] };
  const end = new Date(`${AS_OF_ISO}T12:00:00`);
  for (const property of PROPERTIES) {
    const rand = mulberry32(property.opened * 13 + property.keys);
    const points: DayPoint[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const dow = d.getDay();
      const weekend = dow === 0 || dow === 6 ? 0.08 : 0;
      const wave = Math.sin((29 - i) / 4.2) * 0.04;
      const occ = Math.min(
        0.98,
        Math.max(0.52, (OCCUPANCY[property.id] ?? 0.8) + weekend + wave + (rand() - 0.5) * 0.06),
      );
      const adr = property.adr * (1 + weekend * 0.7 + (rand() - 0.5) * 0.08);
      const revenue = occ * property.keys * adr;
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const iso = d.toISOString().slice(0, 10);
      points.push({
        iso,
        label,
        occupancy: Math.round(occ * 1000) / 10,
        revenue: Math.round(revenue),
        adr: Math.round(adr),
      });
    }
    out[property.id] = points;
  }
  out.all = (out.marlowe ?? []).map((point, index) => {
    const slice = PROPERTIES.map((p) => out[p.id]?.[index]).filter(Boolean) as DayPoint[];
    const keys = PROPERTIES.reduce((sum, p) => sum + p.keys, 0);
    const revenue = slice.reduce((sum, p) => sum + p.revenue, 0);
    const occWeighted = PROPERTIES.reduce((sum, p, i) => {
      const occ = (slice[i]?.occupancy ?? 0) / 100;
      return sum + occ * p.keys;
    }, 0);
    const roomsSold = PROPERTIES.reduce((sum, p, i) => {
      const occ = (slice[i]?.occupancy ?? 0) / 100;
      return sum + occ * p.keys;
    }, 0);
    return {
      iso: point.iso,
      label: point.label,
      occupancy: Math.round((occWeighted / keys) * 1000) / 10,
      revenue,
      adr: roomsSold > 0 ? Math.round(revenue / roomsSold) : 0,
    };
  });
  return out;
}

export const SERIES = buildSeries();

export function seriesFor(propertyId: string, range: RangeId): DayPoint[] {
  const all = SERIES[propertyId] ?? SERIES.all ?? [];
  if (range === "today") return all.slice(-14);
  if (range === "7d") return all.slice(-7);
  return all;
}

export function propertyById(id: string) {
  return PROPERTIES.find((p) => p.id === id);
}

export const RANGE_OPTIONS: { id: RangeId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

export const STATUS_CYCLE: RoomStatus[] = [
  "vacant-dirty",
  "in-progress",
  "vacant-clean",
  "inspected",
  "occupied",
  "ooo",
];

export const STATUS_LABEL: Record<RoomStatus, string> = {
  occupied: "Occupied",
  "vacant-clean": "Clean",
  "vacant-dirty": "Dirty",
  "in-progress": "Cleaning",
  inspected: "Inspected",
  ooo: "Out of order",
};
