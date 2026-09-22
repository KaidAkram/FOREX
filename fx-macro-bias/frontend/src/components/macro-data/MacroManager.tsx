"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { macroDataApi } from "@/lib/api";
import { useAdminStore } from "@/store/adminStore";
import type { MacroMatrixResponse } from "@/types";
import { CellEditModal } from "./CellEditModal";
import { clsx } from "clsx";

const INDICATORS = [
  { slug: "gdp", label: "GDP Growth" },
  { slug: "cpi", label: "CPI Inflation" },
  { slug: "interest_rate", label: "Interest Rate" },
  { slug: "fx_reserves", label: "FX Reserves" },
  { slug: "ca_gdp", label: "Current Account / GDP" },
  { slug: "equity", label: "Equity" },
] as const;

export function MacroManager() {
  const activeIndicator = useAdminStore((s) => s.activeMacroIndicator);
  const setActiveIndicator = useAdminStore((s) => s.setActiveMacroIndicator);

  // We only implement Matrix view for Phase 1B, but leave structure for others
  const activeView = useAdminStore((s) => s.activeMacroView);
  const setActiveView = useAdminStore((s) => s.setActiveMacroView);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<{
    countryIso: string;
    countryName: string;
    month: string;
    value: number | null;
  } | null>(null);

  const { data, isLoading, isError } = useQuery<MacroMatrixResponse>({
    queryKey: ["macroMatrix", activeIndicator],
    queryFn: async () => {
      const res = await macroDataApi.matrix(activeIndicator);
      return res.data;
    },
    enabled: activeView === "matrix",
  });





  const handleCellClick = (
    countryIso: string,
    countryName: string,
    month: string,
    value: number | null
  ) => {
    setEditData({ countryIso, countryName, month, value });
    setEditModalOpen(true);
  };

  const currentIndicatorLabel = INDICATORS.find((i) => i.slug === activeIndicator)?.label;

  return (
    <div className="space-y-6">
      {/* Top filters */}
      <section className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        {/* Indicator Tabs */}
        <div className="flex flex-wrap gap-2">
          {INDICATORS.map(({ slug, label }) => {
            const isActive = slug === activeIndicator;
            return (
              <button
                key={slug}
                onClick={() => setActiveIndicator(slug)}
                className={clsx(
                  "px-4 py-2 rounded-chip text-sm font-sfpro font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-text-primary"
                    : "text-text-muted hover:text-text-primary hover:bg-white/5"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* View Switcher */}
        <div className="flex bg-void rounded-chip border border-white/5 p-1">
          {(["matrix", "differential", "rating"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={clsx(
                "px-4 py-1.5 rounded-chip text-sm font-sfpro font-medium capitalize transition-all duration-200",
                activeView === view
                  ? "bg-cyan-glow text-cyan border border-cyan-border"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {view}
            </button>
          ))}
        </div>
      </section>

      {/* Main Table Area */}
      <section className="glass-card p-6 min-h-[500px]">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="section-title">{currentIndicatorLabel} &middot; {activeView}</h2>
            <p className="text-xs font-poppins text-text-muted mt-1">
              Click any cell to manually override published data.
            </p>
          </div>
        </div>

        {activeView === "matrix" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left" role="table">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="th-label py-3 pr-4 sticky left-0 bg-surface/90 backdrop-blur z-10 w-48">
                    Country
                  </th>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <th key={i} className="th-label py-3 px-2 min-w-[100px] text-center">
                        <div className="skeleton h-4 w-16 mx-auto rounded" />
                      </th>
                    ))
                  ) : (
                    data?.months.map((month) => (
                      <th key={month} className="th-label py-3 px-2 min-w-[100px] text-center">
                        {month}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              {isLoading ? (
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="table-row border-b border-white/5">
                      <td className="py-3 pr-4 sticky left-0 bg-surface/90 backdrop-blur z-10">
                        <div className="skeleton h-5 w-24 rounded" />
                      </td>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="py-3 px-2">
                          <div className="skeleton h-8 w-full rounded" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ) : isError ? (
                <tbody>
                  <tr>
                    <td colSpan={data?.months.length ? data.months.length + 1 : 7} className="py-8 text-center text-coral text-sm font-poppins">
                      Failed to load data.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {data?.rows.map((row) => (
                    <tr key={row.iso} className="table-row border-b border-white/5 opacity-0">
                      <td className="py-3 pr-4 font-poppins text-sm text-text-primary sticky left-0 bg-surface/90 backdrop-blur z-10">
                        {row.country} <span className="text-text-muted">({row.iso})</span>
                      </td>
                      {data.months.map((month) => {
                        const cell = row.cells[month];
                        return (
                          <td key={month} className="py-3 px-2">
                            <button
                              onClick={() => handleCellClick(row.iso, row.country, month, cell?.value ?? null)}
                              className={clsx(
                                "w-full text-center py-1.5 px-2 rounded font-sfpro text-sm transition-colors border",
                                cell?.status === "manual" 
                                  ? "bg-coral-glow border-coral-border text-text-primary hover:bg-coral-glow/80" 
                                  : cell?.value !== null
                                    ? "bg-white/5 border-border-glass text-text-primary hover:bg-white/10"
                                    : "bg-transparent border-dashed border-white/10 text-text-muted hover:border-cyan"
                              )}
                              title={cell ? `Source: ${cell.source} | Status: ${cell.status}` : "Missing Data"}
                            >
                              {cell && cell.value !== null ? cell.value : "—"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}

        {activeView !== "matrix" && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-text-muted">
            <p className="font-poppins text-sm">
              The {activeView} view is under construction for Phase 1B.
            </p>
          </div>
        )}
      </section>

      {editData && (
        <CellEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          countryIso={editData.countryIso}
          countryName={editData.countryName}
          indicatorSlug={activeIndicator}
          indicatorName={currentIndicatorLabel || ""}
          monthStr={editData.month}
          currentValue={editData.value}
        />
      )}
    </div>
  );
}
