"use client";

import React, { useState, useEffect } from "react";
import { Product } from "../../lib/types";
import HorizontalProductRow from "../catalog/HorizontalProductRow";

export default function ProductRecentlyViewedRow({ currentSlug }: { currentSlug: string }) {
  const [recentItems, setRecentItems] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("recently_viewed_products");
      if (raw) {
        const parsed: Product[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentItems(parsed.filter((p) => p.slug !== currentSlug));
        }
      }
    } catch {
      // Ignore
    }
  }, [currentSlug]);

  if (recentItems.length === 0) return null;

  return (
    <HorizontalProductRow
      title="Recently Viewed"
      viewAllHref="/"
      viewAllText="View All"
      products={recentItems}
    />
  );
}
