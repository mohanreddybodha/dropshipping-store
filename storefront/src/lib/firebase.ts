import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  projectId: "domesticlab-us-store",
  appId: "1:880784030676:web:65e254e020faddbcf97441",
  storageBucket: "domesticlab-us-store.firebasestorage.app",
  apiKey: "AIzaSyAIqT64qFQ9rKSsEb0_oRO0jYWKspmS8Qo",
  authDomain: "domesticlab-us-store.firebaseapp.com",
  messagingSenderId: "880784030676",
  projectNumber: "880784030676",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err: any) {
    if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
      return null;
    }
    console.error("Google login error:", err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { FirebaseUser };
