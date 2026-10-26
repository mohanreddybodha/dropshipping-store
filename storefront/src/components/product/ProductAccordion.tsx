"use client";

import React, { useState } from "react";
import { ChevronDown, Check, PackageCheck, ShieldCheck, HelpCircle } from "lucide-react";
import { Product, Variant } from "../../lib/types";

interface ProductAccordionProps {
  product: Product;
  variant?: Variant;
}

export default function ProductAccordion({ product }: ProductAccordionProps) {
  // Open Product Details by default for consumer exploration
  const [openSection, setOpenSection] = useState<string>("details");

  const toggle = (section: string) => {
    setOpenSection((prev) => (prev === section ? "" : section));
  };

  // Sanitize description HTML to eradicate any "30-day money-back guarantee" unpromised claims
  const cleanDescriptionHtml = (product.pas_description_html || "")
    .replace(/and backed by our unconditional 30-day money-back guarantee,?/gi, "")
    .replace(/backed by our unconditional 30-day money-back guarantee,?/gi, "")
    .replace(/30-day money-back guarantee/gi, "damage-free delivery guarantee")
    .replace(/30-day/gi, "7-day");

  // Filter features to eliminate duplicate delivery claims and unbacked 30-day guarantee promises
  const cleanFeatures = (product.features || []).filter((feat) => {
    const title = (feat.title || "").toLowerCase();
    const desc = (feat.desc || "").toLowerCase();
    return (
      !title.includes("30-day") &&
      !title.includes("money-back") &&
      !desc.includes("30-day") &&
      !desc.includes("money-back") &&
      !title.includes("express delivery") &&
      !title.includes("tracked")
    );
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden text-xs">
      {/* 1. Product Details & Key Features */}
      <div className="p-4 sm:p-4.5">
        <button
          type="button"
          onClick={() => toggle("details")}
          className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-xs sm:text-sm group"
        >
          <span className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            Product Details & Highlights
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              openSection === "details" ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </button>

        {openSection === "details" && (
          <div className="pt-3 space-y-3 text-slate-600">
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

      {/* 2. Damage Replacement Protocol (Truthful 7-day policy, no 30-day fake claims) */}
      <div className="p-4 sm:p-4.5">
        <button
          type="button"
          onClick={() => toggle("guarantee")}
          className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-xs sm:text-sm group"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Damage Replacement Guarantee
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              openSection === "guarantee" ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </button>

        {openSection === "guarantee" && (
          <div className="pt-3 space-y-2 text-xs text-slate-600 leading-relaxed">
            <p className="text-[11px]">
              Every order is thoroughly inspected before shipping. If your package arrives damaged or
              broken during transit, simply email us at{" "}
              <a href="mailto:support@domesticlab.com" className="text-emerald-700 underline font-bold">
                support@domesticlab.com
              </a>{" "}
              with 1 clear photo within 7 days of delivery, and we will send a free replacement
              immediately at zero extra charge.
            </p>
          </div>
        )}
      </div>

      {/* 3. Frequently Asked Questions (Fully accessible & unhidden) */}
      {product.faq_schema && product.faq_schema.length > 0 && (
        <div className="p-4 sm:p-4.5">
          <button
            type="button"
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
            <div className="pt-3 divide-y divide-slate-100 space-y-2">
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
