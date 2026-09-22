"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { dashboardApi } from "@/lib/api";
import type { KpiResponse } from "@/types";


interface KpiCardProps {
  title: string;
  value: number | string | null;
  isNumeric?: boolean;
}

function KpiCard({ title, value, isNumeric = true }: KpiCardProps) {


  return (
    <div className="kpi-card min-h-[120px]">
      <h3 className="font-sfpro text-xs font-semibold text-text-muted uppercase tracking-widest">
        {title}
      </h3>
      <div className="mt-auto">
        {isNumeric ? (
          <div className="font-clash text-kpi-md text-text-primary">
            {value ?? "—"}
          </div>
        ) : (
          <div className="font-clash text-kpi-md text-text-primary text-xl truncate" title={String(value ?? "—")}>
            {value ?? "—"}
          </div>
        )}
      </div>
    </div>
  );
}

export function KpiGrid() {
  const { data, isLoading, isError } = useQuery<KpiResponse>({
    queryKey: ["kpis"],
    queryFn: async () => {
      const res = await dashboardApi.kpis();
      return res.data;
    },
  });

  const gridRef = useRef<HTMLDivElement>(null);



  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="kpi-card min-h-[120px]">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-8 w-16 rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 bg-coral-glow border border-coral-border rounded-panel text-coral font-poppins text-sm">
        Failed to load KPIs. Please check backend connection.
      </div>
    );
  }

  // Formatting date helpers
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  return (
    <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
      <KpiCard title="Active Pairs" value={data.active_fx_pairs} />
      <KpiCard title="Active Indicators" value={data.active_indicators} />
      <KpiCard title="Up Bias" value={data.up_bias} />
      <KpiCard title="Down Bias" value={data.down_bias} />
      <KpiCard title="Neutral Bias" value={data.neutral_bias} />
      <KpiCard title="Last Calc" value={formatTime(data.last_calculation)} isNumeric={false} />
      <KpiCard title="Last Data" value={formatDate(data.last_data_update)} isNumeric={false} />
    </div>
  );
}
