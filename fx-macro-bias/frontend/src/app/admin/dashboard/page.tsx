"use client";

import React from "react";
import { Search, Clock, Database } from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";

const matteCard = "bg-[#1E2028]/80 backdrop-blur-2xl border border-white/5 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]";

const fetchDashboardData = async () => {
  await new Promise(r => setTimeout(r, 800));
  return {
    kpis: {
      activePairs: 28,
      biasDistribution: { bullish: 14, neutral: 6, bearish: 8 },
      activeIndicators: { current: 6, total: 6 },
      timestamps: { lastDataUpdate: "Today, 14:30 UTC", lastCalculation: "Today, 14:32 UTC" }
    },
    latestPublished: [
      { ind: "CPI", country: "USA", base: "us", month: "Oct 2025", val: "3.2%", pub: "Today, 14:30", src: "BLS" },
      { ind: "Interest Rate", country: "Euro Area", base: "eu", month: "Oct 2025", val: "4.5%", pub: "Today, 12:00", src: "ECB" },
      { ind: "GDP", country: "UK", base: "gb", month: "Q3 2025", val: "0.2%", pub: "Yesterday", src: "ONS" },
      { ind: "Current Account", country: "Japan", base: "jp", month: "Sep 2025", val: "1.5%", pub: "2 Days Ago", src: "BOJ" }
    ],
    dataStatus: [
      { ind: "CPI", status: "Updated", last: "Today", next: "Nov 15" },
      { ind: "GDP", status: "Pending", last: "Q2 2025", next: "Tomorrow" },
      { ind: "Interest Rate", status: "Neutral", last: "Sep 2025", next: "TBD" },
      { ind: "FX Reserves", status: "Missing", last: "Aug 2025", next: "Past Due" },
      { ind: "Current Account", status: "Updated", last: "Sep 2025", next: "Dec 1" }
    ]
  };
};

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: fetchDashboardData
  });

  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredLatestPublished = React.useMemo(() => {
    if (!dashboard?.latestPublished) return [];
    if (!searchQuery) return dashboard.latestPublished;
    const q = searchQuery.toLowerCase();
    return dashboard.latestPublished.filter((row: any) => 
      row.ind.toLowerCase().includes(q) || 
      row.country.toLowerCase().includes(q) || 
      row.src.toLowerCase().includes(q) ||
      row.month.toLowerCase().includes(q)
    );
  }, [dashboard, searchQuery]);

  const filteredDataStatus = React.useMemo(() => {
    if (!dashboard?.dataStatus) return [];
    if (!searchQuery) return dashboard.dataStatus;
    const q = searchQuery.toLowerCase();
    return dashboard.dataStatus.filter((row: any) => 
      row.ind.toLowerCase().includes(q) || 
      row.status.toLowerCase().includes(q) ||
      row.last.toLowerCase().includes(q)
    );
  }, [dashboard, searchQuery]);

  return (
    <div className="flex flex-col w-full h-full bg-transparent relative">
      <header className="w-full flex items-center justify-between p-[40px_48px] pb-[32px] opacity-0 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">Overview</span>
          <h1 className="font-sans font-bold text-[40px] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Terminal Dashboard
          </h1>
        </div>
        
        <div className="flex items-center gap-[16px]">

          
          <div className="flex items-center gap-[12px] bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-[16px] px-[24px] py-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <Clock size={20} className="text-[#A0A5B1]" />
            <div className="flex flex-col">
              <span className="font-sans font-medium text-[13px] text-[#A0A5B1] leading-none mb-1">Last Update</span>
              <span className="font-mono font-bold text-[15px] text-white leading-none">Oct 24, 14:02 UTC</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col px-[48px] gap-[32px] pb-[64px]">
        
        {/* KPI Row */}
        <div className="flex w-full gap-[24px]">
          <div className={clsx("p-[32px] flex flex-col justify-between opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-[12px] mb-[16px]">
              <div className="p-[10px] rounded-[12px] bg-[#D2F646]/10 border border-[#D2F646]/20">
                <Database size={22} className="text-[#D2F646]" />
              </div>
              <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">Total Pairs Tracked</span>
            </div>
            <div>
              <span className="font-sans font-black text-[48px] text-white tracking-tight">28</span>
              <span className="font-sans font-bold text-[15px] text-[#6FF542] ml-[12px]">+4 this week</span>
            </div>
          </div>

          <div className={clsx("flex flex-[1.5] flex-col justify-center p-[32px] gap-[20px] opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.3s" }}>
            <div className="flex justify-between items-end">
              <span className="font-sans font-medium text-[14px] leading-none text-[#A0A5B1]">Macro Bias Distribution</span>
              <div className="flex gap-[16px]">
                <div className="flex items-center gap-[6px]"><div className="w-2 h-2 rounded-full bg-[#6FF542]" /><span className="text-[12px] font-bold text-[#FFFFFF]">{isLoading ? "-" : dashboard?.kpis.biasDistribution.bullish}</span></div>
                <div className="flex items-center gap-[6px]"><div className="w-2 h-2 rounded-full bg-[#A0A5B1]" /><span className="text-[12px] font-bold text-[#FFFFFF]">{isLoading ? "-" : dashboard?.kpis.biasDistribution.neutral}</span></div>
                <div className="flex items-center gap-[6px]"><div className="w-2 h-2 rounded-full bg-[#FF4444]" /><span className="text-[12px] font-bold text-[#FFFFFF]">{isLoading ? "-" : dashboard?.kpis.biasDistribution.bearish}</span></div>
              </div>
            </div>
            <div className="w-full h-[8px] rounded-full flex overflow-hidden">
              {isLoading ? (
                <div className="h-full w-full bg-white/5 animate-pulse" />
              ) : (
                <>
                  <div className="h-full bg-[#6FF542] shadow-[0_0_12px_rgba(111,245,66,0.6)]" style={{ width: `${(dashboard!.kpis.biasDistribution.bullish / 28) * 100}%` }} />
                  <div className="h-full bg-[#A0A5B1]" style={{ width: `${(dashboard!.kpis.biasDistribution.neutral / 28) * 100}%` }} />
                  <div className="h-full bg-[#FF4444] shadow-[0_0_12px_rgba(255,68,68,0.6)]" style={{ width: `${(dashboard!.kpis.biasDistribution.bearish / 28) * 100}%` }} />
                </>
              )}
            </div>
          </div>

          <div className={clsx("flex flex-1 flex-col justify-center p-[32px] gap-[16px] opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.4s" }}>
            <span className="font-sans font-medium text-[14px] leading-none text-[#A0A5B1]">Active Indicators</span>
            <div className="flex items-baseline gap-[8px]">
              {isLoading ? (
                 <div className="w-[100px] h-[48px] bg-white/5 rounded-md animate-pulse" />
              ) : (
                <>
                  <span className="font-sans font-bold text-[48px] leading-none tracking-tight text-[#FFFFFF]">{dashboard?.kpis.activeIndicators.current}</span>
                  <span className="font-sans font-medium text-[20px] text-[#A0A5B1]">/ {dashboard?.kpis.activeIndicators.total}</span>
                </>
              )}
            </div>
          </div>

          <div className={clsx("flex flex-[1.5] flex-col justify-center p-[32px] gap-[20px] opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.5s" }}>
            <div className="flex flex-col gap-[4px]">
              <span className="font-sans font-medium text-[13px] text-[#A0A5B1]">Last Data Update</span>
              {isLoading ? <div className="w-full h-[16px] bg-white/5 rounded-md animate-pulse" /> : <span className="font-sans font-bold text-[16px] text-[#FFFFFF]">{dashboard?.kpis.timestamps.lastDataUpdate}</span>}
            </div>
            <div className="w-full h-[1px] bg-white/5" />
            <div className="flex flex-col gap-[4px]">
              <span className="font-sans font-medium text-[13px] text-[#A0A5B1]">Last Calculation</span>
              <div className="flex items-center gap-[8px]">
                {!isLoading && <div className="w-2 h-2 rounded-full bg-[#6FF542] animate-breathe" />}
                {isLoading ? <div className="w-full h-[16px] bg-white/5 rounded-md animate-pulse" /> : <span className="font-sans font-bold text-[16px] text-[#FFFFFF]">{dashboard?.kpis.timestamps.lastCalculation}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full flex gap-[24px]">
          {/* Latest Published Data */}
          <div className={clsx("flex-[2] flex flex-col p-[32px] gap-[24px] opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.6s" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-sans font-bold text-[20px] text-[#FFFFFF] tracking-tight">Latest Published Data</h2>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Indicator</th>
                    <th className="font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Country</th>
                    <th className="font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Month</th>
                    <th className="font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Value</th>
                    <th className="font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Published</th>
                    <th className="font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px] text-right">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td colSpan={6} className="p-0"><div className="flex items-center w-full px-[20px] py-[20px] gap-[16px]"><div className="flex-1 h-[20px] bg-white/5 rounded-md animate-pulse" /><div className="flex-1 h-[20px] bg-white/5 rounded-md animate-pulse" /><div className="flex-1 h-[20px] bg-white/5 rounded-md animate-pulse" /><div className="flex-1 h-[20px] bg-white/5 rounded-md animate-pulse" /><div className="flex-1 h-[20px] bg-white/5 rounded-md animate-pulse" /></div></td>
                      </tr>
                    ))
                  ) : (
                    filteredLatestPublished.map((row: any, i: number) => (
                      <tr key={i} className="group border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors">
                        <td colSpan={6} className="p-0">
                          <div className="flex items-center w-full px-[20px] py-[20px] transition-colors duration-200">
                            <span className="flex-1 font-sans font-bold text-[16px] text-[#FFFFFF]">{row.ind}</span>
                            <span className="flex-1 font-sans font-medium text-[15px] text-[#A0A5B1] group-hover:text-white transition-colors flex items-center gap-[8px] whitespace-nowrap">
                              <img src={`/flags/${row.base}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#1E2028] shadow-sm flex-shrink-0" alt={row.base} />
                              <span>{row.country}</span>
                            </span>
                            <span className="flex-1 font-sans font-medium text-[15px] text-[#A0A5B1] group-hover:text-white transition-colors">{row.month}</span>
                            <span className="flex-1 font-sans font-bold text-[16px] text-[#FFFFFF]">{row.val}</span>
                            <span className="flex-1 font-sans font-medium text-[15px] text-[#A0A5B1] group-hover:text-white transition-colors">{row.pub}</span>
                            <span className="flex-1 text-right font-sans font-medium text-[15px] text-[#A0A5B1] group-hover:text-[#D2F646] transition-colors">{row.src}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Status */}
          <div className={clsx("flex-[1.2] flex flex-col p-[32px] gap-[24px] opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.7s" }}>
            <h2 className="font-sans font-bold text-[20px] text-[#FFFFFF] tracking-tight">Data Status</h2>
            <div className="flex flex-col gap-[16px] w-full">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-[12px] p-[20px] rounded-[24px] bg-[#242731]/50 border border-white/5"><div className="w-full h-[24px] bg-white/5 rounded-md animate-pulse" /><div className="w-[60%] h-[16px] bg-white/5 rounded-md animate-pulse" /></div>
                ))
              ) : (
                filteredDataStatus.map((row: any, i: number) => (
                  <div key={i} className="flex flex-col gap-[12px] p-[20px] rounded-[24px] bg-[#242731]/50 border border-white/5 hover:bg-[#2A2D38]/80 transition-all duration-300 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-[16px] text-[#FFFFFF]">{row.ind}</span>
                      <span className={clsx(
                        "px-[12px] py-[6px] rounded-[8px] text-[13px] font-bold shadow-inner",
                        row.status === "Updated" ? "bg-[#6FF542]/10 text-[#6FF542] border border-[#6FF542]/20" :
                        row.status === "Pending" ? "bg-[#F5D246]/10 text-[#F5D246] border border-[#F5D246]/20" :
                        row.status === "Neutral" ? "bg-[#A0A5B1]/10 text-[#A0A5B1] border border-white/10" :
                        "bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/20"
                      )}>
                        {row.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[14px] font-sans font-medium text-[#A0A5B1]">
                      <span>Last: {row.last}</span>
                      <span>Next: {row.next}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
