"use client";

import React, { useState, useEffect } from "react";

/**
 * Production-Grade Industry Launch Screen Animation.
 *
 * Smooth, Slow, Ease-in-Out Dragging & Rolling Choreography (Swiggy/Zomato quality):
 *   0.0s – 1.0s: Authentic cart parts assemble seamlessly (unified handle, black frame, 10 green accents)
 *   0.8s – 5.0s: Wheels scroll/rotate continuously on stationary green base in place (center)
 *   1.8s – 5.0s: Brand wordmark, horizontal progress bar (0% -> 100%), and tagline rise
 *   5.5s – 6.2s: Cinematic dissolve transition reveals pre-populated storefront
 *
 * Zero-Flash Architecture:
 *   - Initial SSR state is `true` so the white screen + cart renders immediately on first paint
 *   - Synchronous <head> script in layout.tsx sets `html.splash-dismissed` for returning tabs,
 *     hiding the overlay instantly with zero flash
 *   - Closing tab or closing the app clears sessionStorage, re-enabling the animation on next open
 */

const SESSION_KEY = "vastire_launch_splash_seen";
const FADE_START_MS = 5500;
const FADE_DURATION_MS = 700;
const UNMOUNT_MS = FADE_START_MS + FADE_DURATION_MS;

export default function AppLaunchSplash() {
  // Start as true on initial render so the splash screen covers the DOM from frame 0
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      // Check if already seen in this tab / app session
      const alreadySeen = sessionStorage.getItem(SESSION_KEY);
      if (alreadySeen) {
        setShowSplash(false);
        return;
      }

      // Mark seen for this session
      sessionStorage.setItem(SESSION_KEY, "true");
      document.body.classList.add("splash-active");

      // Non-blocking background catalog prefetch during splash
      import("../../lib/api")
        .then(({ getCatalog }) => {
          getCatalog({ limit: 200 }).catch(() => {});
        })
        .catch(() => {});

      // Dissolve transition timer
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, FADE_START_MS);

      // Clean DOM unmount
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
        isFadingOut ? "splash-fade-out" : "splash-fade-in"
      }`}
      aria-label="Vastire App Launch Screen"
    >
      {/* ── Soft Ambient Radial Emerald Glow ── */}
      <div className="absolute w-[480px] h-[480px] rounded-full bg-emerald-50/80 blur-3xl pointer-events-none -translate-y-6" />

      {/* ── Center Stage: Cart Assembly, Continuous Wheel Rolling & Typography ── */}
      <div className="relative flex flex-col items-center justify-center">

        {/* Emblem Stage: All parts assemble at coordinate position and settle */}
        <div className="relative flex items-center justify-center w-36 h-36 sm:w-40 sm:h-40 animate-icon-assemble-settle">
          {/* Ambient Breathing Halo Glow */}
          <div className="animate-ambient-halo absolute -inset-5 rounded-3xl bg-emerald-500/18 blur-xl pointer-events-none" />

          {/* Cart Stage Container (512x512 Coordinate Frame) - Centers in Place */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center select-none pointer-events-none">
            {/* 1. Stationary Green Ground below wheels - constant/fixed base (never rotates) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-ground.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-part-ground absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* 2. Left Wheel: Pure circular dark disc rotating on axle (46.39% X, 73.83% Y) in place */}
            <div className="animate-part-wheels absolute inset-0 w-full h-full pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/splash-part-wheel-left.png"
                alt=""
                loading="eager"
                decoding="sync"
                className="animate-wheel-continuous-spin w-full h-full object-contain"
                style={{ transformOrigin: "46.39% 73.83%" }}
              />
            </div>

            {/* 3. Right Wheel: Pure circular dark disc rotating on axle (69.04% X, 73.83% Y) in place */}
            <div className="animate-part-wheels absolute inset-0 w-full h-full pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/splash-part-wheel-right.png"
                alt=""
                loading="eager"
                decoding="sync"
                className="animate-wheel-continuous-spin w-full h-full object-contain"
                style={{ transformOrigin: "69.04% 73.83%" }}
              />
            </div>

            {/* 4. Cart Basket Body & Internal Green Accents: Sweeps in from bottom-left */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-body.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-part-body animate-cart-rolling-vibe absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* 5. Trailing Drag Motion Streaks: Glides in from far left */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-streaks.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-part-streaks absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* 6. Unified Black Handle: Glides down from top-left */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-handle.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-part-handle absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* 7. Green House Roof: Glides down from top-right */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-roof.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-part-roof absolute inset-0 w-full h-full object-contain pointer-events-none"
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

          {/* Precision Horizontal Loading Progress Bar - Charges while wheels rotate */}
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
