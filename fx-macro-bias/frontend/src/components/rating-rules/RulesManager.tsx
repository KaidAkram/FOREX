"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { rulesApi } from "@/lib/api";
import { useAdminStore } from "@/store/adminStore";
import type { RulesResponse, RatingRule } from "@/types";
import { animateTableRows } from "@/lib/animations/gsap.config";
import { RuleFormModal } from "./RuleFormModal";
import { Edit2, Trash2 } from "lucide-react";
import { clsx } from "clsx";

const INDICATORS = [
  { slug: "gdp", label: "GDP Growth" },
  { slug: "cpi", label: "CPI Inflation" },
  { slug: "interest_rate", label: "Interest Rate" },
  { slug: "fx_reserves", label: "FX Reserves" },
  { slug: "ca_gdp", label: "Current Account / GDP" },
  { slug: "equity", label: "Equity" },
] as const;

export function RulesManager() {
  const queryClient = useQueryClient();
  const activeIndicator = useAdminStore((s) => s.activeRulesIndicator);
  const setActiveIndicator = useAdminStore((s) => s.setActiveRulesIndicator);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RatingRule | null>(null);

  const { data, isLoading, isError } = useQuery<RulesResponse>({
    queryKey: ["rules", activeIndicator],
    queryFn: async () => {
      const res = await rulesApi.list(activeIndicator);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await rulesApi.delete(activeIndicator, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules", activeIndicator] });
    },
  });

  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (!isLoading && data?.rules && data.rules.length > 0 && tbodyRef.current) {
      const rows = tbodyRef.current.querySelectorAll(".table-row");
      if (rows.length > 0) {
        animateTableRows(Array.from(rows));
      }
    }
  }, [isLoading, data]);

  const handleEdit = (rule: RatingRule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicator selector tabs */}
      <section aria-label="Indicator selector">
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
      </section>

      {/* Rules table */}
      <section className="glass-card p-6" aria-label="Rating rules table">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title">
              {INDICATORS.find((i) => i.slug === activeIndicator)?.label} Rules
            </h2>
            <p className="text-xs font-poppins text-text-muted mt-1">
              {data?.version ? `Version ${data.version}` : "Loading version..."}{" "}
              &middot; Last updated {data?.last_updated ?? "—"}
            </p>
          </div>
          <button onClick={handleAdd} className="btn-primary">
            + Add Rule
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table">
            <thead>
              <tr className="border-b border-white/5">
                <th className="th-label py-3 pr-6">Min Difference</th>
                <th className="th-label py-3 pr-6">Max Difference</th>
                <th className="th-label py-3 pr-6">Rating</th>
                <th className="th-label py-3 text-right">Actions</th>
              </tr>
            </thead>
            {isLoading ? (
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    <td className="py-4 pr-6"><div className="skeleton h-4 w-20 rounded" /></td>
                    <td className="py-4 pr-6"><div className="skeleton h-4 w-20 rounded" /></td>
                    <td className="py-4 pr-6"><div className="skeleton h-6 w-12 rounded-chip" /></td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="skeleton h-7 w-14 rounded-chip" />
                        <div className="skeleton h-7 w-16 rounded-chip" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : isError ? (
              <tbody>
                <tr>
                  <td colSpan={4} className="py-8 text-center text-coral text-sm font-poppins">
                    Failed to load rules for this indicator.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody ref={tbodyRef}>
                {data?.rules.map((rule) => (
                  <tr key={rule.id} className="table-row opacity-0">
                    <td className="py-4 pr-6 font-poppins text-sm text-text-primary">
                      {rule.min_diff !== null ? rule.min_diff : "—"}
                    </td>
                    <td className="py-4 pr-6 font-poppins text-sm text-text-primary">
                      {rule.max_diff !== null ? rule.max_diff : "—"}
                    </td>
                    <td className="py-4 pr-6">
                      <span
                        className={clsx(
                          "px-2.5 py-1 rounded-chip text-xs font-semibold font-sfpro",
                          rule.rating > 0 && "bg-mint-glow text-mint border border-mint-border",
                          rule.rating < 0 && "bg-coral-glow text-coral border border-coral-border",
                          rule.rating === 0 && "bg-cyan-glow text-cyan border border-cyan-border"
                        )}
                      >
                        {rule.rating > 0 ? `+${rule.rating}` : rule.rating}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(rule)}
                          className="p-1.5 text-text-muted hover:text-cyan hover:bg-cyan-glow rounded transition-colors"
                          title="Edit rule"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 text-text-muted hover:text-coral hover:bg-coral-glow rounded transition-colors"
                          title="Delete rule"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data?.rules.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-muted text-sm font-poppins italic">
                      No rules defined for this indicator.
                    </td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>
      </section>

      <RuleFormModal
        indicatorSlug={activeIndicator}
        rule={editingRule}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
