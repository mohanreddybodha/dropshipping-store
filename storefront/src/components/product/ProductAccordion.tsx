"use client";

import React, { useState } from "react";
import { ChevronDown, Check, PackageCheck } from "lucide-react";
import { Product } from "../../lib/types";

interface ProductAccordionProps {
  product: Product;
}

export default function ProductAccordion({ product }: ProductAccordionProps) {
  // Collapsed by default (user opens only when clicked)
  const [isOpen, setIsOpen] = useState(false);

  // Clean description HTML to remove fabricated marketing claims
  const cleanDescriptionHtml = (product.pas_description_html || "")
    .replace(/and backed by our unconditional 30-day money-back guarantee,?/gi, "")
    .replace(/backed by our unconditional 30-day money-back guarantee,?/gi, "")
    .replace(/30-day money-back guarantee/gi, "quality guarantee")
    .replace(/30-day/gi, "verified");

  // Keep genuine features without duplicate delivery or unverified guarantee claims
  const cleanFeatures = (product.features || []).filter((feat) => {
    const title = (feat.title || "").toLowerCase();
    const desc = (feat.desc || "").toLowerCase();
    return (
      !title.includes("30-day") &&
      !title.includes("money-back") &&
      !desc.includes("30-day") &&
      !desc.includes("money-back") &&
      !title.includes("delivery") &&
      !title.includes("tracked")
    );
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden text-xs">
      <div className="p-4 sm:p-4.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-xs sm:text-sm group"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            Product Details & Highlights
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="pt-3 space-y-3 text-slate-600 animate-fade-in">
            {cleanDescriptionHtml && (
              <div
                className="text-xs text-slate-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: cleanDescriptionHtml }}
              />
            )}

            {cleanFeatures.length > 0 && (
              <div className="grid grid-cols-1 gap-2 pt-1">
                {cleanFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-900">{feat.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
