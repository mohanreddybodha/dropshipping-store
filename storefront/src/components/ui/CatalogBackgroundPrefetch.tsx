"use client";

import { useEffect } from "react";

/**
 * Non-blocking background catalog prefetcher.
 * Loads catalog data silently in background during app launch or initial render
 * without attaching any DOM or triggering re-renders.
 */
export default function CatalogBackgroundPrefetch() {
  useEffect(() => {
    import("../../lib/api")
      .then(({ getCatalog }) => {
        getCatalog({ limit: 200 }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  return null;
}
