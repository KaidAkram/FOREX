"use client";

import { usePathname } from "next/navigation";
import { GlobalSearch } from "./GlobalSearch";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/admin/dashboard":    { title: "Dashboard",    subtitle: "System overview & data status" },
  "/admin/rating-rules": { title: "Rating Rules",  subtitle: "Configure differential → rating transformations" },
  "/admin/macro-data":   { title: "Macro Data",    subtitle: "Raw data, differentials & ratings" },
  "/admin/final-score":  { title: "Final Score",   subtitle: "Pair × month score matrix & drill-down" },
};

export function AdminTopbar() {
  const pathname = usePathname();

  // Match the current path
  const matchedKey = Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k)) ?? "";
  const page = PAGE_TITLES[matchedKey] ?? { title: "Admin", subtitle: "" };

  return (
    <header
      style={{ height: "var(--topbar-height)", left: "var(--sidebar-width)" }}
      className="fixed top-0 right-0 z-40 flex items-center justify-between px-8 border-b border-border-glass bg-void/80 backdrop-blur-xl"
      role="banner"
    >
      {/* Left: page identity */}
      <div>
        <h1 className="font-clash text-xl font-bold text-text-primary leading-none tracking-tight">
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-xs font-poppins text-text-muted mt-0.5">{page.subtitle}</p>
        )}
      </div>

      {/* Center: Global Search Overlay Trigger */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <GlobalSearch />
      </div>

      {/* Right: dev mode indicator + mock user */}
      <div className="flex items-center gap-4">
        {/* Dev mode badge */}
        <span className="status-badge bg-amber-glow text-amber border border-amber-border text-[10px] uppercase tracking-widest">
          Dev Mode
        </span>

        {/* Mock admin user */}
        <div className="flex items-center gap-2.5 pl-4 border-l border-border-glass">
          <div className="w-8 h-8 rounded-full bg-cyan-glow border border-cyan-border flex items-center justify-center">
            <span className="font-clash text-sm font-bold text-cyan">Q</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-sfpro font-semibold text-text-primary leading-none">
              Quant Admin
            </p>
            <p className="text-[10px] font-poppins text-text-muted mt-0.5">is_staff: true</p>
          </div>
        </div>
      </div>
    </header>
  );
}
