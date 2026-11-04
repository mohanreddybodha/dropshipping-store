"use client";

import React, { useState, useEffect } from "react";
import { VastireIcon } from "./VastireLogo";

/**
 * Production-Grade Industry Launch Screen Animation.
 *
 * Designed to top-tier consumer app standards (Uber, Airbnb, DoorDash, Shopify):
 * - Uses the authentic, high-resolution Vastire brand emblem with zero wireframe approximations
 * - Smooth physics-based drive-in momentum with elastic spring settling
 * - Glowing speed streaks trailing the cart motion
 * - Ambient luxury emerald halo
 * - Crisp brand typography & "Curated Home Essentials"
 * - Precision horizontal gradient progress fill
 * - Cinematic smooth dissolve into the active storefront
 *
 * Sequence:
 *   0ms  — Active on Frame 0, completely shielding the underlying page
 *  50ms  — Cart emblem glides in from left with velocity tilt and trails
 * 520ms  — Wordmark rises up with smooth deceleration; "Curated Home Essentials" appears
 * 550ms  — Sleek horizontal loading bar fills from 0% to 100%
 * 1650ms — Seamless dissolve transition (opacity 1 -> 0, scale 1 -> 1.03)
 * 2050ms — Component cleanly unmounts from DOM
 */
export default function AppLaunchSplash() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      // Check if already shown in this session (skip on subsequent page reloads / navigations)
      const alreadySeen = sessionStorage.getItem("vastire_launch_splash_seen");
      if (alreadySeen) {
        setShowSplash(false);
        return;
      }

      // Mark as seen for current session
      sessionStorage.setItem("vastire_launch_splash_seen", "true");

      // Begin smooth dissolve at 1.65s
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1650);

      // Clean unmount after transition completes
      const unmountTimer = setTimeout(() => {
        setShowSplash(false);
      }, 2050);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(unmountTimer);
      };
    } catch {
      setShowSplash(false);
    }
  }, []);

  if (!showSplash) return null;

  const handleDismiss = () => {
    setIsFadingOut(true);
    setTimeout(() => setShowSplash(false), 250);
  };

  return (
    <div
      id="vastire-splash"
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none cursor-pointer transition-all duration-450 ease-out ${
        isFadingOut
          ? "opacity-0 pointer-events-none scale-[1.03]"
          : "opacity-100 scale-100"
      }`}
      aria-label="Vastire App Launch Screen"
    >
      {/* ── Luxury Ambient Radial Background Glow ── */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-50/70 blur-3xl pointer-events-none -translate-y-4" />

      {/* ── Center Stage: Brand Emblem with Motion Momentum ── */}
      <div className="relative flex flex-col items-center justify-center">

        {/* Emblem Wrapper */}
        <div className="relative flex items-center justify-center w-28 h-28">

          {/* Ambient Breathing Halo Glow */}
          <div className="animate-ambient-halo absolute -inset-3 rounded-3xl bg-emerald-500/15 blur-md" />

          {/* Speed Streaks trailing behind the moving cart on the left */}
          <div className="absolute -left-7 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pointer-events-none">
            <div className="animate-speed-streak-1 w-6 h-[2.5px] rounded-full bg-gradient-to-r from-transparent to-emerald-500" />
            <div className="animate-speed-streak-2 w-8 h-[2.5px] rounded-full bg-gradient-to-r from-transparent to-teal-400" />
            <div className="animate-speed-streak-3 w-5 h-[2.5px] rounded-full bg-gradient-to-r from-transparent to-emerald-500" />
          </div>

          {/* Authentic High-Resolution Vastire Brand Emblem with Smooth Spring Drive-In */}
          <div className="animate-emblem-drive-in relative">
            <VastireIcon size={92} />
          </div>
        </div>

        {/* ── Brand Typography: Wordmark & Tagline ── */}
        <div className="animate-brand-text-rise text-center mt-4 space-y-1">
          <span
            className="block text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-none font-brand-wordmark"
            style={{
              fontFamily:
                "var(--font-poppins), 'VastireBrandFont', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: "-0.035em",
            }}
          >
            Vastire
          </span>
          <span className="block text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-700/90">
            Curated Home Essentials
          </span>
        </div>

        {/* ── Precision Horizontal Progress Bar ── */}
        <div className="animate-brand-text-rise w-36 h-[3.5px] bg-slate-100 rounded-full overflow-hidden mt-4 relative">
          <div className="animate-loading-progress-fill h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}
