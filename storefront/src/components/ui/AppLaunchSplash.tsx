import React from "react";
import CatalogBackgroundPrefetch from "./CatalogBackgroundPrefetch";

/**
 * Production-Grade Industry Launch Screen (Pure SSR + Isolated Vanilla Controller).
 *
 * Architecture Guarantee:
 * 1. Rendered as static HTML via dangerouslySetInnerHTML so React virtual DOM reconciliation
 *    NEVER diffs, unmounts, or resets the CSS animations or internal DOM elements.
 * 2. Self-dismissing zero-dependency inline script executes on initial parse:
 *    - Snappy total duration: 2.2s assemble + roll, then 350ms smooth fade-out.
 *    - Click / tap anywhere dismisses immediately (150ms).
 *    - Sets sessionStorage('vastire_launch_splash_seen', 'true') to prevent repeated runs.
 * 3. layout.tsx <head> script checks sessionStorage synchronously before first paint:
 *    If already seen in this session, adds 'splash-dismissed' class to <html> so it is never displayed.
 * 4. Completely immune to slow internet or deferred JS chunk hydration — will NEVER repeat twice.
 */

const SPLASH_INNER_HTML = `
<div
  id="vastire-splash"
  class="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none cursor-pointer splash-fade-in"
  aria-label="Vastire App Launch Screen"
>
  <div class="absolute w-[480px] h-[480px] rounded-full bg-emerald-50/80 blur-3xl pointer-events-none -translate-y-6"></div>

  <div class="relative flex flex-col items-center justify-center">
    <div class="relative flex items-center justify-center w-36 h-36 sm:w-40 sm:h-40 animate-icon-assemble-settle">
      <div class="animate-ambient-halo absolute -inset-5 rounded-3xl bg-emerald-500/18 blur-xl pointer-events-none"></div>

      <div class="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center select-none pointer-events-none">
        <div class="animate-part-ground absolute inset-0 w-full h-full pointer-events-none">
          <img src="/splash-part-ground.png" alt="" loading="eager" decoding="sync" class="w-full h-full object-contain pointer-events-none" />
        </div>

        <div class="animate-part-wheels absolute inset-0 w-full h-full pointer-events-none">
          <img src="/splash-part-wheel-left.png" alt="" loading="eager" decoding="sync" class="animate-wheel-continuous-spin w-full h-full object-contain pointer-events-none" style="transform-origin: 46.29% 74.41%;" />
        </div>

        <div class="animate-part-wheels absolute inset-0 w-full h-full pointer-events-none">
          <img src="/splash-part-wheel-right.png" alt="" loading="eager" decoding="sync" class="animate-wheel-continuous-spin w-full h-full object-contain pointer-events-none" style="transform-origin: 69.04% 74.41%;" />
        </div>

        <div class="animate-part-body absolute inset-0 w-full h-full pointer-events-none">
          <img src="/splash-part-body.png" alt="" loading="eager" decoding="sync" class="animate-cart-rolling-vibe w-full h-full object-contain pointer-events-none" />
        </div>

        <div class="animate-part-streaks absolute inset-0 w-full h-full pointer-events-none">
          <img src="/splash-part-streaks.png" alt="" loading="eager" decoding="sync" class="w-full h-full object-contain pointer-events-none" />
        </div>

        <div class="animate-part-handle absolute inset-0 w-full h-full pointer-events-none">
          <img src="/splash-part-handle.png" alt="" loading="eager" decoding="sync" class="w-full h-full object-contain pointer-events-none" />
        </div>

        <div class="animate-part-roof absolute inset-0 w-full h-full pointer-events-none">
          <img src="/splash-part-roof.png" alt="" loading="eager" decoding="sync" class="w-full h-full object-contain pointer-events-none" />
        </div>
      </div>
    </div>

    <div class="animate-brand-rise-smooth text-center mt-7 flex flex-col items-center space-y-4 pointer-events-none">
      <span
        class="block text-[2.6rem] sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-none font-brand-wordmark"
        style="letter-spacing: -0.038em;"
      >
        Vastire
      </span>

      <div class="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
        <div class="animate-loading-progress-smooth h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 rounded-full"></div>
      </div>

      <span class="animate-tagline-rise block text-[11px] sm:text-xs font-bold uppercase tracking-[0.26em] text-emerald-700">
        Curated Home Essentials
      </span>
    </div>
  </div>
</div>
<script>
(function() {
  var SESSION_KEY = 'vastire_launch_splash_seen';
  var splash = document.getElementById('vastire-splash');
  if (!splash) return;

  try {
    if (sessionStorage.getItem(SESSION_KEY)) {
      splash.style.display = 'none';
      if (splash.parentNode) splash.parentNode.removeChild(splash);
      return;
    }
  } catch(e) {}

  var dismissed = false;
  function dismissSplash(fast) {
    if (dismissed) return;
    dismissed = true;
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch(e) {}
    splash.classList.remove('splash-fade-in');
    splash.classList.add('splash-fade-out');
    setTimeout(function() {
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, fast ? 150 : 350);
  }

  splash.addEventListener('click', function() { dismissSplash(true); });
  splash.addEventListener('touchstart', function() { dismissSplash(true); }, { passive: true });

  setTimeout(function() {
    dismissSplash(false);
  }, 2200);
})();
</script>
`;

export default function AppLaunchSplash() {
  return (
    <>
      <div
        id="vastire-splash-wrapper"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SPLASH_INNER_HTML }}
      />
      <CatalogBackgroundPrefetch />
    </>
  );
}
