import { create } from "zustand";
import { ALERTS, ROOMS, STAYS } from "./data";
import type { RangeId, RoomStatus, StayStatus, ViewId } from "./types";

type DashboardState = {
  view: ViewId;
  range: RangeId;
  propertyId: string;
  query: string;
  roomStatus: Record<string, RoomStatus>;
  stayStatus: Record<string, StayStatus>;
  dismissedAlerts: string[];
  selectedPropertyId: string | null;
  selectedStayId: string | null;
  occupancyNudge: number;
  setView: (view: ViewId) => void;
  setRange: (range: RangeId) => void;
  setPropertyId: (id: string) => void;
  setQuery: (query: string) => void;
  cycleRoom: (roomId: string) => void;
  setStayStatus: (id: string, status: StayStatus) => void;
  dismissAlert: (id: string) => void;
  restoreAlerts: () => void;
  selectProperty: (id: string | null) => void;
  selectStay: (id: string | null) => void;
  tickOccupancy: () => void;
};

const NEXT_STATUS: Record<RoomStatus, RoomStatus> = {
  "vacant-dirty": "in-progress",
  "in-progress": "vacant-clean",
  "vacant-clean": "inspected",
  inspected: "occupied",
  occupied: "vacant-dirty",
  ooo: "vacant-dirty",
};

export const useDashboard = create<DashboardState>((set) => ({
  view: "overview",
  range: "today",
  propertyId: "all",
  query: "",
  roomStatus: {},
  stayStatus: {},
  dismissedAlerts: [],
  selectedPropertyId: null,
  selectedStayId: null,
  occupancyNudge: 0,
  setView: (view) => set({ view }),
  setRange: (range) => set({ range }),
  setPropertyId: (propertyId) => set({ propertyId }),
  setQuery: (query) => set({ query }),
  cycleRoom: (roomId) =>
    set((state) => {
      const current =
        state.roomStatus[roomId] ?? ROOMS.find((r) => r.id === roomId)?.status ?? "vacant-clean";
      return { roomStatus: { ...state.roomStatus, [roomId]: NEXT_STATUS[current] } };
    }),
  setStayStatus: (id, status) =>
    set((state) => ({ stayStatus: { ...state.stayStatus, [id]: status } })),
  dismissAlert: (id) =>
    set((state) => ({
      dismissedAlerts: state.dismissedAlerts.includes(id)
        ? state.dismissedAlerts
        : [...state.dismissedAlerts, id],
    })),
  restoreAlerts: () => set({ dismissedAlerts: [] }),
  selectProperty: (selectedPropertyId) => set({ selectedPropertyId }),
  selectStay: (selectedStayId) => set({ selectedStayId }),
  tickOccupancy: () =>
    set((state) => ({
      occupancyNudge: Math.max(-0.6, Math.min(0.6, state.occupancyNudge + (Math.random() - 0.5) * 0.12)),
    })),
}));

export function resolveRooms(overrides: Record<string, RoomStatus>) {
  return ROOMS.map((room) =>
    overrides[room.id] ? { ...room, status: overrides[room.id]! } : room,
  );
}

export function resolveStays(overrides: Record<string, StayStatus>) {
  return STAYS.map((stay) =>
    overrides[stay.id] ? { ...stay, status: overrides[stay.id]! } : stay,
  );
}

export function resolveAlerts(dismissed: string[]) {
  return ALERTS.filter((alert) => !dismissed.includes(alert.id));
}
