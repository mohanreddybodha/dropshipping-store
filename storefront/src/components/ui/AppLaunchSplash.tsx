"use client";

import React, { useState, useEffect } from "react";
import { VastireIcon } from "./VastireLogo";

/**
 * Premium PWA / Browser App Launch Animation Screen.
 * Triggers when the user opens the application as an installed browser app (PWA),
 * delivering a native-grade, ultra-crisp luxury startup experience with smooth exit.
 */
export default function AppLaunchSplash() {
  const [showSplash, setShowSplash] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      // 1. Detect if running as an installed browser app (standalone PWA)
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      // 2. Only show on the very first cold launch of the session
      const alreadySeen = sessionStorage.getItem("vastire_launch_splash_seen");

      if (isStandalone && !alreadySeen) {
        setShowSplash(true);
        sessionStorage.setItem("vastire_launch_splash_seen", "true");

        // Start smooth exit transition after 1.1s
        const fadeTimer = setTimeout(() => {
          setIsFadingOut(true);
        }, 1100);

        // Completely unmount splash overlay after fade finishes
        const unmountTimer = setTimeout(() => {
          setShowSplash(false);
        }, 1500);

        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(unmountTimer);
        };
      }
    } catch {
      // Fail silently if sessionStorage or mediaQuery is restricted
      setShowSplash(false);
    }
  }, []);

  if (!showSplash) return null;

  return (
    <div
      onClick={() => setShowSplash(false)}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none transition-all duration-400 ease-out cursor-pointer ${
        isFadingOut ? "opacity-0 pointer-events-none scale-105" : "opacity-100 scale-100"
      }`}
      aria-label="Vastire Launch Screen"
    >
      {/* ── Soft Background Ambient Glow ── */}
      <div className="absolute w-72 h-72 rounded-full bg-emerald-50/60 blur-3xl pointer-events-none -translate-y-6" />

      {/* ── Center Brand Emblem with Animated Halo ── */}
      <div className="relative flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          {/* Subtle Outer Halo Pulse */}
          <div className="absolute -inset-2.5 rounded-[28px] bg-emerald-500/15 blur-sm animate-pulse" />

          {/* 4K Ultra-Crisp Master Squircle Icon */}
          <div className="relative transition-transform duration-700 ease-out transform scale-100 animate-in zoom-in-90">
            <VastireIcon size={84} />
          </div>
        </div>

        {/* ── Brand Wordmark ── */}
        <div className="text-center space-y-1">
          <span
            className="block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none"
            style={{
              fontFamily:
                "var(--font-poppins), 'VastireBrandFont', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: "-0.035em",
            }}
          >
            Vastire
          </span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700/90">
            Curated Living Essentials
          </span>
        </div>

        {/* ── Micro Progress Slider Indicator ── */}
        <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden mt-3 relative">
          <div className="h-full bg-emerald-600 rounded-full animate-indeterminate-bar" />
        </div>
      </div>
    </div>
  );
}
