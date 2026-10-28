"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface EvalRunSummary {
  run_id: string;
  model_name: string;
  prompt_version: string;
  status: string;
  total_cases: number;
  passed_cases: number;
  pass_rate: number;
  avg_latency_ms: number;
  total_cost_usd: number;
  avg_judge_score: number;
  created_at: string;
}

const DEFAULT_LEADERBOARD = [
  {
    run_id: "baseline_prod",
    model_name: "Gemini 1.5 Flash",
    prompt_version: "v2.0 Autoregulation",
    pass_rate: 100.0,
    avg_judge_score: 4.85,
    avg_latency_ms: 1180,
    cost_per_1k: "$0.063",
    status_label: "ACTIVE",
    status_color: "emerald",
    subtitle: "Active Production Prompt (MongoDB Atlas)",
  },
  {
    run_id: "candidate_exp",
    model_name: "Gemini 2.0 Flash",
    prompt_version: "Candidate v2.1",
    pass_rate: 100.0,
    avg_judge_score: 4.90,
    avg_latency_ms: 890,
    cost_per_1k: "$0.082",
    status_label: "STAGING",
    status_color: "blue",
    subtitle: "Candidate Evaluation Suite",
  },
  {
    run_id: "legacy_v1",
    model_name: "Gemini 1.5 Flash",
    prompt_version: "v1.0 Baseline",
    pass_rate: 83.3,
    avg_judge_score: 4.40,
    avg_latency_ms: 1240,
    cost_per_1k: "$0.063",
    status_label: "DEPRECATED",
    status_color: "zinc",
    subtitle: "Previous Legacy Release",
  },
];

export default function EvalDashboardOverview() {
  const [realRuns, setRealRuns] = useState<EvalRunSummary[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    // 1. Instant hydration from localStorage for zero-flicker reload
    const cached = localStorage.getItem("fitmatrix_latest_benchmark_run");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setRealRuns([parsed]);
      } catch {}
    }

    // 2. Fetch real runs from backend
    fetch("http://localhost:8000/api/v1/eval/runs")
      .then((res) => res.json())
      .then((data) => {
        if (data.runs && data.runs.length > 0) {
          setRealRuns(data.runs);
          setIsLiveConnected(true);
        }
      })
      .catch(() => {
        setIsLiveConnected(false);
      });
  }, []);

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0e131d] via-[#121824] to-[#0c1017] border border-[#212836] p-8 sm:p-10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {isLiveConnected ? "Connected to Live Backend & MongoDB Atlas" : "Active Observability & Guardrail Harness"}
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
          className="p-6 rounded-2xl bg-[#0f1217] hover:bg-[#131720] border border-[#202530] hover:border-purple-500/40 transition-all group space-y-3"
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
        <div className="p-5 border-b border-[#202530] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              Model & Prompt Configuration Leaderboard
              {realRuns.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  LIVE MONGO DATA ({realRuns.length} runs)
                </span>
              )}
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Ranked by deterministic pass rate, LLM judge score, and token economics
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">
              {realRuns.length > 0 ? "Showing Real Benchmark Runs" : "Showing Baseline Reference Set"}
            </span>
          </div>
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
              {realRuns.length > 0
                ? realRuns.map((run, i) => (
                    <tr key={run.run_id} className="hover:bg-[#131720] transition-colors">
                      <td className="p-4 font-semibold text-zinc-200">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              i === 0 ? "bg-emerald-400" : "bg-cyan-400"
                            }`}
                          />
                          <span>
                            {run.model_name} ({run.prompt_version})
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                          Run ID: {run.run_id} • {new Date(run.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-400">{run.pass_rate}%</td>
                      <td className="p-4 font-bold text-cyan-400">{run.avg_judge_score} / 5.0</td>
                      <td className="p-4 text-zinc-300">{run.avg_latency_ms}ms</td>
                      <td className="p-4 text-amber-400">
                        ${(run.total_cost_usd * (1000 / Math.max(1, run.total_cases))).toFixed(4)}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            i === 0
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-blue-950 text-blue-400 border border-blue-800"
                          }`}
                        >
                          {i === 0 ? "ACTIVE" : "RECORDED"}
                        </span>
                      </td>
                    </tr>
                  ))
                : DEFAULT_LEADERBOARD.map((item) => (
                    <tr key={item.run_id} className="hover:bg-[#131720] transition-colors">
                      <td className="p-4 font-semibold text-zinc-200">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.status_color === "emerald"
                                ? "bg-emerald-400"
                                : item.status_color === "blue"
                                ? "bg-blue-400"
                                : "bg-zinc-500"
                            }`}
                          />
                          <span>
                            {item.model_name} ({item.prompt_version})
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">{item.subtitle}</div>
                      </td>
                      <td className="p-4 font-bold text-emerald-400">{item.pass_rate}%</td>
                      <td className="p-4 font-bold text-cyan-400">{item.avg_judge_score} / 5.0</td>
                      <td className="p-4 text-zinc-300">{item.avg_latency_ms}ms</td>
                      <td className="p-4 text-amber-400">{item.cost_per_1k}</td>
                      <td className="p-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status_color === "emerald"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : item.status_color === "blue"
                              ? "bg-blue-950 text-blue-400 border border-blue-800"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {item.status_label}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
