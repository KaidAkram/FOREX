"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { dashboardApi } from "@/lib/api";
import type { LatestDataRow } from "@/types";
import { animateTableRows } from "@/lib/animations/gsap.config";

export function LatestDataTable() {
  const { data, isLoading, isError } = useQuery<LatestDataRow[]>({
    queryKey: ["latestData"],
    queryFn: async () => {
      const res = await dashboardApi.latestData();
      return res.data;
    },
  });

  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (!isLoading && data && data.length > 0 && tbodyRef.current) {
      const rows = tbodyRef.current.querySelectorAll(".table-row");
      if (rows.length > 0) {
        animateTableRows(Array.from(rows));
      }
    }
  }, [isLoading, data]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-white/5">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-3 w-12 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-sm font-poppins text-coral p-4 bg-coral-glow border border-coral-border rounded-panel">
        Failed to load latest data.
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-sm font-poppins text-text-muted p-4 italic">
        No published data points found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" role="table">
        <thead>
          <tr className="border-b border-white/5">
            <th className="th-label py-3 pr-4">Indicator</th>
            <th className="th-label py-3 pr-4">Country</th>
            <th className="th-label py-3 pr-4">Month</th>
            <th className="th-label py-3 pr-4 text-right">Value</th>
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {data.map((row, i) => (
            <tr key={i} className="table-row opacity-0">
              <td className="py-3 pr-4 font-poppins text-sm font-medium text-text-primary">
                {row.indicator}
              </td>
              <td className="py-3 pr-4 font-poppins text-sm text-text-muted">
                {row.country}
              </td>
              <td className="py-3 pr-4 font-sfpro text-xs text-text-slate">
                {row.month}
              </td>
              <td className="py-3 pr-4 font-poppins text-sm text-right text-text-primary">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
