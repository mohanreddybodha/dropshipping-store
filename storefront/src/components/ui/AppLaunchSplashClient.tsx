"use client";

/**
 * Client-only wrapper that lazy-loads AppLaunchSplash with ssr: false.
 * This file must be a Client Component ("use client") so that next/dynamic
 * with ssr:false is legal — it cannot be called from a Server Component (layout.tsx).
 */
import dynamic from "next/dynamic";

const AppLaunchSplash = dynamic(
  () => import("./AppLaunchSplash"),
  { ssr: false, loading: () => null }
);

export default function AppLaunchSplashClient() {
  return <AppLaunchSplash />;
}
