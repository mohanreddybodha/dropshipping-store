"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

interface ProductGalleryProps {
  images?: string[];
  title: string;
  topRightActions?: React.ReactNode;
}

export default function ProductGallery({ images = [], title, topRightActions }: ProductGalleryProps) {
  // Ensure non-empty initial array
  const initialImages = images && images.length > 0 ? images : ["/placeholder.jpg"];
  const [galleryImages, setGalleryImages] = useState<string[]>(initialImages);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Sync state if parent images prop updates
  useEffect(() => {
    if (images && images.length > 0) {
      setGalleryImages((prev) => {
        const combined = Array.from(new Set([...images, ...prev.filter((i) => i !== "/placeholder.jpg")]));
        return combined.length > 0 ? combined : ["/placeholder.jpg"];
      });
    }
  }, [images]);

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  }, [galleryImages.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  }, [galleryImages.length]);

  // Handle escape key to close lightbox & left/right arrows for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, handlePrev, handleNext]);

  // Synchronize gallery when user switches product variants across ALL products
  useEffect(() => {
    const handleVariantImage = (e: Event) => {
      const detail = (e as CustomEvent<{ imageUrl?: string }>).detail;
      const targetUrl = detail?.imageUrl?.trim();
      if (!targetUrl) return;

      const normalize = (u: string) => u.replace(/^https?:/, "").replace(/\/$/, "");
      const targetNorm = normalize(targetUrl);

      setGalleryImages((currentList) => {
        const foundIdx = currentList.findIndex((img) => normalize(img) === targetNorm);
        if (foundIdx >= 0) {
          setSelectedIndex(foundIdx);
          return currentList;
        } else {
          // Prepend variant image to the gallery so it becomes immediately visible at index 0
          const newList = [targetUrl, ...currentList.filter((img) => img !== "/placeholder.jpg")];
          setSelectedIndex(0);
          return newList;
        }
      });
    };

    window.addEventListener("product:variant_image_change", handleVariantImage);
    return () => window.removeEventListener("product:variant_image_change", handleVariantImage);
  }, []);

  return (
    <div className="space-y-4">
      {/* Main Image Frame */}
      <div className="relative w-full aspect-square max-h-[500px] bg-slate-50 border border-slate-200/80 rounded-3xl overflow-hidden group shadow-sm flex items-center justify-center">
        {/* Top-Right Floating Overlay (Watchlist & Share) */}
        {topRightActions && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2">
            {topRightActions}
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={galleryImages[selectedIndex] || galleryImages[0] || "/placeholder.jpg"}
          alt={`${title} - View ${selectedIndex + 1}`}
          className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
          onClick={() => setIsLightboxOpen(true)}
        />

        {/* Zoom Hint Badge */}
        <button
          onClick={() => setIsLightboxOpen(true)}
          className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm flex items-center gap-1.5 transition opacity-90 group-hover:opacity-100"
          aria-label="Enlarge image"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Click to Zoom</span>
        </button>

        {/* Left/Right Floating Navigation Chevrons */}
        {galleryImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 shadow-md flex items-center justify-center transition active:scale-95 border border-slate-200"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 shadow-md flex items-center justify-center transition active:scale-95 border border-slate-200"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Interactive Thumbnail Strip */}
      {galleryImages.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-thin">
          {galleryImages.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              onClick={() => setSelectedIndex(idx)}
              className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-50 border-2 transition active:scale-95 ${
                selectedIndex === idx
                  ? "border-emerald-600 ring-2 ring-emerald-600/30 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 opacity-75 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`${title} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar with Counter & Close */}
          <div className="flex items-center justify-between text-white max-w-7xl mx-auto w-full z-10">
            <span className="text-sm font-bold tracking-wide bg-white/10 px-3 py-1 rounded-full">
              {selectedIndex + 1} / {galleryImages.length}
            </span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
              aria-label="Close fullscreen modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Central High-Res Stage */}
          <div
            className="relative flex-1 flex items-center justify-center max-w-5xl mx-auto w-full my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galleryImages[selectedIndex] || galleryImages[0] || "/placeholder.jpg"}
              alt={`${title} full display`}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />

            {/* Modal Navigation Buttons */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-2 sm:-left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition active:scale-90"
                  aria-label="Previous picture"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 sm:-right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition active:scale-90"
                  aria-label="Next picture"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails in Lightbox */}
          {galleryImages.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {galleryImages.map((img, idx) => (
                <button
                  key={`${img}-lb-${idx}`}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition ${
                    selectedIndex === idx
                      ? "border-emerald-500 scale-105 shadow-md"
                      : "border-white/20 opacity-50 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
