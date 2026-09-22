"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { dashboardApi } from "@/lib/api";
import type { DataStatusRow } from "@/types";


function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Updated":
      return <span className="status-published">{status}</span>;
    case "Pending":
      return <span className="status-pending">{status}</span>;
    case "Missing":
      return <span className="status-missing">{status}</span>;
    case "Manual":
      return <span className="status-manual">{status}</span>;
    default:
      return <span className="status-badge bg-white/10 text-text-muted border border-border-glass">{status}</span>;
  }
}

export function DataStatusTable() {
  const { data, isLoading, isError } = useQuery<DataStatusRow[]>({
    queryKey: ["dataStatus"],
    queryFn: async () => {
      const res = await dashboardApi.dataStatus();
      return res.data;
    },
  });



  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-white/5">
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-5 w-16 rounded-pill" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-sm font-poppins text-coral p-4 bg-coral-glow border border-coral-border rounded-panel">
        Failed to load data status.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" role="table">
        <thead>
          <tr className="border-b border-white/5">
            <th className="th-label py-3 pr-4">Indicator</th>
            <th className="th-label py-3 pr-4">Frequency</th>
            <th className="th-label py-3 pr-4">Last Pub</th>
            <th className="th-label py-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody >
          {data.map((row, i) => (
            <tr key={i} className="table-row opacity-0">
              <td className="py-3 pr-4 font-poppins text-sm font-medium text-text-primary">
                {row.indicator}
              </td>
              <td className="py-3 pr-4 font-sfpro text-xs text-text-slate">
                {row.frequency}
              </td>
              <td className="py-3 pr-4 font-sfpro text-xs text-text-muted">
                {row.last_published ?? "—"}
              </td>
              <td className="py-3 text-right">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
