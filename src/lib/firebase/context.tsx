import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, logoutUser } from "./config";
import {
  SavedIncident,
  subscribeUserSavedIncidents,
  addSavedIncident,
  removeSavedIncident,
} from "./firestore-service";

interface FirebaseContextType {
  user: User | null;
  authLoading: boolean;
  savedIncidents: SavedIncident[];
  isSaved: (incidentId: string) => boolean;
  toggleSaveIncident: (incident: {
    id: string;
    incidentTitle: string;
    lat: number;
    lng: number;
    acres?: number;
    notes?: string;
  }) => Promise<void>;
  removeSavedIncident: (incidentId: string) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultFirebaseContext: FirebaseContextType = {
  user: null,
  authLoading: false,
  savedIncidents: [],
  isSaved: () => false,
  toggleSaveIncident: async () => {},
  removeSavedIncident: async () => {},
  signIn: async () => {},
  signOut: async () => {},
};

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [savedIncidents, setSavedIncidents] = useState<SavedIncident[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Listen to user's saved incidents only when authenticated
  useEffect(() => {
    if (!user) {
      setSavedIncidents([]);
      return;
    }
    const unsubscribe = subscribeUserSavedIncidents(
      user.uid,
      (data) => setSavedIncidents(data),
      (err) => console.warn("Saved incidents sync error:", err)
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [user]);

  // Fast O(1) set of saved IDs
  const savedIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const item of savedIncidents) {
      set.add(item.id);
    }
    return set;
  }, [savedIncidents]);

  const isSaved = useCallback((incidentId: string) => {
    const clean = incidentId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return savedIdSet.has(clean) || savedIdSet.has(incidentId);
  }, [savedIdSet]);

  const signIn = useCallback(async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Firebase Google Sign-In error:", err);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Firebase Sign-Out error:", err);
    }
  }, []);

  const removeSaved = useCallback(async (incidentId: string) => {
    if (!user) return;
    const cleanId = incidentId.replace(/[^a-zA-Z0-9_-]/g, "_");
    await removeSavedIncident(user.uid, cleanId);
  }, [user]);

  const toggleSaveIncident = useCallback(async (incident: {
    id: string;
    incidentTitle: string;
    lat: number;
    lng: number;
    acres?: number;
    notes?: string;
  }) => {
    if (!user) {
      await signIn();
      return;
    }
    const cleanId = incident.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (isSaved(cleanId) || isSaved(incident.id)) {
      await removeSavedIncident(user.uid, cleanId);
    } else {
      await addSavedIncident(user.uid, {
        id: cleanId,
        incidentTitle: incident.incidentTitle,
        lat: incident.lat,
        lng: incident.lng,
        acres: incident.acres,
        notes: incident.notes || "",
      });
    }
  }, [user, isSaved, signIn]);

  const value = useMemo<FirebaseContextType>(() => ({
    user,
    authLoading,
    savedIncidents,
    isSaved,
    toggleSaveIncident,
    removeSavedIncident: removeSaved,
    signIn,
    signOut,
  }), [user, authLoading, savedIncidents, isSaved, toggleSaveIncident, removeSaved, signIn, signOut]);

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  return context ?? defaultFirebaseContext;
}
