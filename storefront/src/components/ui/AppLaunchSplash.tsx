"use client";

import React, { useState, useEffect } from "react";
import { VastireIcon } from "./VastireLogo";

/**
 * Cinematic PWA & Browser App Launch Splash Screen.
 *
 * Sequence:
 *  0 ms   — Splash overlay active on frame 0 (prevents homepage flash)
 *  0–620ms — Cart body drives in from left with speed lines; wheels roll in from right
 *  620ms  — The parts snap together and the official Vastire icon is formed on screen
 *  720ms  — "Vastire" wordmark fades in with subtle rise
 *  750ms  — Sleek horizontal loading progress bar sweeps across from 0% to 100%
 *  780ms  — "Curated Home Essentials" tagline fades in
 * 1650ms — Smooth exit fade transition (opacity 1 -> 0, scale 1 -> 1.03)
 * 2050ms — Component unmounts, seamlessly revealing the interactive homepage
 */
export default function AppLaunchSplash() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAssembled, setIsAssembled] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      // If already seen in this session, hide immediately without animating
      const alreadySeen = sessionStorage.getItem("vastire_launch_splash_seen");
      if (alreadySeen) {
        setShowSplash(false);
        return;
      }

      // Mark seen so subsequent page visits / reloads in this session skip the splash
      sessionStorage.setItem("vastire_launch_splash_seen", "true");

      // Snap & form full icon at 620ms
      const assembleTimer = setTimeout(() => {
        setIsAssembled(true);
      }, 620);

      // Start smooth fade-out exit at 1.65s
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1650);

      // Clean unmount after fade finishes
      const unmountTimer = setTimeout(() => {
        setShowSplash(false);
      }, 2050);

      return () => {
        clearTimeout(assembleTimer);
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

      {/* Center Stage: Cart Assembly & Formed Brand Icon */}
      <div className="relative flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center w-24 h-24">
          {!isAssembled ? (
            /* ── Phase 1: Cart drives in from left, Wheels roll in from right ── */
            <div className="relative w-20 h-20 flex items-center justify-center">
              {/* Cart Body & Speed Lines moving in from left */}
              <div className="animate-splash-cart-drive absolute inset-0 flex items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Speed lines on left */}
                  <line x1="8" y1="46" x2="26" y2="46" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                  <line x1="12" y1="55" x2="30" y2="55" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                  <line x1="16" y1="64" x2="28" y2="64" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                  {/* Cart handle & frame */}
                  <path
                    d="M 28 32 C 34 32 37 35 40 46 L 46 64 C 47 67 50 69 54 69 L 80 69 C 83 69 86 66 87 62 L 92 44 C 93 40 90 36 86 36 L 44 36"
                    stroke="#0f172a"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* House Roof inside cart */}
                  <path
                    d="M 52 38 L 65 24 L 78 38"
                    stroke="#059669"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Green Ribbon accent */}
                  <path
                    d="M 43 56 C 52 50 65 52 74 44 C 80 40 86 44 86 44"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>

              {/* Wheels rolling in from right / opposite side */}
              <div className="animate-splash-wheels-roll absolute inset-0 flex items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left Wheel */}
                  <circle cx="53" cy="77" r="6" fill="#0f172a" />
                  <circle cx="53" cy="77" r="2.5" fill="#10b981" />
                  {/* Right Wheel */}
                  <circle cx="75" cy="77" r="6" fill="#0f172a" />
                  <circle cx="75" cy="77" r="2.5" fill="#10b981" />
                </svg>
              </div>
            </div>
          ) : (
            /* ── Phase 2: Formed Official Brand Icon with Smooth Bounce Settle ── */
            <div className="relative flex items-center justify-center animate-splash-icon-formed">
              {/* Subtle outer halo pulse */}
              <div className="absolute -inset-2.5 rounded-[28px] bg-emerald-500/15 blur-sm animate-pulse" />
              <div className="relative">
                <VastireIcon size={84} />
              </div>
            </div>
          )}
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
