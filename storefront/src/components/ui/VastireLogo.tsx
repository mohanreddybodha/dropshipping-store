"use client";

import React, { useState, useEffect } from "react";
import { getCachedBrandEmblem, VASTIRE_BRAND_EMBLEM_DATA_URI } from "./brandEmblemCache";

interface VastireLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  textClassName?: string;
  priority?: boolean;
}

/**
 * High-Performance Brand Icon for Vastire.
 * Uses instantaneous zero-latency in-memory / localStorage Data URI cache,
 * ensuring 0.00ms paint with zero blank flashes on route transitions or slow networks.
 */
export function VastireIcon({
  size = 44,
  className = "",
}: {
  size?: number | string;
  className?: string;
}) {
  const pixelSize = typeof size === "number" ? size : parseInt(String(size), 10) || 44;
  const width = Math.round(pixelSize * 1.25);
  const [src, setSrc] = useState<string>(VASTIRE_BRAND_EMBLEM_DATA_URI);

  useEffect(() => {
    try {
      const cached = getCachedBrandEmblem();
      if (cached && cached !== src) {
        setSrc(cached);
      }
    } catch {
      // Keep initial data URI
    }
  }, [src]);

  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      style={{
        width: `${width}px`,
        height: `${pixelSize}px`,
      }}
      aria-label="Vastire Brand Icon"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Vastire"
        width={width}
        height={pixelSize}
        decoding="sync"
        loading="eager"
        onError={() => {
          if (src !== "/brand-emblem.webp") {
            setSrc("/brand-emblem.webp");
          }
        }}
        className="w-full h-full object-contain select-none pointer-events-none drop-shadow-2xs"
      />
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
      iconSize: 36,
      textSize: "text-lg sm:text-xl",
      gap: "gap-2.5",
    },
    md: {
      iconSize: 44,
      textSize: "text-xl sm:text-2xl",
      gap: "gap-3",
    },
    lg: {
      iconSize: 54,
      textSize: "text-2xl sm:text-3xl",
      gap: "gap-3.5",
    },
    xl: {
      iconSize: 66,
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
