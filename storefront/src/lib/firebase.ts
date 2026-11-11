import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

import {
  FIREBASE_DEFAULT_AUTH_DOMAIN,
  FIREBASE_PUBLIC_CONFIG,
} from "./firebaseConfig";

const CUSTOM_AUTH_HOSTS = new Set(["vastire.com", "www.vastire.com"]);

/**
 * Use the live custom domain on production so Google OAuth shows Vastire's own domain
 * and keeps auth storage first-party via Next.js `/__/auth/*` rewrites, while keeping
 * `firebaseapp.com` on localhost and Vercel preview deployments.
 */
function resolveAuthDomain(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (CUSTOM_AUTH_HOSTS.has(host)) {
      return host;
    }
  }
  return FIREBASE_DEFAULT_AUTH_DOMAIN;
}

const firebaseConfig = {
  ...FIREBASE_PUBLIC_CONFIG,
  authDomain: resolveAuthDomain(),
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Force account picker prompt so returning users can select or switch accounts
googleProvider.setCustomParameters({
  prompt: "select_account",
});

let isAuthInProgress = false;

export async function loginWithGoogle(): Promise<FirebaseUser | null> {
  // Prevent duplicate concurrent popup requests that clobber OAuth state in sessionStorage
  if (isAuthInProgress) {
    console.warn("[Firebase Auth] Sign-in already in progress.");
    return null;
  }

  isAuthInProgress = true;
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err: any) {
    if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
      return null;
    }
    console.error("Google login error:", err);
    throw err;
  } finally {
    isAuthInProgress = false;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { FirebaseUser };
