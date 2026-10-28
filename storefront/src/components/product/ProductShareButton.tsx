"use client";

import React, { useState } from "react";
import { Share2, Check } from "lucide-react";
import { showToast } from "../ui/Toast";

interface ProductShareButtonProps {
  title: string;
}

export default function ProductShareButton({ title }: ProductShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof window === "undefined") return;

    const shareData = {
      title,
      text: `Check out ${title} on Domestic Lab with free domestic delivery!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to clipboard
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast("Product link copied to clipboard!", "info");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // In case clipboard fails, fallback to window.prompt
      showToast("Link: " + window.location.href, "info");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 shadow-sm border ${
        copied
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-emerald-700"
      }`}
      aria-label="Share product"
      title="Share this product"
    >
      {copied ? (
        <Check className="w-4 h-4 text-white stroke-[2.5]" />
      ) : (
        <Share2 className="w-4 h-4 text-slate-700" />
      )}
    </button>
  );
}
