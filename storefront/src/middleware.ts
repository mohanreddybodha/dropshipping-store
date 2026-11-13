import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { redis, isRedisConfigured } from "./lib/redis";

// Pre-configured sliding-window rate limiters per route category
const paypalCreateLimiter = isRedisConfigured && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, "60 s"),
      analytics: false,
      prefix: "rl:pp_create",
    })
  : null;

const paypalCaptureLimiter = isRedisConfigured && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: false,
      prefix: "rl:pp_capture",
    })
  : null;

const orderLookupLimiter = isRedisConfigured && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(6, "60 s"),
      analytics: false,
      prefix: "rl:order_lookup",
    })
  : null;

const catalogLimiter = isRedisConfigured && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, "60 s"),
      analytics: false,
      prefix: "rl:catalog",
    })
  : null;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply rate limiting to targeted API endpoints
  let limiter: Ratelimit | null = null;
  if (pathname === "/api/orders/paypal/create") {
    limiter = paypalCreateLimiter;
  } else if (pathname === "/api/orders/paypal/capture") {
    limiter = paypalCaptureLimiter;
  } else if (
    pathname === "/api/orders/lookup" ||
    pathname === "/api/orders/cancel" ||
    pathname === "/api/orders/address"
  ) {
    limiter = orderLookupLimiter;
  } else if (pathname.startsWith("/api/catalog")) {
    limiter = catalogLimiter;
  }

  if (!limiter) {
    return NextResponse.next();
  }

  try {
    const ip = getClientIp(req);
    const { success, limit, remaining, reset } = await limiter.limit(ip);

    if (!success) {
      const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return NextResponse.json(
        {
          error: "Too many requests. Please slow down and try again.",
          code: "RATE_LIMIT_EXCEEDED",
          retry_after_seconds: retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfterSec.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", limit.toString());
    res.headers.set("X-RateLimit-Remaining", remaining.toString());
    return res;
  } catch (err: any) {
    // Fail-open: If Redis encounters a transient network timeout, allow the customer through
    console.warn("[Middleware RateLimit Warning] Failed open:", err?.message || err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/api/orders/paypal/create",
    "/api/orders/paypal/capture",
    "/api/orders/lookup",
    "/api/orders/cancel",
    "/api/orders/address",
    "/api/catalog",
    "/api/catalog/:path*",
  ],
};
