import React from "react";
import { Navigation } from "../../components/eval/Navigation";

export default function EvalDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-200 selection:bg-cyan-500 selection:text-black">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

