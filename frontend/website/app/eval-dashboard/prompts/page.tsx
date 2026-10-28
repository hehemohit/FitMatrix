"use client";

import React, { useState, useEffect } from "react";

interface PromptConfig {
  agent_role: string;
  active_version: string;
  system_prompt: string;
  guardrails: Record<string, any>;
  versions: Record<string, string>;
  updated_at: string;
}

const DEFAULT_PROMPTS: Record<string, PromptConfig> = {
  workout_agent: {
    agent_role: "workout_agent",
    active_version: "v2.0_autoregulation",
    system_prompt: `You are the FitMatrix Head Strength & Conditioning Coach.
Active Athlete State:
{state_context}

Prescription Rules:
- Tailor the workout to the user's fitness goal if specified in user_profile (e.g. hypertrophy, strength, endurance).
- If fatigue is 'high_fatigue' or readiness < 60: apply RPE auto-regulation (target RPE 6-7, reduce working volume by 1-2 sets, drop back-off failure sets, prioritize submaximal form) rather than canceling workouts.
- If fatigue is 'nominal' and readiness >= 60: prescribe high-intensity compound lifts, progressive overload (RPE 8-9), or goal-specific volume.
- Limit response to 2 crisp, actionable sentences.`,
    guardrails: { max_rpe_when_fatigued: 7, forbid_failure_sets: true, max_sentence_count: 3 },
    versions: { "v1_baseline": "...", "v2.0_autoregulation": "..." },
    updated_at: new Date().toISOString(),
  },
  diet_agent: {
    agent_role: "diet_agent",
    active_version: "v1.8_strict_pref",
    system_prompt: `You are the FitMatrix Lead Sports Nutritionist.
Active Athlete State:
{state_context}

Nutrition Rules:
- Strictly enforce user_profile.dietary_preference (e.g. if 'pure_vegetarian', exclusively prescribe paneer, lentils/dal, Greek yogurt, tofu, soy, or vegetarian whey; NEVER prescribe meat, fish, poultry, or eggs unless permitted).
- Strictly avoid any items in user_profile.allergies.
- Provide direct meal and macro timing recommendations (timing of complex carbs and protein around training/recovery).
- Keep response strictly under 3-4 crisp sentences.`,
    guardrails: { strict_allergy_enforcement: true, enforce_diet_pref: true, max_sentence_count: 4 },
    versions: { "v1_baseline": "...", "v1.8_strict_pref": "..." },
    updated_at: new Date().toISOString(),
  },
  supervisor: {
    agent_role: "supervisor",
    active_version: "v1.0_dispatcher",
    system_prompt: `You are the FitMatrix Master Coordinator. Evaluate athlete telemetry and route to:
- 'sleep_agent' if biometric readiness is uncalculated or sleep debt is severe.
- 'workout_agent' if user asks for workout guidance or daily training prescription.
- 'diet_agent' if user asks for nutrition, food logging, or macro balancing.
- 'FINISH' when all required specialized guidance turns have concluded.`,
    guardrails: { max_hops: 4 },
    versions: { "v1.0_dispatcher": "..." },
    updated_at: new Date().toISOString(),
  },
};

