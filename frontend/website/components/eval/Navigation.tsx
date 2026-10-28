"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/eval-dashboard", icon: "dashboard" },
  { label: "Context Studio", href: "/eval-dashboard/studio", icon: "tune" },
  { label: "Card Visualizer", href: "/eval-dashboard/cards", icon: "view_carousel" },
  { label: "Prompt Registry", href: "/eval-dashboard/prompts", icon: "psychology" },
  { label: "Benchmarks", href: "/eval-dashboard/benchmarks", icon: "verified" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[#222730] bg-[#0c0e12]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/eval-dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black text-xs tracking-wider shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              FM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-sm font-['Space_Grotesk'] text-white">
                  FitMatrix
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  HARNESS // v2.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">Agent Tracing & Guardrail Studio</p>
            </div>
          </Link>
        </div>

        {/* Nav Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Backend & Mobile Sync Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden md:inline">Mongo Registry Live</span>
            <span className="md:hidden">Live</span>
          </div>
          <Link
            href="/"
            className="text-xs font-mono text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            Landing ↗
          </Link>
        </div>
      </div>
    </header>
  );
}

