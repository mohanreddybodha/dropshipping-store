"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// ── Custom SVG Tab Icons Matching User Design (media_1794652588225_edab7147.png) ──

function HomeTabIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg className="w-5 h-5 text-rose-500 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.5L2.5 10.5C2.18 10.77 2 11.17 2 11.6V20C2 21.1 2.9 22 4 22H9.5C9.78 22 10 21.78 10 21.5V15.5C10 14.67 10.67 14 11.5 14H12.5C13.33 14 14 14.67 14 15.5V21.5C14 21.78 14.22 22 14.5 22H20C21.1 22 22 21.1 22 20V11.6C22 11.17 21.82 10.77 21.5 10.5L12 2.5Z" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-600"
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

function MessagesTabIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V17C2 18.1 2.9 19 4 19H6V22.5L10.5 19H20C21.1 19 22 18.1 22 17V4C22 2.9 21.1 2 20 2Z" />
        <line x1="7" y1="8.5" x2="17" y2="8.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="7" y1="12.5" x2="14" y2="12.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="13" y2="12" />
    </svg>
  );
}

function SearchTabIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        className="w-5 h-5 text-rose-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function HistoryTabIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <polyline
          points="12 6 12 12 16 12"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ProfileTabIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="7" r="4.5" />
        <path d="M4 21C4 16.58 7.58 13 12 13C16.42 13 20 16.58 20 21H4Z" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-600"
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
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Listen to search open/close events from Navbar
  useEffect(() => {
    const onSearchOpen = () => setIsSearchActive(true);
    const onSearchClose = () => setIsSearchActive(false);

    window.addEventListener("app:search_opened", onSearchOpen);
    window.addEventListener("app:search_closed", onSearchClose);

    return () => {
      window.removeEventListener("app:search_opened", onSearchOpen);
      window.removeEventListener("app:search_closed", onSearchClose);
    };
  }, []);

  // Reset search active state on route changes unless query has active search
  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("search");
      if (!q || q === "open") {
        setIsSearchActive(q === "open");
      }
    }
  }, [pathname]);

  // Do not render bottom nav on checkout or product detail pages
  if (pathname === "/checkout" || pathname.startsWith("/products/")) return null;

  const isHomeActive = pathname === "/" && !isSearchActive;
  const isMessagesActive = pathname === "/messages";
  const isHistoryActive = pathname === "/orders";
  const isProfileActive = pathname === "/profile";

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("app:open_search"));
    } else {
      router.push("/?search=open");
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-[26px] border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
    >
      <div className="grid grid-cols-5 h-12">
        {/* 1. Home Tab */}
        <Link
          href="/"
          prefetch={true}
          onClick={(e) => {
            if (isHomeActive && typeof window !== "undefined") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="flex flex-col items-center justify-center transition-all duration-150 active:scale-95 select-none"
        >
          <HomeTabIcon active={isHomeActive} />
          <span
            className={`text-[11px] mt-1 tracking-tight ${
              isHomeActive ? "text-rose-500 font-medium" : "text-slate-600 font-normal"
            }`}
          >
            Home
          </span>
        </Link>

        {/* 2. Messages Tab */}
        <Link
          href="/messages"
          prefetch={true}
          className="flex flex-col items-center justify-center transition-all duration-150 active:scale-95 select-none"
        >
          <MessagesTabIcon active={isMessagesActive} />
          <span
            className={`text-[11px] mt-1 tracking-tight ${
              isMessagesActive ? "text-rose-500 font-medium" : "text-slate-600 font-normal"
            }`}
          >
            Messages
          </span>
        </Link>

        {/* 3. Search Tab */}
        <button
          type="button"
          onClick={handleSearchClick}
          className="flex flex-col items-center justify-center transition-all duration-150 active:scale-95 select-none cursor-pointer"
        >
          <SearchTabIcon active={isSearchActive} />
          <span
            className={`text-[11px] mt-1 tracking-tight ${
              isSearchActive ? "text-rose-500 font-medium" : "text-slate-600 font-normal"
            }`}
          >
            Search
          </span>
        </button>

        {/* 4. History Tab */}
        <Link
          href="/orders"
          prefetch={true}
          className="flex flex-col items-center justify-center transition-all duration-150 active:scale-95 select-none"
        >
          <HistoryTabIcon active={isHistoryActive} />
          <span
            className={`text-[11px] mt-1 tracking-tight ${
              isHistoryActive ? "text-rose-500 font-medium" : "text-slate-600 font-normal"
            }`}
          >
            History
          </span>
        </Link>

        {/* 5. Profile Tab */}
        <Link
          href="/profile"
          prefetch={true}
          className="flex flex-col items-center justify-center transition-all duration-150 active:scale-95 select-none"
        >
          <ProfileTabIcon active={isProfileActive} />
          <span
            className={`text-[11px] mt-1 tracking-tight ${
              isProfileActive ? "text-rose-500 font-medium" : "text-slate-600 font-normal"
            }`}
          >
            Profile
          </span>
        </Link>
      </div>

      {/* Modern Centered Home Indicator Bar */}
      <div className="w-32 h-1 bg-slate-300 rounded-full mx-auto mt-1" />
    </nav>
  );
}
