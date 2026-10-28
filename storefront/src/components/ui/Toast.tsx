"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, Heart, ShoppingBag, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  message: string;
  type?: "success" | "watchlist-add" | "watchlist-remove" | "info" | "cart-add" | "cart-remove";
  actionText?: string;
  actionHref?: string;
}

// ── Global event bus ──────────────────────────────────────────────────────────
export function showToast(
  message: string,
  type: ToastMessage["type"] = "success",
  actionText?: string,
  actionHref?: string
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app:toast", {
      detail: { id: Date.now().toString(), message, type, actionText, actionHref },
    })
  );
}

// ── Toast Container (render once in AppShell) ─────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const toast = (e as CustomEvent<ToastMessage>).detail;
      setToasts((prev) => [...prev.slice(-2), toast]); // max 3 stacked
      setTimeout(() => dismiss(toast.id), 3500);
    };
    window.addEventListener("app:toast", handler);
    return () => window.removeEventListener("app:toast", handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-900/95 backdrop-blur-md text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-2xl border border-white/10 animate-toast-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {t.type === "watchlist-add" ? (
              <Heart className="w-4 h-4 fill-rose-400 text-rose-400 flex-shrink-0" />
            ) : t.type === "watchlist-remove" ? (
              <Heart className="w-4 h-4 text-slate-400 flex-shrink-0" />
            ) : t.type === "cart-add" ? (
              <ShoppingBag className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : t.type === "cart-remove" ? (
              <ShoppingBag className="w-4 h-4 text-slate-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span className="truncate">{t.message}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {t.actionHref && t.actionText && (
              <Link
                href={t.actionHref}
                onClick={() => dismiss(t.id)}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition active:scale-95 whitespace-nowrap shadow-sm"
              >
                {t.actionText}
              </Link>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-white transition p-0.5"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
