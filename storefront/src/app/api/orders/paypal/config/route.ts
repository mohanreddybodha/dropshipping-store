import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public client-side PayPal configuration provider.
 * Dynamically serves the active PayPal Client ID and Environment Mode from server configuration.
 * Eliminates the need for hardcoded client IDs or public framework-prefixed environment variables.
 */
export async function GET() {
  const clientId =
    process.env.PAYPAL_CLIENT_ID ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "";

  const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();

  return NextResponse.json(
    {
      clientId,
      mode,
      currency: "USD",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    }
  );
}