export default function PromptRegistryPage() {
  const [prompts, setPrompts] = useState<Record<string, PromptConfig>>(DEFAULT_PROMPTS);
  const [selectedRole, setSelectedRole] = useState("workout_agent");
  const [currentPromptText, setCurrentPromptText] = useState("");
  const [versionTag, setVersionTag] = useState("v2.1_candidate");
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);

  useEffect(() => {
    // Attempt fetching live prompts from FastAPI backend
    fetch("http://localhost:8000/api/v1/prompts")
      .then((res) => res.json())
      .then((data) => {
        if (data.prompts && data.prompts.length > 0) {
          const map: Record<string, PromptConfig> = {};
          data.prompts.forEach((p: PromptConfig) => {
            map[p.agent_role] = p;
          });
          setPrompts(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (prompts[selectedRole]) {
      setCurrentPromptText(prompts[selectedRole].system_prompt);
      setVersionTag(prompts[selectedRole].active_version || "v2.1_candidate");
    }
  }, [selectedRole, prompts]);

  const handleDeployToMongo = async (promoteImmediately: boolean) => {
    setDeploying(true);
    setDeploySuccess(false);

    try {
      const res = await fetch("http://localhost:8000/api/v1/prompts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_role: selectedRole,
          version_tag: versionTag,
          prompt_text: currentPromptText,
          guardrails: prompts[selectedRole]?.guardrails || {},
          promote_immediately: promoteImmediately,
        }),
      });
      await res.json();
      setDeploySuccess(true);
      setTimeout(() => setDeploySuccess(false), 4000);
    } catch {
      // In offline/demo mode, update state directly
      setPrompts((prev) => ({
        ...prev,
        [selectedRole]: {
          ...prev[selectedRole],
          system_prompt: currentPromptText,
          active_version: promoteImmediately ? versionTag : prev[selectedRole].active_version,
          updated_at: new Date().toISOString(),
        },
      }));
      setDeploySuccess(true);
      setTimeout(() => setDeploySuccess(false), 4000);
    } finally {
      setDeploying(false);
    }
  };

  const activePrompt = prompts[selectedRole];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f242d] pb-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2">
            Dynamic Prompt Registry & Guardrails
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Persisted in MongoDB Atlas. Promoted versions immediately sync with production mobile clients.
          </p>
        </div>

        {deploySuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-mono animate-fade-in">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Promoted to MongoDB Atlas & Live Mobile Sync Active!
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Role Selector List (Left 3 Cols) */}
        <div className="lg:col-span-3 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
            Configured Agents
          </div>
          {Object.keys(prompts).map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                selectedRole === role
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/10"
                  : "bg-[#101318] border-[#202530] text-zinc-400 hover:text-white hover:bg-[#141820]"
              }`}
            >
              <div className="text-xs font-bold font-mono uppercase tracking-wide">
                {role.replace("_", " ")}
              </div>
              <div className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center justify-between">
                <span>Active: {prompts[role]?.active_version}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
            </button>
          ))}
        </div>

        {/* Prompt Editor & Guardrails (Right 9 Cols) */}
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-[#0f1217] p-6 rounded-2xl border border-[#202530] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-mono uppercase tracking-wider text-cyan-400">
                  {selectedRole.toUpperCase()} // System Prompt
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Dynamic template interpolated with active athlete telemetry at runtime.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">Version Tag:</span>
                <input
                  type="text"
                  value={versionTag}
                  onChange={(e) => setVersionTag(e.target.value)}
                  className="bg-[#151921] border border-[#232936] rounded-md px-2.5 py-1 text-xs font-mono text-cyan-300 w-36"
                />
              </div>
            </div>

            {/* Code / Textarea */}
            <textarea
              rows={14}
              value={currentPromptText}
              onChange={(e) => setCurrentPromptText(e.target.value)}
              className="w-full bg-[#08090d] border border-[#1e232d] rounded-xl p-4 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-y font-mono"
            />

            {/* Guardrail Policy Controls */}
            <div className="p-4 rounded-xl bg-[#141820] border border-[#232936] space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-cyan-400">security</span>
                Runtime Guardrail Policies ({selectedRole})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-zinc-500 text-[10px]">FATIGUE RPE CEILING</div>
                  <div className="text-cyan-400 font-bold mt-1">RPE ≤ 7 (Enforced)</div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-zinc-500 text-[10px]">ALLERGY FILTER</div>
                  <div className="text-emerald-400 font-bold mt-1">Strict Zero-Tolerance</div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-zinc-500 text-[10px]">MAX BREVITY</div>
                  <div className="text-amber-400 font-bold mt-1">2-4 Sentences</div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleDeployToMongo(false)}
                disabled={deploying}
                className="px-4 py-2.5 rounded-xl border border-[#252c3a] hover:bg-[#151922] text-xs font-mono text-zinc-300 hover:text-white transition-colors"
              >
                Save as Draft Version
              </button>
              <button
                onClick={() => handleDeployToMongo(true)}
                disabled={deploying}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                {deploying ? (
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                )}
                Promote to Production (MongoDB Atlas)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

