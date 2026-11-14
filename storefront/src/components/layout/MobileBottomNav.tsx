"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../../lib/cart";

// ── Full Gapless SVG Tab Icons (Green Theme) ──

function HomeTabIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        className="w-5 h-5 text-emerald-600 fill-current transition-transform duration-200 scale-105"
        viewBox="0 0 24 24"
      >
        <path d="M12 2L2 10.5V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V10.5L12 2Z" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-600 transition-transform duration-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CollectionsTabIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        className="w-5 h-5 text-emerald-600 fill-current transition-transform duration-200 scale-105"
        viewBox="0 0 24 24"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-600 transition-transform duration-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function CartTabIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        className="w-5 h-5 text-emerald-600 fill-current transition-transform duration-200 scale-105"
        viewBox="0 0 24 24"
      >
        <path d="M4 7C4 5.9 4.9 5 6 5H18C19.1 5 20 5.9 20 7V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19V7Z" />
        <path d="M9 5V4C9 2.34 10.34 1 12 1C13.66 1 15 2.34 15 4V5H13V4C13 3.45 12.55 3 12 3C11.45 3 11 3.45 11 4V5H9Z" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-600 transition-transform duration-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function ProfileTabIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        className="w-5 h-5 text-emerald-600 fill-current transition-transform duration-200 scale-105"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="7" r="4.5" />
        <path d="M4 21C4 16.58 7.58 13 12 13C16.42 13 20 16.58 20 21H4Z" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-600 transition-transform duration-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Do not render bottom nav on checkout or product detail pages
  if (pathname === "/checkout" || pathname.startsWith("/products/")) return null;

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: HomeTabIcon,
      isActive: pathname === "/",
    },
    {
      label: "Collections",
      href: "/watchlist",
      icon: CollectionsTabIcon,
      isActive: pathname === "/watchlist",
    },
    {
      label: "Cart",
      href: "/cart",
      icon: CartTabIcon,
      isActive: pathname === "/cart",
      badge: mounted && itemCount > 0 ? itemCount : null,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: ProfileTabIcon,
      isActive: pathname === "/profile",
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-[26px] border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5"
    >
      <div className="grid grid-cols-4 h-13 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch={true}
              onClick={(e) => {
                if (item.isActive && typeof window !== "undefined") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="flex flex-col items-center justify-center relative transition-all duration-200 active:scale-95 select-none py-1 group"
            >
              {/* WhatsApp-Style Active Indicator Pill */}
              <div
                className={`relative px-4 py-0.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                  item.isActive ? "bg-emerald-100/70" : "bg-transparent"
                }`}
              >
                <Icon active={item.isActive} />
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight transition-colors duration-150 ${
                  item.isActive
                    ? "text-emerald-700 font-bold"
                    : "text-slate-600 font-medium group-hover:text-slate-900"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Modern Centered Home Indicator Bar */}
      <div className="w-32 h-1 bg-slate-300 rounded-full mx-auto mt-1" />
    </nav>
  );
}
