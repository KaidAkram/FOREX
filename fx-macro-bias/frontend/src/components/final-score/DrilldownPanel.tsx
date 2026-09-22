"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { finalScoreApi } from "@/lib/api";
import { useAdminStore } from "@/store/adminStore";
import type { DrilldownResponse } from "@/types";

import { X, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export function DrilldownPanel() {
  const isOpen = useAdminStore((s) => s.drilldownOpen);
  const pair = useAdminStore((s) => s.drilldownPair);
  const month = useAdminStore((s) => s.drilldownMonth);
  const close = useAdminStore((s) => s.closeDrilldown);
  
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  const { data, isLoading, isError } = useQuery<DrilldownResponse>({
    queryKey: ["scoreDrilldown", pair, month],
    queryFn: async () => {
      if (!pair || !month) throw new Error("Missing params");
      const res = await finalScoreApi.drilldown(pair, month);
      return res.data;
    },
    enabled: isOpen && !!pair && !!month,
  });

  const handleClose = () => {
    close();
    setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <div
        id="drilldown-drawer"
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-surface border-l border-border-glass shadow-2xl z-50 flex flex-col translate-x-full"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="font-clash text-2xl font-bold text-text-primary">
              {pair}
            </h2>
            <p className="text-sm font-poppins text-text-muted mt-1">
              Final Score Breakdown &middot; {month}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 flex gap-4">
                  <div className="skeleton h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-48 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError || !data ? (
            <div className="text-center py-12">
              <p className="text-coral font-poppins text-sm">Failed to load drilldown data.</p>
            </div>
          ) : (
            <>
              {/* Score Summary */}
              <section className="flex gap-4">
                <div className="flex-1 glass-card p-4 flex flex-col items-center justify-center">
                  <span className="text-xs font-sfpro text-text-muted uppercase tracking-widest mb-1">
                    Final Score
                  </span>
                  <span className="text-3xl font-clash font-bold text-text-primary">
                    {data.final_score !== null ? data.final_score : "—"}
                  </span>
                </div>
                <div className="flex-1 glass-card p-4 flex flex-col items-center justify-center">
                  <span className="text-xs font-sfpro text-text-muted uppercase tracking-widest mb-1">
                    Bias
                  </span>
                  {data.bias ? (
                    <span
                      className={clsx(
                        "px-3 py-1 rounded-chip text-sm font-bold font-clash mt-1",
                        data.bias === "UP" && "bg-mint-glow text-mint border border-mint-border",
                        data.bias === "DOWN" && "bg-coral-glow text-coral border border-coral-border",
                        data.bias === "NEUTRAL" && "bg-cyan-glow text-cyan border border-cyan-border"
                      )}
                    >
                      {data.bias}
                    </span>
                  ) : (
                    <span className="text-xl font-clash font-bold text-text-muted">—</span>
                  )}
                </div>
              </section>

              {/* Indicator Breakdown */}
              <section className="space-y-3">
                <h3 className="text-sm font-sfpro font-medium text-text-muted uppercase tracking-widest mb-4">
                  Indicator Contributions
                </h3>
                {data.breakdown.map((item) => (
                  <div key={item.slug} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-poppins text-sm font-semibold text-text-primary">
                        {item.indicator}
                      </span>
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded-chip text-xs font-semibold font-sfpro",
                          (item.rating ?? 0) > 0 && "bg-mint-glow text-mint border border-mint-border",
                          (item.rating ?? 0) < 0 && "bg-coral-glow text-coral border border-coral-border",
                          item.rating === 0 && "bg-cyan-glow text-cyan border border-cyan-border",
                          item.rating === null && "bg-white/5 text-text-muted"
                        )}
                      >
                        {item.rating !== null ? (item.rating > 0 ? `+${item.rating}` : item.rating) : "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-sfpro text-text-muted">
                      <div className="flex-1 flex justify-between items-center bg-void rounded px-2 py-1 border border-border-glass">
                        <span>{data.base_currency}</span>
                        <span className="text-text-primary font-medium">{item.base_value ?? "—"}</span>
                      </div>
                      <span className="text-border-glass">-</span>
                      <div className="flex-1 flex justify-between items-center bg-void rounded px-2 py-1 border border-border-glass">
                        <span>{data.quote_currency}</span>
                        <span className="text-text-primary font-medium">{item.quote_value ?? "—"}</span>
                      </div>
                      <ChevronRight size={14} className="text-border-glass" />
                      <div className="flex-1 flex justify-between items-center bg-void rounded px-2 py-1 border border-border-glass">
                        <span>Diff</span>
                        <span className="text-text-primary font-medium">{item.difference ?? "—"}</span>
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] font-sfpro text-text-slate border-t border-white/5 pt-2">
                      Rule Applied: {item.applied_rule || "No rule matched or data missing"}
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
