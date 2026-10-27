"use client";

import { usePathname } from "next/navigation";
import { GlobalSearch } from "./GlobalSearch";
import { AuthHeaderWidget } from "./AuthHeaderWidget";

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
      className="fixed top-0 right-0 z-40 flex items-center justify-between px-8 border-b border-white/[0.08] bg-[#0C0D12]/90 backdrop-blur-xl"
      role="banner"
    >
      {/* Left: page identity */}
      <div>
        <h1 className="font-sans text-xl font-bold text-white leading-none tracking-tight">
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-xs font-sans text-[#A0A5B1] mt-1">{page.subtitle}</p>
        )}
      </div>

      {/* Center: Global Search Trigger */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <GlobalSearch />
      </div>

      {/* Right: dev mode indicator + user widget */}
      <div className="flex items-center gap-4">
        {/* Dev mode badge */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#14151b] text-[#D2F646] border border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6FF542] animate-pulse" />
          Live Engine
        </span>

        {/* User profile widget */}
        <AuthHeaderWidget />
      </div>
    </header>
  );
}
