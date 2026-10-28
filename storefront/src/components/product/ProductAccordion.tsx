"use client";

import React, { useState } from "react";
import { ChevronDown, Check, PackageCheck, Layers, FileText } from "lucide-react";
import { Product } from "../../lib/types";

interface ProductAccordionProps {
  product: Product;
}

const SPEC_LABELS: Record<string, string> = {
  material: "Primary Material",
  power_source: "Power / Electronics",
  package_weight: "Package Weight & Dimensions",
  fulfillment_origin: "Fulfillment Origin",
  carrier_sla: "Shipping Carrier & SLA",
  in_the_box: "Package Contents",
  warranty: "Delivery Guarantee",
};

export default function ProductAccordion({ product }: ProductAccordionProps) {
  // Collapsed by default (user opens only when clicked)
  const [isOpen, setIsOpen] = useState(false);

  // Clean description HTML to remove fabricated marketing claims
  const cleanDescriptionHtml = (product.pas_description_html || "")
    .replace(/and backed by our unconditional 30-day money-back guarantee,?/gi, "")
    .replace(/backed by our unconditional 30-day money-back guarantee,?/gi, "")
    .replace(/30-day money-back guarantee/gi, "damage-free guarantee")
    .replace(/30-day/gi, "verified");

  // Keep genuine features without unverified guarantee claims
  const cleanFeatures = (product.features || []).filter((feat) => {
    const title = (feat.title || "").toLowerCase();
    const desc = (feat.desc || "").toLowerCase();
    return (
      !title.includes("30-day") &&
      !title.includes("money-back") &&
      !desc.includes("30-day") &&
      !desc.includes("money-back")
    );
  });

  const specs = product.specs || {};
  const specEntries = Object.entries(specs).filter(
    ([, val]) => val !== null && val !== undefined && typeof val !== "object" && String(val).trim() !== ""
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden text-xs">
      <div className="p-3.5 sm:p-4">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-xs sm:text-sm group"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            Product Details, Specs & Features
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
              isOpen ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </button>

        {/* Google-style smooth CSS Grid transition (no hardcoded height, silky 60fps) */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden space-y-4 text-slate-600">
            {/* Section 1: Authentic Product Description */}
            {cleanDescriptionHtml && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Overview & Details</span>
                </div>
                <div
                  className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-2 [&_p]:leading-relaxed [&_strong]:text-slate-800"
                  dangerouslySetInnerHTML={{ __html: cleanDescriptionHtml }}
                />
              </div>
            )}

            {/* Section 2: Product Features & Highlights */}
            {cleanFeatures.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Key Features</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cleanFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-900 leading-tight">
                          {feat.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Technical Specifications Table */}
            {specEntries.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] uppercase tracking-wider">
                  <PackageCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Specifications & Package Info</span>
                </div>
                <div className="border border-slate-200/90 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {specEntries.map(([key, val]) => {
                    const label =
                      SPEC_LABELS[key] ||
                      key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-1 sm:grid-cols-3 p-2.5 text-[11px] bg-white odd:bg-slate-50/50"
                      >
                        <span className="font-semibold text-slate-500 sm:col-span-1">
                          {label}
                        </span>
                        <span className="text-slate-800 font-medium sm:col-span-2 mt-0.5 sm:mt-0">
                          {String(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
