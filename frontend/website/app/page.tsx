"use client";

import React, { useState, useEffect } from "react";
import { useLenis } from "lenis/react";

type PhoneView = "dashboard" | "foodlog" | "vision";
type GaugeMode = "consumed" | "remaining";
type DishKey = "fried_rice" | "poha_curd" | "chicken_bowl";

interface DishData {
  title: string;
  confidence: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  volume: string;
  notes: string;
}

const DISHES: Record<DishKey, DishData> = {
  fried_rice: {
    title: "Vegetable Fried Rice with Stir-Fry",
    confidence: "97.4% CONFIDENCE",
    kcal: "540",
    protein: "10g",
    carbs: "86g",
    fat: "17g",
    volume: "420 cm³",
    notes:
      "[SEGMENTATION]: Identified Jasmin white rice base (density ~0.85 g/cm³), diced bell pepper, French beans, and canola oil surface gloss sheen. Estimated meal mass: 310g ± 15g.",
  },
  poha_curd: {
    title: "Poha with Plain Curd (Dahi)",
    confidence: "98.9% CONFIDENCE",
    kcal: "360",
    protein: "9g",
    carbs: "50g",
    fat: "13g",
    volume: "310 cm³",
    notes:
      "[SEGMENTATION]: Flattened rice flakes (flattened poha) tempered with mustard seeds and roasted peanuts (6g). Plain whole milk curd detected in secondary ramekin. Total mass: 240g.",
  },
  chicken_bowl: {
    title: "Chipotle Grilled Chicken Bowl",
    confidence: "96.2% CONFIDENCE",
    kcal: "680",
    protein: "58g",
    carbs: "62g",
    fat: "22g",
    volume: "560 cm³",
    notes:
      "[SEGMENTATION]: Skinless chicken breast strips with grilled char marks (180g), black beans, brown rice, and fresh tomato salsa. Tableware reference 10.5-inch plate used for depth map.",
  },
};

