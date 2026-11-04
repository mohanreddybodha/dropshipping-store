"use client";

import React, { useState, useEffect } from "react";

/**
 * Cinematic PWA App Launch Animation.
 *
 * Sequence:
 *  0 ms  — white screen
 *  50 ms — cart body slides up from below
 * 280 ms — left wheel rolls in from left
 * 360 ms — right wheel rolls in from right
 * 520 ms — handle slides down
 * 720 ms — full cart bounces/settles
 * 820 ms — "Vastire" wordmark fades in
 * 950 ms — loading bar sweeps left → right
 * 1080 ms — tagline fades in
 * 1900 ms — entire overlay fades out
 * 2300 ms — component unmounts
 *
 * Mounted via dynamic({ ssr: false }) in layout.tsx — zero SSR hydration impact.
 */
export default function AppLaunchSplash() {
  const [showSplash, setShowSplash] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    try {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");

      const alreadySeen = sessionStorage.getItem("vastire_launch_splash_seen");

      if (isStandalone && !alreadySeen) {
        setShowSplash(true);
        sessionStorage.setItem("vastire_launch_splash_seen", "true");

        const fadeTimer = setTimeout(() => setIsFadingOut(true), 1900);
        const unmountTimer = setTimeout(() => setShowSplash(false), 2300);

        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(unmountTimer);
        };
      }
    } catch {
      setShowSplash(false);
    }
  }, []);

  if (!showSplash) return null;

  return (
    <div
      onClick={() => { setIsFadingOut(true); setTimeout(() => setShowSplash(false), 400); }}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none cursor-pointer
        transition-[opacity,transform] duration-400 ease-out
        ${isFadingOut ? "opacity-0 scale-[1.03] pointer-events-none" : "opacity-100 scale-100"}`}
      aria-label="Vastire App Launch Screen"
    >
      {/* Soft ambient glow */}
      <div className="absolute w-80 h-80 rounded-full bg-emerald-50/80 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center gap-5">

        {/* ── CART ASSEMBLY ── */}
        <div className="animate-cart-bounce relative" style={{ width: 120, height: 110 }}>

          {/* Cart handle (slides down from top of body) */}
          <div className="animate-handle-in absolute left-1/2 -translate-x-1/2" style={{ top: 0 }}>
            <svg width="66" height="36" viewBox="0 0 66 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M8 34 C8 20 10 8 33 8 C56 8 58 20 58 34"
                stroke="#059669"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>

          {/* Cart body (slides up) */}
          <div className="animate-cart-body-in absolute bottom-16" style={{ left: 0, right: 0 }}>
            <svg width="120" height="70" viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Main body */}
              <rect x="4" y="4" width="112" height="58" rx="10" fill="#10b981" />
              {/* Top lip */}
              <rect x="0" y="4" width="120" height="12" rx="10" fill="#059669" />
              {/* Horizontal line divider */}
              <line x1="12" y1="32" x2="108" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.4" />
              {/* Three vertical item slots */}
              <rect x="22" y="20" width="18" height="28" rx="4" fill="white" fillOpacity="0.18" />
              <rect x="51" y="20" width="18" height="28" rx="4" fill="white" fillOpacity="0.18" />
              <rect x="80" y="20" width="18" height="28" rx="4" fill="white" fillOpacity="0.18" />
            </svg>
          </div>

          {/* Left wheel */}
          <div className="animate-wheel-left absolute" style={{ bottom: 2, left: 14 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="12" fill="#064e3b" />
              <circle cx="14" cy="14" r="6" fill="#10b981" />
              <circle cx="14" cy="14" r="2.5" fill="#064e3b" />
              {/* Spokes */}
              <line x1="14" y1="4" x2="14" y2="10" stroke="#10b981" strokeWidth="1.5" />
              <line x1="14" y1="18" x2="14" y2="24" stroke="#10b981" strokeWidth="1.5" />
              <line x1="4" y1="14" x2="10" y2="14" stroke="#10b981" strokeWidth="1.5" />
              <line x1="18" y1="14" x2="24" y2="14" stroke="#10b981" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Right wheel */}
          <div className="animate-wheel-right absolute" style={{ bottom: 2, right: 14 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="12" fill="#064e3b" />
              <circle cx="14" cy="14" r="6" fill="#10b981" />
              <circle cx="14" cy="14" r="2.5" fill="#064e3b" />
              {/* Spokes */}
              <line x1="14" y1="4" x2="14" y2="10" stroke="#10b981" strokeWidth="1.5" />
              <line x1="14" y1="18" x2="14" y2="24" stroke="#10b981" strokeWidth="1.5" />
              <line x1="4" y1="14" x2="10" y2="14" stroke="#10b981" strokeWidth="1.5" />
              <line x1="18" y1="14" x2="24" y2="14" stroke="#10b981" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* ── WORDMARK ── */}
        <div className="animate-wordmark-in text-center">
          <span
            className="block text-[28px] font-extrabold text-slate-900 tracking-tight leading-none"
            style={{
              fontFamily: "var(--font-poppins), 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: "-0.035em",
              fontWeight: 800,
            }}
          >
            Vastire
          </span>
        </div>

        {/* ── LOADING BAR ── */}
        <div className="w-28 h-[3px] bg-slate-100 rounded-full overflow-hidden relative">
          <div className="animate-loading-sweep h-full bg-emerald-500 rounded-full absolute left-0 top-0" />
        </div>

        {/* ── TAGLINE ── */}
        <span className="animate-tagline-in block text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/80">
          Curated Home Essentials
        </span>
      </div>
    </div>
  );
}
