/**
 * Internal Navigation History Tracker for Vastire Storefront
 *
 * Provides intelligent, deterministic back-navigation across the entire store:
 * 1. SPA Navigation: Next.js <Link> client transitions do not update document.referrer.
 *    By maintaining an internal session navigation stack in sessionStorage, clicking
 *    "Back" on any product or subpage returns the user to their exact originating page
 *    (e.g., Cart, Watchlist, Search results, or Profile) with all queries and state preserved.
 * 2. External Direct Traffic: When visitors arrive from external direct URLs
 *    (such as Pinterest, Instagram, Facebook, TikTok, or direct shared links),
 *    browser window.history.back() would eject them from Vastire back to the social platform.
 *    This tracker identifies direct arrivals (stack length <= 1) and navigates them to
 *    Vastire's Home ("/") instead, retaining the shopper and preventing lost sales.
 */

const STORAGE_KEY = "vastire_internal_nav_stack";
const MAX_STACK_SIZE = 50;

/**
 * Record the current route in the session navigation stack.
 * Called on every route transition in AppShell.
 */
export function recordCurrentRoute(): void {
  if (typeof window === "undefined") return;

  try {
    const currentUrl = window.location.pathname + window.location.search;
    if (!currentUrl.startsWith("/")) return;

    // Ignore Next.js internals, API routes, or auth callback hashes
    if (
      currentUrl.startsWith("/api/") ||
      currentUrl.startsWith("/_next/") ||
      currentUrl.includes("__next")
    ) {
      return;
    }

    const raw = sessionStorage.getItem(STORAGE_KEY);
    let stack: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) stack = parsed;
      } catch {}
    }

    const last = stack[stack.length - 1];
    if (last === currentUrl) {
      // Avoid duplicate consecutive entries for the same page
      return;
    }

    // If the user already navigated back to the second-to-last item, pop the top
    if (stack.length >= 2 && stack[stack.length - 2] === currentUrl) {
      stack.pop();
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
      return;
    }

    // Push current route onto stack
    stack.push(currentUrl);
    if (stack.length > MAX_STACK_SIZE) {
      stack = stack.slice(-MAX_STACK_SIZE);
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {
    // Graceful silent fallback if sessionStorage is inaccessible
  }
}

/**
 * Look up the previous internal route without modifying the stack.
 */
export function getPreviousInternalRoute(): string | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Highest priority: explicit return URL query parameter (?from=/cart or ?returnUrl=/watchlist)
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get("from") || params.get("returnUrl");
    if (fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//")) {
      return fromParam;
    }

    // 2. Inspect session navigation stack
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stack: string[] = JSON.parse(raw);
    if (!Array.isArray(stack) || stack.length <= 1) {
      return null;
    }

    const currentUrl = window.location.pathname + window.location.search;
    for (let i = stack.length - 1; i >= 0; i--) {
      const entry = stack[i];
      if (entry && entry !== currentUrl && entry.startsWith("/")) {
        return entry;
      }
    }
  } catch {
    // Ignore error
  }

  return null;
}

/**
 * Intelligently navigate back to the previous internal page, or to the fallback (Home)
 * if the user entered directly from social media or an external link.
 */
export function popNavigationHistory(
  router: { push: (url: string) => void },
  fallbackHref: string = "/"
): void {
  if (typeof window === "undefined") {
    router.push(fallbackHref || "/");
    return;
  }

  try {
    // 1. Check explicit return query parameters first
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get("from") || params.get("returnUrl");
    if (fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//")) {
      router.push(fromParam);
      return;
    }

    // 2. Read session navigation stack
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stack: string[] = JSON.parse(raw);
      if (Array.isArray(stack) && stack.length > 1) {
        const currentUrl = window.location.pathname + window.location.search;

        // Discard all trailing entries that match current URL
        while (stack.length > 0 && stack[stack.length - 1] === currentUrl) {
          stack.pop();
        }

        if (stack.length > 0) {
          const target = stack.pop()!;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
          if (target && target.startsWith("/")) {
            router.push(target);
            return;
          }
        }
      }
    }
  } catch {
    // Fall back to safe home route
  }

  // 3. Fallback for direct external entries (Pinterest, Instagram, typed URL)
  router.push(fallbackHref || "/");
}
