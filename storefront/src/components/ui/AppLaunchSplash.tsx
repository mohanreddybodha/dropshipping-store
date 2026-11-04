"use client";

import React, { useState, useEffect } from "react";

/**
 * Production-Grade Industry Launch Screen Animation.
 *
 * Choreographed Sequence:
 *   0ms  — Opaque pure white canvas shields the page from any initial layout flash
 *  20ms  — Cart Body drives in with momentum from left with forward tilt
 *  20ms  — Wheels roll in from bottom-right and align directly underneath the body
 * 680ms  — Cart body and wheels meet and lock into the unified Vastire Brand Icon (micro-snap settle)
 * 680ms  — "Vastire" wordmark and "CURATED HOME ESSENTIALS" rise smoothly below the emblem
 * 720ms  — Precision horizontal gradient loading bar fills from 0% to 100%
 * 1900ms — Seamless dissolve transition (opacity: 1 -> 0, scale: 1 -> 1.02)
 * 2300ms — Component cleanly unmounts from DOM
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

      // Smooth dissolve
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1900);

      // Clean unmount from DOM
      const unmountTimer = setTimeout(() => {
        setShowSplash(false);
      }, 2300);

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
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none cursor-pointer transition-all duration-400 ease-out ${
        isFadingOut
          ? "opacity-0 pointer-events-none scale-[1.02]"
          : "opacity-100 scale-100"
      }`}
      aria-label="Vastire App Launch Screen"
    >
      {/* ── Luxury Ambient Radial Glow ── */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-50/70 blur-3xl pointer-events-none -translate-y-4" />

      {/* ── Center Stage: Icon Formation + Typography + Loading Bar ── */}
      <div className="relative flex flex-col items-center justify-center">

        {/* Emblem Stage: Moving Cart Body and Wheels converging */}
        <div className="relative flex items-center justify-center w-28 h-28 animate-icon-snap">
          {/* Ambient Breathing Halo Glow */}
          <div className="animate-ambient-halo absolute -inset-3 rounded-3xl bg-emerald-500/15 blur-md pointer-events-none" />

          {/* Cart Stage Container (100% Vector Proportioned) */}
          <div className="relative w-24 h-24 flex items-center justify-center select-none pointer-events-none">
            {/* 1. Cart Body: Drives in from left with momentum and velocity tilt */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-cart-body.png"
              alt="Vastire Cart Body"
              loading="eager"
              decoding="sync"
              className="animate-cart-body-move absolute inset-0 w-full h-full object-contain"
            />

            {/* 2. Wheels: Roll in from bottom-right and align directly underneath */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-cart-wheels.png"
              alt="Vastire Cart Wheels"
              loading="eager"
              decoding="sync"
              className="animate-wheels-move-in absolute inset-0 w-full h-full object-contain"
            />
          </div>
        </div>

        {/* ── Brand Typography & Horizontal Loading Indicator ── */}
        <div className="animate-brand-text-rise text-center mt-5 flex flex-col items-center space-y-3 pointer-events-none">
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

          {/* ── Precision Horizontal Progress Bar ── */}
          <div className="w-36 h-1 bg-slate-100 rounded-full overflow-hidden relative">
            <div className="animate-loading-progress-fill h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 rounded-full" />
          </div>

          <span className="block text-[11px] sm:text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
            Curated Home Essentials
          </span>
        </div>
      </div>
    </div>
  );
}
