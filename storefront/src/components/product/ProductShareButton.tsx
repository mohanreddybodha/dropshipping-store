"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Share2,
  Check,
  X,
  Copy,
  Link2,
  Mail,
  Send,
  MessageCircle,
} from "lucide-react";
import { showToast } from "../ui/Toast";

interface ProductShareButtonProps {
  title: string;
  heroImage?: string;
  slug?: string;
}

export default function ProductShareButton({
  title,
  heroImage,
  slug,
}: ProductShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : slug
      ? `https://vastire.com/products/${slug}`
      : "https://vastire.com";

  const shareText = `Check out the ${title} on Vastire with free domestic US shipping!`;

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

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

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        setIsOpen(false);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const openShareWindow = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer,width=600,height=550");
    }
  };

  // Supported sharing destinations
  const socialApps = [
    {
      name: "WhatsApp",
      bgColor: "bg-emerald-500 hover:bg-emerald-600 text-white",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      ),
      action: () =>
        openShareWindow(
          `https://api.whatsapp.com/send?text=${encodeURIComponent(
            `${shareText}\n${shareUrl}`
          )}`
        ),
    },
    {
      name: "X / Twitter",
      bgColor: "bg-slate-900 hover:bg-slate-800 text-white",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      action: () =>
        openShareWindow(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            shareText
          )}&url=${encodeURIComponent(shareUrl)}`
        ),
    },
    {
      name: "Facebook",
      bgColor: "bg-blue-600 hover:bg-blue-700 text-white",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      action: () =>
        openShareWindow(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            shareUrl
          )}`
        ),
    },
    {
      name: "Pinterest",
      bgColor: "bg-rose-600 hover:bg-rose-700 text-white",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0a12 12 0 0 0-4.37 23.18c-.05-.98-.1-2.48.02-3.55.11-.97.74-6.31.74-6.31s-.19-.38-.19-.94c0-.88.51-1.54 1.15-1.54.54 0 .8.41.8.9 0 .55-.35 1.37-.53 2.13-.15.64.32 1.16.95 1.16 1.14 0 2.02-1.2 2.02-2.93 0-1.53-1.1-2.6-2.67-2.6-1.82 0-2.89 1.37-2.89 2.78 0 .55.21 1.14.48 1.46.05.06.06.12.04.18l-.18.74c-.03.12-.1.15-.23.09-1.07-.5-1.74-2.07-1.74-3.33 0-2.71 1.97-5.2 5.68-5.2 2.98 0 5.3 2.12 5.3 4.96 0 2.96-1.87 5.34-4.46 5.34-.87 0-1.69-.45-1.97-.98l-.54 2.05c-.19.74-.72 1.67-1.07 2.24A12 12 0 1 0 12 0z" />
        </svg>
      ),
      action: () =>
        openShareWindow(
          `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
            shareUrl
          )}&media=${encodeURIComponent(
            heroImage || ""
          )}&description=${encodeURIComponent(shareText)}`
        ),
    },
    {
      name: "Telegram",
      bgColor: "bg-sky-500 hover:bg-sky-600 text-white",
      icon: <Send className="w-4 h-4" />,
      action: () =>
        openShareWindow(
          `https://t.me/share/url?url=${encodeURIComponent(
            shareUrl
          )}&text=${encodeURIComponent(shareText)}`
        ),
    },
    {
      name: "Email",
      bgColor: "bg-slate-600 hover:bg-slate-700 text-white",
      icon: <Mail className="w-4 h-4" />,
      action: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(
          `${title} on Vastire`
        )}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
      },
    },
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 shadow-sm border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-emerald-700"
        aria-label="Share product"
        title="Share this product"
      >
        <Share2 className="w-4 h-4 text-slate-700" />
      </button>

      {/* Share Modal Dialog via Portal */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3
                      id="share-dialog-title"
                      className="text-sm sm:text-base font-extrabold text-slate-900"
                    >
                      Share Product
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Share with friends or social networks
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition active:scale-90"
                  aria-label="Close share dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Product Preview Card */}
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                {heroImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={heroImage}
                    alt={title}
                    className="w-12 h-12 object-cover rounded-lg bg-white border border-slate-200/80 flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {title}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    Free Tracked US Delivery
                  </p>
                </div>
              </div>

              {/* Social Applications List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">
                  Share via Application
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {socialApps.map((app) => (
                    <button
                      key={app.name}
                      type="button"
                      onClick={app.action}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition active:scale-95 shadow-xs ${app.bgColor}`}
                    >
                      {app.icon}
                      <span className="text-[11px] font-medium leading-none">
                        {app.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Copy Link Option (Prominent inside the shared list) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Copy Link Option
                </label>
                <div className="flex items-center gap-1.5 p-1.5 pl-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <Link2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="bg-transparent text-[11px] sm:text-xs text-slate-600 flex-1 truncate outline-none select-all font-mono min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-2 font-bold text-xs rounded-lg flex items-center gap-1.5 transition active:scale-95 flex-shrink-0 ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* System Share (If native web share is available on this browser/OS) */}
              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-98"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>More System Share Options…</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
