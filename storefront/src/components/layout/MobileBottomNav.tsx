"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../../lib/cart";
import { auth, onAuthStateChanged, FirebaseUser } from "../../lib/firebase";

// ── 1. Home Tab Icons (Exact match to media_1794656088222_478ea279.png) ──

function HomeActiveIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-100" viewBox="0 0 24 24" fill="currentColor">
      {/* Pitched roof house with centered rectangular door cutout */}
      <path d="M12 3L2 12H5V21H10V14H14V21H19V12H22L12 3Z" />
    </svg>
  );
}

function HomeInactiveIcon() {
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

// ── 2. Collections Tab Icons (Watchlist / Collections) ──

function CollectionsActiveIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-100 fill-current" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function CollectionsInactiveIcon() {
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
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

// ── 3. Cart Tab Icons (Exact match to media_1794656095650_4a4a7bc0.png) ──

function CartActiveIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-100" viewBox="0 0 24 24" fill="currentColor">
      {/* Shopping bag with arched handle and handle attachment tabs */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 7C4.9 7 4 7.9 4 9V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V9C20 7.9 19.1 7 18 7H16V5C16 2.8 14.2 1 12 1C9.8 1 8 2.8 8 5V7H6ZM10 5C10 3.9 10.9 3 12 3C13.1 3 14 3.9 14 5V7H10V5ZM8 10C8 9.45 8.45 9 9 9C9.55 9 10 9.45 10 10V11C10 11.55 9.55 12 9 12C8.45 12 8 11.55 8 11V10ZM14 10C14 9.45 14.45 9 15 9C15.55 9 16 9.45 16 10V11C16 11.55 15.55 12 15 12C14.45 12 14 11.55 14 11V10Z"
      />
    </svg>
  );
}

function CartInactiveIcon() {
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
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

// ── 4. Profile / You Tab Icons (Exact match to media_1794656146201_ca3cd319.png) ──

function ProfileActiveIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-100 fill-current" viewBox="0 0 24 24">
      <circle cx="12" cy="7" r="4.5" />
      <path d="M4 21C4 16.58 7.58 13 12 13C16.42 13 20 16.58 20 21H4Z" />
    </svg>
  );
}

function ProfileInactiveIcon() {
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
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Do not render bottom nav on checkout or product detail pages
  if (pathname === "/checkout" || pathname.startsWith("/products/")) return null;

  const userInitial = (
    currentUser?.displayName ||
    currentUser?.email ||
    "M"
  )
    .trim()[0]
    .toUpperCase();
  const userPhoto = currentUser?.photoURL;
  const isAuthenticated = Boolean(currentUser);

  const navItems = [
    {
      label: "Home",
      href: "/",
      isActive: pathname === "/",
      renderIcon: (active: boolean) => (active ? <HomeActiveIcon /> : <HomeInactiveIcon />),
    },
    {
      label: "Collections",
      href: "/watchlist",
      isActive: pathname === "/watchlist",
      renderIcon: (active: boolean) =>
        active ? <CollectionsActiveIcon /> : <CollectionsInactiveIcon />,
    },
    {
      label: "Cart",
      href: "/cart",
      isActive: pathname === "/cart",
      badge: mounted && itemCount > 0 ? itemCount : null,
      renderIcon: (active: boolean) => (active ? <CartActiveIcon /> : <CartInactiveIcon />),
    },
    {
      // Authenticated users see "You" with initial circle matching media_1794656146201_ca3cd319.png;
      // Unauthenticated users see "Profile" with standard user icon as it presently exists.
      label: isAuthenticated ? "You" : "Profile",
      href: "/profile",
      isActive: pathname === "/profile",
      renderIcon: (active: boolean) => {
        if (isAuthenticated) {
          return userPhoto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={userPhoto}
              alt="User"
              className="w-6 h-6 rounded-full object-cover ring-1 ring-white/50"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#f97316] text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {userInitial}
            </div>
          );
        }
        return active ? <ProfileActiveIcon /> : <ProfileInactiveIcon />;
      },
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-[26px] border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
    >
      <div className="grid grid-cols-4 h-14 items-center">
        {navItems.map((item) => {
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
              className="flex flex-col items-center justify-center relative transition-all duration-200 active:scale-95 select-none py-0.5 group"
            >
              {/* Material 3 / WhatsApp Stadium Pill Container matching reference images */}
              <div
                className={`relative w-16 h-8 rounded-full transition-all duration-200 flex items-center justify-center ${
                  item.isActive
                    ? "bg-[#047857] shadow-xs"
                    : "bg-transparent group-hover:bg-slate-100"
                }`}
              >
                {item.renderIcon(item.isActive)}

                {/* Cart Badge */}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs border-2 border-white">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] mt-1 tracking-tight transition-colors duration-150 ${
                  item.isActive
                    ? "text-slate-900 font-bold"
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
