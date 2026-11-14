"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Mail,
  Package,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import NavigationBackButton from "../../components/ui/NavigationBackButton";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "How fast is domestic US shipping?",
    a: "All verified items are dispatched directly from domestic US fulfillment facilities. Standard tracked delivery takes 3–5 business days to physical street addresses in the 48 contiguous US states.",
  },
  {
    q: "Can I cancel or edit my delivery address after ordering?",
    a: "Yes. Before your order is dispatched to fulfillment, you can edit your shipping address or cancel the order for an automated refund directly from the 'History' tab or 'My Orders' page.",
  },
  {
    q: "How do I track my delivery status?",
    a: "Tap the 'History' tab in the bottom bar or enter your Order Number and Email on the Orders page. Once dispatched, live carrier tracking numbers (USPS, FedEx, UPS) update in real-time.",
  },
  {
    q: "What is your refund and return policy?",
    a: "Every purchase is backed by our 30-day domestic satisfaction guarantee. If an item arrives damaged, defective, or incorrect, you receive an immediate replacement or full refund.",
  },
];

export default function MessagesPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-24 md:pb-12 space-y-4">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between border-b border-slate-200/90 pb-3">
        <div className="flex items-center gap-2.5">
          <NavigationBackButton fallbackHref="/" />
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 flex-shrink-0">
            <MessageCircle className="w-5 h-5 fill-rose-500 text-rose-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Messages & Support
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Direct assistance for orders, questions, and deliveries
            </p>
          </div>
        </div>
      </div>

      {/* ── PRIORITY ACTION 1: WHATSAPP DIRECT CHAT ── */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-emerald-100 backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Live Direct Support
            </span>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              Chat With Us on WhatsApp
            </h2>
            <p className="text-xs text-emerald-100 max-w-md leading-relaxed">
              Connect instantly with our customer concierge for order questions, specification verification, or bulk inquiries.
            </p>
          </div>
        </div>

        <div className="pt-1 flex flex-wrap items-center gap-3 relative z-10">
          <a
            href="https://wa.me/?text=Hello%20Vastire%20Support%2C%20I%20have%20an%20inquiry%20regarding%20my%20order."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Open WhatsApp Chat</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
          <span className="text-[11px] text-emerald-200">
            Typically responds in under 15 minutes
          </span>
        </div>
      </div>

      {/* ── QUICK HELP CHANNELS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Channel A: Track Existing Order */}
        <Link
          href="/orders"
          prefetch={true}
          className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition group flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition">
              <Package className="w-5 h-5 text-slate-700" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition">
                Order Status & Tracking
              </h3>
              <p className="text-xs text-slate-500 leading-snug">
                Look up live carrier tracking, edit delivery address, or request cancellation.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition flex-shrink-0 mt-1" />
        </Link>

        {/* Channel B: Email Concierge */}
        <a
          href="mailto:support@vastire.com"
          className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition group flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 transition">
              <Mail className="w-5 h-5 text-rose-500" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition">
                Email Customer Support
              </h3>
              <p className="text-xs text-slate-500 leading-snug">
                Reach support@vastire.com for official inquiries, receipts, and returns.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition flex-shrink-0 mt-1" />
        </a>
      </div>

      {/* ── FREQUENTLY ASKED QUESTIONS ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-2.5">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left gap-3 text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-900 transition"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? "rotate-180 text-slate-700" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed pl-1 pr-4 animate-fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TRUST & COMMITMENT FOOTER NOTE ── */}
      <div className="text-center py-2 space-y-1">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Vastire Customer Guarantee • 30-Day Money Back Protection</span>
        </p>
      </div>
    </div>
  );
}
