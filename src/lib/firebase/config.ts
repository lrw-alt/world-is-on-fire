import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../../firebase-applet-config.json";

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with explicit databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Test connection at boot as required by Firebase integration guidelines
if (typeof window !== "undefined") {
  (async function testConnection() {
    try {
      await getDocFromServer(doc(db, "test", "connection"));
    } catch (error) {
      if (error instanceof Error && error.message.includes("the client is offline")) {
        console.error("Please check your Firebase configuration.");
      }
    }
  })();
}

export async function loginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function logoutUser() {
  return await fbSignOut(auth);
}
