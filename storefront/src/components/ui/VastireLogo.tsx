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
 * High-Performance Brand Icon for Vastire.
 * Uses cached static asset /icon-512.png (zero JS bundle bloat, hardware accelerated).
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
      style={{
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
      }}
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
        textRendering="geometricPrecision"
      >
        <defs>
          <clipPath id="vastireSquircleCard">
            <rect x="0" y="0" width="1024" height="1024" rx="220" ry="220" />
          </clipPath>
        </defs>
        <rect x="0" y="0" width="1024" height="1024" rx="220" ry="220" fill="#ffffff" />
        <g clipPath="url(#vastireSquircleCard)">
          <image
            href="/icon-512.png"
            x="0"
            y="0"
            width="1024"
            height="1024"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
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
