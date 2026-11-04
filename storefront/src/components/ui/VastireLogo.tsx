"use client";

import React from "react";

interface VastireLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  textClassName?: string;
  priority?: boolean;
}

/**
 * Flat pure-vector SVG brand icon for Vastire.
 * No raster images, no WebP, no photo textures — crisp at any resolution.
 * Squircle background (white) with emerald shopping cart icon.
 */
export function VastireIcon({
  size = 42,
  className = "",
}: {
  size?: number | string;
  className?: string;
}) {
  const pixelSize = typeof size === "number" ? size : parseInt(String(size), 10) || 42;

  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      style={{ width: `${pixelSize}px`, height: `${pixelSize}px` }}
      aria-label="Vastire Brand Icon"
    >
      <svg
        viewBox="0 0 1024 1024"
        width={pixelSize}
        height={pixelSize}
        className="w-full h-full select-none pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        shapeRendering="geometricPrecision"
      >
        {/* Squircle background */}
        <rect x="42" y="42" width="940" height="940" rx="210" ry="210" fill="#ffffff" />

        {/* ── Flat emerald shopping cart ── */}

        {/* Cart handle arc */}
        <path
          d="M 340 480 C 340 310 420 240 512 240 C 604 240 684 310 684 480"
          stroke="#059669"
          strokeWidth="72"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cart body */}
        <rect x="270" y="460" width="484" height="310" rx="52" fill="#10b981" />

        {/* Top lip / rim */}
        <rect x="250" y="450" width="524" height="80" rx="40" fill="#059669" />

        {/* Three item slots inside cart */}
        <rect x="315" y="560" width="110" height="150" rx="20" fill="white" fillOpacity="0.22" />
        <rect x="457" y="560" width="110" height="150" rx="20" fill="white" fillOpacity="0.22" />
        <rect x="599" y="560" width="110" height="150" rx="20" fill="white" fillOpacity="0.22" />

        {/* Left wheel */}
        <circle cx="358" cy="800" r="72" fill="#064e3b" />
        <circle cx="358" cy="800" r="36" fill="#10b981" />
        <circle cx="358" cy="800" r="14" fill="#064e3b" />

        {/* Right wheel */}
        <circle cx="666" cy="800" r="72" fill="#064e3b" />
        <circle cx="666" cy="800" r="36" fill="#10b981" />
        <circle cx="666" cy="800" r="14" fill="#064e3b" />

        {/* Squircle border */}
        <rect x="42" y="42" width="940" height="940" rx="210" ry="210" fill="none" stroke="#E2E8F0" strokeWidth="6" />
      </svg>
    </div>
  );
}

export default function VastireLogo({
  size = "md",
  showText = true,
  className = "",
  textClassName = "",
}: VastireLogoProps) {
  const sizePresets = {
    sm: {
      iconSize: 34,
      textSize: "text-lg sm:text-xl",
      gap: "gap-2.5",
    },
    md: {
      iconSize: 42,
      textSize: "text-xl sm:text-2xl",
      gap: "gap-3",
    },
    lg: {
      iconSize: 52,
      textSize: "text-2xl sm:text-3xl",
      gap: "gap-3.5",
    },
    xl: {
      iconSize: 64,
      textSize: "text-3xl sm:text-4xl",
      gap: "gap-4",
    },
  };

  const preset = sizePresets[size] || sizePresets.md;

  return (
    <div className={`inline-flex items-center ${preset.gap} flex-shrink-0 group select-none ${className}`}>
      {/* ── Precision Scalable SVG Brand Icon ── */}
      <VastireIcon size={preset.iconSize} />

      {/* ── Brand Wordmark strictly beside the icon with NO subtitle ── */}
      {showText && (
        <span
          className={`select-none leading-none text-slate-900 tracking-tight font-brand-wordmark ${textClassName}`}
          style={{
            fontSize: size === "sm" ? "21px" : size === "lg" ? "28px" : size === "xl" ? "34px" : "25px",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: "#0f172a",
            fontFamily: "var(--font-poppins), 'VastireBrandFont', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            lineHeight: 1,
          }}
        >
          Vastire
        </span>
      )}
    </div>
  );
}
