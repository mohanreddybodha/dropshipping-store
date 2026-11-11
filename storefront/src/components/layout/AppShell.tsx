"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import { ToastContainer } from "../ui/Toast";
import VastireLogo from "../ui/VastireLogo";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isCheckout = pathname === "/checkout";
  const isBrowseSurface = pathname === "/" || pathname.startsWith("/collections/");
  const isProduct = pathname.startsWith("/products/");

  // Automatic stale deployment chunk reload handler (client-side only, zero SSR DOM mutation)
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent) => {
      const isChunkError =
        (e && e.message && (e.message.includes("Loading chunk") || e.message.includes("ChunkLoadError"))) ||
        ((e?.target as HTMLElement)?.tagName === "SCRIPT" &&
          (e?.target as HTMLScriptElement)?.src?.includes("/_next/static/"));
      if (isChunkError) {
        const lastReload = sessionStorage.getItem("chunk_reload_ts");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 4000) {
          sessionStorage.setItem("chunk_reload_ts", now.toString());
          window.location.reload();
        }
      }
    };
    window.addEventListener("error", handleChunkError, true);
    return () => window.removeEventListener("error", handleChunkError, true);
  }, []);

  if (isCheckout) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Distraction-Free Checkout Header */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center group" aria-label="Vastire Home">
              <VastireLogo size="sm" />
            </Link>

            <div className="flex items-center gap-4 text-xs">
              <span className="hidden sm:flex items-center gap-1.5 text-slate-500 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Secure Checkout
              </span>
              <Link
                href="/cart"
                className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Cart
              </Link>
            </div>
          </div>
        </header>

        {/* Checkout Main Flow */}
        <main className="flex-1">{children}</main>

        {/* Minimal Checkout Compliance Footer */}
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
          <p>© 2026 Vastire (vastire.com). All rights reserved.</p>
          <p className="mt-1">
            Need assistance with your order? Contact{" "}
            <a href="mailto:support@vastire.com" className="text-slate-600 underline">
              support@vastire.com
            </a>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Top Header: Rendered on home and collection pages */}
      {isBrowseSurface && <Navbar />}

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Retail Trust Pillars & Footer on Home and Collections */}
      {isBrowseSurface && <Footer />}

      {/* Native App-Style Mobile Bottom Navigation Bar: Hidden on product pages and checkout */}
      {!isProduct && <MobileBottomNav />}
    </div>
  );
}
