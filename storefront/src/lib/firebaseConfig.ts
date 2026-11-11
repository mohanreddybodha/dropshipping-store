/**
 * Public Firebase web app configuration for project `domesticlab-us-store`.
 * Web API keys are non-secret project identifiers used by both the browser SDK
 * and Google Identity Toolkit server-side ID token verification.
 */
export const FIREBASE_WEB_API_KEY = "AIzaSyAIqT64qFQ9rKSsEb0_oRO0jYWKspmS8Qo";
export const FIREBASE_DEFAULT_AUTH_DOMAIN = "domesticlab-us-store.firebaseapp.com";

export const FIREBASE_PUBLIC_CONFIG = {
  projectId: "domesticlab-us-store",
  appId: "1:880784030676:web:65e254e020faddbcf97441",
  storageBucket: "domesticlab-us-store.firebasestorage.app",
  apiKey: FIREBASE_WEB_API_KEY,
  messagingSenderId: "880784030676",
  projectNumber: "880784030676",
} as const;
