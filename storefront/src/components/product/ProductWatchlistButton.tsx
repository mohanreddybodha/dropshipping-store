"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Product } from "../../lib/types";
import { showToast } from "../ui/Toast";
import { auth } from "../../lib/firebase";
import { toggleUserWatchlist } from "../../lib/api";

interface ProductWatchlistButtonProps {
  product: Product;
}

export default function ProductWatchlistButton({ product }: ProductWatchlistButtonProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("watchlist_items");
      if (raw) {
        const list: Product[] = JSON.parse(raw);
        setIsSaved(list.some((p) => p.slug === product.slug));
      }
    } catch {
      // Ignore
    }
  }, [product.slug]);

  const handleToggle = () => {
    try {
      const raw = localStorage.getItem("watchlist_items");
      let list: Product[] = raw ? JSON.parse(raw) : [];

      if (isSaved) {
        list = list.filter((p) => p.slug !== product.slug);
        setIsSaved(false);
        showToast("Removed from Watchlist", "watchlist-remove");
      } else {
        list.push(product);
        setIsSaved(true);
        showToast("Added to Watchlist ❤️", "watchlist-add");
      }

      localStorage.setItem("watchlist_items", JSON.stringify(list));
      window.dispatchEvent(new Event("watchlist_updated"));

      // Background cloud sync if user is authenticated
      if (auth.currentUser && product.pid) {
        toggleUserWatchlist(auth.currentUser.uid, product.pid).catch(() => {});
      }
    } catch {
      // Ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 shadow-sm border ${
        isSaved
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-emerald-700"
      }`}
      aria-label={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
      title={isSaved ? "In Watchlist" : "Add to Watchlist"}
    >
      <Plus
        className={`w-4 h-4 stroke-[2.5] transition-transform duration-200 ${
          isSaved ? "rotate-45" : ""
        }`}
      />
    </button>
  );
}
