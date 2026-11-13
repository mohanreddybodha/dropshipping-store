"use client";

import React, { useState, useEffect, useCallback } from "react";
import CatalogBackgroundPrefetch from "./CatalogBackgroundPrefetch";

// In-memory module-level session flag: once dismissed in this SPA runtime, never show again
let globalSplashDismissed = false;

function isBotUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /bot|crawler|spider|pinterest|facebook|google|bing|yahoo|duckduck|headless|prerender|lighthouse/i.test(
    ua
  );
}

export default function AppLaunchSplash() {
  // CRITICAL: Default to false on SSR so automated crawlers (Pinterestbot, Googlebot, Meta)
  // receive unobstructed, pure HTML without a full-screen z-[99999] blocking overlay.
  const [visible, setVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const dismiss = useCallback(() => {
    setIsFadingOut(true);
    globalSplashDismissed = true;
    try {
      sessionStorage.setItem("vastire_launch_splash_seen", "true");
      document.documentElement.classList.add("splash-dismissed");
      document.body.classList.remove("splash-active");
    } catch {}

    setTimeout(() => {
      setVisible(false);
      const splash = document.getElementById("vastire-splash");
      if (splash?.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, 350);
  }, []);

  useEffect(() => {
    // If bot crawler, never display splash screen
    if (isBotUserAgent()) {
      globalSplashDismissed = true;
      document.documentElement.classList.add("splash-dismissed");
      document.body.classList.remove("splash-active");
      return;
    }

    if (globalSplashDismissed) {
      document.documentElement.classList.add("splash-dismissed");
      document.body.classList.remove("splash-active");
      return;
    }

    try {
      if (sessionStorage.getItem("vastire_launch_splash_seen")) {
        globalSplashDismissed = true;
        document.documentElement.classList.add("splash-dismissed");
        document.body.classList.remove("splash-active");
        return;
      }
    } catch {}

    // First-time human visitor in browser: show branded launch splash
    setVisible(true);
    document.body.classList.add("splash-active");

    const timer = setTimeout(() => {
      dismiss();
    }, 1800);

    return () => clearTimeout(timer);
  }, [dismiss]);

  // If already seen, dismissed, or SSR crawler: return ONLY background prefetcher.
  if (!visible || globalSplashDismissed) {
    return <CatalogBackgroundPrefetch />;
  }

  return (
    <>
      <div
        id="vastire-splash"
        onClick={dismiss}
        className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none cursor-pointer transition-opacity duration-350 ease-out ${
          isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100 splash-fade-in"
        }`}
        aria-label="Vastire App Launch Screen"
      >
        <div className="absolute w-[480px] h-[480px] rounded-full bg-emerald-50/80 blur-3xl pointer-events-none -translate-y-6" />

        <div className="relative flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center w-36 h-36 sm:w-40 sm:h-40 animate-icon-assemble-settle">
            <div className="animate-ambient-halo absolute -inset-5 rounded-3xl bg-emerald-500/18 blur-xl pointer-events-none" />

            <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center select-none pointer-events-none">
              <div className="animate-part-ground absolute inset-0 w-full h-full pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/splash-part-ground.png"
                  alt=""
                  loading="eager"
                  decoding="sync"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>

              <div className="animate-part-wheels absolute inset-0 w-full h-full pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/splash-part-wheel-left.png"
                  alt=""
                  loading="eager"
                  decoding="sync"
                  className="animate-wheel-continuous-spin w-full h-full object-contain pointer-events-none"
                  style={{ transformOrigin: "46.29% 74.41%" }}
                />
              </div>

              <div className="animate-part-wheels absolute inset-0 w-full h-full pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/splash-part-wheel-right.png"
                  alt=""
                  loading="eager"
                  decoding="sync"
                  className="animate-wheel-continuous-spin w-full h-full object-contain pointer-events-none"
                  style={{ transformOrigin: "69.04% 74.41%" }}
                />
              </div>

              <div className="animate-part-body absolute inset-0 w-full h-full pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/splash-part-body.png"
                  alt=""
                  loading="eager"
                  decoding="sync"
                  className="animate-cart-rolling-vibe w-full h-full object-contain pointer-events-none"
                />
              </div>

              <div className="animate-part-streaks absolute inset-0 w-full h-full pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/splash-part-streaks.png"
                  alt=""
                  loading="eager"
                  decoding="sync"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>

              <div className="animate-part-handle absolute inset-0 w-full h-full pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/splash-part-handle.png"
                  alt=""
                  loading="eager"
                  decoding="sync"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>

              <div className="animate-part-roof absolute inset-0 w-full h-full pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/splash-part-roof.png"
                  alt=""
                  loading="eager"
                  decoding="sync"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            </div>
          </div>

          <div className="animate-brand-rise-smooth text-center mt-7 flex flex-col items-center space-y-4 pointer-events-none">
            <span
              className="block text-[2.6rem] sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-none font-brand-wordmark"
              style={{ letterSpacing: "-0.038em" }}
            >
              Vastire
            </span>

            <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
              <div className="animate-loading-progress-smooth h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 rounded-full" />
            </div>

            <span className="animate-tagline-rise block text-[11px] sm:text-xs font-bold uppercase tracking-[0.26em] text-emerald-700">
              Curated Home Essentials
            </span>
          </div>
        </div>
      </div>
      <CatalogBackgroundPrefetch />
    </>
  );
}
