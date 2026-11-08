"use client";

import React, { useState, useEffect } from "react";

/**
 * Production-Grade Industry Launch Screen Animation.
 *
 * PWA (installed app): Shows on every cold launch (uses localStorage).
 * Browser tab: Shows only on first visit per session (uses sessionStorage).
 *
 * Smooth, Slow, Premium Choreography (Swiggy/Zomato quality):
 *   0ms    — Pure white canvas shields storefront from layout flash
 *   50ms   — 1. Ambient halo glow blooms in behind emblem
 *   300ms  — 2. Cart body drags in with physical inertia & tilt
 *   500ms  — 3. Wheels roll in from the right
 *   700ms  — 4. Green accents glide in from top-left
 *   900ms  — 5. Drag streaks stretch & settle
 *   2800ms — 6. All parts spring-settle into final brand icon
 *   3000ms — 7. Brand wordmark "Vastire" rises up
 *   3300ms — 8. Progress bar sweeps 0→100% over 2 seconds
 *   5300ms — 9. Tagline fully visible
 *   5500ms — 10. Cinematic dissolve (opacity 0, slight scale up)
 *   6200ms — 11. Component unmounts; home screen fully visible
 */

const PWA_KEY = "vastire_pwa_launched_v1";
const BROWSER_KEY = "vastire_launch_splash_seen";

/** Total visible animation before fade begins, in ms */
const FADE_START_MS = 5500;
/** Time for opacity-0 transition, in ms */
const FADE_DURATION_MS = 700;
/** Total time before DOM removal, in ms */
const UNMOUNT_MS = FADE_START_MS + FADE_DURATION_MS;

export default function AppLaunchSplash() {
  const [showSplash, setShowSplash] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      const isPWA =
        typeof window !== "undefined" &&
        window.matchMedia("(display-mode: standalone)").matches;

      if (isPWA) {
        // PWA: show once per install (localStorage persists across sessions)
        const alreadyLaunched = localStorage.getItem(PWA_KEY);
        if (alreadyLaunched) return;
        localStorage.setItem(PWA_KEY, "true");
      } else {
        // Browser tab: show only on first visit this session
        const alreadySeen = sessionStorage.getItem(BROWSER_KEY);
        if (alreadySeen) return;
        sessionStorage.setItem(BROWSER_KEY, "true");
      }

      // Show splash
      setShowSplash(true);
      document.body.classList.add("splash-active");

      // Background data prefetch — warms the catalog in-memory cache
      // so home page appears populated instantly after splash ends
      import("../../lib/api")
        .then(({ getCatalog }) => {
          getCatalog({ limit: 200 }).catch(() => {});
        })
        .catch(() => {});

      // Start fade-out
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, FADE_START_MS);

      // Remove from DOM
      const unmountTimer = setTimeout(() => {
        setShowSplash(false);
        document.body.classList.remove("splash-active");
      }, UNMOUNT_MS);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(unmountTimer);
        document.body.classList.remove("splash-active");
      };
    } catch {
      setShowSplash(false);
    }
  }, []);

  if (!showSplash) return null;

  const handleDismiss = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setShowSplash(false);
      document.body.classList.remove("splash-active");
    }, 350);
  };

  return (
    <div
      id="vastire-splash"
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none cursor-pointer ${
        isFadingOut
          ? "splash-fade-out"
          : "splash-fade-in"
      }`}
      aria-label="Vastire App Launch Screen"
    >
      {/* ── Soft Ambient Radial Emerald Glow ── */}
      <div className="absolute w-[480px] h-[480px] rounded-full bg-emerald-50/80 blur-3xl pointer-events-none -translate-y-6" />

      {/* ── Center Stage: Multi-Part Cart Assembly + Typography + Loading Bar ── */}
      <div className="relative flex flex-col items-center justify-center">

        {/* Emblem Stage: All parts assemble at the exact coordinate position */}
        <div className="relative flex items-center justify-center w-36 h-36 animate-icon-assemble-settle">
          {/* Ambient Breathing Halo Glow */}
          <div className="animate-ambient-halo absolute -inset-5 rounded-3xl bg-emerald-500/18 blur-xl pointer-events-none" />

          {/* Cart Stage Container (512×512 coordinate frame) */}
          <div className="relative w-32 h-32 flex items-center justify-center select-none pointer-events-none">
            {/* 1. Trailing Drag Streaks on the Left */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-streaks.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-drag-streaks absolute inset-0 w-full h-full object-contain"
            />

            {/* 2. Cart Body: Drags in with inertia, tilt, ease-in-out */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-body.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-drag-cart-body absolute inset-0 w-full h-full object-contain"
            />

            {/* 3. Green Upper Frame & Accents: Glides into place */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-accents.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-drag-accents absolute inset-0 w-full h-full object-contain"
            />

            {/* 4. Wheels (gray + green): Roll in from right, underneath */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-wheels.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-drag-wheels absolute inset-0 w-full h-full object-contain"
            />
          </div>
        </div>

        {/* ── Brand Typography & Smooth Horizontal Progress Bar ── */}
        <div className="animate-brand-rise-smooth text-center mt-7 flex flex-col items-center space-y-4 pointer-events-none">
          <span
            className="block text-[2.6rem] sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-none"
            style={{
              fontFamily:
                "var(--font-poppins), 'VastireBrandFont', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: "-0.038em",
            }}
          >
            Vastire
          </span>

          {/* Precision Horizontal Loading Progress Bar */}
          <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
            <div className="animate-loading-progress-smooth h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 rounded-full" />
          </div>

          <span className="animate-tagline-rise block text-[11px] sm:text-xs font-bold uppercase tracking-[0.26em] text-emerald-700">
            Curated Home Essentials
          </span>
        </div>
      </div>
    </div>
  );
}
