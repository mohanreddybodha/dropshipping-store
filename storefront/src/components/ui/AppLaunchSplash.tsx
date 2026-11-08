"use client";

import React, { useState, useEffect } from "react";

/**
 * Production-Grade Industry Launch Screen Animation.
 *
 * Smooth, Slow, Ease-in-Out Dragging & Rolling Choreography (Swiggy/Zomato quality):
 *   0.0s – 1.8s: Authentic cart parts assemble seamlessly (unbroken body, speed streaks, 2 wheels)
 *   1.8s – 3.8s: Assembled cart glides to the right while wheels rotate for 2 seconds
 *   2.8s – 5.2s: Brand wordmark, progress bar (0% -> 100%), and tagline rise
 *   5.5s – 6.2s: Cinematic dissolve transition reveals populated storefront
 *
 * Session gate:
 *   Uses sessionStorage so that whenever the user closes the tab / closes the app
 *   and reopens it, the launch animation plays smoothly.
 */

const SESSION_KEY = "vastire_launch_splash_seen";
const FADE_START_MS = 5500;
const FADE_DURATION_MS = 700;
const UNMOUNT_MS = FADE_START_MS + FADE_DURATION_MS;

export default function AppLaunchSplash() {
  const [showSplash, setShowSplash] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      // Check if already seen in this tab / app session
      // Closing tab or closing the app automatically clears sessionStorage
      const alreadySeen = sessionStorage.getItem(SESSION_KEY);
      if (alreadySeen) {
        return;
      }

      setShowSplash(true);
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

      {/* ── Center Stage: Cart Assembly, Drive Right with Wheel Spin & Typography ── */}
      <div className="relative flex flex-col items-center justify-center">

        {/* Emblem Stage: All parts assemble at coordinate position and settle */}
        <div className="relative flex items-center justify-center w-36 h-36 sm:w-40 sm:h-40 animate-icon-assemble-settle">
          {/* Ambient Breathing Halo Glow */}
          <div className="animate-ambient-halo absolute -inset-5 rounded-3xl bg-emerald-500/18 blur-xl pointer-events-none" />

          {/* Cart Stage Container (512x512 Coordinate Frame) with 2-second Drive Right */}
          <div className="animate-cart-drive-right relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center select-none pointer-events-none">
            {/* 1. Trailing Drag Streaks on the Left */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-streaks.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-drag-streaks absolute inset-0 w-full h-full object-contain"
            />

            {/* 2. Cart Body: Solid black basket frame with 10 green accents (unbroken) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/splash-part-body.png"
              alt=""
              loading="eager"
              decoding="sync"
              className="animate-drag-cart-body absolute inset-0 w-full h-full object-contain"
            />

            {/* 3. Left Wheel: Combination of grey wheel & green base, rotates 2s around its axle */}
            <div className="animate-drag-wheels absolute inset-0 w-full h-full pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/splash-part-wheel-left.png"
                alt=""
                loading="eager"
                decoding="sync"
                className="animate-spin-wheel-left w-full h-full object-contain"
                style={{ transformOrigin: "45.12% 75.39%" }}
              />
            </div>

            {/* 4. Right Wheel: Combination of grey wheel & green base, rotates 2s around its axle */}
            <div className="animate-drag-wheels absolute inset-0 w-full h-full pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/splash-part-wheel-right.png"
                alt=""
                loading="eager"
                decoding="sync"
                className="animate-spin-wheel-right w-full h-full object-contain"
                style={{ transformOrigin: "68.55% 75.39%" }}
              />
            </div>
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
