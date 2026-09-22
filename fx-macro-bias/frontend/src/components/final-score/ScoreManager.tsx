"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { finalScoreApi, macroDataApi } from "@/lib/api";
import { useAdminStore } from "@/store/adminStore";
import type { ScoreMatrixResponse } from "@/types";
import { animateTableRows } from "@/lib/animations/gsap.config";
import { DrilldownPanel } from "./DrilldownPanel";
import { clsx } from "clsx";
import { RefreshCw } from "lucide-react";

export function ScoreManager() {
  const queryClient = useQueryClient();
  const openDrilldown = useAdminStore((s) => s.openDrilldown);
  const isRecalculating = useAdminStore((s) => s.isRecalculating);
  const setIsRecalculating = useAdminStore((s) => s.setIsRecalculating);

  const { data, isLoading, isError } = useQuery<ScoreMatrixResponse>({
    queryKey: ["scoreMatrix"],
    queryFn: async () => {
      const res = await finalScoreApi.matrix();
      return res.data;
    },
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      await macroDataApi.recalculate({});
    },
    onMutate: () => setIsRecalculating(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoreMatrix"] });
      setIsRecalculating(false);
    },
    onError: () => setIsRecalculating(false),
  });

  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (!isLoading && data?.rows && data.rows.length > 0 && tbodyRef.current) {
      const rows = tbodyRef.current.querySelectorAll(".table-row");
      if (rows.length > 0) {
        animateTableRows(Array.from(rows));
      }
    }
  }, [isLoading, data]);

  const handleCellClick = (pair: string, month: string) => {
    openDrilldown(pair, month);
  };

  return (
    <div className="space-y-6">
      <section className="glass-card p-6 min-h-[500px]">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="section-title">Final Score & Bias</h2>
            <p className="text-xs font-poppins text-text-muted mt-1">
              Click any score to view the component breakdown.
            </p>
          </div>
          <button
            onClick={() => recalcMutation.mutate()}
            disabled={isRecalculating || recalcMutation.isPending}
            className="btn-ghost text-xs flex items-center gap-2"
          >
            <RefreshCw size={14} className={clsx(isRecalculating && "animate-spin")} />
            {isRecalculating ? "Recalculating..." : "Force Recalculate"}
          </button>
        </div>

        <div className="overflow-x-auto relative">
          {/* Recalculating overlay */}
          {isRecalculating && (
            <div className="absolute inset-0 z-20 bg-surface/50 backdrop-blur-[2px] flex items-center justify-center rounded-panel">
              <div className="flex items-center gap-3 px-4 py-2 bg-void border border-border-glass rounded-chip shadow-xl">
                <RefreshCw size={16} className="text-cyan animate-spin" />
                <span className="text-sm font-sfpro font-medium text-text-primary">
                  Processing pipeline...
                </span>
              </div>
            </div>
          )}

          <table className="w-full text-left" role="table">
            <thead>
              <tr className="border-b border-white/5">
                <th className="th-label py-3 pr-4 sticky left-0 bg-surface z-10 w-32">Pair</th>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <th key={i} className="th-label py-3 px-2 min-w-[80px] text-center">
                      <div className="skeleton h-4 w-16 mx-auto rounded" />
                    </th>
                  ))
                ) : (
                  data?.months.map((month) => (
                    <th key={month} className="th-label py-3 px-2 min-w-[80px] text-center">
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
                    <td className="py-3 pr-4 sticky left-0 bg-surface z-10">
                      <div className="skeleton h-5 w-16 rounded" />
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
                    Failed to load final scores.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody ref={tbodyRef}>
                {data?.rows.map((row) => (
                  <tr key={row.pair} className="table-row border-b border-white/5 opacity-0">
                    <td className="py-3 pr-4 font-sfpro text-sm font-semibold text-text-primary sticky left-0 bg-surface z-10">
                      {row.pair}
                    </td>
                    {data.months.map((month) => {
                      const cell = row.cells[month];
                      return (
                        <td key={month} className="py-3 px-2">
                          {cell?.final_score !== null ? (
                            <button
                              onClick={() => handleCellClick(row.pair, month)}
                              className={clsx(
                                "w-full flex flex-col items-center justify-center py-1.5 px-2 rounded transition-colors border relative overflow-hidden",
                                cell.bias === "UP" && "bg-mint-glow/30 border-mint-border/50 text-mint hover:bg-mint-glow/50",
                                cell.bias === "DOWN" && "bg-coral-glow/30 border-coral-border/50 text-coral hover:bg-coral-glow/50",
                                cell.bias === "NEUTRAL" && "bg-cyan-glow/30 border-cyan-border/50 text-cyan hover:bg-cyan-glow/50",
                                !cell.bias && "bg-white/5 border-border-glass text-text-primary hover:bg-white/10"
                              )}
                              title={`${cell.n_complete}/${cell.n_indicators} indicators complete`}
                            >
                              <span className="font-clash text-sm font-bold leading-none">
                                {cell.final_score}
                              </span>
                              {!cell.is_complete && (
                                <div className="absolute top-0 right-0 w-2 h-2 bg-amber rounded-bl-sm" title="Incomplete data" />
                              )}
                            </button>
                          ) : (
                            <div className="w-full text-center py-1.5 px-2 border border-dashed border-white/10 rounded text-text-muted text-xs">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </section>

      <DrilldownPanel />
    </div>
  );
}
