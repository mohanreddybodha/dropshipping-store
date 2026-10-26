"use client";

import React, { useState } from "react";
import { ChevronDown, Check, ShieldCheck, Truck, PackageCheck, HelpCircle } from "lucide-react";
import { Product, Variant } from "../../lib/types";

interface ProductAccordionProps {
  product: Product;
  variant?: Variant;
}

export default function ProductAccordion({ product, variant }: ProductAccordionProps) {
  // Collapsed by default until the customer wants to explore
  const [openSection, setOpenSection] = useState<string>("");

  const toggle = (section: string) => {
    setOpenSection((prev) => (prev === section ? "" : section));
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden text-xs">
      {/* 1. Highlights & Benefits */}
      <div className="p-4 sm:p-4.5">
        <button
          onClick={() => toggle("highlights")}
          className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-xs sm:text-sm group"
        >
          <span className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            Product Details & Highlights
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              openSection === "highlights" ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </button>

        {openSection === "highlights" && (
          <div className="pt-3 space-y-3 animate-fadeIn text-slate-600">
            {product.pas_description_html && (
              <div
                className="text-xs text-slate-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.pas_description_html }}
              />
            )}

            {product.features && product.features.length > 0 && (
              <div className="grid grid-cols-1 gap-2 pt-1">
                {product.features.map((feat, idx) => (
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

      {/* 2. Specifications */}
      <div className="p-4 sm:p-4.5">
        <button
          onClick={() => toggle("specs")}
          className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-xs sm:text-sm group"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Specs & Fulfillment
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              openSection === "specs" ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </button>

        {openSection === "specs" && (
          <div className="pt-3 space-y-2 animate-fadeIn text-xs text-slate-600">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Category</span>
                <span className="font-bold text-slate-800 text-[11px]">{product.category || "General Gear"}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Dispatch</span>
                <span className="font-bold text-slate-800 text-[11px]">US Distribution Hub</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Delivery & Guarantee */}
      <div className="p-4 sm:p-4.5">
        <button
          onClick={() => toggle("shipping")}
          className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-xs sm:text-sm group"
        >
          <span className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            Delivery & Damage Replacement
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              openSection === "shipping" ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </button>

        {openSection === "shipping" && (
          <div className="pt-3 space-y-2.5 animate-fadeIn text-xs text-slate-600">
            <p className="leading-relaxed text-[11px]">
              • <strong>Tracked 3–5 Day Delivery:</strong> Shipped same-day from US domestic fulfillment hubs with tracking provided via email.
            </p>
            <p className="leading-relaxed text-[11px]">
              • <strong>Damage-Free Guarantee:</strong> Arrived damaged or broken? Email our support team with 1 photo within 7 days and we will dispatch a free replacement immediately.
            </p>
          </div>
        )}
      </div>

      {/* 4. FAQs (if present) */}
      {product.faq_schema && product.faq_schema.length > 0 && (
        <div className="p-4 sm:p-4.5">
          <button
            onClick={() => toggle("faqs")}
            className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-xs sm:text-sm group"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              Frequently Asked Questions
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                openSection === "faqs" ? "rotate-180 text-emerald-600" : ""
              }`}
            />
          </button>

          {openSection === "faqs" && (
            <div className="pt-3 divide-y divide-slate-100 space-y-2 animate-fadeIn">
              {product.faq_schema.map((faq, idx) => (
                <div key={idx} className="pt-2 first:pt-0 space-y-0.5 text-[11px]">
                  <h4 className="font-bold text-slate-900">{faq.question}</h4>
                  <p className="text-slate-500 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
