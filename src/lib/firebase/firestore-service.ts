import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from "firebase/firestore";
import { db, auth } from "./config";
import { handleFirestoreError, OperationType } from "./errors";

export interface SavedIncident {
  id: string;
  userId: string;
  incidentTitle: string;
  lat: number;
  lng: number;
  acres?: number;
  notes?: string;
  savedAt: string;
}

export interface CommunityReport {
  id: string;
  incidentId: string;
  userId: string;
  userDisplayName?: string;
  notes: string;
  smokeObserved?: boolean;
  createdAt: string;
}

// ── Saved Incidents (User Bookmarks) ──────────────────────────────────────────

export function subscribeUserSavedIncidents(
  userId: string,
  onData: (incidents: SavedIncident[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const collectionPath = `users/${userId}/savedIncidents`;
  try {
    const colRef = collection(db, "users", userId, "savedIncidents");
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: SavedIncident[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as SavedIncident);
        });
        // Sort newest first
        items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        onData(items);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, collectionPath, auth.currentUser);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath, auth.currentUser);
  }
}

export async function addSavedIncident(
  userId: string,
  incident: Omit<SavedIncident, "userId" | "savedAt"> & { notes?: string }
): Promise<void> {
  const docPath = `users/${userId}/savedIncidents/${incident.id}`;
  try {
    const docRef = doc(db, "users", userId, "savedIncidents", incident.id);
    const data: SavedIncident = {
      ...incident,
      userId,
      savedAt: new Date().toISOString(),
    };
    await setDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath, auth.currentUser);
  }
}

export async function removeSavedIncident(userId: string, incidentId: string): Promise<void> {
  const docPath = `users/${userId}/savedIncidents/${incidentId}`;
  try {
    const docRef = doc(db, "users", userId, "savedIncidents", incidentId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath, auth.currentUser);
  }
}

// ── Community Reports for Incidents ──────────────────────────────────────────

export function subscribeIncidentReports(
  incidentId: string,
  onData: (reports: CommunityReport[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const cleanId = incidentId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const collectionPath = `incidents/${cleanId}/reports`;
  try {
    const colRef = collection(db, "incidents", cleanId, "reports");
    const q = query(colRef, orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: CommunityReport[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as CommunityReport);
        });
        onData(items);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, collectionPath, auth.currentUser);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath, auth.currentUser);
  }
}

export async function addCommunityReport(
  incidentId: string,
  report: {
    notes: string;
    smokeObserved?: boolean;
  }
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("Must be signed in to submit a field report");
  }
  const cleanId = incidentId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const docPath = `incidents/${cleanId}/reports/${reportId}`;

  try {
    const docRef = doc(db, "incidents", cleanId, "reports", reportId);
    const data: CommunityReport = {
      id: reportId,
      incidentId: cleanId,
      userId: auth.currentUser.uid,
      userDisplayName: auth.currentUser.displayName || "Field Observer",
      notes: report.notes.slice(0, 1000),
      smokeObserved: !!report.smokeObserved,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath, auth.currentUser);
  }
}
