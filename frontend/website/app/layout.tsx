import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitMatrix AI // Autonomous Multi-Agent Biometric Intelligence",
  description:
    "Deterministic sports informatics platform coupling Android Health Connect ingestion with sub-millisecond mathematical state machines, LangGraph cyclic supervisor orchestration, and adherence-neutral metabolic kinetics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&family=Geist:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0c0e12] text-[#e2e2e8]">
        {children}
      </body>
    </html>
  );
}
