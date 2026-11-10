import { NextResponse } from "next/server";
import { getPayPalCredentials, PayPalConfigError } from "@/lib/paypal";

export const dynamic = "force-dynamic";

/**
 * Public client-side PayPal configuration provider.
 * Dynamically serves the active PayPal Client ID and Environment Mode from server configuration.
 * Cache-Control: no-store ensures instant Sandbox -> Live switching with zero stale CDN keys.
 */
export async function GET() {
  try {
    const creds = getPayPalCredentials({ requireSecret: false });
    return NextResponse.json(
      {
        clientId: creds.clientId,
        mode: creds.mode,
        currency: "USD",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    const status = err instanceof PayPalConfigError ? err.status : 503;
    console.error("[PayPal Config] Configuration error:", err?.message || err);
    return NextResponse.json(
      { error: "Payment gateway is not configured. Contact support." },
      {
        status,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }
}
