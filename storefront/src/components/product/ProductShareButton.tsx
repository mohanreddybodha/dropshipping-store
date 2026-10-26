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
      showToast("Product link copied to clipboard!", "general");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // In case clipboard fails, fallback to window.prompt
      showToast("Link: " + window.location.href, "general");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs ${
        copied
          ? "bg-emerald-600 text-white"
          : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900"
      }`}
      aria-label="Share product"
      title="Share this product"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-white" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-slate-600" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
