import crypto from "crypto";

export type PayPalMode = "live" | "sandbox";

export class PayPalConfigError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = "PayPalConfigError";
    this.status = status;
  }
}

export class PayPalGatewayError extends Error {
  status: number;
  issue?: string;
  constructor(message: string, status = 502, issue?: string) {
    super(message);
    this.name = "PayPalGatewayError";
    this.status = status;
    this.issue = issue;
  }
}

export interface PayPalCredentials {
  clientId: string;
  secret: string;
  mode: PayPalMode;
  baseUrl: string;
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Normalizes PAYPAL_MODE strictly.
 * Accepts "live" | "production" | "prod" as live mode, "sandbox" | "test" | "" as sandbox.
 * Rejects ambiguous values so live deployments never silently fall back to the wrong endpoint.
 */
export function resolvePayPalMode(rawMode = process.env.PAYPAL_MODE): PayPalMode {
  const normalized = (rawMode || "sandbox").trim().toLowerCase();
  if (normalized === "live" || normalized === "production" || normalized === "prod") {
    return "live";
  }
  if (normalized === "sandbox" || normalized === "test" || normalized === "") {
    return "sandbox";
  }
  throw new PayPalConfigError(
    `Invalid PAYPAL_MODE value "${rawMode}". Expected "live" or "sandbox".`
  );
}

/**
 * Reads authoritative PayPal credentials from server environment variables.
 * Never falls back to hardcoded sandbox credentials.
 */
export function getPayPalCredentials(options?: {
  requireSecret?: boolean;
}): PayPalCredentials {
  const requireSecret = options?.requireSecret ?? true;
  const clientId = (
    process.env.PAYPAL_CLIENT_ID ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    ""
  ).trim();
  const secret = (process.env.PAYPAL_CLIENT_SECRET || "").trim();
  const mode = resolvePayPalMode();

  if (!clientId) {
    throw new PayPalConfigError("PAYPAL_CLIENT_ID is not configured in environment.");
  }
  if (requireSecret && !secret) {
    throw new PayPalConfigError("PAYPAL_CLIENT_SECRET is not configured in environment.");
  }

  const baseUrl =
    mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  return { clientId, secret, mode, baseUrl };
}

/**
 * Retrieves an OAuth2 Bearer token from PayPal with in-memory expiry-aware caching.
 */
export async function getPayPalAccessToken(
  creds: PayPalCredentials
): Promise<string> {
  const cacheKey = `${creds.mode}:${creds.clientId}`;
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);
  if (cached && now < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const authHeader = Buffer.from(`${creds.clientId}:${creds.secret}`).toString(
    "base64"
  );
  const res = await fetch(`${creds.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const hint =
      res.status === 401
        ? ` Check that PAYPAL_MODE ("${creds.mode}") matches your PayPal Client ID & Secret.`
        : "";
    throw new PayPalGatewayError(
      `PayPal OAuth authentication failed (HTTP ${res.status}).${hint}`,
      502
    );
  }

  const data = await res.json();
  if (!data?.access_token) {
    throw new PayPalGatewayError("PayPal OAuth response missing access_token.", 502);
  }

  const expiresInSec = Math.max(300, Number(data.expires_in) || 3600);
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: now + expiresInSec * 1000,
  });

  return data.access_token;
}

/**
 * Generates a collision-resistant internal order reference.
 */
export function generateUniqueOrderNumber(prefix = "ORD-PP"): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export function sanitizeOrderNumber(raw?: string | null): string {
  if (typeof raw === "string") {
    const cleaned = raw.trim().replace(/[^A-Za-z0-9_-]/g, "");
    if (cleaned.length >= 6 && cleaned.length <= 64) {
      return cleaned;
    }
  }
  return generateUniqueOrderNumber();
}

export interface CartCommitmentInput {
  total: number;
  currency?: string;
  items: Array<{ vid: string; quantity: number }>;
}

function buildCanonicalCartPayload(input: CartCommitmentInput): string {
  const normalizedItems = input.items
    .map((it) => `${String(it.vid).trim()}:${Number(it.quantity)}`)
    .sort()
    .join(",");
  const currency = (input.currency || "USD").toUpperCase();
  return `${input.total.toFixed(2)}|${currency}|${normalizedItems}`;
}

function getCommitmentHmacKey(secret: string): Buffer {
  return crypto
    .createHmac("sha256", secret)
    .update("vastire-paypal-commitment-v1")
    .digest();
}

/**
 * Signs an unforgeable cart commitment embedded inside PayPal's purchase_units[0].custom_id
 * (<= 127 ASCII chars). Prevents attackers from paying for Item A then swapping Item B on capture.
 */
export function signPayPalOrderCommitment(
  input: CartCommitmentInput,
  secret: string
): { customId: string; cartHashPrefix: string } {
  const canonical = buildCanonicalCartPayload(input);
  const cartHashHex = crypto
    .createHash("sha256")
    .update(canonical)
    .digest("hex")
    .slice(0, 16);
  const macHex = crypto
    .createHmac("sha256", getCommitmentHmacKey(secret))
    .update(canonical)
    .digest("hex")
    .slice(0, 32);

  return {
    customId: `v1:${cartHashHex}:${macHex}`,
    cartHashPrefix: cartHashHex,
  };
}

/**
 * Verifies a signed PayPal purchase_units[0].custom_id commitment against recalculated cart items.
 */
export function verifyPayPalOrderCommitment(
  customId: string,
  input: CartCommitmentInput,
  secret: string
): boolean {
  if (typeof customId !== "string" || !customId.startsWith("v1:")) {
    return false;
  }
  const parts = customId.split(":");
  if (parts.length !== 3) return false;

  const expected = signPayPalOrderCommitment(input, secret).customId;
  const a = Buffer.from(customId, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Issues an automatic full or partial refund for a PayPal capture ID.
 */
export async function refundPayPalCapture(params: {
  creds: PayPalCredentials;
  accessToken: string;
  captureId: string;
  amount?: number;
  reason?: string;
  idempotencyKey: string;
}): Promise<{ ok: boolean; alreadyRefunded?: boolean; status: number; error?: string }> {
  const bodyPayload: Record<string, any> = {
    note_to_payer:
      params.reason || "Order refunded to original PayPal payment method.",
  };
  if (typeof params.amount === "number" && params.amount > 0) {
    bodyPayload.amount = {
      value: params.amount.toFixed(2),
      currency_code: "USD",
    };
  }

  const refundRes = await fetch(
    `${params.creds.baseUrl}/v2/payments/captures/${encodeURIComponent(
      params.captureId
    )}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": params.idempotencyKey,
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (refundRes.ok) {
    return { ok: true, status: refundRes.status };
  }

  const errBody = await refundRes.json().catch(() => ({}));
  const issue = String(
    errBody?.details?.[0]?.issue || errBody?.message || ""
  ).toUpperCase();

  if (
    issue.includes("CAPTURE_ALREADY_REFUNDED") ||
    issue.includes("ALREADY_REFUNDED") ||
    issue.includes("CAPTURE_FULLY_REFUNDED")
  ) {
    return { ok: true, alreadyRefunded: true, status: refundRes.status };
  }

  return {
    ok: false,
    status: refundRes.status,
    error: issue || `HTTP ${refundRes.status}`,
  };
}
