"use client";

import { usePathname } from "next/navigation";
import { GlobalSearch } from "./GlobalSearch";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/admin/dashboard":    { title: "Dashboard",    subtitle: "System overview & data status" },
  "/admin/rating-rules": { title: "Rating Rules",  subtitle: "Configure differential → rating transformations" },
  "/admin/macro-data":   { title: "Macro Data",    subtitle: "Raw data, differentials & ratings" },
  "/admin/final-score":  { title: "Final Score",   subtitle: "Pair × month score matrix & drill-down" },
  "/admin/analytics":    { title: "Analytics",     subtitle: "High-frequency performance sparklines & telemetry" },
  "/admin/settings":     { title: "Settings",      subtitle: "Scraper configuration, cron jobs & architecture" },
};

export function AdminTopbar() {
  const pathname = usePathname();

  // Match the current path
  const matchedKey = Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k)) ?? "";
  const page = PAGE_TITLES[matchedKey] ?? { title: "Admin", subtitle: "" };

  return (
    <header
      style={{ height: "var(--topbar-height, 64px)", left: "var(--sidebar-width, 280px)" }}
      className="fixed top-0 right-0 z-40 flex items-center justify-between px-8 border-b border-[#0B453A] bg-[#032221]/90 backdrop-blur-xl"
      role="banner"
    >
      {/* Left: page identity */}
      <div>
        <h1 className="font-sans text-xl font-bold text-[#F1F7F6] leading-none tracking-tight">
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-xs font-sans text-[#AACBC4] mt-1">{page.subtitle}</p>
        )}
      </div>

      {/* Center: Global Search Trigger */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <GlobalSearch />
      </div>

      {/* Right: dev mode indicator + mock user */}
      <div className="flex items-center gap-4">
        {/* Dev mode badge */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#06302B] text-[#00DF81] border border-[#0B453A] text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00DF81] animate-pulse" />
          Live Engine
        </span>

        {/* Quant admin user */}
        <div className="flex items-center gap-2.5 pl-4 border-l border-[#0B453A]">
          <div className="w-8 h-8 rounded-full bg-[#06302B] border border-[#0B453A] flex items-center justify-center">
            <span className="font-sans text-xs font-bold text-[#00DF81]">Q</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-sans font-semibold text-[#F1F7F6] leading-none">
              Quant Admin
            </p>
            <p className="text-[10px] font-mono text-[#AACBC4] mt-1">is_staff: true</p>
          </div>
        </div>
      </div>
    </header>
  );
}
