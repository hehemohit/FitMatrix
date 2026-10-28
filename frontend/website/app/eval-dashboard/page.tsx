"use client";

import React from "react";
import Link from "next/link";

export default function EvalDashboardOverview() {
  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0e131d] via-[#121824] to-[#0c1017] border border-[#212836] p-8 sm:p-10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Active Observability & Guardrail Harness
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-['Space_Grotesk'] text-white tracking-tight">
            FitMatrix Multi-Agent Intelligence & Evaluation Studio
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans max-w-2xl">
            Unified telemetry, deterministic guardrails, and LLM-as-a-judge benchmarking
            for the LangGraph supervisor-worker coaching topology. Promoted prompt improvements
            automatically synchronize with production mobile athletes.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/eval-dashboard/benchmarks"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              Run Benchmark Suite
            </Link>
            <Link
              href="/eval-dashboard/studio"
              className="px-5 py-2.5 rounded-xl bg-[#171c26] hover:bg-[#1e2432] border border-[#283042] text-zinc-200 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Athlete Context Studio
            </Link>
            <Link
              href="/eval-dashboard/cards"
              className="px-5 py-2.5 rounded-xl bg-[#171c26] hover:bg-[#1e2432] border border-[#283042] text-zinc-200 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">view_carousel</span>
              Card Visualizer
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Feature Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          href="/eval-dashboard/studio"
          className="p-6 rounded-2xl bg-[#0f1217] hover:bg-[#131720] border border-[#202530] hover:border-cyan-500/40 transition-all group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">tune</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100 group-hover:text-cyan-400 transition-colors">
              Context Studio
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Simulate 1-click physiological presets (Overtrained, Vegan, Injured) or beam phone MMKV biometrics.
            </p>
          </div>
          <div className="text-[11px] font-mono text-cyan-500 flex items-center gap-1 pt-1">
            <span>Explore Studio →</span>
          </div>
        </Link>

        <Link
          href="/eval-dashboard/cards"
          className="p-6 rounded-2xl bg-[#0f1217] hover:bg-[#131720] border border-[#202530] hover:border-cyan-500/40 transition-all group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">view_carousel</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100 group-hover:text-purple-400 transition-colors">
              Card Visualizer
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Preview native mobile AmbientCompanionCard and WorkoutPlan cards with real-time biometric responsiveness.
            </p>
          </div>
          <div className="text-[11px] font-mono text-purple-400 flex items-center gap-1 pt-1">
            <span>Simulate Cards →</span>
          </div>
        </Link>

        <Link
          href="/eval-dashboard/prompts"
          className="p-6 rounded-2xl bg-[#0f1217] hover:bg-[#131720] border border-[#202530] hover:border-emerald-500/40 transition-all group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">psychology</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
              Prompt Registry
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Live edit system prompts and guardrails in MongoDB Atlas. Instant push to production mobile clients.
            </p>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 pt-1">
            <span>Manage Prompts →</span>
          </div>
        </Link>

        <Link
          href="/eval-dashboard/benchmarks"
          className="p-6 rounded-2xl bg-[#0f1217] hover:bg-[#131720] border border-[#202530] hover:border-blue-500/40 transition-all group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100 group-hover:text-blue-400 transition-colors">
              Benchmarks & Judge
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Execute golden test cases, grade safety auto-regulation, and score 4-pillar rubrics using Gemini judge.
            </p>
          </div>
          <div className="text-[11px] font-mono text-blue-400 flex items-center gap-1 pt-1">
            <span>View Benchmarks →</span>
          </div>
        </Link>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-[#0f1217] rounded-2xl border border-[#202530] overflow-hidden">
        <div className="p-5 border-b border-[#202530] flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-wider text-cyan-400">
            Model & Prompt Configuration Leaderboard
          </h2>
          <span className="text-xs font-mono text-zinc-500">Ranked by Pass Rate & Judge Score</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#141820] text-zinc-400 border-b border-[#202530]">
              <tr>
                <th className="p-4">Model & Prompt Version</th>
                <th className="p-4">Pass Rate</th>
                <th className="p-4">LLM Judge Score</th>
                <th className="p-4">Avg Latency</th>
                <th className="p-4">Cost / 1k Invocations</th>
                <th className="p-4 text-right">Production Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2029]">
              <tr className="hover:bg-[#131720] transition-colors">
                <td className="p-4 font-semibold text-zinc-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Gemini 1.5 Flash (v2.0 Autoregulation)</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">Active Production Prompt</div>
                </td>
                <td className="p-4 font-bold text-emerald-400">100.0%</td>
                <td className="p-4 font-bold text-cyan-400">4.85 / 5.0</td>
                <td className="p-4 text-zinc-300">1,180ms</td>
                <td className="p-4 text-amber-400">$0.063</td>
                <td className="p-4 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    ACTIVE
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#131720] transition-colors">
                <td className="p-4 font-semibold text-zinc-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>Gemini 2.0 Flash (Experimental)</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">Candidate v2.1</div>
                </td>
                <td className="p-4 font-bold text-emerald-400">100.0%</td>
                <td className="p-4 font-bold text-cyan-400">4.90 / 5.0</td>
                <td className="p-4 text-zinc-300">890ms</td>
                <td className="p-4 text-amber-400">$0.082</td>
                <td className="p-4 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800">
                    STAGING
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#131720] transition-colors">
                <td className="p-4 font-semibold text-zinc-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-500" />
                    <span>Gemini 1.5 Flash (v1.0 Baseline)</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">Previous Release</div>
                </td>
                <td className="p-4 font-bold text-zinc-400">83.3%</td>
                <td className="p-4 font-bold text-zinc-400">4.40 / 5.0</td>
                <td className="p-4 text-zinc-300">1,240ms</td>
                <td className="p-4 text-amber-400">$0.063</td>
                <td className="p-4 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
                    DEPRECATED
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

