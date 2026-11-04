"use client";

import React, { useState, useEffect } from "react";

/**
 * Production-Grade Industry Launch Screen Animation.
 *
 * Smooth, Slow, Ease-in-Out Dragging Choreography:
 *   0ms   — Pure white canvas shields storefront from any layout flash
 *  50ms   — 1. Cart Body: Drags in with physical inertia, subtle tilt, and ease-in-out momentum
 * 200ms   — 2. Two Wheels: Combination of two gray and two green with gap, rolling in directly underneath
 * 270ms   — 3. Green Accents: Glides in smoothly from top-left to lock with the frame
 * 350ms   — 4. Drag Streaks: Trailing drag lines stretch and settle on the left
 * 1850ms  — 5. Convergence: All parts lock seamlessly into the authentic Vastire brand icon with gentle settle
 * 1850ms  — 6. Wordmark, Horizontal Loading Bar (filling 0% to 100% with ease-in-out), and Tagline rise smoothly
 * 3100ms  — 7. Cinematic dissolve transition (opacity: 1 -> 0, scale: 1 -> 1.015)
 * 3600ms  — 8. Component cleanly unmounts from DOM
 */
export default function AppLaunchSplash() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      // Check if already shown in this browser session
      const alreadySeen = sessionStorage.getItem("vastire_launch_splash_seen");
      if (alreadySeen) {
        setShowSplash(false);
        return;
      }

      sessionStorage.setItem("vastire_launch_splash_seen", "true");

      // Smooth slow dissolve transition
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 3100);

      // Clean unmount from DOM
      const unmountTimer = setTimeout(() => {
        setShowSplash(false);
      }, 3600);

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
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none cursor-pointer transition-all duration-500 ease-in-out ${
        isFadingOut
          ? "opacity-0 pointer-events-none scale-[1.015]"
          : "opacity-100 scale-100"
      }`}
      aria-label="Vastire App Launch Screen"
    >
      {/* ── Soft Ambient Radial Emerald Glow ── */}
      <div className="absolute w-[420px] h-[420px] rounded-full bg-emerald-50/70 blur-3xl pointer-events-none -translate-y-4" />

      {/* ── Center Stage: Multi-Part Cart Assembly + Typography + Loading Bar ── */}
      <div className="relative flex flex-col items-center justify-center">

        {/* Emblem Stage: All parts assemble at the exact coordinate position */}
        <div className="relative flex items-center justify-center w-32 h-32 animate-icon-assemble-settle">
          {/* Ambient Breathing Halo Glow */}
          <div className="animate-ambient-halo absolute -inset-4 rounded-3xl bg-emerald-500/15 blur-lg pointer-events-none" />

          {/* Cart Stage Container (512x512 Coordinate Frame) */}
          <div className="relative w-28 h-28 flex items-center justify-center select-none pointer-events-none">
            {/* 1. Trailing Drag Streaks on the Left */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-streaks.png"
              alt="Vastire Cart Drag Streaks"
              loading="eager"
              decoding="sync"
              className="animate-drag-streaks absolute inset-0 w-full h-full object-contain"
            />

            {/* 2. Cart Body: Drags in with inertia, tilt, and ease-in-out */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-body.png"
              alt="Vastire Cart Body"
              loading="eager"
              decoding="sync"
              className="animate-drag-cart-body absolute inset-0 w-full h-full object-contain"
            />

            {/* 3. Green Upper Frame & Accents: Glides into place */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-accents.png"
              alt="Vastire Cart Frame & Accents"
              loading="eager"
              decoding="sync"
              className="animate-drag-accents absolute inset-0 w-full h-full object-contain"
            />

            {/* 4. Two Wheels (Combination of two gray and two green with gap): Roll in directly underneath */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-wheels.png"
              alt="Vastire Cart Wheels"
              loading="eager"
              decoding="sync"
              className="animate-drag-wheels absolute inset-0 w-full h-full object-contain"
            />
          </div>
        </div>

        {/* ── Brand Typography & Smooth Horizontal Progress Bar ── */}
        <div className="animate-brand-rise-smooth text-center mt-6 flex flex-col items-center space-y-3.5 pointer-events-none">
          <span
            className="block text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-none"
            style={{
              fontFamily:
                "var(--font-poppins), 'VastireBrandFont', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: "-0.035em",
            }}
          >
            Vastire
          </span>

          {/* ── Precision Horizontal Loading Progress Bar ── */}
          <div className="w-44 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
            <div className="animate-loading-progress-smooth h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 rounded-full" />
          </div>

          <span className="block text-[11px] sm:text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
            Curated Home Essentials
          </span>
        </div>
      </div>
    </div>
  );
}
