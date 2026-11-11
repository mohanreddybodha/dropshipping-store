/**
 * Generates clean, keyword-rich, human-readable product URL slugs from product titles.
 * Shared across `next.config.js` (build-time 301 redirects) and TypeScript runtime modules.
 *
 * @param {string | null | undefined} title
 * @param {string} [fallbackSlug]
 * @returns {string}
 */
function toSeoProductSlug(title, fallbackSlug) {
  const clean = String(title || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || String(fallbackSlug || "").trim().toLowerCase() || "product";
}

/**
 * Assigns unique clean keyword slugs across a catalog while preserving each item's
 * original database slug in `legacy_slug` for backward compatibility and 301 redirects.
 *
 * @template {{ id?: number | string; pid?: string; title?: string; slug?: string; legacy_slug?: string }} T
 * @param {T[]} products
 * @returns {T[]}
 */
function normalizeCatalogSlugs(products) {
  const seen = new Map();
  return products.map((product) => {
    const rawOriginalSlug = String(product.legacy_slug || product.slug || "").trim();
    const baseCleanSlug = toSeoProductSlug(product.title, rawOriginalSlug);
    const keyId = String(product.pid || product.id || rawOriginalSlug);

    let finalSlug = baseCleanSlug;
    const owner = seen.get(finalSlug);
    if (owner && owner !== keyId) {
      const suffix =
        rawOriginalSlug.split("-").pop() || String(product.pid || product.id || "").slice(-5);
      finalSlug = `${baseCleanSlug}-${suffix}`.replace(/-+/g, "-");
    }
    seen.set(finalSlug, keyId);

    return {
      ...product,
      legacy_slug: rawOriginalSlug || finalSlug,
      slug: finalSlug,
    };
  });
}

module.exports = {
  toSeoProductSlug,
  normalizeCatalogSlugs,
};
