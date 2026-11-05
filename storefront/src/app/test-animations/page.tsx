"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Truck,
  ShieldCheck,
  Package,
  Clock,
  ArrowRight,
  Maximize2,
  Minimize2,
  Eye,
  Check,
  Volume2,
  VolumeX,
  Sliders,
  Layers,
  Award,
  Zap,
} from "lucide-react";

type AnimationConcept =
  | "luxury-wax-seal"
  | "tactile-parcel-scan"
  | "nike-got-em"
  | "dynamic-island-hud";

export default function TestAnimationsPage() {
  const [activeTab, setActiveTab] = useState<AnimationConcept>("luxury-wax-seal");
  const [duration, setDuration] = useState<number>(5000); // 5s requested default
  const [isPlaying, setIsPlaying] = useState(true);
  const [key, setKey] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("light");
  const [showGraceTransition, setShowGraceTransition] = useState(true);
  const [hasFinishedAnimation, setHasFinishedAnimation] = useState(false);
  const [copiedNote, setCopiedNote] = useState<string | null>(null);

  // Play subtle web audio chime when sound is enabled and animation lands
  const playHapticAudio = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  useEffect(() => {
    setIsPlaying(true);
    setHasFinishedAnimation(false);

    // Audio cue trigger timing
    const audioTimer = setTimeout(() => {
      playHapticAudio();
    }, duration * 0.35);

    const timer = setTimeout(() => {
      setIsPlaying(false);
      setHasFinishedAnimation(true);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(audioTimer);
    };
  }, [activeTab, duration, key, soundEnabled]);

  const restartAnimation = () => {
    setKey((prev) => prev + 1);
  };

  const handleSelectChoice = (opt: AnimationConcept) => {
    const titles: Record<AnimationConcept, string> = {
      "luxury-wax-seal": "Concept 1: Luxury 3D Wax Seal & Specular Bloom (Apple / Hermes Style)",
      "tactile-parcel-scan": "Concept 2: Tactile Parcel Tape & Laser Barcode Scan (Amazon / Zomato Style)",
      "nike-got-em": "Concept 3: Kinetic Editorial 'GOT 'EM' Triumph (Nike SNKRS / Supreme Style)",
      "dynamic-island-hud": "Concept 4: Dynamic Island iOS 18 Morphing Milestone HUD (Apple / Uber Style)",
    };
    navigator.clipboard?.writeText(titles[opt]).catch(() => {});
    setCopiedNote(`Selected: ${titles[opt]}`);
    setTimeout(() => setCopiedNote(null), 3500);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeMode === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"} pb-24`}>
      {/* ── HIGH-PERFORMANCE CSS HARDWARE-ACCELERATED KEYFRAMES ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ══════════════════════════════════════════════════════════════
           CONCEPT 1: LUXURY 3D WAX SEAL (Hermes / Apple Edition)
           ══════════════════════════════════════════════════════════════ */
        @keyframes stampPressDown {
          0% {
            transform: translate3d(0, -90px, 0) scale(1.35);
            opacity: 0;
            filter: blur(8px);
          }
          45% {
            transform: translate3d(0, 0, 0) scale(0.96);
            opacity: 1;
            filter: blur(0px);
          }
          65% {
            transform: translate3d(0, -6px, 0) scale(1.02);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }

        @keyframes waxRippleShockwave {
          0% {
            transform: scale(0.65);
            opacity: 0.9;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
          }
          60% {
            transform: scale(1.4);
            opacity: 0.3;
            box-shadow: 0 0 0 35px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        @keyframes specularSheenPass {
          0% {
            transform: translateX(-140%) rotate(25deg);
            opacity: 0;
          }
          40% {
            opacity: 0.85;
          }
          100% {
            transform: translateX(180%) rotate(25deg);
            opacity: 0;
          }
        }

        @keyframes goldDustFloat {
          0% {
            transform: translate3d(var(--gx, 0), var(--gy, 0), 0) scale(0);
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          100% {
            transform: translate3d(calc(var(--gx, 0) * 1.8), calc(var(--gy, 0) - 50px), 0) scale(1.2);
            opacity: 0;
          }
        }

        /* ══════════════════════════════════════════════════════════════
           CONCEPT 2: TACTILE PARCEL TAPE & LASER SCAN (Amazon Prime)
           ══════════════════════════════════════════════════════════════ */
        @keyframes boxDropIn {
          0% {
            transform: translate3d(0, -60px, 0) scale(0.85) rotateX(20deg);
            opacity: 0;
          }
          50% {
            transform: translate3d(0, 6px, 0) scale(1.04) rotateX(-4deg);
            opacity: 1;
          }
          75% {
            transform: translate3d(0, -2px, 0) scale(0.99);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1) rotateX(0deg);
            opacity: 1;
          }
        }

        @keyframes tapeUnrollAcross {
          0% {
            transform: scaleX(0);
            transform-origin: left center;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: scaleX(1);
            transform-origin: left center;
            opacity: 1;
          }
        }

        @keyframes laserBarSweep {
          0% {
            top: 6px;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            top: 76px;
            opacity: 1;
          }
          100% {
            top: 84px;
            opacity: 0;
          }
        }

        @keyframes barcodeScanBeep {
          0%, 100% { opacity: 0; }
          40%, 70% { opacity: 0.35; filter: drop-shadow(0 0 10px #10b981); }
        }

        /* ══════════════════════════════════════════════════════════════
           CONCEPT 3: NIKE SNKRS KINETIC TRIUMPH
           ══════════════════════════════════════════════════════════════ */
        @keyframes gotEmStampIn {
          0% {
            transform: scale(2.2);
            opacity: 0;
            filter: blur(12px);
            letter-spacing: 0.3em;
          }
          45% {
            transform: scale(0.92);
            opacity: 1;
            filter: blur(0px);
            letter-spacing: -0.04em;
          }
          70% {
            transform: scale(1.04);
          }
          100% {
            transform: scale(1);
            opacity: 1;
            letter-spacing: -0.03em;
          }
        }

        @keyframes holographicSweep {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes cardPerspectiveSlide {
          0% {
            transform: translate3d(0, 40px, 0) rotateX(15deg);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0) rotateX(0deg);
            opacity: 1;
          }
        }

        /* ══════════════════════════════════════════════════════════════
           CONCEPT 4: DYNAMIC ISLAND iOS 18 MORPHING HUD (Apple/Uber)
           ══════════════════════════════════════════════════════════════ */
        @keyframes islandExpandSpring {
          0% {
            width: 160px;
            height: 44px;
            border-radius: 9999px;
            transform: scale(0.9);
          }
          35% {
            width: 220px;
            height: 48px;
            border-radius: 9999px;
            transform: scale(1.05);
          }
          65% {
            width: 380px;
            height: 160px;
            border-radius: 28px;
            transform: scale(0.98);
          }
          100% {
            width: 100%;
            max-width: 440px;
            height: auto;
            border-radius: 24px;
            transform: scale(1);
          }
        }

        @keyframes transitLaserBeam {
          0% {
            width: 0%;
            opacity: 0.4;
          }
          100% {
            width: 100%;
            opacity: 1;
          }
        }

        @keyframes nodePulseGlow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
          50% { transform: scale(1.2); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
        }

        @keyframes editorialFadeUp {
          0% {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}} />

      {/* ── TOP CONTROL & EVALUATION DASHBOARD ── */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors ${themeMode === "dark" ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200"}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-3 h-3" />
                <span>Executive Design Lab</span>
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight">
                Post-Order Psychology & Motion Suite
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              4 industry-grade animation paradigms engineered to eliminate buyer remorse and elevate perceived brand luxury.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
              title="Toggle tactile sound cue"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span className="hidden sm:inline">{soundEnabled ? "Audio On" : "Muted"}</span>
            </button>

            {/* Dark / Light Theme Toggle */}
            <button
              type="button"
              onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
              className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {themeMode === "dark" ? "☀️ Light Mode" : "🌙 Studio Dark"}
            </button>

            {/* Replay */}
            <button
              type="button"
              onClick={restartAnimation}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>

            <Link
              href="/checkout"
              className="py-1.5 px-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition hover:bg-slate-300 dark:hover:bg-slate-700"
            >
              Back to Store
            </Link>
          </div>
        </div>

        {/* ── 4 WORLD-CLASS CONCEPT TABS ── */}
        <div className="max-w-6xl mx-auto px-4 border-t border-slate-100 dark:border-slate-800/80 flex overflow-x-auto scrollbar-none gap-2 py-2">
          <button
            type="button"
            onClick={() => setActiveTab("luxury-wax-seal")}
            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "luxury-wax-seal"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>1. Luxury Embossed Wax Stamp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tactile-parcel-scan")}
            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "tactile-parcel-scan"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>2. Live Parcel Tape & Barcode Scan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("nike-got-em")}
            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "nike-got-em"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>3. Nike SNKRS Kinetic 'GOT EM'</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dynamic-island-hud")}
            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "dynamic-island-hud"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4. Dynamic Island iOS 18 Morph</span>
          </button>
        </div>
      </header>

      {/* ── TOOLBAR CONTROLS ── */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">Playback Duration:</span>
          {[3000, 5000, 7000].map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => setDuration(ms)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                duration === ms
                  ? "bg-slate-900 dark:bg-emerald-500 text-white border-transparent shadow-xs font-bold"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              {ms / 1000}s {ms === 5000 ? "(Requested)" : ms === 3000 ? "(High-Pace)" : "(Slow-Mo)"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showGraceTransition}
              onChange={(e) => setShowGraceTransition(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-semibold">Simulate Transition to Grace Window & Details</span>
          </label>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold flex items-center gap-1 cursor-pointer transition"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullScreen ? "Exit Fullscreen" : "Fullscreen Focus"}</span>
          </button>
        </div>
      </div>

      {copiedNote && (
        <div className="max-w-6xl mx-auto px-4 mb-2 animate-in fade-in">
          <div className="bg-emerald-600 text-white py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-600/20">
            <span>✓ {copiedNote}</span>
            <span className="text-[10px] opacity-80 font-mono">Copied choice to clipboard!</span>
          </div>
        </div>
      )}

      {/* ── HERO PREVIEW STAGE ── */}
      <main
        className={`max-w-6xl mx-auto px-4 ${
          isFullScreen
            ? `fixed inset-0 z-50 ${themeMode === "dark" ? "bg-slate-950 text-white" : "bg-white text-slate-900"} max-w-none px-6 py-8 flex flex-col justify-center items-center overflow-auto`
            : ""
        }`}
      >
        <div className={`border rounded-3xl shadow-lg overflow-hidden flex flex-col min-h-[520px] relative transition-colors duration-200 ${
          themeMode === "dark" ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200/90"
        }`}>
          {/* Top Bar Indicator */}
          <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs transition-colors ${
            themeMode === "dark" ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200/80"
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="font-mono text-[11px] text-slate-400 ml-2">
                Checkout Flow • Status: {isPlaying ? "Active Playing Sequence" : "Order Confirmed & Transitioned"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleSelectChoice(activeTab)}
              className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Check className="w-3 h-3" />
              <span>Select This Animation</span>
            </button>
          </div>

          {/* ── ACTIVE CANVAS ── */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-14 text-center relative overflow-hidden select-none">
            {/* Transitioned State: Grace Window & Verified Domestic Order Card */}
            {!isPlaying && showGraceTransition && hasFinishedAnimation ? (
              <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto text-2xl font-black shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-500/20">
                  ✓
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>30-Minute Cancellation Grace Window Active</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    Order #ORD-STORE-894201
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    US Domestic Distribution Center • Tracked via USPS Ground
                  </p>
                </div>

                <div className={`p-4 rounded-2xl text-left text-xs space-y-2.5 border transition-colors ${
                  themeMode === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-500">Estimated Delivery:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">3–5 Business Days</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/70 dark:border-slate-800 pt-2 font-medium">
                    <span className="text-slate-500">Payment Status:</span>
                    <span>PayPal Verified • $49.98 USD</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Grace Time Remaining:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">29m 49s</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={restartAnimation}
                    className="flex-1 py-3 px-4 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay This Animation</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ── LIVE ACTIVE ANIMATIONS ── */
              <div key={key} className="w-full max-w-lg flex flex-col items-center justify-center relative min-h-[320px]">
                {/* ───────────────────────────────────────────────────────────── */}
                {/* CONCEPT 1: LUXURY 3D WAX SEAL (Hermes / Apple Edition) */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "luxury-wax-seal" && (
                  <div className="flex flex-col items-center justify-center relative w-full">
                    {/* Concentric Ambient Shockwave Rings */}
                    <div
                      className="absolute w-36 h-36 rounded-full border-2 border-emerald-500 pointer-events-none"
                      style={{
                        animation: `waxRippleShockwave ${duration * 0.45}ms ease-out ${duration * 0.28}ms forwards`,
                      }}
                    />

                    {/* Floating Specular Gold Dust Sparks */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden h-72">
                      {[
                        { gx: "-40px", gy: "-30px", d: "0ms" },
                        { gx: "50px", gy: "-40px", d: "100ms" },
                        { gx: "-60px", gy: "20px", d: "150ms" },
                        { gx: "70px", gy: "30px", d: "80ms" },
                        { gx: "-20px", gy: "-60px", d: "200ms" },
                        { gx: "30px", gy: "-55px", d: "160ms" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-amber-300 to-emerald-300 left-1/2 top-1/2"
                          style={{
                            ["--gx" as any]: item.gx,
                            ["--gy" as any]: item.gy,
                            animation: `goldDustFloat 1.8s ease-out ${duration * 0.3}ms both`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Heavy Embossed Metallic Seal Plate */}
                    <div
                      className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-2xl flex items-center justify-center mb-6 overflow-hidden"
                      style={{
                        background: "radial-gradient(circle at 35% 35%, #10b981 0%, #047857 55%, #064e3b 100%)",
                        boxShadow: "0 20px 40px -12px rgba(4, 120, 87, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.35), inset 0 -4px 8px rgba(0, 0, 0, 0.4)",
                        animation: `stampPressDown ${duration * 0.45}ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards`,
                      }}
                    >
                      {/* Specular Diagonal Sheen Sweep */}
                      <div
                        className="absolute inset-0 w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                        style={{
                          animation: `specularSheenPass 1.2s ease-in-out ${duration * 0.45}ms both`,
                        }}
                      />

                      {/* Concentric Guilloche Border Ring */}
                      <div className="absolute inset-2 rounded-full border border-emerald-300/30 border-dashed pointer-events-none" />

                      {/* Solid Embossed Center Emblem */}
                      <div className="relative z-10 flex flex-col items-center justify-center text-white drop-shadow-md">
                        <svg
                          className="w-12 h-12 stroke-[3.5] text-white"
                          viewBox="0 0 48 48"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            d="M12 25L21 34L36 16"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-[8px] font-black tracking-widest uppercase opacity-90 -mt-1 font-mono">
                          VASTIRE
                        </span>
                      </div>
                    </div>

                    {/* Headline and Status */}
                    <div
                      className="space-y-2 max-w-md mx-auto"
                      style={{
                        animation: `editorialFadeUp 0.6s ease-out ${duration * 0.4}ms both`,
                      }}
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Officially Verified & Recorded</span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                        Your order placed successfully
                      </h2>

                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Secured with PayPal Buyer Protection • Allocated at US Hub
                      </p>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* CONCEPT 2: TACTILE PARCEL TAPE & BARCODE SCAN (Amazon Prime) */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "tactile-parcel-scan" && (
                  <div className="flex flex-col items-center justify-center relative w-full">
                    {/* 3D Corrugated Shipping Carton */}
                    <div
                      className="relative w-56 sm:w-64 bg-amber-100 dark:bg-amber-950/70 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-4 shadow-xl mb-6 text-left"
                      style={{
                        animation: `boxDropIn ${duration * 0.35}ms cubic-bezier(0.18, 0.9, 0.3, 1) forwards`,
                      }}
                    >
                      {/* Laser Sweep Beam */}
                      <div
                        className="absolute left-3 right-3 h-0.5 bg-emerald-500 shadow-[0_0_12px_#10b981] z-20 pointer-events-none"
                        style={{
                          animation: `laserBarSweep ${duration * 0.4}ms ease-in-out ${duration * 0.38}ms forwards`,
                        }}
                      />

                      {/* Box Top Flap & Sealing Tape */}
                      <div className="relative mb-3 flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800/80">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                            Domestic Parcel
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-amber-700 dark:text-amber-400">
                          3–5 DAY PRIORITY
                        </span>

                        {/* Automatic Emerald Sealing Tape */}
                        <div
                          className="absolute inset-x-0 -bottom-1 h-3 bg-emerald-600/90 text-white text-[8px] font-mono font-bold flex items-center justify-center tracking-widest uppercase shadow-xs"
                          style={{
                            animation: `tapeUnrollAcross ${duration * 0.28}ms ease-out ${duration * 0.2}ms both`,
                          }}
                        >
                          SEALED • VASTIRE
                        </div>
                      </div>

                      {/* Realistic USPS Barcode Label */}
                      <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-xs space-y-1.5 relative overflow-hidden">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-800 font-bold">
                          <span>USPS GROUND TRACKED</span>
                          <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px]">
                            US DOMESTIC
                          </span>
                        </div>

                        {/* Barcode Graphic Lines */}
                        <div className="h-7 w-full flex items-stretch gap-[2px] py-1 bg-slate-50 px-1 rounded">
                          {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3].map((w, i) => (
                            <div
                              key={i}
                              className="bg-slate-900 h-full rounded-xs flex-1"
                              style={{ opacity: i % 5 === 0 ? 0.3 : 1 }}
                            />
                          ))}
                        </div>

                        <div className="flex justify-between text-[9px] font-mono text-slate-500">
                          <span>SCAN: 9400 1118 9956</span>
                          <span className="text-emerald-700 font-bold">PASSED ✓</span>
                        </div>
                      </div>
                    </div>

                    {/* Headline and Status */}
                    <div
                      className="space-y-2 max-w-md mx-auto"
                      style={{
                        animation: `editorialFadeUp 0.6s ease-out ${duration * 0.45}ms both`,
                      }}
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Package Sealed & Barcode Validated</span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                        Your order placed successfully
                      </h2>

                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Queued for immediate dispatch at US Domestic Hub...
                      </p>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* CONCEPT 3: NIKE SNKRS KINETIC 'GOT EM' */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "nike-got-em" && (
                  <div className="flex flex-col items-center justify-center relative w-full">
                    {/* Bold Kinetic Typography Title */}
                    <div className="relative mb-5">
                      <h1
                        className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white"
                        style={{
                          animation: `gotEmStampIn ${duration * 0.3}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                        }}
                      >
                        CONFIRMED.
                      </h1>

                      <span className="block text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mt-1">
                        ALLOCATION SECURED • 100% AUTHENTIC
                      </span>
                    </div>

                    {/* Perspective Glass Allocation Card */}
                    <div
                      className="w-72 sm:w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 mb-4 text-left"
                      style={{
                        animation: `cardPerspectiveSlide 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${duration * 0.28}ms both`,
                      }}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">Order Status</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          Priority Queue #01
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-full animate-in slide-in-from-left duration-700" />
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                        <span>Fulfillment Channel:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">USPS Domestic Fast-Track</span>
                      </div>
                    </div>

                    {/* Subtext */}
                    <p
                      className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium"
                      style={{
                        animation: `editorialFadeUp 0.5s ease-out ${duration * 0.45}ms both`,
                      }}
                    >
                      Your order placed successfully. Transferring to order management...
                    </p>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* CONCEPT 4: DYNAMIC ISLAND iOS 18 MORPHING HUD (Apple/Uber) */}
                {/* ───────────────────────────────────────────────────────────── */}
                {activeTab === "dynamic-island-hud" && (
                  <div className="flex flex-col items-center justify-center relative w-full">
                    {/* Morphing Dynamic Island Shell */}
                    <div
                      className="bg-slate-950 text-white p-5 shadow-2xl relative border border-slate-800/80 mx-auto"
                      style={{
                        animation: `islandExpandSpring ${duration * 0.35}ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards`,
                      }}
                    >
                      {/* Top Row: Icon + Confirmation Status */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/40">
                            ✓
                          </div>
                          <div>
                            <div className="text-xs font-black tracking-tight text-white">
                              Your order placed successfully
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Paid via PayPal • ID: ORD-894201
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono">
                          LIVE
                        </span>
                      </div>

                      {/* Live 3-Node Milestones Timeline Wireframe */}
                      <div className="pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="relative flex items-center justify-between text-[10px] font-bold">
                          {/* Connecting Rail */}
                          <div className="absolute left-3 right-3 top-2 h-0.5 bg-slate-800 -z-0" />
                          <div
                            className="absolute left-3 top-2 h-0.5 bg-emerald-500 shadow-[0_0_8px_#10b981] -z-0"
                            style={{
                              animation: `transitLaserBeam ${duration * 0.35}ms ease-out ${duration * 0.25}ms forwards`,
                            }}
                          />

                          {/* Node 1: Captured */}
                          <div className="flex flex-col items-center gap-1 relative z-10">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                            <span className="text-emerald-400">Captured</span>
                          </div>

                          {/* Node 2: Domestic Hub */}
                          <div className="flex flex-col items-center gap-1 relative z-10">
                            <div
                              className="w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-slate-950"
                              style={{ animation: "nodePulseGlow 1.8s infinite" }}
                            />
                            <span className="text-white">US Packaging</span>
                          </div>

                          {/* Node 3: Doorstep */}
                          <div className="flex flex-col items-center gap-1 relative z-10">
                            <div className="w-4 h-4 rounded-full bg-slate-700 ring-2 ring-slate-950" />
                            <span className="text-slate-400">3–5 Days</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subtext */}
                    <div
                      className="mt-6 space-y-1"
                      style={{
                        animation: `editorialFadeUp 0.6s ease-out ${duration * 0.45}ms both`,
                      }}
                    >
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Seamlessly connecting you to your customer fulfillment portal...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── DESIGNER & ARCHITECTURAL COMPARISON MATRIX ── */}
        <div className={`mt-8 border rounded-3xl p-6 sm:p-8 space-y-6 transition-colors ${
          themeMode === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/90"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Design Psychology & App Reference Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluated from user psychology, cognitive load, buyer remorse quenching, and mobile performance.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
              100% CSS GPU Accelerated • Zero Lag
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Concept 1 */}
            <div
              onClick={() => setActiveTab("luxury-wax-seal")}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === "luxury-wax-seal"
                  ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-600"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">1. Luxury Wax Stamp</span>
                  {activeTab === "luxury-wax-seal" && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                      Viewing
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  References: Apple Watch Edition, Hermes, Monocle, Rimowa
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Embossed 3D wax plate stamps down with physical inertia, triggering concentric shockwaves and specular sheen sweeps.
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                    ✓ Psych: Extreme sense of prestige & authenticity.
                  </div>
                  <div className="text-slate-500">
                    • Ideal for curated lifestyle & home goods.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectChoice("luxury-wax-seal");
                }}
                className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition cursor-pointer"
              >
                Choose Concept 1
              </button>
            </div>

            {/* Concept 2 */}
            <div
              onClick={() => setActiveTab("tactile-parcel-scan")}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === "tactile-parcel-scan"
                  ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-600"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">2. Live Parcel Scan</span>
                  {activeTab === "tactile-parcel-scan" && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                      Viewing
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  References: Amazon Prime, Zomato Live Kitchen, Deliveroo
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Corrugated package lands, automated emerald security tape seals the box, and a laser scanner validates the USPS barcode in real time.
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                    ✓ Psych: Tangible proof goods are moving.
                  </div>
                  <div className="text-slate-500">
                    • Quenches shipping anxiety immediately.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectChoice("tactile-parcel-scan");
                }}
                className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition cursor-pointer"
              >
                Choose Concept 2
              </button>
            </div>

            {/* Concept 3 */}
            <div
              onClick={() => setActiveTab("nike-got-em")}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === "nike-got-em"
                  ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-600"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">3. Nike SNKRS Triumph</span>
                  {activeTab === "nike-got-em" && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                      Viewing
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  References: Nike SNKRS 'GOT EM', Supreme, StockX
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  High-impact kinetic editorial typography stamping 'CONFIRMED.' with a 3D perspective authentication card.
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                    ✓ Psych: Maximum dopamine & triumph.
                  </div>
                  <div className="text-slate-500">
                    • Eliminates post-checkout second guessing.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectChoice("nike-got-em");
                }}
                className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition cursor-pointer"
              >
                Choose Concept 3
              </button>
            </div>

            {/* Concept 4 */}
            <div
              onClick={() => setActiveTab("dynamic-island-hud")}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                activeTab === "dynamic-island-hud"
                  ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-600"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">4. iOS 18 Dynamic Island</span>
                  {activeTab === "dynamic-island-hud" && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                      Viewing
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  References: iOS 18 Live Activities, Uber, Flighty
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Compact pill springs open into a sleek futuristic HUD with a live milestone rail showing funds capture, hub packing, and delivery.
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                    ✓ Psych: High-tech clarity & real-time momentum.
                  </div>
                  <div className="text-slate-500">
                    • Zero fluff, pure functional elegance.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectChoice("dynamic-island-hud");
                }}
                className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition cursor-pointer"
              >
                Choose Concept 4
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
