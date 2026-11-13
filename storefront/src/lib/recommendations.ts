import type { Product } from "./types";

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 * Given a numeric seed, produces a deterministic sequence in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a deterministic RNG.
 */
export function seededShuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Retrieve or generate a session-specific rotation seed.
 * Changes on each new browsing session, but remains stable across page navigations within a session.
 * On SSR / node, uses a daily calendar seed (year * 365 + day_of_year) for deterministic hydration.
 */
export function getRotationSeed(): number {
  if (typeof window === "undefined") {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return now.getFullYear() * 365 + dayOfYear;
  }

  try {
    const key = "vastire_session_seed";
    const existing = sessionStorage.getItem(key);
    if (existing) {
      const parsed = parseInt(existing, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const newSeed = Math.floor(Math.random() * 100000) + 1;
    sessionStorage.setItem(key, String(newSeed));
    return newSeed;
  } catch {
    return 42;
  }
}

/**
 * Record a user interaction with a category (e.g. clicking a product card or viewing a product).
 */
export function recordCategoryAffinity(category: string): void {
  if (typeof window === "undefined" || !category || category === "All Products") return;
  try {
    const key = "vastire_affinity_history";
    const raw = localStorage.getItem(key);
    let history: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(history)) history = [];
    history.unshift(category.trim());
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    // Ignore storage errors in private browsing
  }
}

/**
 * Calculate category affinity weights from user activity:
 * - Cart items (+5 per item in category)
 * - Watchlist items (+3 per item in category)
 * - Recent views/clicks (+2 for top recent, +1 for older)
 */
export function getCategoryAffinityScores(): Record<string, number> {
  const scores: Record<string, number> = {};
  if (typeof window === "undefined") return scores;

  try {
    // 1. Cart Items
    const cartRaw = localStorage.getItem("app_cart");
    if (cartRaw) {
      const cartItems = JSON.parse(cartRaw);
      if (Array.isArray(cartItems)) {
        for (const item of cartItems) {
          const cat = item?.product?.category;
          if (cat) scores[cat] = (scores[cat] || 0) + 5;
        }
      }
    }

    // 2. Watchlist Items
    const watchRaw = localStorage.getItem("watchlist_items");
    if (watchRaw) {
      const watchItems = JSON.parse(watchRaw);
      if (Array.isArray(watchItems)) {
        for (const prod of watchItems) {
          const cat = prod?.category;
          if (cat) scores[cat] = (scores[cat] || 0) + 3;
        }
      }
    }

    // 3. Recent Category Clicks
    const histRaw = localStorage.getItem("vastire_affinity_history");
    if (histRaw) {
      const history = JSON.parse(histRaw);
      if (Array.isArray(history)) {
        history.slice(0, 10).forEach((cat: unknown, idx: number) => {
          if (cat && typeof cat === "string") {
            const weight = idx < 3 ? 2 : 1;
            scores[cat] = (scores[cat] || 0) + weight;
          }
        });
      }
    }
  } catch {
    // Ignore private browsing errors
  }

  return scores;
}

/**
 * Personalization & Diversity Interleaving Algorithm:
 * 1. Groups products into distinct category buckets.
 * 2. Deterministically shuffles each bucket using the session/daily seed.
 * 3. Orders category buckets by user affinity score (with seed-based tie-breaking).
 * 4. Interleaves products in a round-robin stride across categories so items of the same
 *    type never cluster together and every visit displays a fresh, rotating front showcase.
 */
export function getPersonalizedFeaturedProducts(
  products: Product[],
  seed?: number
): Product[] {
  if (!products || products.length <= 1) return products || [];

  const actualSeed = seed ?? getRotationSeed();
  const rng = mulberry32(actualSeed);
  const affinityScores = getCategoryAffinityScores();

  // Group products by primary category
  const buckets: Record<string, Product[]> = {};
  for (const p of products) {
    const cat = p.category || "Home & Kitchen";
    if (!buckets[cat]) buckets[cat] = [];
    buckets[cat].push(p);
  }

  // Shuffle within each category bucket using deterministic RNG
  const shuffledBuckets: Record<string, Product[]> = {};
  for (const [cat, items] of Object.entries(buckets)) {
    shuffledBuckets[cat] = seededShuffle(items, rng);
  }

  // Sort categories by user affinity score, breaking ties using seeded hash
  const categoryNames = Object.keys(shuffledBuckets).sort((a, b) => {
    const scoreA = affinityScores[a] || 0;
    const scoreB = affinityScores[b] || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    // Tie-break with deterministic hash based on seed
    const hashA = (a.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) + actualSeed) % 100;
    const hashB = (b.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) + actualSeed) % 100;
    return hashB - hashA;
  });

  // Round-robin stride across categories
  const interleaved: Product[] = [];
  let addedAny = true;
  let stride = 0;

  while (addedAny) {
    addedAny = false;
    for (const cat of categoryNames) {
      const bucket = shuffledBuckets[cat];
      if (stride < bucket.length) {
        interleaved.push(bucket[stride]);
        addedAny = true;
      }
    }
    stride++;
  }

  return interleaved;
}