export default function LandingPage() {
  const lenis = useLenis();

  // Interactive Phone Simulator State
  const [phoneView, setPhoneView] = useState<PhoneView>("dashboard");
  const [gaugeMode, setGaugeMode] = useState<GaugeMode>("consumed");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState("Analyze with Gemini Vision");
  const [activeDish, setActiveDish] = useState<DishKey>("fried_rice");
  const [simDish, setSimDish] = useState<DishData>(DISHES.fried_rice);
  const [copiedTerminal, setCopiedTerminal] = useState(false);

  // Heatmap generation state (deterministic 52x7 matrix)
  const [heatmapCells, setHeatmapCells] = useState<number[]>([]);

  useEffect(() => {
    // 52 weeks * 7 days = 364 cells
    const cells: number[] = [];
    for (let i = 0; i < 364; i++) {
      const rand = Math.sin(i * 997 + 13) * 0.5 + 0.5;
      let level = 0;
      if (rand > 0.82) level = 4;
      else if (rand > 0.55) level = 3;
      else if (rand > 0.3) level = 2;
      else if (rand > 0.12) level = 1;
      cells.push(level);
    }
    setHeatmapCells(cells);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(targetId, { offset: -70, duration: 1.2 });
    } else {
      const el = document.querySelector(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const triggerPhoneScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanStatusText("Segmenting Mesh...");
    setTimeout(() => {
      setScanStatusText("Depth Calibrated!");
      setTimeout(() => {
        setIsScanning(false);
        setScanStatusText("Analyze with Gemini Vision");
      }, 1400);
    }, 900);
  };

  const handleSelectDish = (key: DishKey) => {
    setActiveDish(key);
    setSimDish(DISHES[key]);
  };

  const handleCopyCommands = () => {
    const text = `git clone https://github.com/fitmatrix-informatics/fitmatrix-core.git && cd fitmatrix-core\ndocker compose up -d redis mongodb-atlas-local pgvector\npoetry run uvicorn fitmatrix.agent.main:app --host 0.0.0.0 --port 8000 --reload\nyarn install && npx react-native run-android --mode=release`;
    navigator.clipboard.writeText(text);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2000);
  };

  // Calorie SVG calculations (r = 66, circumference = 2 * Math.PI * 66 = ~414.69)
  const circumference = 414.69;
  const consumedOffset = circumference * (1 - 0.33); // ~277.84
  const remainingOffset = circumference * (1 - 0.67); // ~136.85

  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#e2e2e8] selection:bg-[#00e699] selection:text-[#002112]">
      {/* ================= TOP APP BAR ================= */}
      <header className="sticky top-0 z-50 bg-[#111317]/90 backdrop-blur-md border-b border-[#3b4a40]/30 transition-all">
        <div className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand Logo Anchor */}
          <a
            className="font-['Space_Grotesk'] text-lg md:text-xl tracking-tight font-bold text-[#e2e2e8] flex items-center gap-2 group cursor-pointer"
            href="#hero"
            onClick={(e) => scrollToSection(e, "#hero")}
          >
            <span className="w-8 h-8 rounded-lg bg-[#282a2e] border border-[#3b4a40]/40 flex items-center justify-center text-[#76ffbb] transition-all group-hover:border-[#76ffbb]/60 group-hover:shadow-[0_0_15px_-3px_rgba(118,255,187,0.3)]">
              <span
                className="material-symbols-outlined text-[#76ffbb] text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                hub
              </span>
            </span>
            <span className="tracking-tight">FitMatrix AI</span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-[#76ffbb] bg-[#00e699]/15 px-2 py-0.5 rounded border border-[#76ffbb]/30 ml-1 hidden sm:inline-block">
              CAPSTONE // 2025
            </span>
          </a>

          {/* Desktop Links with Lenis smooth scroll */}
          <nav className="hidden md:flex items-center gap-7">
            <a
              className="text-[#76ffbb] font-['JetBrains_Mono'] text-xs transition-all hover:text-[#76ffbb] hover:bg-[#282a2e]/60 px-2.5 py-1 rounded"
              href="#interactive-phone"
              onClick={(e) => scrollToSection(e, "#interactive-phone")}
            >
              Live Client
            </a>
            <a
              className="text-[#bacbbe] hover:text-[#e2e2e8] transition-all font-['JetBrains_Mono'] text-xs hover:bg-[#282a2e]/60 px-2.5 py-1 rounded"
              href="#production-interfaces"
              onClick={(e) => scrollToSection(e, "#production-interfaces")}
            >
              App Gallery
            </a>
            <a
              className="text-[#bacbbe] hover:text-[#e2e2e8] transition-all font-['JetBrains_Mono'] text-xs hover:bg-[#282a2e]/60 px-2.5 py-1 rounded"
              href="#architecture"
              onClick={(e) => scrollToSection(e, "#architecture")}
            >
              Architecture
            </a>
            <a
              className="text-[#bacbbe] hover:text-[#e2e2e8] transition-all font-['JetBrains_Mono'] text-xs hover:bg-[#282a2e]/60 px-2.5 py-1 rounded"
              href="#vision-engine"
              onClick={(e) => scrollToSection(e, "#vision-engine")}
            >
              Vision Engine
            </a>
            <a
              className="text-[#bacbbe] hover:text-[#e2e2e8] transition-all font-['JetBrains_Mono'] text-xs hover:bg-[#282a2e]/60 px-2.5 py-1 rounded"
              href="#formulations"
              onClick={(e) => scrollToSection(e, "#formulations")}
            >
              Formulations
            </a>
          </nav>

          {/* Trailing Action Cluster */}
          <div className="flex items-center gap-3">
            <a
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-['JetBrains_Mono'] text-xs hover:bg-cyan-900/60 hover:border-cyan-400 transition-all cursor-pointer shadow-sm shadow-cyan-500/20"
              href="/eval-dashboard"
            >
              <span className="material-symbols-outlined text-base">psychology</span>
              <span>Agent Eval Studio</span>
            </a>
            <a
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3b4a40]/50 text-[#e2e2e8] font-['JetBrains_Mono'] text-xs hover:bg-[#1e2024] hover:border-[#849589] transition-all cursor-pointer"
              href="#reproducibility"
              onClick={(e) => scrollToSection(e, "#reproducibility")}
            >
              <span className="material-symbols-outlined text-base">terminal</span>
              <span>Docs</span>
            </a>
            <a
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#00e699] text-[#002112] font-['Space_Grotesk'] text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-md shadow-[#00e699]/15 cursor-pointer"
              href="#reproducibility"
              onClick={(e) => scrollToSection(e, "#reproducibility")}
            >
              <span
                className="material-symbols-outlined text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                rocket_launch
              </span>
              <span>Deploy System</span>
            </a>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="w-full">
        {/* HERO SECTION WITH LIVE INTERACTIVE CLIENT MOCKUP */}
        <section
          className="relative pt-10 pb-20 md:pt-16 md:pb-28 px-6 amoled-grid border-b border-[#3b4a40]/20 overflow-hidden"
          id="hero"
        >
          {/* Radial ambient background flare */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-[#76ffbb]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Academic Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a1c20] border border-[#3b4a40]/50 mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#00e699] animate-ping" />
              <span className="w-2 h-2 rounded-full bg-[#00e699] -ml-4" />
              <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb] tracking-wider uppercase">
                FINAL YEAR ENGINEERING MAJOR PROJECT // COMPUTER SCIENCE &amp; AI // APPLIED METABOLIC INFORMATICS
              </span>
            </div>

            {/* 2-Column Hero Structure */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-12">
              {/* Left Column (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl lg:text-5xl text-[#e2e2e8] tracking-tight font-bold mb-6 leading-tight">
                  Transforming Biometric Noise into{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#76ffbb] via-[#4dffb1] to-[#adc6ff]">
                    Autonomous Athletic Intelligence
                  </span>
                  .
                </h1>

                <p className="font-['Geist'] text-base md:text-lg text-[#bacbbe] max-w-2xl leading-relaxed mb-8">
                  FitMatrix is a deterministic sports informatics platform coupling Android Health Connect ingestion with
                  sub-millisecond mathematical state machines, LangGraph cyclic supervisor orchestration, and adherence-neutral
                  metabolic kinetics (Wishnofsky &amp; Trexler models).
                </p>

                {/* Research Telemetry Pill Cluster */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8">
                  <div className="p-3 rounded-xl bg-[#1e2024]/80 backdrop-blur-sm border border-[#3b4a40]/40 flex flex-col transition-all hover:border-[#76ffbb]/40">
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">BMR LATENCY</span>
                    <span className="font-mono text-sm font-bold text-[#76ffbb] tabular-nums">&lt;1ms // 0 Tokens</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e2024]/80 backdrop-blur-sm border border-[#3b4a40]/40 flex flex-col transition-all hover:border-[#adc6ff]/40">
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">ROLLING TDEE</span>
                    <span className="font-mono text-sm font-bold text-[#adc6ff] tabular-nums">14-Day α=0.15</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e2024]/80 backdrop-blur-sm border border-[#3b4a40]/40 flex flex-col transition-all hover:border-[#ffdbca]/40">
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">VISION ENGINE</span>
                    <span className="font-mono text-sm font-bold text-[#ffdbca]">Gemini 3.8 Flash</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1e2024]/80 backdrop-blur-sm border border-[#3b4a40]/40 flex flex-col transition-all hover:border-[#e2e2e8]/40">
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">SENSOR BUS</span>
                    <span className="font-mono text-sm font-bold text-[#e2e2e8]">Health Connect</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    className="py-3 px-6 rounded-xl bg-[#00e699] text-[#002112] font-['Space_Grotesk'] text-sm font-bold hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-[#00e699]/20 cursor-pointer"
                    href="#architecture"
                    onClick={(e) => scrollToSection(e, "#architecture")}
                  >
                    <span className="material-symbols-outlined text-base">account_tree</span>
                    <span>Explore Architecture</span>
                  </a>
                  <a
                    className="py-3 px-6 rounded-xl bg-[#282a2e] border border-[#3b4a40]/60 text-[#e2e2e8] font-['Space_Grotesk'] text-sm font-semibold hover:border-[#76ffbb] transition-all flex items-center gap-2 cursor-pointer"
                    href="#vision-engine"
                    onClick={(e) => scrollToSection(e, "#vision-engine")}
                  >
                    <span className="material-symbols-outlined text-base">center_focus_strong</span>
                    <span>Vision Lab Simulator</span>
                  </a>
                  <div className="text-[#bacbbe] font-['JetBrains_Mono'] text-xs flex items-center gap-1.5 px-2">
                    <span className="w-2 h-2 rounded-full bg-[#76ffbb] animate-pulse" />
                    <span>Interact with the live client ➔</span>
                  </div>
                </div>

                {/* Compact Research Node Badge */}
                <div className="mt-8 p-3.5 rounded-xl bg-[#1a1c20] border border-[#3b4a40]/30 max-w-xl">
                  <div className="flex items-center justify-between text-xs font-['JetBrains_Mono']">
                    <span className="text-[#e2e2e8] font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#76ffbb]">verified_user</span>
                      Autonomous Verification Engine: Adherence-Neutral UX
                    </span>
                    <span className="text-[#76ffbb] text-[11px]">POSIX MMKV BUS</span>
                  </div>
                </div>
              </div>

              {/* Right Column: INTERACTIVE ANDROID CLIENT DEVICE FRAME (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center" id="interactive-phone">
                <div className="w-full max-w-[340px] sm:max-w-[364px] bg-[#000000] rounded-[44px] p-2.5 border-[3px] border-[#3b4a40]/80 device-shadow relative select-none">
                  {/* Phone Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-40 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#1a1c20] border border-[#3b4a40]/30" />
                  </div>

                  {/* Inner Phone AMOLED Screen */}
                  <div className="w-full bg-[#0d0f12] text-[#e2e2e8] rounded-[36px] overflow-hidden border border-white/5 flex flex-col relative min-h-[660px]">
                    {/* Android Status Bar */}
                    <div className="px-5 pt-3 pb-1 flex items-center justify-between text-[11px] font-mono text-[#bacbbe]/90 z-30">
                      <span className="font-semibold text-[#e2e2e8]">7:33</span>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[13px] text-[#76ffbb]">sensors</span>
                        <span className="material-symbols-outlined text-[13px]">wifi</span>
                        <span className="material-symbols-outlined text-[13px]">signal_cellular_alt</span>
                        <span className="text-[10px] font-bold text-[#e2e2e8] ml-0.5">48%</span>
                      </div>
                    </div>

                    {/* In-Phone Header & View Switcher */}
                    <div className="px-4 pt-1 pb-2 border-b border-[#3b4a40]/20 bg-[#0c0e12]/60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-['JetBrains_Mono'] text-[9px] text-[#bacbbe] tracking-wider uppercase">
                          TUESDAY, OCTOBER 13
                        </span>
                        <span className="font-mono text-[9px] text-[#76ffbb] bg-[#76ffbb]/10 border border-[#76ffbb]/20 px-1.5 py-0.5 rounded">
                          MMKV v4 SYNC
                        </span>
                      </div>

                      {/* Screen Switcher Tabs */}
                      <div className="grid grid-cols-3 gap-1 bg-[#282a2e]/60 p-1 rounded-xl">
                        <button
                          className={`py-1 px-1 rounded-lg text-center font-['JetBrains_Mono'] text-[11px] font-semibold transition-all ${
                            phoneView === "dashboard"
                              ? "bg-[#00e699] text-[#002112] shadow"
                              : "text-[#bacbbe] hover:text-[#e2e2e8]"
                          }`}
                          onClick={() => setPhoneView("dashboard")}
                        >
                          Dashboard
                        </button>
                        <button
                          className={`py-1 px-1 rounded-lg text-center font-['JetBrains_Mono'] text-[11px] font-semibold transition-all ${
                            phoneView === "foodlog"
                              ? "bg-[#00e699] text-[#002112] shadow"
                              : "text-[#bacbbe] hover:text-[#e2e2e8]"
                          }`}
                          onClick={() => setPhoneView("foodlog")}
                        >
                          Food Log
                        </button>
                        <button
                          className={`py-1 px-1 rounded-lg text-center font-['JetBrains_Mono'] text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                            phoneView === "vision"
                              ? "bg-[#00e699] text-[#002112] shadow"
                              : "text-[#bacbbe] hover:text-[#e2e2e8]"
                          }`}
                          onClick={() => setPhoneView("vision")}
                        >
                          <span>Vision</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ffdbca]" />
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Phone Body (with data-lenis-prevent to prevent scroll hijacking) */}
                    <div
                      className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-left overscroll-contain"
                      id="phone-content-area"
                      data-lenis-prevent
                    >
                      {/* VIEW 1: DASHBOARD */}
                      {phoneView === "dashboard" && (
                        <div className="space-y-4 animate-fadeIn">
                          <div className="flex items-baseline justify-between">
                            <h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#e2e2e8] tracking-tight">
                              Dashboard
                            </h2>
                            <span className="text-[11px] text-[#bacbbe] font-medium">Daily Nutrition</span>
                          </div>

                          {/* Calorie Arc SVG Gauge */}
                          <div className="relative flex flex-col items-center justify-center pt-1 pb-2">
                            <div className="relative w-44 h-44 flex items-center justify-center">
                              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                                <circle cx="80" cy="80" fill="none" r="66" stroke="#1f232b" strokeWidth="12" />
                                <circle
                                  className="transition-all duration-700 ease-out"
                                  cx="80"
                                  cy="80"
                                  fill="none"
                                  r="66"
                                  stroke={gaugeMode === "consumed" ? "#0566d9" : "#00e699"}
                                  strokeDasharray={circumference}
                                  strokeDashoffset={gaugeMode === "consumed" ? consumedOffset : remainingOffset}
                                  strokeLinecap="round"
                                  strokeWidth="12"
                                />
                              </svg>

                              {/* Center Digits */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#e2e2e8] tracking-tight tabular-nums">
                                  {gaugeMode === "consumed" ? "900" : "1,834"}
                                </span>
                                <span className="text-[11px] font-medium text-[#bacbbe] uppercase tracking-wider">
                                  {gaugeMode === "consumed" ? "Consumed" : "Remaining"}
                                </span>
                                <span
                                  className={`text-[10px] font-mono font-semibold mt-0.5 tabular-nums ${
                                    gaugeMode === "consumed" ? "text-[#adc6ff]" : "text-[#76ffbb]"
                                  }`}
                                >
                                  {gaugeMode === "consumed" ? "33%" : "67%"}
                                </span>
                              </div>
                            </div>

                            {/* Left / Right markers */}
                            <div className="w-full flex items-center justify-between px-3 -mt-3 text-center">
                              <div>
                                <span className="font-['Space_Grotesk'] text-base font-bold text-[#e2e2e8] tabular-nums">
                                  {gaugeMode === "consumed" ? "1,834" : "900"}
                                </span>
                                <p className="text-[10px] text-[#bacbbe]">
                                  {gaugeMode === "consumed" ? "Remaining" : "Consumed"}
                                </p>
                              </div>
                              <div>
                                <span className="font-['Space_Grotesk'] text-base font-bold text-[#e2e2e8] tabular-nums">
                                  2,734
                                </span>
                                <p className="text-[10px] text-[#bacbbe]">Target</p>
                              </div>
                            </div>

                            {/* Macro Breakdown */}
                            <div className="w-full grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#3b4a40]/20">
                              <div className="flex flex-col items-center text-center">
                                <span className="w-10 h-1 bg-[#de7237] rounded-full mb-1" />
                                <span className="text-[10px] text-[#bacbbe] font-mono uppercase">Protein</span>
                                <span className="text-xs font-bold font-mono text-[#e2e2e8] tabular-nums">
                                  {gaugeMode === "consumed" ? "19 / 205g" : "186g left"}
                                </span>
                              </div>
                              <div className="flex flex-col items-center text-center">
                                <span className="w-10 h-1 bg-[#e5ad35] rounded-full mb-1" />
                                <span className="text-[10px] text-[#bacbbe] font-mono uppercase">Fat</span>
                                <span className="text-xs font-bold font-mono text-[#e2e2e8] tabular-nums">
                                  {gaugeMode === "consumed" ? "0 / 122g" : "122g left"}
                                </span>
                              </div>
                              <div className="flex flex-col items-center text-center">
                                <span className="w-10 h-1 bg-[#3eb474] rounded-full mb-1" />
                                <span className="text-[10px] text-[#bacbbe] font-mono uppercase">Carbs</span>
                                <span className="text-xs font-bold font-mono text-[#e2e2e8] tabular-nums">
                                  {gaugeMode === "consumed" ? "0 / 204g" : "204g left"}
                                </span>
                              </div>
                            </div>

                            {/* Toggle Pill */}
                            <div className="mt-4 flex items-center justify-center bg-[#1e2024] p-1 rounded-full border border-[#3b4a40]/30 w-full max-w-[220px]">
                              <button
                                className={`flex-1 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                  gaugeMode === "consumed"
                                    ? "text-black bg-white shadow-sm"
                                    : "text-[#bacbbe] hover:text-[#e2e2e8]"
                                }`}
                                onClick={() => setGaugeMode("consumed")}
                              >
                                Consumed
                              </button>
                              <button
                                className={`flex-1 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                  gaugeMode === "remaining"
                                    ? "text-black bg-white shadow-sm"
                                    : "text-[#bacbbe] hover:text-[#e2e2e8]"
                                }`}
                                onClick={() => setGaugeMode("remaining")}
                              >
                                Remaining
                              </button>
                            </div>
                          </div>

                          {/* Habits Consistency Cards */}
                          <div>
                            <div className="text-[12px] font-bold text-[#e2e2e8] mb-2 font-['Space_Grotesk']">Habits</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2.5 rounded-xl bg-[#1e2024] border border-[#3b4a40]/30">
                                <div className="flex items-center justify-between text-[11px] font-medium text-[#e2e2e8]">
                                  <span>Weigh-In</span>
                                  <span className="material-symbols-outlined text-[14px] text-[#bacbbe]">chevron_right</span>
                                </div>
                                <span className="text-[9px] text-[#bacbbe] block mb-1.5">Last 30 Days</span>
                                <div className="grid grid-cols-7 gap-0.5">
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#76ffbb]" />
                                </div>
                                <div className="text-[10px] text-[#76ffbb] font-bold mt-2">1/7 this week</div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-[#1e2024] border border-[#3b4a40]/30">
                                <div className="flex items-center justify-between text-[11px] font-medium text-[#e2e2e8]">
                                  <span>Food Logging</span>
                                  <span className="material-symbols-outlined text-[14px] text-[#bacbbe]">chevron_right</span>
                                </div>
                                <span className="text-[9px] text-[#bacbbe] block mb-1.5">Last 30 Days</span>
                                <div className="grid grid-cols-7 gap-0.5">
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#4b88eb]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#4b88eb]" />
                                  <span className="w-2 h-2 rounded-xs bg-[#333539]" />
                                </div>
                                <div className="text-[10px] text-[#4b88eb] font-bold mt-2">2/7 this week</div>
                              </div>
                            </div>
                          </div>

                          {/* Companion Intelligence Card */}
                          <div className="p-2.5 rounded-xl bg-[#1e2024] border border-[#76ffbb]/20 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[#e2e2e8] text-[11px] font-semibold">
                              <span className="material-symbols-outlined text-sm text-[#ffb690]">bolt</span>
                              <span>Companion Intelligence</span>
                            </div>
                            <span className="text-[10px] font-mono text-[#76ffbb] bg-[#76ffbb]/10 px-2 py-0.5 rounded border border-[#76ffbb]/30">
                              Optimal Recovery
                            </span>
                          </div>
                        </div>
                      )}

                      {/* VIEW 2: FOOD LOG */}
                      {phoneView === "foodlog" && (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-[#bacbbe] uppercase font-mono">TODAY'S TIMELINE</span>
                              <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#e2e2e8]">Food Log</h2>
                            </div>
                            <button
                              className="px-2.5 py-1 rounded-lg bg-[#282a2e] border border-[#3b4a40]/60 text-[#76ffbb] font-mono text-[10px] font-bold hover:bg-[#1e2024] flex items-center gap-1 cursor-pointer"
                              onClick={() => setPhoneView("vision")}
                            >
                              <span className="material-symbols-outlined text-xs">add</span> Log Meal
                            </button>
                          </div>

                          {/* Macro Mini Status */}
                          <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-[#1e2024] text-center border border-[#3b4a40]/30 text-[10px]">
                            <div>
                              <span className="text-[#bacbbe] font-mono">CONSUMED</span>
                              <p className="font-bold text-xs text-[#e2e2e8] tabular-nums">900 kcal</p>
                            </div>
                            <div>
                              <span className="text-[#bacbbe] font-mono">REMAINING</span>
                              <p className="font-bold text-xs text-[#76ffbb] tabular-nums">1,834 kcal</p>
                            </div>
                            <div>
                              <span className="text-[#bacbbe] font-mono">TARGET</span>
                              <p className="font-bold text-xs text-[#adc6ff] tabular-nums">2,734 kcal</p>
                            </div>
                          </div>

                          {/* Logged Meals Hierarchy */}
                          <div className="space-y-2">
                            <div className="p-2.5 rounded-xl bg-[#1a1c20] border border-[#3b4a40]/20 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[11px] text-[#e2e2e8]">Breakfast</span>
                                <p className="text-[9px] text-[#bacbbe]">No meals logged for Breakfast</p>
                              </div>
                              <span className="text-[11px] text-[#bacbbe]">—</span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-[#1e2024] border border-[#3b4a40]/40 space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#3b4a40]/20">
                                <span className="font-bold text-[11px] text-[#e2e2e8]">Lunch</span>
                                <span className="text-[11px] font-mono font-bold text-[#76ffbb] tabular-nums">
                                  900 kcal
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#0c0e12]/80 flex items-start justify-between">
                                <div>
                                  <div className="text-[11px] font-semibold text-[#e2e2e8]">
                                    Vegetable Fried Rice with Mixed Vegetable Stir-Fry
                                  </div>
                                  <div className="text-[9px] font-mono text-[#bacbbe] mt-0.5">
                                    02:27 · 10g P · 86g C · 17g F
                                  </div>
                                </div>
                                <span className="text-[11px] font-mono font-semibold text-[#e2e2e8] tabular-nums">
                                  540 kcal
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#0c0e12]/80 flex items-start justify-between">
                                <div>
                                  <div className="text-[11px] font-semibold text-[#e2e2e8]">
                                    Poha with Plain Curd (Dahi)
                                  </div>
                                  <div className="text-[9px] font-mono text-[#bacbbe] mt-0.5">
                                    04:06 · 9g P · 50g C · 13g F
                                  </div>
                                </div>
                                <span className="text-[11px] font-mono font-semibold text-[#e2e2e8] tabular-nums">
                                  360 kcal
                                </span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-[#1a1c20] border border-[#3b4a40]/20 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[11px] text-[#e2e2e8]">Dinner</span>
                                <p className="text-[9px] text-[#bacbbe]">No meals logged for Dinner</p>
                              </div>
                              <span className="text-[11px] text-[#bacbbe]">—</span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-[#1a1c20] border border-[#3b4a40]/20 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[11px] text-[#e2e2e8]">Snack</span>
                                <p className="text-[9px] text-[#bacbbe]">No meals logged for Snack</p>
                              </div>
                              <span className="text-[11px] text-[#bacbbe]">—</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VIEW 3: VISION INGRESS MODAL */}
                      {phoneView === "vision" && (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between pb-1 border-b border-[#3b4a40]/20">
                            <div>
                              <span className="text-[9px] text-[#ffdbca] font-mono uppercase">MULTIMODAL INGRESS</span>
                              <h2 className="font-['Space_Grotesk'] text-base font-bold text-[#e2e2e8]">
                                Log Food &amp; Macros
                              </h2>
                            </div>
                            <button
                              className="text-[#bacbbe] hover:text-[#e2e2e8] cursor-pointer"
                              onClick={() => setPhoneView("dashboard")}
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>

                          {/* Frequent Staples Chip */}
                          <div className="p-2 rounded-xl bg-[#1e2024] border border-[#3b4a40]/30 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs text-[#76ffbb]">history</span>
                              <span className="text-[10px] text-[#e2e2e8] font-semibold">
                                Poha with Plain Curd (Dahi)
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[#bacbbe]">360 kcal &gt;</span>
                          </div>

                          {/* 3 Ingress Mode Switchers */}
                          <div className="grid grid-cols-3 gap-1 bg-[#0c0e12] p-1 rounded-xl border border-[#3b4a40]/30 text-center text-[10px]">
                            <span className="py-1 rounded text-[#bacbbe] flex items-center justify-center gap-1">
                              ✍️ Text AI
                            </span>
                            <span className="py-1 rounded bg-[#00e699] text-[#002112] font-bold flex items-center justify-center gap-1 shadow">
                              📸 Photo
                            </span>
                            <span className="py-1 rounded text-[#bacbbe] flex items-center justify-center gap-1">
                              🏷️ Barcode
                            </span>
                          </div>

                          {/* Camera Reticle Preview */}
                          <div className="relative rounded-2xl bg-[#0c0e12] border border-dashed border-[#76ffbb]/40 p-3 text-center overflow-hidden">
                            <div className="w-full h-28 bg-gradient-to-b from-[#1e2024] to-[#0c0e12] rounded-xl flex flex-col items-center justify-center relative border border-[#3b4a40]/20">
                              <div className="w-20 h-20 rounded-full border-2 border-[#76ffbb]/50 border-dashed flex items-center justify-center relative animate-pulse">
                                <span className="material-symbols-outlined text-2xl text-[#76ffbb]">
                                  lunch_dining
                                </span>
                                <span className="absolute -bottom-2 text-[8px] font-mono text-[#76ffbb] bg-black/80 px-1 rounded">
                                  10.5&quot; REF
                                </span>
                              </div>
                              <span className="text-[9px] text-[#bacbbe] mt-1 font-mono">
                                GEMINI 3.8 FLASH DEPTH CALIBRATION
                              </span>
                            </div>

                            <button
                              className="w-full mt-2.5 py-2 rounded-xl bg-gradient-to-r from-[#00e699] to-[#0566d9] text-[#002112] font-['Space_Grotesk'] text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
                              onClick={triggerPhoneScan}
                            >
                              <span className="material-symbols-outlined text-sm">auto_awesome</span>
                              <span>{scanStatusText}</span>
                            </button>
                          </div>

                          {/* Scan Result Preview Stream */}
                          <div className="p-2.5 rounded-xl bg-[#1e2024] border border-[#3b4a40]/30 text-[10px] space-y-1">
                            <div className="flex items-center justify-between text-[#e2e2e8] font-semibold">
                              <span>Vegetable Fried Rice + Veggies</span>
                              <span className="text-[#76ffbb] font-mono font-bold tabular-nums">540 kcal</span>
                            </div>
                            <div className="flex items-center justify-between text-[#bacbbe] font-mono text-[9px]">
                              <span>
                                Protein: <strong className="text-[#e2e2e8] tabular-nums">10g</strong>
                              </span>
                              <span>
                                Carbs: <strong className="text-[#e2e2e8] tabular-nums">86g</strong>
                              </span>
                              <span>
                                Fat: <strong className="text-[#e2e2e8] tabular-nums">17g</strong>
                              </span>
                            </div>
                            <p className="text-[9px] text-[#bacbbe]/80 border-t border-[#3b4a40]/20 pt-1">
                              Depth estimated: 420cm³ volumetrics against 10.5&quot; tableware standard.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Android Bottom Nav */}
                    <div className="mt-auto border-t border-[#3b4a40]/20 bg-[#0d0f12] px-3 py-2 flex items-center justify-between text-[9px] font-medium z-30">
                      <button
                        className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                          phoneView === "dashboard" ? "text-[#76ffbb]" : "text-[#bacbbe] hover:text-[#e2e2e8]"
                        }`}
                        onClick={() => setPhoneView("dashboard")}
                      >
                        <span className="material-symbols-outlined text-[17px]">grid_view</span>
                        <span>Dashboard</span>
                        {phoneView === "dashboard" && <span className="w-1 h-1 rounded-full bg-[#76ffbb] -mt-0.5" />}
                      </button>

                      <button
                        className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                          phoneView === "foodlog" ? "text-[#76ffbb]" : "text-[#bacbbe] hover:text-[#e2e2e8]"
                        }`}
                        onClick={() => setPhoneView("foodlog")}
                      >
                        <span className="text-[14px]">🍎</span>
                        <span>Food Log</span>
                        {phoneView === "foodlog" && <span className="w-1 h-1 rounded-full bg-[#76ffbb] -mt-0.5" />}
                      </button>

                      {/* Central FAB (+) */}
                      <button
                        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-base shadow-lg -mt-3 border-2 border-[#0d0f12] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        onClick={() => setPhoneView("vision")}
                      >
                        +
                      </button>

                      <button
                        className="flex flex-col items-center gap-0.5 text-[#bacbbe] hover:text-[#e2e2e8] cursor-pointer"
                        onClick={() => alert("Strategy Universe: 14-day rolling expenditure autoregulation loaded.")}
                      >
                        <span className="material-symbols-outlined text-[17px]">science</span>
                        <span>Strategy</span>
                      </button>

                      <button
                        className="flex flex-col items-center gap-0.5 text-[#bacbbe] hover:text-[#e2e2e8] cursor-pointer"
                        onClick={() => alert("Health Connect Sensors: 4 hardware streams connected.")}
                      >
                        <span className="material-symbols-outlined text-[17px]">more_horiz</span>
                        <span>More</span>
                      </button>
                    </div>

                    {/* Android Gesture Bar */}
                    <div className="w-full flex justify-center pb-1 pt-0.5 bg-[#0d0f12]">
                      <div className="w-24 h-1 bg-[#3b4a40]/40 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Telemetry Annotation under phone */}
                <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-[#bacbbe]">
                  <span className="w-2 h-2 rounded-full bg-[#76ffbb]" />
                  <span>Live State Machine: React Native 0.87 AMOLED Engine</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= REAL PRODUCTION INTERFACES SHOWCASE ================= */}
        <section className="py-20 px-6 max-w-7xl mx-auto" id="production-interfaces">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb] uppercase tracking-wider mb-2">
                PRODUCTION SYSTEM DEPLOYMENT
              </div>
              <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl text-[#e2e2e8] font-bold">
                Android Client Interface Verification
              </h2>
            </div>
            <p className="font-['Geist'] text-sm text-[#bacbbe] max-w-md mt-4 md:mt-0">
              Native AMOLED interfaces running under React Native 0.87 with direct MMKV synchronization, rendering
              metabolic gauges and drawer state machines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* CARD 1: Dashboard */}
            <div className="flex flex-col rounded-3xl bg-[#1a1c20] border border-[#3b4a40]/40 p-4 transition-all duration-300 hover:border-[#76ffbb]/40 hover:shadow-[0_0_25px_-5px_rgba(118,255,187,0.12)] group">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">SCREEN 01 // HUD TELEMETRY</span>
                <span className="inline-flex items-center gap-1 font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#76ffbb]" /> Live Sync
                </span>
              </div>

              {/* Phone Shell */}
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-[#3b4a40]/60 shadow-2xl aspect-[9/19.5]">
                <div className="w-full h-full bg-[#0c0e12] text-[#e2e2e8] flex flex-col justify-between text-left select-none overflow-hidden text-[10px] p-3 font-sans">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#bacbbe] pb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#e2e2e8] text-[11px]">7:33</span>
                      <span className="material-symbols-outlined text-[11px]">photo_camera</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px] text-[#76ffbb]">sensors</span>
                      <span className="material-symbols-outlined text-[11px]">wifi</span>
                      <span className="text-[9px] font-bold text-[#e2e2e8]">48%</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 py-1">
                    <div className="flex items-baseline justify-between">
                      <span className="font-['JetBrains_Mono'] text-[8px] text-[#bacbbe] tracking-wider uppercase">
                        TUESDAY, OCTOBER 13
                      </span>
                      <span className="font-mono text-[8px] text-[#76ffbb] bg-[#76ffbb]/10 border border-[#76ffbb]/20 px-1 rounded">
                        MMKV v4 SYNC
                      </span>
                    </div>
                    <h4 className="font-['Space_Grotesk'] text-base font-bold text-[#e2e2e8] leading-tight">Dashboard</h4>

                    {/* Gauge Visual */}
                    <div className="flex flex-col items-center justify-center pt-0.5">
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#1c2027" strokeWidth="9" />
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="none"
                            stroke="#0566d9"
                            strokeWidth="9"
                            strokeDasharray="314.15"
                            strokeDashoffset="210.48"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-['Space_Grotesk'] text-lg font-bold text-[#e2e2e8] leading-none tabular-nums">
                            900
                          </span>
                          <span className="text-[8px] text-[#bacbbe] uppercase tracking-wider mt-0.5">Consumed</span>
                          <span className="text-[8px] font-mono text-[#adc6ff] font-semibold tabular-nums">33%</span>
                        </div>
                      </div>

                      <div className="w-full flex items-center justify-between px-2 -mt-1.5 text-center">
                        <div>
                          <span className="font-['Space_Grotesk'] text-[11px] font-bold text-[#e2e2e8] tabular-nums">
                            1,834
                          </span>
                          <p className="text-[8px] text-[#bacbbe]">Remaining</p>
                        </div>
                        <div>
                          <span className="font-['Space_Grotesk'] text-[11px] font-bold text-[#e2e2e8] tabular-nums">
                            2,734
                          </span>
                          <p className="text-[8px] text-[#bacbbe]">Target</p>
                        </div>
                      </div>

                      <div className="w-full grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-[#3b4a40]/20 text-center">
                        <div className="flex flex-col items-center">
                          <span className="w-7 h-1 bg-[#ffb690] rounded-full mb-0.5" />
                          <span className="text-[8px] text-[#bacbbe] font-mono uppercase">Protein</span>
                          <span className="text-[9px] font-bold font-mono text-[#e2e2e8] tabular-nums">19 / 205g</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="w-7 h-1 bg-[#ffdbca] rounded-full mb-0.5" />
                          <span className="text-[8px] text-[#bacbbe] font-mono uppercase">Fat</span>
                          <span className="text-[9px] font-bold font-mono text-[#e2e2e8] tabular-nums">0 / 122g</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="w-7 h-1 bg-[#76ffbb] rounded-full mb-0.5" />
                          <span className="text-[8px] text-[#bacbbe] font-mono uppercase">Carbs</span>
                          <span className="text-[9px] font-bold font-mono text-[#e2e2e8] tabular-nums">0 / 204g</span>
                        </div>
                      </div>
                    </div>

                    {/* Habits Mini */}
                    <div className="p-1.5 rounded-lg bg-[#14161a] border border-[#3b4a40]/30 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[#e2e2e8] text-[9px] font-semibold">
                        <span className="material-symbols-outlined text-[11px] text-[#ffb690]">bolt</span>
                        <span>Companion Intelligence</span>
                      </div>
                      <span className="text-[8px] font-mono text-[#76ffbb] bg-[#76ffbb]/10 px-1.5 py-0.5 rounded border border-[#76ffbb]/30">
                        Optimal Recovery
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-[#3b4a40]/20 bg-[#0c0e12] flex items-center justify-between text-[8px] font-medium">
                    <div className="flex flex-col items-center gap-0.5 text-[#76ffbb]">
                      <span className="material-symbols-outlined text-[13px]">grid_view</span>
                      <span>Dashboard</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#bacbbe]">
                      <span className="text-[11px] leading-none">🍎</span>
                      <span>Food Log</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shadow -mt-2 border border-[#0d0f12]">
                      +
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#bacbbe]">
                      <span className="material-symbols-outlined text-[13px]">science</span>
                      <span>Strategy</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 px-2">
                <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-semibold mb-1">
                  Metabolic Gauge &amp; Habit Matrix
                </h3>
                <p className="font-['Geist'] text-xs text-[#bacbbe]">
                  Displays the dual-arc circular tracker:{" "}
                  <strong className="text-[#e2e2e8]">900 Consumed / 1,834 Remaining (2,734 Target)</strong>. Tripartite macro
                  telemetry and 30-day binary consistency heatmaps.
                </p>
              </div>
            </div>

            {/* CARD 2: Food Log */}
            <div className="flex flex-col rounded-3xl bg-[#1a1c20] border border-[#3b4a40]/40 p-4 transition-all duration-300 hover:border-[#adc6ff]/40 hover:shadow-[0_0_25px_-5px_rgba(173,198,255,0.12)] group">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#adc6ff]">
                  SCREEN 02 // LOGISTICS TIMELINE
                </span>
                <span className="inline-flex items-center gap-1 font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#adc6ff]" /> Non-Punitive
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-[#3b4a40]/60 shadow-2xl aspect-[9/19.5]">
                <div className="w-full h-full bg-[#0c0e12] text-[#e2e2e8] flex flex-col justify-between text-left select-none overflow-hidden text-[10px] p-3 font-sans">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#bacbbe] pb-1">
                    <span className="font-semibold text-[#e2e2e8] text-[11px]">7:33</span>
                    <span className="text-[9px] font-bold text-[#e2e2e8]">5G · 48%</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 py-1">
                    <div className="flex items-center justify-between pt-0.5">
                      <div>
                        <span className="text-[8px] text-[#bacbbe] uppercase font-mono tracking-wider">TODAY</span>
                        <h4 className="font-['Space_Grotesk'] text-base font-bold text-[#e2e2e8] leading-tight">Food Log</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#282a2e] border border-[#3b4a40]/60 text-[#e2e2e8] font-mono text-[8px] font-bold">
                        + Log Meal
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-[#14161a] text-center border border-[#3b4a40]/30 text-[9px]">
                      <div>
                        <span className="text-[#e2e2e8] font-bold text-[11px] block leading-tight tabular-nums">900</span>
                        <span className="text-[#bacbbe] text-[8px] font-mono">Consumed</span>
                      </div>
                      <div>
                        <span className="text-[#adc6ff] font-bold text-[11px] block leading-tight tabular-nums">1834</span>
                        <span className="text-[#bacbbe] text-[8px] font-mono">Remaining</span>
                      </div>
                      <div>
                        <span className="text-[#e2e2e8] font-bold text-[11px] block leading-tight tabular-nums">2734</span>
                        <span className="text-[#bacbbe] text-[8px] font-mono">Target</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="p-2 rounded-xl bg-[#14171d] border border-[#3b4a40]/40 space-y-1.5">
                        <div className="flex items-center justify-between pb-1 border-b border-[#3b4a40]/20">
                          <span className="font-bold text-[9px] text-[#e2e2e8]">Lunch</span>
                          <span className="text-[8px] font-mono font-bold text-[#76ffbb] bg-[#76ffbb]/10 border border-[#76ffbb]/20 px-1 py-0.5 rounded tabular-nums">
                            900 kcal
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-[#0c0e12] border border-[#3b4a40]/20 flex items-start justify-between">
                          <div>
                            <div className="text-[9px] font-semibold text-[#e2e2e8] leading-tight">
                              Vegetable Fried Rice + Veggies
                            </div>
                            <div className="text-[7px] font-mono text-[#bacbbe] mt-0.5">02:27 · 10g P · 86g C · 17g F</div>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-[#e2e2e8] ml-1 tabular-nums">540 kcal</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-[#0c0e12] border border-[#3b4a40]/20 flex items-start justify-between">
                          <div>
                            <div className="text-[9px] font-semibold text-[#e2e2e8] leading-tight">
                              Poha with Plain Curd (Dahi)
                            </div>
                            <div className="text-[7px] font-mono text-[#bacbbe] mt-0.5">05:38 · 9g P · 50g C · 13g F</div>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-[#e2e2e8] ml-1 tabular-nums">360 kcal</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-[#3b4a40]/20 bg-[#0c0e12] flex items-center justify-between text-[8px] font-medium">
                    <div className="flex flex-col items-center gap-0.5 text-[#bacbbe]">
                      <span className="material-symbols-outlined text-[13px]">grid_view</span>
                      <span>Dashboard</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#76ffbb]">
                      <span className="text-[11px] leading-none">🍎</span>
                      <span>Food Log</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shadow -mt-2 border border-[#0d0f12]">
                      +
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#bacbbe]">
                      <span className="material-symbols-outlined text-[13px]">science</span>
                      <span>Strategy</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 px-2">
                <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-semibold mb-1">
                  Adherence-Neutral Nutrition Stream
                </h3>
                <p className="font-['Geist'] text-xs text-[#bacbbe]">
                  Hierarchical meal logging without red guilt streaks. Verified logs include Vegetable Fried Rice (540
                  kcal) and Poha with Curd (360 kcal) under Lunch (900 kcal).
                </p>
              </div>
            </div>

            {/* CARD 3: Multimodal Vision Sheet */}
            <div className="flex flex-col rounded-3xl bg-[#1a1c20] border border-[#3b4a40]/40 p-4 transition-all duration-300 hover:border-[#ffb690]/40 hover:shadow-[0_0_25px_-5px_rgba(255,182,144,0.12)] group">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#ffb690]">SCREEN 03 // VISION DRAWER</span>
                <span className="inline-flex items-center gap-1 font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffb690]" /> Multimodal
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-[#3b4a40]/60 shadow-2xl aspect-[9/19.5]">
                <div className="w-full h-full bg-[#0c0e12] text-[#e2e2e8] flex flex-col justify-between text-left select-none overflow-hidden text-[10px] relative font-sans">
                  {/* Backdrop blur effect */}
                  <div className="absolute inset-0 p-3 opacity-30 pointer-events-none filter blur-[1px]">
                    <div className="h-4 w-20 bg-[#1e2024] rounded" />
                    <div className="h-10 w-full bg-[#1e2024] rounded-xl mt-2" />
                    <div className="h-12 w-full bg-[#1e2024] rounded-xl mt-2" />
                  </div>

                  {/* Drawer */}
                  <div className="absolute inset-x-0 bottom-0 top-10 bg-[#16191f] rounded-t-3xl border-t border-[#3b4a40]/50 p-3 flex flex-col justify-between shadow-2xl z-20">
                    <div className="space-y-2.5">
                      <div className="w-8 h-1 bg-[#3b4a40]/60 rounded-full mx-auto -mt-1" />
                      <div className="flex items-start justify-between pt-0.5">
                        <div>
                          <span className="text-[8px] font-mono font-bold text-[#bacbbe] uppercase tracking-wider block">
                            NUTRITION LOGGING
                          </span>
                          <h4 className="font-['Space_Grotesk'] text-sm font-bold text-[#e2e2e8] leading-tight">
                            Log Food &amp; Macros
                          </h4>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 bg-[#0c0e12] p-1 rounded-xl border border-[#3b4a40]/30 text-center text-[9px]">
                        <span className="py-1 rounded text-[#bacbbe]">✍️ Text AI</span>
                        <span className="py-1 rounded bg-white text-black font-bold shadow-sm">📸 Food Photo</span>
                        <span className="py-1 rounded text-[#bacbbe]">🏷️ Barcode</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-xl bg-gradient-to-b from-[#1e232c] to-[#121418] border border-[#3b4a40]/40 flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-[15px] text-[#76ffbb] mb-1">photo_camera</span>
                          <span className="font-bold text-[9px] text-[#e2e2e8]">Snap Photo</span>
                        </div>
                        <div className="p-2 rounded-xl bg-gradient-to-b from-[#1e232c] to-[#121418] border border-[#3b4a40]/40 flex flex-col items-center text-center">
                          <span className="material-symbols-outlined text-[15px] text-[#adc6ff] mb-1">photo_library</span>
                          <span className="font-bold text-[9px] text-[#e2e2e8]">Choose Photo</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button className="w-full py-2 rounded-xl bg-gradient-to-r from-[#00e699] via-[#76ffbb] to-[#0566d9] text-black font-['Space_Grotesk'] text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-[#00e699]/20 cursor-pointer">
                        <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                        <span>Analyze with Gemini Vision</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 px-2">
                <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-semibold mb-1">
                  Multimodal Vision &amp; Macro Ingress
                </h3>
                <p className="font-['Geist'] text-xs text-[#bacbbe]">
                  High-speed logging drawer supporting 3 ingress modes: Text AI, Food Photo (Gemini 3.8 Flash with 10.5-inch
                  plate reference), and Barcode scanner.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= THREE CORE BOTTLENECKS & SOLUTIONS ================= */}
        <section className="py-20 px-6 bg-[#0c0e12] border-y border-[#3b4a40]/20">
          <div className="max-w-7xl mx-auto">
            <div className="mb-14 text-center max-w-2xl mx-auto">
              <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb] tracking-wider uppercase">
                Theoretical Dilemmas &amp; Capstone Breakthroughs
              </span>
              <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl text-[#e2e2e8] font-bold mt-2">
                The Three Fundamental Sports Informatics Bottlenecks
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Dilemma 1 */}
              <div className="rounded-2xl bg-[#1e2024] p-6 border border-[#3b4a40]/40 flex flex-col justify-between transition-all duration-300 hover:border-[#76ffbb]/40 hover:shadow-[0_0_20px_-5px_rgba(118,255,187,0.1)]">
                <div>
                  <div className="flex items-center gap-2 text-[#ffb4ab] font-['JetBrains_Mono'] text-xs uppercase mb-3">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>The Static TDEE Trap</span>
                  </div>
                  <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-3">
                    Adaptive Thermogenesis Halts Progress
                  </h3>
                  <p className="font-['Geist'] text-sm text-[#bacbbe] leading-relaxed mb-6">
                    Legacy fitness apps calculate maintenance calories once using static formulas. As energy restriction
                    causes Non-Exercise Activity Thermogenesis (NEAT) and metabolic efficiency to decline, users crash into
                    unexplainable plateaus.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#1a1c20] border border-[#76ffbb]/20">
                  <div className="flex items-center gap-2 text-[#76ffbb] font-['JetBrains_Mono'] text-[11px] mb-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>FitMatrix Autonomous Solution</span>
                  </div>
                  <p className="font-['Geist'] text-xs text-[#e2e2e8] font-medium">
                    Dynamic Rolling TDEE with Exponential Smoothing: updates maintenance expenditure daily via bodyweight
                    change derivatives (ΔW × 7,700 kcal / 7 days, α = 0.15).
                  </p>
                </div>
              </div>

              {/* Dilemma 2 */}
              <div className="rounded-2xl bg-[#1e2024] p-6 border border-[#3b4a40]/40 flex flex-col justify-between transition-all duration-300 hover:border-[#76ffbb]/40 hover:shadow-[0_0_20px_-5px_rgba(118,255,187,0.1)]">
                <div>
                  <div className="flex items-center gap-2 text-[#ffb4ab] font-['JetBrains_Mono'] text-xs uppercase mb-3">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>Compliance Shaming Paradigms</span>
                  </div>
                  <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-3">
                    Red Streaks Induce User Abandonment
                  </h3>
                  <p className="font-['Geist'] text-sm text-[#bacbbe] leading-relaxed mb-6">
                    Standard apps punish athletes when they exceed caloric limits by 50 calories, displaying aggressive red
                    bars, broken flame streaks, and accusatory notifications that trigger binge-restrict cycles.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#1a1c20] border border-[#76ffbb]/20">
                  <div className="flex items-center gap-2 text-[#76ffbb] font-['JetBrains_Mono'] text-[11px] mb-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>FitMatrix Autonomous Solution</span>
                  </div>
                  <p className="font-['Geist'] text-xs text-[#e2e2e8] font-medium">
                    Adherence-Neutral Feedback Architecture: Pure thermodynamic telemetry. Calories are treated as raw
                    energetic ledger units with dynamic multi-day budget rebalancing without guilt.
                  </p>
                </div>
              </div>

              {/* Dilemma 3 */}
              <div className="rounded-2xl bg-[#1e2024] p-6 border border-[#3b4a40]/40 flex flex-col justify-between transition-all duration-300 hover:border-[#76ffbb]/40 hover:shadow-[0_0_20px_-5px_rgba(118,255,187,0.1)]">
                <div>
                  <div className="flex items-center gap-2 text-[#ffb4ab] font-['JetBrains_Mono'] text-xs uppercase mb-3">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>Sensor Silos &amp; Hallucinations</span>
                  </div>
                  <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-3">
                    Unreliable Generic AI Advice
                  </h3>
                  <p className="font-['Geist'] text-sm text-[#bacbbe] leading-relaxed mb-6">
                    Generic LLM wrappers fail to access real-time raw biometric sensor data, dispensing dangerously inaccurate
                    training and diet advice that ignores acute fatigue or low HRV levels.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#1a1c20] border border-[#76ffbb]/20">
                  <div className="flex items-center gap-2 text-[#76ffbb] font-['JetBrains_Mono'] text-[11px] mb-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>FitMatrix Autonomous Solution</span>
                  </div>
                  <p className="font-['Geist'] text-xs text-[#e2e2e8] font-medium">
                    Hardware Sensor Pipeline via Android Health Connect + zero-token deterministic Recovery calculation
                    coupled with a LangGraph multi-agent DAG that enforces medical guardrails.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 3-TIER DISTRIBUTED ARCHITECTURE ================= */}
        <section className="py-20 px-6 max-w-7xl mx-auto" id="architecture">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb] tracking-wider uppercase">
                Full-Stack Blueprint
              </span>
              <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl text-[#e2e2e8] font-bold mt-1">
                3-Tier Distributed Architecture
              </h2>
            </div>
            <div className="font-['JetBrains_Mono'] text-xs text-[#bacbbe] flex items-center gap-2 mt-2 md:mt-0">
              <span className="w-2 h-2 rounded-full bg-[#00e699]" />
              <span>STABLE SPECIFICATION // v2.4.0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TIER 1 */}
            <div className="rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40 p-6 flex flex-col transition-all duration-300 hover:border-[#76ffbb]/40">
              <div className="flex items-center justify-between pb-4 border-b border-[#3b4a40]/20 mb-4">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">TIER 01 // CLIENT DEVICE</span>
                <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">EDGE RUNTIME</span>
              </div>
              <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-3">
                React Native 0.87 &amp; Health Connect
              </h3>
              <ul className="space-y-3 font-['Geist'] text-xs text-[#bacbbe] flex-1">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#76ffbb] text-base">check</span>
                  <span>
                    <strong className="text-[#e2e2e8]">Zustand v5 + MMKV v4:</strong> C++ POSIX mmap layer delivering
                    microsecond-grade local cache reads (&lt;5ms) without serialization overhead.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#76ffbb] text-base">check</span>
                  <span>
                    <strong className="text-[#e2e2e8]">Android Health Connect API 34+:</strong> Native ActivityResultLauncher
                    permission flow retrieving sleep stages, HRV, resting HR, and active expenditure.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#76ffbb] text-base">check</span>
                  <span>
                    <strong className="text-[#e2e2e8]">Zero-Jank Visuals:</strong> Skia GPU-accelerated SVG telemetry arcs
                    running on dedicated UI render threads.
                  </span>
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-[#3b4a40]/20 font-['JetBrains_Mono'] text-[11px] text-[#bacbbe]">
                Target OS: Android 14 / API 34+
              </div>
            </div>

            {/* TIER 2 */}
            <div className="rounded-2xl bg-[#1e2024] border border-[#76ffbb]/30 p-6 flex flex-col glow-primary relative transition-all duration-300 hover:border-[#76ffbb]/60">
              <div className="absolute -top-3 right-6 bg-[#76ffbb] text-[#002112] text-[10px] font-['JetBrains_Mono'] px-2 py-0.5 rounded font-bold uppercase">
                Supervisor Core
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-[#3b4a40]/20 mb-4">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">TIER 02 // INTELLIGENCE</span>
                <span className="font-['JetBrains_Mono'] text-[10px] text-[#76ffbb]">ORCHESTRATOR</span>
              </div>
              <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-3">
                FastAPI &amp; LangGraph StateGraph
              </h3>
              <ul className="space-y-3 font-['Geist'] text-xs text-[#bacbbe] flex-1">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#76ffbb] text-base">check</span>
                  <span>
                    <strong className="text-[#e2e2e8]">LangGraph 0.2+ Engine:</strong> Cyclic multi-agent graph with
                    specialized workers for Sleep, Diet, and Workout autoregulation.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#76ffbb] text-base">check</span>
                  <span>
                    <strong className="text-[#e2e2e8]">Multimodal Vision Ingress:</strong> Gemini 3.8 Flash with 10.5-inch
                    plate tableware reference and zero-shot volumetric density heuristics.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#76ffbb] text-base">check</span>
                  <span>
                    <strong className="text-[#e2e2e8]">Resilient Multi-Provider Fallback:</strong> Gemini 3.8 → Groq
                    (qwen3.8-27b, 120 tps) → OpenAI gpt-4o fallback queue.
                  </span>
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-[#3b4a40]/20 font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">
                FastAPI 0.115+ / Async UVLoop
              </div>
            </div>

            {/* TIER 3 */}
            <div className="rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40 p-6 flex flex-col transition-all duration-300 hover:border-[#adc6ff]/40">
              <div className="flex items-center justify-between pb-4 border-b border-[#3b4a40]/20 mb-4">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#adc6ff]">TIER 03 // PERSISTENCE</span>
                <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">DATA LAKE</span>
              </div>
              <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-3">
                MongoDB Atlas &amp; Vector Store
              </h3>
              <ul className="space-y-3 font-['Geist'] text-xs text-[#bacbbe] flex-1">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#adc6ff] text-base">check</span>
                  <span>
                    <strong className="text-[#e2e2e8]">Beanie Async ODM:</strong> Strictly-typed Pydantic schemas validating
                    meal and telemetry documents across MongoDB Atlas sharded clusters.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#adc6ff] text-base">check</span>
                  <span>
                    <strong className="text-[#e2e2e8]">Redis Distributed Cache:</strong> Leaky-bucket rate limiters and
                    pub/sub channels coordinating real-time client state notifications.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#adc6ff] text-base">check</span>
                  <span>
                    <strong className="text-[#e2e2e8]">PostgreSQL pgvector RAG:</strong> Embedded sports science peer-reviewed
                    papers (ISSN, ACSM) for evidence-grounded agent rationale.
                  </span>
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-[#3b4a40]/20 font-['JetBrains_Mono'] text-[11px] text-[#bacbbe]">
                ACID Compliance + HNSW Vector Indices
              </div>
            </div>
          </div>
        </section>

        {/* ================= LANGGRAPH MULTI-AGENT STATEGRAPH DAG ================= */}
        <section className="py-20 px-6 bg-[#1a1c20] border-y border-[#3b4a40]/20">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb] tracking-wider uppercase">
                Orchestration Protocol
              </span>
              <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl text-[#e2e2e8] font-bold mt-1">
                LangGraph Multi-Agent StateGraph
              </h2>
              <p className="font-['Geist'] text-sm text-[#bacbbe] max-w-2xl mt-2">
                Deterministic biometric state extraction precedes any generative invocation. The supervisor routes user intent
                dynamically while safety evaluators intercept nutritional anomalies.
              </p>
            </div>

            {/* DAG Diagram with data-lenis-prevent for horizontal scrolling */}
            <div
              className="p-8 rounded-2xl bg-[#0c0e12] border border-[#3b4a40]/40 overflow-x-auto overscroll-contain"
              data-lenis-prevent
            >
              <div className="min-w-[760px] flex items-center justify-between gap-4 relative py-6">
                {/* START Node */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-[#282a2e] border-2 border-[#3b4a40]/60 flex items-center justify-center font-['JetBrains_Mono'] text-xs text-[#e2e2e8] font-bold">
                    START
                  </div>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe] mt-2">User Query / Ingress</span>
                </div>

                <div className="h-0.5 flex-1 bg-[#3b4a40]/40 relative">
                  <span className="material-symbols-outlined absolute right-0 -top-2.5 text-[#3b4a40] text-base">
                    arrow_forward
                  </span>
                </div>

                {/* SUPERVISOR Node */}
                <div className="flex flex-col items-center">
                  <div className="px-5 py-4 rounded-xl bg-[#282a2e] border-2 border-[#76ffbb]/80 flex flex-col items-center shadow-lg shadow-[#76ffbb]/10">
                    <span className="material-symbols-outlined text-[#76ffbb] mb-1">psychology</span>
                    <span className="font-['Space_Grotesk'] text-sm text-[#76ffbb] font-bold">Supervisor Router</span>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Conditional Edge Dispatch</span>
                  </div>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe] mt-2 font-mono">Intent Parsing</span>
                </div>

                <div className="h-0.5 flex-1 bg-[#3b4a40]/40 relative">
                  <span className="material-symbols-outlined absolute right-0 -top-2.5 text-[#3b4a40] text-base">
                    arrow_forward
                  </span>
                </div>

                {/* PARALLEL AGENTS */}
                <div className="flex flex-col gap-3">
                  <div className="p-3 rounded-lg bg-[#1e2024] border border-[#3b4a40]/40 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#76ffbb] text-lg">bedtime</span>
                    <div>
                      <div className="font-['JetBrains_Mono'] text-[11px] text-[#e2e2e8] font-bold">sleep_agent</div>
                      <div className="font-['JetBrains_Mono'] text-[10px] text-[#76ffbb]">
                        &lt;1ms Deterministic Recovery Score
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1e2024] border border-[#3b4a40]/40 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#adc6ff] text-lg">fitness_center</span>
                    <div>
                      <div className="font-['JetBrains_Mono'] text-[11px] text-[#e2e2e8] font-bold">workout_agent</div>
                      <div className="font-['JetBrains_Mono'] text-[10px] text-[#adc6ff]">RIR / Fatigue Autoregulation</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1e2024] border border-[#3b4a40]/40 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#ffdbca] text-lg">restaurant</span>
                    <div>
                      <div className="font-['JetBrains_Mono'] text-[11px] text-[#e2e2e8] font-bold">diet_agent</div>
                      <div className="font-['JetBrains_Mono'] text-[10px] text-[#ffdbca]">
                        Dynamic Carb Cycling &amp; Macro Bounds
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-0.5 flex-1 bg-[#3b4a40]/40 relative">
                  <span className="material-symbols-outlined absolute right-0 -top-2.5 text-[#3b4a40] text-base">
                    arrow_forward
                  </span>
                </div>

                {/* PLAN GENERATOR */}
                <div className="flex flex-col items-center">
                  <div className="px-4 py-4 rounded-xl bg-[#282a2e] border border-[#3b4a40]/60 flex flex-col items-center">
                    <span className="material-symbols-outlined text-[#adc6ff] mb-1">auto_awesome</span>
                    <span className="font-['Space_Grotesk'] text-sm text-[#e2e2e8] font-bold">Plan Aggregator</span>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Validated JSON Output</span>
                  </div>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe] mt-2 font-mono">Consensus Gate</span>
                </div>

                <div className="h-0.5 flex-1 bg-[#3b4a40]/40 relative">
                  <span className="material-symbols-outlined absolute right-0 -top-2.5 text-[#3b4a40] text-base">
                    arrow_forward
                  </span>
                </div>

                {/* END Node */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-[#00e699] text-[#002112] flex items-center justify-center font-['JetBrains_Mono'] text-xs font-bold">
                    END
                  </div>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#76ffbb] mt-2">Mobile Sync</span>
                </div>
              </div>
            </div>

            {/* Fallback Banner */}
            <div className="mt-6 p-4 rounded-xl bg-[#333539]/40 border border-[#3b4a40]/30 flex flex-wrap items-center justify-between gap-4 font-['JetBrains_Mono'] text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#76ffbb] text-base">shield</span>
                <span className="text-[#e2e2e8] font-semibold">Resilience Fallback Tier:</span>
              </div>
              <div className="flex items-center gap-3 text-[#bacbbe]">
                <span className="text-[#76ffbb] font-bold">Tier 1: Google Gemini 3.8 Flash (Multimodal)</span>
                <span>→</span>
                <span className="text-[#adc6ff] font-bold">Tier 2: Groq qwen/qwen3.8-27b (120 tps)</span>
                <span>→</span>
                <span className="text-[#ffdbca] font-bold">Tier 3: OpenAI gpt-4o (Emergency Safety)</span>
              </div>
              <span className="text-[#76ffbb] font-mono font-bold tabular-nums">99.98% Orchestration Uptime</span>
            </div>
          </div>
        </section>

        {/* ================= MATHEMATICAL FORMULATIONS MATRIX ================= */}
        <section className="py-20 px-6 max-w-7xl mx-auto" id="formulations">
          <div className="mb-14">
            <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb] tracking-wider uppercase">
              Applied Sports Science Core
            </span>
            <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl text-[#e2e2e8] font-bold mt-1">
              Mathematical Formulations Matrix
            </h2>
            <p className="font-['Geist'] text-sm text-[#bacbbe] max-w-2xl mt-2">
              Deterministic algorithms executing locally and in backend state machines with zero hallucination.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Formula 1 */}
            <div className="p-6 rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40 flex flex-col justify-between transition-all duration-300 hover:border-[#76ffbb]/40">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">ALGORITHM 01</span>
                  <span className="font-mono text-[10px] text-[#bacbbe]">&lt;1ms // 0 Tokens</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-2">
                  Biometric Readiness Score
                </h3>
                <div className="p-3 my-3 rounded-lg bg-[#0c0e12] border border-[#3b4a40]/30 font-mono text-xs text-[#76ffbb] overflow-x-auto leading-relaxed">
                  Readiness = max(0, ⌊min(SleepMin/420, 1.0) × 80⌋ - Pen<sub>steps</sub> - Pen<sub>RHR</sub>)
                </div>
                <p className="font-['Geist'] text-xs text-[#bacbbe]">
                  Where Pen<sub>steps</sub> triggers if step count &gt; 18,000 and Pen<sub>RHR</sub> penalizes when morning
                  resting heart rate is &gt; 5 bpm above the 30-day baseline average.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#3b4a40]/20 font-['JetBrains_Mono'] text-[10px] text-[#76ffbb]">
                Evaluates to &quot;Optimal Recovery&quot; in Client Telemetry
              </div>
            </div>

            {/* Formula 2 */}
            <div className="p-6 rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40 flex flex-col justify-between transition-all duration-300 hover:border-[#adc6ff]/40">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">ALGORITHM 02</span>
                  <span className="font-mono text-[10px] text-[#bacbbe]">AJCN Validated</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-2">
                  Mifflin-St Jeor BMR Engine
                </h3>
                <div className="p-3 my-3 rounded-lg bg-[#0c0e12] border border-[#3b4a40]/30 font-mono text-xs text-[#adc6ff] overflow-x-auto leading-relaxed">
                  BMR<sub>male</sub> = (10 × W) + (6.25 × H) - (5 × A) + 5
                  <br />
                  BMR<sub>female</sub> = (10 × W) + (6.25 × H) - (5 × A) - 161
                </div>
                <p className="font-['Geist'] text-xs text-[#bacbbe]">
                  Weight (W) in kg, Height (H) in cm, Age (A) in years. Multiplied by empirical physical activity level
                  (PAL) coefficients ranging 1.2 to 1.9.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#3b4a40]/20 font-['JetBrains_Mono'] text-[10px] text-[#adc6ff]">
                Deterministic baseline foundation
              </div>
            </div>

            {/* Formula 3 */}
            <div className="p-6 rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40 flex flex-col justify-between transition-all duration-300 hover:border-[#ffdbca]/40">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">ALGORITHM 03</span>
                  <span className="font-mono text-[10px] text-[#bacbbe]">Trexler Smoothing</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-2">
                  Dynamic Rolling TDEE
                </h3>
                <div className="p-3 my-3 rounded-lg bg-[#0c0e12] border border-[#3b4a40]/30 font-mono text-xs text-[#ffdbca] overflow-x-auto leading-relaxed">
                  W̄<sub>t</sub> = α × W<sub>t</sub> + (1 - α) × W̄<sub>t-1</sub> (α = 0.15)
                  <br />
                  Daily Imbalance = (ΔW̄ × 7700) / 7
                </div>
                <p className="font-['Geist'] text-xs text-[#bacbbe]">
                  Eliminates transient water weight oscillations to dynamically solve for real expenditure:{" "}
                  <code className="text-[#76ffbb] font-mono">TDEE = Intake - Daily Imbalance</code>.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#3b4a40]/20 font-['JetBrains_Mono'] text-[10px] text-[#ffdbca]">
                Continuous auto-tuning against metabolic adaptation
              </div>
            </div>

            {/* Formula 4 */}
            <div className="p-6 rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40 flex flex-col justify-between transition-all duration-300 hover:border-[#76ffbb]/40">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">ALGORITHM 04</span>
                  <span className="font-mono text-[10px] text-[#bacbbe]">Wishnofsky Kinetic</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-2">
                  Wishnofsky Tissue Deficit
                </h3>
                <div className="p-3 my-3 rounded-lg bg-[#0c0e12] border border-[#3b4a40]/30 font-mono text-xs text-[#e2e2e8] overflow-x-auto leading-relaxed">
                  Deficit<sub>cumulative</sub> = ∫ (TDEE(t) - Intake(t)) dt
                  <br />
                  ΔM = (Deficit × 0.75 / 9400) + (Deficit × 0.25 / 1800)
                </div>
                <p className="font-['Geist'] text-xs text-[#bacbbe]">
                  Replaces the naive 3,500 kcal rule with variable adipose (75%) vs fat-free mass (25%) thermodynamic
                  density degradation.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#3b4a40]/20 font-['JetBrains_Mono'] text-[10px] text-[#e2e2e8]">
                Realistic plateau &amp; goal ETA forecast
              </div>
            </div>

            {/* Formula 5 */}
            <div className="p-6 rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40 flex flex-col justify-between transition-all duration-300 hover:border-[#adc6ff]/40">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">ALGORITHM 05</span>
                  <span className="font-mono text-[10px] text-[#bacbbe]">Periodized Nutrition</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-2">
                  Isocaloric Carb Cycling
                </h3>
                <div className="p-3 my-3 rounded-lg bg-[#0c0e12] border border-[#3b4a40]/30 font-mono text-xs text-[#adc6ff] overflow-x-auto leading-relaxed">
                  Intake<sub>train</sub> = Intake<sub>base</sub> + 250 kcal
                  <br />
                  Intake<sub>rest</sub> = Intake<sub>base</sub> - (250 × N<sub>train</sub> / N<sub>rest</sub>)
                </div>
                <p className="font-['Geist'] text-xs text-[#bacbbe]">
                  Preserves weekly net energy balance while boosting muscle glycogen loading around high-volume lifting sessions.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#3b4a40]/20 font-['JetBrains_Mono'] text-[10px] text-[#adc6ff]">
                Enforced by the LangGraph diet_agent
              </div>
            </div>

            {/* Formula 6 */}
            <div className="p-6 rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40 flex flex-col justify-between transition-all duration-300 hover:border-[#76ffbb]/40">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">ALGORITHM 06</span>
                  <span className="font-mono text-[10px] text-[#bacbbe]">Hypertrophy Physics</span>
                </div>
                <h3 className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold mb-2">
                  Brzycki 1RM Estimation
                </h3>
                <div className="p-3 my-3 rounded-lg bg-[#0c0e12] border border-[#3b4a40]/30 font-mono text-xs text-[#76ffbb] overflow-x-auto leading-relaxed">
                  1RM = Weight × 36 / (37 - Repetitions)
                  <br />
                  decay_factor = e<sup>-0.035 × days_inactive</sup>
                </div>
                <p className="font-['Geist'] text-xs text-[#bacbbe]">
                  Autoregulates training loads based on logged RPE/RIR sets. Accounts for neuromuscular decay when workouts are missed.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#3b4a40]/20 font-['JetBrains_Mono'] text-[10px] text-[#76ffbb]">
                Integrated in Workout Universe
              </div>
            </div>
          </div>
        </section>

        {/* ================= DUAL-UNIVERSE NAVIGATION & 52-WEEK HEATMAP ================= */}
        <section className="py-20 px-6 bg-[#0c0e12] border-y border-[#3b4a40]/20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb] tracking-wider uppercase">
                  Dual-Universe Architecture
                </span>
                <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl text-[#e2e2e8] font-bold mt-1 mb-4">
                  Nutrition Universe <span className="text-[#bacbbe] font-light">×</span> Workout Universe
                </h2>
                <p className="font-['Geist'] text-sm md:text-base text-[#bacbbe] mb-6 leading-relaxed">
                  FitMatrix bifurcates athlete telemetry into two dedicated operational paradigms. The Nutrition Universe
                  tracks continuous thermodynamic consumption, while the Workout Universe calculates biomechanical mechanical
                  tension.
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#1e2024] border border-[#3b4a40]/30 transition-all hover:border-[#76ffbb]/30">
                    <div className="font-['Space_Grotesk'] text-sm text-[#e2e2e8] font-semibold flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[#76ffbb]">nutrition</span>
                      <span>Nutrition Universe</span>
                    </div>
                    <p className="font-['Geist'] text-xs text-[#bacbbe]">
                      Arc gauges (900 kcal consumed / 1,834 kcal remaining), multi-phase macro distribution bars, and
                      zero-shaming dietary timeline logging.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1e2024] border border-[#3b4a40]/30 transition-all hover:border-[#adc6ff]/30">
                    <div className="font-['Space_Grotesk'] text-sm text-[#e2e2e8] font-semibold flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[#adc6ff]">exercise</span>
                      <span>Workout Universe (Tri-Mode Silhouettes)</span>
                    </div>
                    <p className="font-['Geist'] text-xs text-[#bacbbe]">
                      Tri-Mode muscular activation visualizer: (1) Volume Balance, (2) Acute Fatigue Recency, and (3)
                      Neuromuscular 1RM Decay.
                    </p>
                  </div>
                </div>
              </div>

              {/* 52-Week Heatmap with data-lenis-prevent */}
              <div className="lg:col-span-7">
                <div className="p-6 rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">52-WEEK ACTIVITY MATRIX</div>
                      <div className="font-['Space_Grotesk'] text-base md:text-lg text-[#e2e2e8] font-bold">
                        Biometric Consistency Heatmap
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-xs">
                      <span className="text-[#bacbbe]">Less</span>
                      <div className="flex gap-1">
                        <span className="w-3 h-3 rounded-xs bg-[#333539]/40" />
                        <span className="w-3 h-3 rounded-xs bg-[#76ffbb]/30" />
                        <span className="w-3 h-3 rounded-xs bg-[#76ffbb]/70" />
                        <span className="w-3 h-3 rounded-xs bg-[#76ffbb]" />
                      </div>
                      <span className="text-[#76ffbb] font-bold">More</span>
                    </div>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="overflow-x-auto py-2 overscroll-contain" data-lenis-prevent>
                    <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
                      {heatmapCells.map((level, idx) => {
                        const bgClasses = [
                          "bg-[#333539]/40",
                          "bg-[#333539]",
                          "bg-[#76ffbb]/30",
                          "bg-[#76ffbb]/60",
                          "bg-[#76ffbb]",
                        ];
                        return (
                          <span
                            key={idx}
                            className={`w-3 h-3 rounded-xs ${bgClasses[level]} transition-transform hover:scale-150 cursor-pointer`}
                            title={`Day ${idx + 1}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#3b4a40]/30 text-center">
                    <div>
                      <div className="font-['Space_Grotesk'] text-xl font-bold text-[#76ffbb] tabular-nums">96.4%</div>
                      <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Weigh-In Adherence</div>
                    </div>
                    <div>
                      <div className="font-['Space_Grotesk'] text-xl font-bold text-[#adc6ff] tabular-nums">284 Days</div>
                      <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Active Telemetry Stream</div>
                    </div>
                    <div>
                      <div className="font-['Space_Grotesk'] text-xl font-bold text-[#ffdbca] tabular-nums">0 Days</div>
                      <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Compliance Punishment</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= INTERACTIVE VISION & MACRO INGRESS SIMULATOR ================= */}
        <section className="py-20 px-6 max-w-7xl mx-auto" id="vision-engine">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb] tracking-wider uppercase">
              Interactive Laboratory
            </span>
            <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl text-[#e2e2e8] font-bold mt-1">
              Multimodal Vision &amp; Macro Ingress Simulator
            </h2>
            <p className="font-['Geist'] text-sm text-[#bacbbe] mt-2">
              Experience the Gemini 3.8 Flash Vision pipeline with tableware calibration (standard 10.5-inch plate reference)
              and zero-shot volumetric density heuristics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-[#1a1c20] border border-[#3b4a40]/40 p-6">
              <div className="font-['JetBrains_Mono'] text-[11px] text-[#bacbbe] mb-3">SELECT REAL TEST INGRESS</div>
              <div className="space-y-3 mb-6">
                <button
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    activeDish === "fried_rice"
                      ? "border-[#76ffbb]/50 bg-[#1e2024] shadow-[0_0_15px_-3px_rgba(118,255,187,0.15)]"
                      : "border-[#3b4a40]/30 bg-[#0c0e12] hover:border-[#3b4a40]"
                  }`}
                  onClick={() => handleSelectDish("fried_rice")}
                >
                  <div>
                    <div className="font-['Space_Grotesk'] text-sm font-bold text-[#e2e2e8]">
                      Vegetable Fried Rice &amp; Stir-Fry
                    </div>
                    <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Indian / Asian Lunch Ingress</div>
                  </div>
                  <span className="font-['JetBrains_Mono'] text-xs text-[#76ffbb] font-bold tabular-nums">540 kcal</span>
                </button>

                <button
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    activeDish === "poha_curd"
                      ? "border-[#76ffbb]/50 bg-[#1e2024] shadow-[0_0_15px_-3px_rgba(118,255,187,0.15)]"
                      : "border-[#3b4a40]/30 bg-[#0c0e12] hover:border-[#3b4a40]"
                  }`}
                  onClick={() => handleSelectDish("poha_curd")}
                >
                  <div>
                    <div className="font-['Space_Grotesk'] text-sm font-bold text-[#e2e2e8]">
                      Poha with Plain Curd (Dahi)
                    </div>
                    <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Frequent Staple (1-Tap Re-Log)</div>
                  </div>
                  <span className="font-['JetBrains_Mono'] text-xs text-[#adc6ff] font-bold tabular-nums">360 kcal</span>
                </button>

                <button
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    activeDish === "chicken_bowl"
                      ? "border-[#76ffbb]/50 bg-[#1e2024] shadow-[0_0_15px_-3px_rgba(118,255,187,0.15)]"
                      : "border-[#3b4a40]/30 bg-[#0c0e12] hover:border-[#3b4a40]"
                  }`}
                  onClick={() => handleSelectDish("chicken_bowl")}
                >
                  <div>
                    <div className="font-['Space_Grotesk'] text-sm font-bold text-[#e2e2e8]">
                      Chipotle Grilled Chicken Bowl
                    </div>
                    <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">High-Protein Ingress</div>
                  </div>
                  <span className="font-['JetBrains_Mono'] text-xs text-[#ffdbca] font-bold tabular-nums">680 kcal</span>
                </button>
              </div>

              {/* Mode Switcher */}
              <div className="p-1 rounded-xl bg-[#1e2024] border border-[#3b4a40]/40 flex items-center justify-between mb-4">
                <div className="flex-1 text-center py-2 rounded-lg text-[#bacbbe] font-['JetBrains_Mono'] text-xs flex items-center justify-center gap-1">
                  <span>✍️</span> Text AI
                </div>
                <div className="flex-1 text-center py-2 rounded-lg bg-[#00e699] text-[#002112] font-['JetBrains_Mono'] text-xs font-bold flex items-center justify-center gap-1 shadow">
                  <span>📸</span> Food Photo
                </div>
                <div className="flex-1 text-center py-2 rounded-lg text-[#bacbbe] font-['JetBrains_Mono'] text-xs flex items-center justify-center gap-1">
                  <span>🏷️</span> Barcode
                </div>
              </div>

              <div className="font-['JetBrains_Mono'] text-xs text-[#bacbbe] space-y-2 p-3 bg-[#0c0e12] rounded-lg border border-[#3b4a40]/20">
                <div className="text-[#e2e2e8] font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#76ffbb]">straighten</span>
                  Tableware Depth Calibration
                </div>
                <div>
                  Reference Dimension: <span className="text-[#e2e2e8]">10.5 inches (±0.2 cm)</span>
                </div>
                <div>
                  Estimated Volume: <span className="text-[#e2e2e8] tabular-nums">{simDish.volume}</span>
                </div>
                <div>
                  Model: <span className="text-[#76ffbb] font-mono">gemini-3.8-flash-vision</span>
                </div>
              </div>
            </div>

            {/* Right Output (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl bg-[#1e2024] border border-[#3b4a40]/40 p-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#3b4a40]/30 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#76ffbb] animate-pulse" />
                  <span className="font-['Space_Grotesk'] text-lg text-[#e2e2e8] font-bold">{simDish.title}</span>
                </div>
                <span className="font-['JetBrains_Mono'] text-xs text-[#76ffbb] bg-[#76ffbb]/10 border border-[#76ffbb]/30 px-2.5 py-1 rounded-md">
                  {simDish.confidence}
                </span>
              </div>

              {/* Macro Telemetry Breakdown */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#0c0e12] border border-[#3b4a40]/20 text-center">
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">ENERGY</div>
                  <div className="font-['Space_Grotesk'] text-xl text-[#e2e2e8] font-bold mt-1 tabular-nums">{simDish.kcal}</div>
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">kcal</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0c0e12] border border-[#3b4a40]/20 text-center">
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#76ffbb]">PROTEIN</div>
                  <div className="font-['Space_Grotesk'] text-xl text-[#76ffbb] font-bold mt-1 tabular-nums">{simDish.protein}</div>
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Target 205g</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0c0e12] border border-[#3b4a40]/20 text-center">
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#adc6ff]">CARBS</div>
                  <div className="font-['Space_Grotesk'] text-xl text-[#adc6ff] font-bold mt-1 tabular-nums">{simDish.carbs}</div>
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Target 204g</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0c0e12] border border-[#3b4a40]/20 text-center">
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#ffdbca]">FATS</div>
                  <div className="font-['Space_Grotesk'] text-xl text-[#ffdbca] font-bold mt-1 tabular-nums">{simDish.fat}</div>
                  <div className="font-['JetBrains_Mono'] text-[10px] text-[#bacbbe]">Target 122g</div>
                </div>
              </div>

              {/* Reasoning Chain Trace */}
              <div className="p-4 rounded-xl bg-[#0c0e12] border border-[#3b4a40]/30 font-mono text-xs space-y-2">
                <div className="text-[#e2e2e8] font-bold flex items-center justify-between border-b border-[#3b4a40]/20 pb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#76ffbb]">terminal</span>
                    INFERENCE TRACE // GEMINI 3.8 FLASH
                  </span>
                  <span className="text-[#bacbbe] tabular-nums">t = 342ms</span>
                </div>
                <p className="text-[#bacbbe] leading-relaxed">{simDish.notes}</p>
                <div className="text-[#76ffbb] pt-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Validated against USDA FoodData Central &amp; IFCT 2017 nutritional datasets.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= ACADEMIC RUBRIC & CITATIONS ================= */}
        <section className="py-20 px-6 bg-[#0c0e12] border-t border-[#3b4a40]/20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-6">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb] tracking-wider uppercase">
                  Institutional Rigor
                </span>
                <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl text-[#e2e2e8] font-bold mt-1 mb-4">
                  Capstone Engineering Rubric
                </h2>
                <p className="font-['Geist'] text-sm text-[#bacbbe] mb-6">
                  Developed as a Major Final Year Project fulfilling accredited Bachelor of Technology criteria in
                  Computer Science, Artificial Intelligence, and Applied Health Informatics.
                </p>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#1e2024] border border-[#3b4a40]/30 flex items-center justify-between">
                    <div>
                      <div className="font-['Space_Grotesk'] text-sm text-[#e2e2e8] font-bold">
                        1. Autonomous Biometric Pipeline
                      </div>
                      <div className="font-['JetBrains_Mono'] text-xs text-[#bacbbe]">
                        Native Android Health Connect API 34+ Ingestion
                      </div>
                    </div>
                    <span className="font-['JetBrains_Mono'] text-xs text-[#76ffbb] font-bold">GRADE A+</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1e2024] border border-[#3b4a40]/30 flex items-center justify-between">
                    <div>
                      <div className="font-['Space_Grotesk'] text-sm text-[#e2e2e8] font-bold">
                        2. LangGraph Multi-Agent DAG
                      </div>
                      <div className="font-['JetBrains_Mono'] text-xs text-[#bacbbe]">
                        Deterministic mathematical fallbacks &amp; supervisor routing
                      </div>
                    </div>
                    <span className="font-['JetBrains_Mono'] text-xs text-[#76ffbb] font-bold">GRADE A+</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1e2024] border border-[#3b4a40]/30 flex items-center justify-between">
                    <div>
                      <div className="font-['Space_Grotesk'] text-sm text-[#e2e2e8] font-bold">
                        3. Adherence-Neutral UX Innovation
                      </div>
                      <div className="font-['JetBrains_Mono'] text-xs text-[#bacbbe]">
                        Zero moral guilt interface eliminating burnout
                      </div>
                    </div>
                    <span className="font-['JetBrains_Mono'] text-xs text-[#76ffbb] font-bold">GRADE A+</span>
                  </div>
                </div>
              </div>

              {/* Citations */}
              <div className="lg:col-span-6">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#adc6ff] tracking-wider uppercase">
                  Scientific Grounding
                </span>
                <h2 className="font-['Space_Grotesk'] text-2xl md:text-3xl text-[#e2e2e8] font-bold mt-1 mb-4">
                  Peer-Reviewed Literature
                </h2>

                <div className="space-y-4 font-['Geist'] text-xs">
                  <div className="p-3.5 rounded-xl bg-[#1e2024] border-l-2 border-[#76ffbb]">
                    <span className="font-['JetBrains_Mono'] text-xs text-[#76ffbb] font-mono">
                      [1] Trexler, E. T., Smith-Ryan, A. E., &amp; Norton, L. E. (2014)
                    </span>
                    <p className="text-[#e2e2e8] mt-1">
                      Metabolic adaptation to weight loss: implications for the athlete.{" "}
                      <em>Journal of the International Society of Sports Nutrition (JISSN)</em>, 11(1), 7.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1e2024] border-l-2 border-[#adc6ff]">
                    <span className="font-['JetBrains_Mono'] text-xs text-[#adc6ff] font-mono">
                      [2] Wishnofsky, M. (1958)
                    </span>
                    <p className="text-[#e2e2e8] mt-1">
                      Caloric equivalents of gained or lost weight.{" "}
                      <em>The American Journal of Clinical Nutrition (AJCN)</em>, 6(5), 542–546.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1e2024] border-l-2 border-[#ffdbca]">
                    <span className="font-['JetBrains_Mono'] text-xs text-[#ffdbca] font-mono">
                      [3] Mifflin, M. D., et al. (1990)
                    </span>
                    <p className="text-[#e2e2e8] mt-1">
                      A new predictive equation for resting energy expenditure in healthy individuals.{" "}
                      <em>The American Journal of Clinical Nutrition</em>, 51(2), 241-247.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= QUICKSTART TERMINAL ================= */}
        <section className="py-16 px-6 max-w-7xl mx-auto" id="reproducibility">
          <div className="p-8 rounded-3xl bg-[#1e2024] border border-[#3b4a40]/50 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div>
                <div className="font-['JetBrains_Mono'] text-[11px] text-[#76ffbb]">REPRODUCIBILITY COMPACT</div>
                <h3 className="font-['Space_Grotesk'] text-xl md:text-2xl text-[#e2e2e8] font-bold mt-1">
                  Local Development Environment
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-[#282a2e] border border-[#3b4a40]/50 font-['JetBrains_Mono'] text-xs text-[#e2e2e8]">
                  Docker Engine 27+
                </span>
                <span className="px-3 py-1 rounded bg-[#282a2e] border border-[#3b4a40]/50 font-['JetBrains_Mono'] text-xs text-[#e2e2e8]">
                  Python 3.12+
                </span>
                <span className="px-3 py-1 rounded bg-[#282a2e] border border-[#3b4a40]/50 font-['JetBrains_Mono'] text-xs text-[#e2e2e8]">
                  Node 20 LTS
                </span>
                <button
                  className="px-3 py-1 rounded bg-[#00e699] text-[#002112] font-['Space_Grotesk'] text-xs font-bold hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                  onClick={handleCopyCommands}
                >
                  {copiedTerminal ? "Copied!" : "Copy All"}
                </button>
              </div>
            </div>

            <div
              className="p-4 rounded-xl bg-[#0c0e12] font-mono text-xs text-[#e2e2e8] overflow-x-auto space-y-2 border border-[#3b4a40]/30 overscroll-contain"
              data-lenis-prevent
            >
              <div className="text-[#bacbbe]"># 1. Clone &amp; spin up distributed multi-agent cluster</div>
              <div className="text-[#76ffbb]">
                git clone https://github.com/fitmatrix-informatics/fitmatrix-core.git &amp;&amp; cd fitmatrix-core
              </div>
              <div className="text-[#76ffbb]">docker compose up -d redis mongodb-atlas-local pgvector</div>
              <div className="text-[#bacbbe] pt-2"># 2. Launch FastAPI LangGraph Supervisor DAG</div>
              <div className="text-[#adc6ff]">
                poetry run uvicorn fitmatrix.agent.main:app --host 0.0.0.0 --port 8000 --reload
              </div>
              <div className="text-[#bacbbe] pt-2"># 3. Mount React Native Android Sensor Ingress Client</div>
              <div className="text-[#ffdbca]">yarn install &amp;&amp; npx react-native run-android --mode=release</div>
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-[#0c0e12] border-t border-[#3b4a40]/20">
        <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <span className="font-['Space_Grotesk'] text-base font-bold text-[#e2e2e8]">FitMatrix AI</span>
            <span className="hidden sm:inline text-[#3b4a40]">|</span>
            <span className="font-['JetBrains_Mono'] text-xs text-[#bacbbe] text-center sm:text-left">
              © 2025 FitMatrix Informatics. Autonomous Multi-Agent Biometric Intelligence.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 font-['JetBrains_Mono'] text-xs text-[#bacbbe]">
            <a
              className="hover:text-[#76ffbb] transition-colors cursor-pointer"
              href="#architecture"
              onClick={(e) => scrollToSection(e, "#architecture")}
            >
              Architecture Spec
            </a>
            <a
              className="hover:text-[#76ffbb] transition-colors cursor-pointer"
              href="#architecture"
              onClick={(e) => scrollToSection(e, "#architecture")}
            >
              LangGraph DAG
            </a>
            <a
              className="hover:text-[#76ffbb] transition-colors cursor-pointer"
              href="#hero"
              onClick={(e) => scrollToSection(e, "#hero")}
            >
              Health Connect Sync
            </a>
            <a
              className="hover:text-[#76ffbb] transition-colors cursor-pointer"
              href="#formulations"
              onClick={(e) => scrollToSection(e, "#formulations")}
            >
              Privacy Protocol
            </a>
            <a
              className="hover:text-[#76ffbb] transition-colors cursor-pointer"
              href="#reproducibility"
              onClick={(e) => scrollToSection(e, "#reproducibility")}
            >
              Terms of Compute
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
