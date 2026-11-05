"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Truck,
  Send,
  ShieldCheck,
  Package,
  Clock,
  ArrowRight,
  Maximize2,
  Minimize2,
  Eye,
  Check,
} from "lucide-react";

type AnimationOption = "paper-plane" | "calm-seal" | "delivery-van" | "confetti-morph";

export default function TestAnimationsPage() {
  const [activeTab, setActiveTab] = useState<AnimationOption>("paper-plane");
  const [duration, setDuration] = useState<number>(5000); // 5s default
  const [isPlaying, setIsPlaying] = useState(true);
  const [key, setKey] = useState(0); // For hard-restarting animations
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showOrderSummaryTransition, setShowOrderSummaryTransition] = useState(true);
  const [hasFinishedAnimation, setHasFinishedAnimation] = useState(false);
  const [copiedNote, setCopiedNote] = useState<string | null>(null);

  // Restart animation whenever tab, duration, or key changes
  useEffect(() => {
    setIsPlaying(true);
    setHasFinishedAnimation(false);
    const timer = setTimeout(() => {
      setIsPlaying(false);
      setHasFinishedAnimation(true);
    }, duration);
    return () => clearTimeout(timer);
  }, [activeTab, duration, key]);

  const restartAnimation = () => {
    setKey((prev) => prev + 1);
  };

  const handleCopyChoice = (opt: AnimationOption) => {
    const names: Record<AnimationOption, string> = {
      "paper-plane": "Option 1: Flipkart / Telegram Express Paper Plane",
      "calm-seal": "Option 2: Apple Pay / Stripe Minimal Luxury Seal",
      "delivery-van": "Option 3: Amazon Express Delivery Van",
      "confetti-morph": "Option 4: Modern Fintech Confetti Shower",
    };
    navigator.clipboard?.writeText(names[opt]).catch(() => {});
    setCopiedNote(`Selected: ${names[opt]}`);
    setTimeout(() => setCopiedNote(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      {/* ── STYLES FOR ALL 4 ANIMATIONS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── OPTION 1: PAPER PLANE ── */
        @keyframes planeFlight {
          0% {
            transform: translate3d(-100px, 240px, 0) scale(0.6) rotate(-28deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          65% {
            transform: translate3d(20px, -20px, 0) scale(1.1) rotate(6deg);
            opacity: 1;
          }
          80% {
            transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
            opacity: 1;
          }
          90% {
            transform: translate3d(0, 0, 0) scale(1.2) rotate(0deg);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(0.9);
            opacity: 0;
          }
        }
        @keyframes planeTrail {
          0% { stroke-dashoffset: 240; opacity: 0; }
          20% { opacity: 0.8; }
          75% { stroke-dashoffset: 0; opacity: 0.8; }
          100% { stroke-dashoffset: -40; opacity: 0; }
        }
        @keyframes planeSealBloom {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          85% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* ── OPTION 2: CALM LUXURY SEAL (Apple Pay / Stripe) ── */
        @keyframes calmSealBloom {
          0% { transform: scale(0.82); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes calmGlowPulse {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.35); opacity: 0.12; }
        }
        @keyframes checkDraw {
          0% { stroke-dashoffset: 44; opacity: 0; }
          30% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }

        /* ── OPTION 3: DELIVERY VAN (Amazon / Logistics) ── */
        @keyframes vanDriveIn {
          0% { transform: translate3d(-260px, 0, 0); opacity: 0; }
          50% { transform: translate3d(15px, 0, 0); opacity: 1; }
          70% { transform: translate3d(-6px, 0, 0); }
          85% { transform: translate3d(2px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); opacity: 1; }
        }
        @keyframes vanWheelSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(1440deg); }
        }
        @keyframes parcelPop {
          0% { transform: translate3d(0, 20px, 0) scale(0.4); opacity: 0; }
          60% { transform: translate3d(0, -22px, 0) scale(1.15); opacity: 1; }
          100% { transform: translate3d(0, -14px, 0) scale(1); opacity: 1; }
        }

        /* ── OPTION 4: FINTECH CONFETTI SHOWER ── */
        @keyframes confettiFall {
          0% { transform: translate3d(var(--cx, 0), -40px, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(calc(var(--cx, 0) + var(--drift, 20px)), 280px, 0) rotate(var(--rot, 360deg)); opacity: 0; }
        }
        @keyframes elasticPop {
          0% { transform: scale(0.2); opacity: 0; }
          50% { transform: scale(1.22); opacity: 1; }
          75% { transform: scale(0.92); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes starTwinkle {
          0%, 100% { transform: scale(0.5); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        /* Common smooth text fade */
        @keyframes smoothFadeInUp {
          0% { opacity: 0; transform: translate3d(0, 10px, 0); }
          100% { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}} />

      {/* ── HEADER & NAVIGATION BAR ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                Interactive Lab
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Post-Order Animation Evaluator
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live interactive preview of 4 candidate post-order celebrations before deploying to production.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={restartAnimation}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay Animation</span>
            </button>
            <Link
              href="/checkout"
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Back to Checkout
            </Link>
          </div>
        </div>

        {/* ── 4 ANIMATION TABS SELECTOR ── */}
        <div className="max-w-6xl mx-auto px-4 border-t border-slate-100 flex overflow-x-auto scrollbar-none gap-2 pt-2 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("paper-plane")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "paper-plane"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 hover:bg-slate-200/70 text-slate-600 border border-slate-200"
            }`}
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>1. Flipkart Paper Plane</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("calm-seal")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "calm-seal"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 hover:bg-slate-200/70 text-slate-600 border border-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>2. Apple Pay Luxury Seal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("delivery-van")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "delivery-van"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 hover:bg-slate-200/70 text-slate-600 border border-slate-200"
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>3. Amazon Express Van</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("confetti-morph")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "confetti-morph"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 hover:bg-slate-200/70 text-slate-600 border border-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>4. Fintech Confetti Shower</span>
          </button>
        </div>
      </header>

      {/* ── CONTROLS TOOLBAR ── */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700">Duration:</span>
          {[3000, 5000, 7000].map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => setDuration(ms)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                duration === ms
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {ms / 1000}s {ms === 5000 ? "(Requested)" : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOrderSummaryTransition}
              onChange={(e) => setShowOrderSummaryTransition(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-semibold text-slate-700">Simulate Grace Window & Details after {duration / 1000}s</span>
          </label>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold flex items-center gap-1 cursor-pointer transition"
          >
            {isFullScreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span>{isFullScreen ? "Exit Fullscreen" : "Fullscreen Preview"}</span>
          </button>
        </div>
      </div>

      {copiedNote && (
        <div className="max-w-6xl mx-auto px-4 mb-2 animate-in fade-in">
          <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-between">
            <span>✓ {copiedNote} — Ready to implement as default!</span>
            <span className="text-[10px] text-emerald-700 font-mono">Copied to clipboard</span>
          </div>
        </div>
      )}

      {/* ── MAIN PREVIEW STAGE ── */}
      <main
        className={`max-w-6xl mx-auto px-4 ${
          isFullScreen
            ? "fixed inset-0 z-50 bg-white max-w-none px-6 py-8 flex flex-col justify-center items-center overflow-auto"
            : ""
        }`}
      >
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[460px] sm:min-h-[520px] relative">
          {/* Top Bar for Card Mockup */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <span className="font-mono text-[11px] text-slate-400 ml-2">
                Checkout Flow: /checkout/success (Live Animation State: {isPlaying ? "Playing..." : "Transitioned"})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyChoice(activeTab)}
                className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Choose This Effect</span>
              </button>
            </div>
          </div>

          {/* Animation Viewport Stage */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center relative overflow-hidden select-none">
            {/* If animation finished AND simulate transition is enabled, show the post-animation order details */}
            {!isPlaying && showOrderSummaryTransition && hasFinishedAnimation ? (
              <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl font-bold shadow-xs">
                  ✓
                </div>
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>30-Minute Grace Window Active</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Order #ORD-STORE-894201
                  </h2>
                  <p className="text-xs text-slate-500">
                    Fulfillment Hub: US Domestic Distribution (USPS Tracked Ground)
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Estimated Delivery:</span>
                    <span className="text-emerald-700">3–5 Business Days</span>
                  </div>
                  <div className="flex justify-between text-slate-600 border-t border-slate-200/60 pt-2">
                    <span>Payment Method:</span>
                    <span>PayPal Verified (Captured)</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Grace Period Remaining:</span>
                    <span className="font-mono font-bold text-amber-700">29m 48s</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={restartAnimation}
                    className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay Animation Again</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ── LIVE ANIMATION OPTIONS ── */
              <div key={key} className="w-full max-w-lg flex flex-col items-center justify-center relative min-h-[300px]">
                {/* ───────────────────────────────────────────────────────────── */}
                {/* OPTION 1: FLIPKART / TELEGRAM PAPER PLANE FLY-UP */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "paper-plane" && (
                  <div className="flex flex-col items-center justify-center relative w-full">
                    {/* Flight Trail Vector SVG */}
                    <svg
                      className="absolute inset-0 w-full h-64 pointer-events-none"
                      viewBox="0 0 320 240"
                      fill="none"
                    >
                      <path
                        d="M 60 220 C 100 170, 160 140, 160 80"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeDasharray="6 6"
                        strokeLinecap="round"
                        style={{
                          animation: `planeTrail ${duration * 0.55}ms ease-out forwards`,
                        }}
                      />
                    </svg>

                    {/* Paper Plane Element */}
                    <div
                      className="relative z-10 w-16 h-16 text-emerald-600"
                      style={{
                        animation: `planeFlight ${duration * 0.65}ms cubic-bezier(0.2, 0.8, 0.25, 1) forwards`,
                      }}
                    >
                      <Send className="w-16 h-16 fill-emerald-50 stroke-emerald-600" />
                    </div>

                    {/* Transformed Checkmark Seal after Plane reaches apex */}
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-600/30 ring-4 ring-emerald-50 mb-6"
                      style={{
                        animation: `planeSealBloom 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${duration * 0.5}ms both`,
                      }}
                    >
                      <Check className="w-10 h-10 sm:w-12 sm:h-12 text-white stroke-[3.5]" />
                    </div>

                    {/* Headline and Status */}
                    <div
                      className="space-y-2"
                      style={{
                        animation: `smoothFadeInUp 0.6s ease-out ${duration * 0.55}ms both`,
                      }}
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Dispatched to US Processing</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Your order placed successfully
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Seamlessly transitioning to your fulfillment dashboard...
                      </p>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* OPTION 2: APPLE PAY / STRIPE CALM LUXURY SEAL */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "calm-seal" && (
                  <div className="flex flex-col items-center justify-center relative">
                    {/* Gentle Centered Ambient Glow */}
                    <div
                      className="absolute w-36 h-36 rounded-full bg-emerald-500/15 pointer-events-none"
                      style={{ animation: "calmGlowPulse 2.8s ease-in-out infinite" }}
                    />

                    {/* Central Hero Seal */}
                    <div
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-600/25 ring-4 ring-emerald-50 mb-6"
                      style={{
                        animation: "calmSealBloom 0.75s cubic-bezier(0.16, 1, 0.3, 1) both",
                      }}
                    >
                      {/* Precise Vector Stroke Checkmark */}
                      <svg
                        className="w-10 h-10 sm:w-12 sm:h-12 text-white"
                        viewBox="0 0 48 48"
                        fill="none"
                      >
                        <path
                          d="M14 25L21 32L34 17"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            strokeDasharray: 44,
                            strokeDashoffset: 44,
                            animation: "checkDraw 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards",
                          }}
                        />
                      </svg>
                    </div>

                    {/* Centered Triumphant Headline */}
                    <div
                      className="space-y-2 max-w-md mx-auto"
                      style={{
                        animation: "smoothFadeInUp 0.6s ease-out 0.45s both",
                      }}
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Order Confirmed</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Your order placed successfully
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Preparing your domestic fulfillment package...
                      </p>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* OPTION 3: AMAZON EXPRESS DELIVERY VAN */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "delivery-van" && (
                  <div className="flex flex-col items-center justify-center relative">
                    <div className="relative mb-6">
                      {/* Delivery Van Body */}
                      <div
                        className="w-28 h-16 bg-slate-900 rounded-2xl relative shadow-xl p-2 flex items-center justify-between border-b-4 border-emerald-500"
                        style={{
                          animation: `vanDriveIn ${duration * 0.3}ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards`,
                        }}
                      >
                        <div className="space-y-1">
                          <div className="w-8 h-4 bg-slate-800 rounded-md" />
                          <span className="text-[9px] font-black tracking-wider text-emerald-400 block uppercase">
                            USPS Express
                          </span>
                        </div>
                        <Truck className="w-8 h-8 text-white" />

                        {/* Wheels */}
                        <div
                          className="absolute -bottom-2.5 left-4 w-5 h-5 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center"
                          style={{
                            animation: `vanWheelSpin ${duration * 0.3}ms linear forwards`,
                          }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div
                          className="absolute -bottom-2.5 right-4 w-5 h-5 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center"
                          style={{
                            animation: `vanWheelSpin ${duration * 0.3}ms linear forwards`,
                          }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      </div>

                      {/* Package / Checkmark Blooming from Top */}
                      <div
                        className="absolute -top-7 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg"
                        style={{
                          animation: `parcelPop 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${duration * 0.28}ms both`,
                        }}
                      >
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                    </div>

                    {/* Headline */}
                    <div
                      className="space-y-2 max-w-md mx-auto"
                      style={{
                        animation: `smoothFadeInUp 0.6s ease-out ${duration * 0.35}ms both`,
                      }}
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        <Truck className="w-3.5 h-3.5 text-amber-600" />
                        <span>3–5 Day Tracked US Dispatch</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Your order placed successfully
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Courier allocated & queued for US domestic routing...
                      </p>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* OPTION 4: FINTECH CONFETTI SHOWER */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "confetti-morph" && (
                  <div className="flex flex-col items-center justify-center relative w-full">
                    {/* Dynamic Simulated Confetti Particles */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden h-64">
                      {[
                        { left: "10%", delay: "0ms", color: "#10b981", drift: "-20px" },
                        { left: "20%", delay: "100ms", color: "#f59e0b", drift: "30px" },
                        { left: "35%", delay: "50ms", color: "#06b6d4", drift: "-15px" },
                        { left: "50%", delay: "150ms", color: "#8b5cf6", drift: "25px" },
                        { left: "65%", delay: "0ms", color: "#ec4899", drift: "-30px" },
                        { left: "80%", delay: "120ms", color: "#10b981", drift: "15px" },
                        { left: "90%", delay: "70ms", color: "#f59e0b", drift: "-10px" },
                        { left: "15%", delay: "300ms", color: "#3b82f6", drift: "20px" },
                        { left: "45%", delay: "350ms", color: "#10b981", drift: "-25px" },
                        { left: "75%", delay: "280ms", color: "#ec4899", drift: "15px" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="absolute w-2.5 h-2.5 rounded-sm"
                          style={{
                            left: item.left,
                            backgroundColor: item.color,
                            ["--drift" as any]: item.drift,
                            ["--rot" as any]: `${(idx % 2 === 0 ? 1 : -1) * 720}deg`,
                            animation: `confettiFall 2.4s ease-out ${item.delay} forwards`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Central Bouncy Morphing Stamp */}
                    <div
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-100 mb-6 rotate-3"
                      style={{
                        animation: "elasticPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                      }}
                    >
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>

                    {/* Headline */}
                    <div
                      className="space-y-2 max-w-md mx-auto"
                      style={{
                        animation: "smoothFadeInUp 0.6s ease-out 0.3s both",
                      }}
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Payment Verified • Order Locked</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Your order placed successfully
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Thank you for your order! Unlocking order management...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── TECHNICAL COMPARISON TABLE (Principal Architect Review) ── */}
        <div className="mt-8 bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Architectural Evaluation & Tradeoffs of the 4 Options</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Zero External Dependencies • 60 FPS CSS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Option 1 */}
            <div
              onClick={() => setActiveTab("paper-plane")}
              className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                activeTab === "paper-plane"
                  ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}
            >
              <div className="space-y-2">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span>1. Flipkart Paper Plane</span>
                  {activeTab === "paper-plane" && <span className="text-[10px] text-emerald-700 font-bold">Active</span>}
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Paper airplane glides from bottom corner to screen center, blooming into a checkmark seal.
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-700 font-semibold">✓ High delight & recognizable motion</div>
                  <div className="text-slate-500">• Best for: Retail consumer e-commerce</div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyChoice("paper-plane");
                }}
                className="mt-3 w-full py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 rounded-lg font-bold text-[11px]"
              >
                Select Option 1
              </button>
            </div>

            {/* Option 2 */}
            <div
              onClick={() => setActiveTab("calm-seal")}
              className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                activeTab === "calm-seal"
                  ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}
            >
              <div className="space-y-2">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span>2. Apple Pay / Stripe Seal</span>
                  {activeTab === "calm-seal" && <span className="text-[10px] text-emerald-700 font-bold">Active</span>}
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Calm glowing ambient ripple with precision vector line-drawing checkmark and subtle scale bloom.
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-700 font-semibold">✓ Utmost trust, zero sensory clutter</div>
                  <div className="text-slate-500">• Best for: High-ticket luxury home goods</div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyChoice("calm-seal");
                }}
                className="mt-3 w-full py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 rounded-lg font-bold text-[11px]"
              >
                Select Option 2
              </button>
            </div>

            {/* Option 3 */}
            <div
              onClick={() => setActiveTab("delivery-van")}
              className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                activeTab === "delivery-van"
                  ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}
            >
              <div className="space-y-2">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span>3. Amazon Express Van</span>
                  {activeTab === "delivery-van" && <span className="text-[10px] text-emerald-700 font-bold">Active</span>}
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  USPS Domestic Van drives in with spinning wheels, popping an express delivery package seal.
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-700 font-semibold">✓ Instantly reassures 3–5 day shipping</div>
                  <div className="text-slate-500">• Best for: Fast logistics reassurance</div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyChoice("delivery-van");
                }}
                className="mt-3 w-full py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 rounded-lg font-bold text-[11px]"
              >
                Select Option 3
              </button>
            </div>

            {/* Option 4 */}
            <div
              onClick={() => setActiveTab("confetti-morph")}
              className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                activeTab === "confetti-morph"
                  ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}
            >
              <div className="space-y-2">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span>4. Fintech Confetti Shower</span>
                  {activeTab === "confetti-morph" && <span className="text-[10px] text-emerald-700 font-bold">Active</span>}
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Bouncy elastic badge pop with floating multicolor confetti drifting downwards.
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-700 font-semibold">✓ High dopamine celebration</div>
                  <div className="text-slate-500">• Best for: Viral mobile shopping apps</div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyChoice("confetti-morph");
                }}
                className="mt-3 w-full py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 rounded-lg font-bold text-[11px]"
              >
                Select Option 4
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
