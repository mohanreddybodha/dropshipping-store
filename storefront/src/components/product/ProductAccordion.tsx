"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Check, PackageCheck, Layers, FileText, CheckCircle2, HelpCircle } from "lucide-react";
import { Product, Variant } from "../../lib/types";
import { sanitizeProductDescriptionHtml } from "../../lib/seo";

interface ProductAccordionProps {
  product: Product;
}

const SPEC_LABELS: Record<string, string> = {
  material: "Primary Material",
  piece_count: "Piece Count / Set Size",
  dimensions: "Physical Dimensions",
  blade_length: "Blade & Handle Specs",
  cable_length: "Cable Length",
  power_rating: "Power & Fast Charge Spec",
  capacity: "Capacity & Weight Rating",
  installation: "Mounting & Installation",
  fit_type: "Garment Fit",
  care_instructions: "Care Instructions",
  weather_resistance: "Weather Resistance",
  power_source: "Power / Electronics",
  package_weight: "Package Weight & Parcel Form",
  fulfillment_origin: "Fulfillment Origin",
  carrier_sla: "Shipping Carrier & SLA",
  in_the_box: "Package Contents",
};

export default function ProductAccordion({ product }: ProductAccordionProps) {
  // Collapsed by default (user opens only when clicked)
  const [isOpen, setIsOpen] = useState(false);
  const [activeVariant, setActiveVariant] = useState<Variant | undefined>(product.variants?.[0]);

  // Reactively track selected specification from tier change events
  useEffect(() => {
    const handleVariantChange = (e: any) => {
      if (e.detail?.variant) {
        setActiveVariant(e.detail.variant);
      }
    };
    window.addEventListener("product:tier_change", handleVariantChange);
    return () => window.removeEventListener("product:tier_change", handleVariantChange);
  }, []);

  // Clean description HTML: replace raw supplier slug titles with clean product title
  const cleanDescriptionHtml = sanitizeProductDescriptionHtml(
    product.pas_description_html || "",
    product.title
  )
    .replace(/and backed by our unconditional 30-day money-back guarantee,?/gi, "")
    .replace(/backed by our unconditional 30-day money-back guarantee,?/gi, "")
    .replace(/30-day money-back guarantee/gi, "verified craftsmanship")
    .replace(/damage-free delivery guarantee/gi, "domestic dispatch")
    .replace(/30-day/gi, "verified");

  // Keep genuine features without unverified guarantee claims
  const cleanFeatures = (product.features || []).filter((feat) => {
    const title = (feat.title || "").toLowerCase();
    const desc = (feat.desc || "").toLowerCase();
    return (
      !title.includes("30-day") &&
      !title.includes("money-back") &&
      !desc.includes("30-day") &&
      !desc.includes("money-back") &&
      !title.includes("guarantee") &&
      !desc.includes("guarantee")
    );
  });

  const specs = product.specs || {};
  const specEntries = Object.entries(specs).filter(
    ([key, val]) =>
      key !== "warranty" &&
      val !== null &&
      val !== undefined &&
      typeof val !== "object" &&
      String(val).trim() !== ""
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
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] uppercase tracking-wider">
                <PackageCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Specifications & Verified Package Info</span>
              </div>
              <div className="border border-slate-200/90 rounded-xl overflow-hidden divide-y divide-slate-100">
                {/* Dynamically Selected Model Row */}
                {activeVariant && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 p-2.5 text-[11px] bg-emerald-50/50">
                      <span className="font-bold text-emerald-900 sm:col-span-1">
                        Selected Option
                      </span>
                      <span className="text-emerald-950 font-bold sm:col-span-2 mt-0.5 sm:mt-0 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{activeVariant.display_name || activeVariant.variant_name || "Standard Model"}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 p-2.5 text-[11px] bg-white">
                      <span className="font-semibold text-slate-500 sm:col-span-1">
                        Active Option Price
                      </span>
                      <span className="text-slate-900 font-mono font-bold sm:col-span-2 mt-0.5 sm:mt-0">
                        ${activeVariant.retail_price_1x.toFixed(2)} USD
                      </span>
                    </div>
                  </>
                )}

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

            {/* Section 4: Frequently Asked Questions (Backed by FAQPage JSON-LD) */}
            {Array.isArray(product.faq_schema) && product.faq_schema.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] uppercase tracking-wider">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Shipping & Product FAQ</span>
                </div>
                <div className="space-y-2">
                  {product.faq_schema
                    .filter((faq) => faq?.question && faq?.answer)
                    .map((faq, idx) => {
                      let answer = faq.answer;
                      if (
                        faq.question.toLowerCase().includes("return") ||
                        answer.toLowerCase().includes("30 day") ||
                        answer.toLowerCase().includes("money-back")
                      ) {
                        answer =
                          "We provide a 7-day transit damage & defect replacement guarantee. Email photos to support@vastire.com within 7 calendar days of delivery for an immediate replacement or refund.";
                      }
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5"
                        >
                          <h4 className="text-[11px] font-bold text-slate-900">{faq.question}</h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{answer}</p>
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
