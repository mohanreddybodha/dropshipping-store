"use client";

import React, { useState, useEffect } from "react";
import { VastireIcon } from "./VastireLogo";

/**
 * Premium PWA & Browser App Launch Splash Screen.
 * Uses the exact Vastire brand icon without modifications.
 *
 * Sequence:
 *  0 ms   — Splash overlay renders immediately on frame 0 (no homepage flash)
 *  100 ms — Vastire squircle brand icon springs in smoothly
 *  200 ms — "Vastire" wordmark fades in with subtle rise
 *  300 ms — Sleek horizontal progress indicator sweeps smoothly
 *  350 ms — "Curated Home Essentials" tagline fades in
 * 1500 ms — Smooth ease-out fade transition (opacity 1 -> 0, scale 1 -> 1.03)
 * 1950 ms — Clean unmount, revealing the interactive homepage
 */
export default function AppLaunchSplash() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      // If already seen in this session, hide immediately without animating
      const alreadySeen = sessionStorage.getItem("vastire_launch_splash_seen");
      if (alreadySeen) {
        setShowSplash(false);
        return;
      }

      // Mark seen so subsequent refreshes / page visits in this session don't show splash
      sessionStorage.setItem("vastire_launch_splash_seen", "true");

      // Smooth fade-out after 1.5s
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1500);

      // Clean unmount after fade finishes
      const unmountTimer = setTimeout(() => {
        setShowSplash(false);
      }, 1950);

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
    setTimeout(() => setShowSplash(false), 300);
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
      aria-label="Vastire Launch Screen"
    >
      {/* Soft Ambient Radial Background Glow */}
      <div className="absolute w-80 h-80 rounded-full bg-emerald-50/70 blur-3xl pointer-events-none -translate-y-4" />

      {/* Center Brand Emblem & Content */}
      <div className="relative flex flex-col items-center justify-center space-y-4">
        {/* Brand Icon with Subtle Outer Halo Pulse */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2.5 rounded-[28px] bg-emerald-500/15 blur-sm animate-pulse" />
          <div className="relative animate-splash-icon">
            <VastireIcon size={84} />
          </div>
        </div>

        {/* Brand Wordmark & Tagline */}
        <div className="text-center space-y-1.5 animate-splash-text">
          <span
            className="block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none font-brand-wordmark"
            style={{
              fontFamily:
                "var(--font-poppins), 'VastireBrandFont', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: "-0.035em",
            }}
          >
            Vastire
          </span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/90">
            Curated Home Essentials
          </span>
        </div>

        {/* Sleek Horizontal Loading Indicator */}
        <div className="w-28 h-1 bg-slate-100 rounded-full overflow-hidden mt-3 relative">
          <div className="h-full bg-emerald-600 rounded-full animate-splash-progress" />
        </div>
      </div>
    </div>
  );
}
