"use client";

import { useEffect } from "react";
import { Product } from "../../lib/types";

export default function TrackRecentlyViewed({ product }: { product: Product }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recently_viewed_products");
      let list: Product[] = raw ? JSON.parse(raw) : [];
      list = list.filter((p) => p.slug !== product.slug);
      list.unshift(product);
      if (list.length > 8) {
        list = list.slice(0, 8);
      }
      localStorage.setItem("recently_viewed_products", JSON.stringify(list));
    } catch {
      // Ignore localStorage quota or private mode issues
    }
  }, [product]);

  return null;
}
