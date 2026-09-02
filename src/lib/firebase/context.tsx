import React, { createContext, useContext, useEffect, useState } from "react";
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
    return () => unsubscribe();
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
    return () => unsubscribe();
  }, [user]);

  const isSaved = (incidentId: string) => {
    const clean = incidentId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return savedIncidents.some((item) => item.id === clean || item.id === incidentId);
  };

  const toggleSaveIncident = async (incident: {
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
  };

  const removeSaved = async (incidentId: string) => {
    if (!user) return;
    const cleanId = incidentId.replace(/[^a-zA-Z0-9_-]/g, "_");
    await removeSavedIncident(user.uid, cleanId);
  };

  const signIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Firebase Google Sign-In error:", err);
    }
  };

  const signOut = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Firebase Sign-Out error:", err);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authLoading,
        savedIncidents,
        isSaved,
        toggleSaveIncident,
        removeSavedIncident: removeSaved,
        signIn,
        signOut,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
}
