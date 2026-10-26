"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Heart, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  message: string;
  type?: "success" | "watchlist-add" | "watchlist-remove" | "info";
}

// ── Global event bus ──────────────────────────────────────────────────────────
export function showToast(message: string, type: ToastMessage["type"] = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app:toast", { detail: { id: Date.now().toString(), message, type } })
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
      setToasts((prev) => [...prev.slice(-3), toast]); // max 4 stacked
      setTimeout(() => dismiss(toast.id), 2800);
    };
    window.addEventListener("app:toast", handler);
    return () => window.removeEventListener("app:toast", handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] flex flex-col items-center gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-slate-900/95 backdrop-blur-md text-white text-sm font-semibold rounded-2xl shadow-2xl border border-white/10 animate-toast-in max-w-xs"
        >
          {t.type === "watchlist-add" ? (
            <Heart className="w-4 h-4 fill-rose-400 text-rose-400 flex-shrink-0" />
          ) : t.type === "watchlist-remove" ? (
            <Heart className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-slate-400 hover:text-white transition ml-1"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
