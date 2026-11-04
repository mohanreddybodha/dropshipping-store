import { NextRequest } from "next/server";
import crypto from "crypto";

export async function verifyFirebaseIdToken(
  token: string
): Promise<{ email: string; emailVerified: boolean; uid: string } | null> {
  try {
    const apiKey =
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      "AIzaSyAIqT64qFQ9rKSsEb0_oRO0jYWKspmS8Qo";
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.users?.[0];
    if (!user || !user.email) return null;
    return {
      email: user.email.toLowerCase().trim(),
      emailVerified: Boolean(user.emailVerified),
      uid: user.localId,
    };
  } catch (err) {
    console.error("[Auth] Firebase token verification error:", err);
    return null;
  }
}

export function verifyAdminApiKey(req: NextRequest): boolean {
  const adminKeyHeader = req.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!adminKeyHeader || !expectedKey) return false;
  if (adminKeyHeader.length !== expectedKey.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(adminKeyHeader),
      Buffer.from(expectedKey)
    );
  } catch {
    return false;
  }
}

export async function verifyAdminAuth(
  req: NextRequest
): Promise<{ authorized: boolean; email?: string; reason?: string }> {
  // 1. Timing-safe Admin API Key verification
  if (verifyAdminApiKey(req)) {
    return { authorized: true, email: "admin-api-key" };
  }

  // 2. Cryptographic Firebase ID Token verification
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const verified = await verifyFirebaseIdToken(token);
      if (verified && verified.email) {
        const adminEmailsRaw =
          process.env.ADMIN_EMAILS ||
          process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
          "";
        const allowedEmails = adminEmailsRaw
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        if (allowedEmails.length > 0) {
          if (allowedEmails.includes(verified.email)) {
            return { authorized: true, email: verified.email };
          }
          return { authorized: false, reason: "EMAIL_NOT_IN_ADMIN_LIST" };
        } else {
          // If ADMIN_EMAILS is not yet configured, allow only in dev mode with valid Google token
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[Admin Auth] Warning: ADMIN_EMAILS not set. Permitting verified token user ${verified.email} in dev mode.`
            );
            return { authorized: true, email: verified.email };
          }
          return { authorized: false, reason: "ADMIN_EMAILS_NOT_CONFIGURED" };
        }
      }
    }
  }

  return { authorized: false, reason: "UNAUTHORIZED" };
}

export async function verifyUserAuth(
  req: NextRequest,
  targetEmail?: string
): Promise<{ authorized: boolean; email?: string; reason?: string }> {
  // 1. Admin API key override
  if (verifyAdminApiKey(req)) {
    return { authorized: true, email: "admin-api-key" };
  }

  // 2. Bearer token check
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const verified = await verifyFirebaseIdToken(token);
      if (verified && verified.email) {
        if (targetEmail) {
          const cleanTarget = targetEmail.trim().toLowerCase();
          if (verified.email === cleanTarget) {
            return { authorized: true, email: verified.email };
          }
          return { authorized: false, reason: "EMAIL_MISMATCH" };
        }
        return { authorized: true, email: verified.email };
      }
    }
  }

  return { authorized: false, reason: "UNAUTHORIZED" };
}
