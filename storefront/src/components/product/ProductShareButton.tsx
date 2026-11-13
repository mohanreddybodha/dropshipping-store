"use client";

import React, { useState } from "react";
import { Share2, Check } from "lucide-react";
import { showToast } from "../ui/Toast";

interface ProductShareButtonProps {
  title: string;
  heroImage?: string;
  slug?: string;
}

export default function ProductShareButton({
  title,
  slug,
}: ProductShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : slug
      ? `https://vastire.com/products/${slug}`
      : "https://vastire.com";

  const shareText = `Check out the ${title} on Vastire with free domestic US shipping!`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      showToast("Product link copied to clipboard!", "info");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast("Link: " + shareUrl, "info");
    }
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Trigger OS native share sheet if supported
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // If user cancelled / aborted native share dialog, do not fallback to copy toast
        if (err?.name === "AbortError") {
          return;
        }
        // Fallback to copy link on any other share exception
        await handleCopyLink();
      }
    } else {
      // Fallback for browsers / platforms without Web Share API
      await handleCopyLink();
    }
  };

  return (
    <button
      type="button"
      onClick={handleShareClick}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 shadow-sm border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-emerald-700 cursor-pointer"
      aria-label="Share product"
      title={copied ? "Link Copied" : "Share this product"}
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-600 animate-scale-in" />
      ) : (
        <Share2 className="w-4 h-4 text-slate-700" />
      )}
    </button>
  );
}
