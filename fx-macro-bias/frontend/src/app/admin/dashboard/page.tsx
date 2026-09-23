"use client";

import React from "react";
import { Clock, Database, ArrowUpRight, TrendingUp, RefreshCw, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

const matteCard = "bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[28px] shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all";

const fetchDashboardData = async () => {
  await new Promise(r => setTimeout(r, 600));
  return {
    kpis: {
      activePairs: 28,
      biasDistribution: { bullish: 14, neutral: 6, bearish: 8 },
      activeIndicators: { current: 6, total: 6 },
      timestamps: { lastDataUpdate: "Today, 14:30 UTC", lastCalculation: "Today, 14:32 UTC" }
    },
    latestPublished: [
      { ind: "CPI", country: "USA", base: "us", month: "Aug 2026", val: "3.4%", pub: "Official BLS Print", src: "BLS" },
      { ind: "Interest Rate", country: "USA", base: "us", month: "Sep 2026", val: "4.00%", pub: "FOMC Target Range", src: "Federal Reserve" },
      { ind: "Interest Rate", country: "Euro Area", base: "eu", month: "Sep 2026", val: "2.65%", pub: "ECB Policy Rate", src: "ECB" },
      { ind: "FX Reserves", country: "USA", base: "us", month: "Aug 2026", val: "$38,578M", pub: "IMF Official Release", src: "IMF" },
      { ind: "GDP", country: "USA", base: "us", month: "Q2 2026", val: "1.8%", pub: "BEA Real Print", src: "BEA" },
      { ind: "Current Account", country: "Japan", base: "jp", month: "Aug 2026", val: "+4.2%", pub: "BOJ Balance Release", src: "BOJ" }
    ],
    dataStatus: [
      { ind: "CPI", status: "Updated", last: "Aug 2026 (3.4%)", next: "Oct 14" },
      { ind: "Interest Rate", status: "Updated", last: "Sep 2026 (4.00%)", next: "Nov 06" },
      { ind: "FX Reserves", status: "Updated", last: "Aug 2026 ($38,578M)", next: "Oct 05" },
      { ind: "GDP", status: "Updated", last: "Q2 2026 (1.8%)", next: "Oct 28" },
      { ind: "Current Account", status: "Updated", last: "Q2 2026 (-3.0%)", next: "Dec 18" },
      { ind: "Equity", status: "Updated", last: "Sep 2026 (+1.7%)", next: "Daily" }
    ]
  };
};

export default function DashboardPage() {
  const { data: dashboard, isLoading, refetch } = useQuery({
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="flex flex-col w-full h-full bg-transparent relative overflow-y-auto no-scrollbar"
    >
      {/* Header */}
      <motion.header 
        variants={itemVariants}
        className="w-full flex items-center justify-between p-[40px_48px] pb-[28px]"
      >
        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-2">
            <span className="font-sans font-medium text-[15px] text-[#A0A5B1]">Overview</span>
            <span className="text-[11px] font-mono font-bold text-[#6FF542] bg-[#6FF542]/10 border border-[#6FF542]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6FF542] animate-pulse" />
              LIVE ENGINE
            </span>
          </div>
          <h1 className="font-sans font-bold text-[38px] text-transparent bg-clip-text bg-gradient-to-r from-white via-white/95 to-white/60 tracking-tight">
            Terminal Dashboard
          </h1>
        </div>
        
        <div className="flex items-center gap-[16px]">
          <GlobalSearch onSearch={(q) => setSearchQuery(q)} />
          
          <div className="flex items-center gap-[12px] bg-[#161822]/85 backdrop-blur-xl border border-white/5 rounded-[16px] px-[22px] py-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <Clock size={18} className="text-[#D2F646]" />
            <div className="flex flex-col">
              <span className="font-sans font-medium text-[12px] text-[#A0A5B1] leading-none mb-1">Last Update</span>
              <span className="font-mono font-bold text-[14px] text-white leading-none">Oct 24, 14:02 UTC</span>
            </div>
          </div>

          <AuthHeaderWidget />
        </div>
      </motion.header>

      {/* Main Container */}
      <main className="flex flex-col px-[48px] gap-[32px] pb-[64px]">
        
        {/* KPI Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[24px]">
          
          {/* Total Pairs */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("p-[28px] flex flex-col justify-between", matteCard)}
          >
            <div className="flex items-center gap-[12px] mb-[16px]">
              <div className="p-[10px] rounded-[14px] bg-[#D2F646]/10 border border-[#D2F646]/20">
                <Database size={22} className="text-[#D2F646]" />
              </div>
              <span className="font-sans font-medium text-[15px] text-[#A0A5B1]">Total Pairs Tracked</span>
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="font-sans font-black text-[46px] text-white tracking-tight leading-none">28</span>
                <span className="font-sans font-bold text-[14px] text-[#6FF542] ml-[12px]">+4 this week</span>
              </div>
            </div>
          </motion.div>

          {/* Macro Bias Distribution */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("flex flex-col justify-center p-[28px] gap-[18px]", matteCard)}
          >
            <div className="flex justify-between items-end">
              <span className="font-sans font-medium text-[14px] leading-none text-[#A0A5B1]">Macro Bias Distribution</span>
              <div className="flex gap-[12px]">
                <div className="flex items-center gap-[6px]">
                  <div className="w-2 h-2 rounded-full bg-[#6FF542] shadow-[0_0_6px_rgba(111,245,66,0.8)]" />
                  <span className="text-[12px] font-bold text-white font-mono">{isLoading ? "-" : dashboard?.kpis.biasDistribution.bullish}</span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <div className="w-2 h-2 rounded-full bg-[#A0A5B1]" />
                  <span className="text-[12px] font-bold text-white font-mono">{isLoading ? "-" : dashboard?.kpis.biasDistribution.neutral}</span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <div className="w-2 h-2 rounded-full bg-[#FF4444] shadow-[0_0_6px_rgba(255,68,68,0.8)]" />
                  <span className="text-[12px] font-bold text-white font-mono">{isLoading ? "-" : dashboard?.kpis.biasDistribution.bearish}</span>
                </div>
              </div>
            </div>

            {/* Gradient Visual Distribution Bar */}
            <div className="w-full h-[10px] rounded-full flex overflow-hidden bg-white/5 p-0.5">
              {isLoading ? (
                <div className="h-full w-full bg-white/5 animate-pulse rounded-full" />
              ) : (
                <>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(dashboard!.kpis.biasDistribution.bullish / 28) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#6FF542] to-[#D2F646] rounded-l-full shadow-[0_0_10px_rgba(111,245,66,0.5)]" 
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(dashboard!.kpis.biasDistribution.neutral / 28) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    className="h-full bg-[#A0A5B1]/70" 
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(dashboard!.kpis.biasDistribution.bearish / 28) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-[#FF4444] to-[#FF6B6B] rounded-r-full shadow-[0_0_10px_rgba(255,68,68,0.5)]" 
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#A0A5B1]">
              <span>50% Bullish</span>
              <span>21% Neutral</span>
              <span>29% Bearish</span>
            </div>
          </motion.div>

          {/* Active Indicators */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("flex flex-col justify-center p-[28px] gap-[14px]", matteCard)}
          >
            <span className="font-sans font-medium text-[14px] leading-none text-[#A0A5B1]">Active Indicators</span>
            <div className="flex items-baseline gap-[8px]">
              {isLoading ? (
                 <div className="w-[100px] h-[46px] bg-white/5 rounded-md animate-pulse" />
              ) : (
                <>
                  <span className="font-sans font-bold text-[46px] leading-none tracking-tight text-white font-mono">{dashboard?.kpis.activeIndicators.current}</span>
                  <span className="font-sans font-medium text-[20px] text-[#A0A5B1] font-mono">/ {dashboard?.kpis.activeIndicators.total}</span>
                </>
              )}
            </div>
            <span className="text-[12px] font-sans text-[#6FF542] flex items-center gap-1">
              <CheckCircle2 size={13} />
              All economic pipelines healthy
            </span>
          </motion.div>

          {/* Data Timestamps */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("flex flex-col justify-center p-[28px] gap-[16px]", matteCard)}
          >
            <div className="flex flex-col gap-[4px]">
              <span className="font-sans font-medium text-[13px] text-[#A0A5B1]">Last Data Update</span>
              {isLoading ? <div className="w-full h-[16px] bg-white/5 rounded-md animate-pulse" /> : <span className="font-sans font-bold text-[15px] text-white font-mono">{dashboard?.kpis.timestamps.lastDataUpdate}</span>}
            </div>
            <div className="w-full h-[1px] bg-white/5" />
            <div className="flex flex-col gap-[4px]">
              <span className="font-sans font-medium text-[13px] text-[#A0A5B1]">Last Model Calculation</span>
              <div className="flex items-center gap-[8px]">
                {!isLoading && <div className="w-2 h-2 rounded-full bg-[#6FF542] animate-pulse" />}
                {isLoading ? <div className="w-full h-[16px] bg-white/5 rounded-md animate-pulse" /> : <span className="font-sans font-bold text-[15px] text-white font-mono">{dashboard?.kpis.timestamps.lastCalculation}</span>}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Data Tables Row */}
        <motion.div variants={itemVariants} className="w-full flex flex-col lg:flex-row gap-[24px]">
          
          {/* Latest Published Data */}
          <div className={clsx("flex-[2] flex flex-col p-[32px] gap-[24px]", matteCard)}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sans font-bold text-[20px] text-white tracking-tight">Latest Published Data</h2>
                <p className="font-sans text-[13px] text-[#A0A5B1] mt-0.5">Real-time macro statistics ingested into the bias pipeline</p>
              </div>
              <button 
                onClick={() => refetch()}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#A0A5B1] hover:text-white transition-colors"
                title="Refresh Feed"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Indicator</th>
                    <th className="font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Country</th>
                    <th className="font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Month</th>
                    <th className="font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Value</th>
                    <th className="font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px]">Published</th>
                    <th className="font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5 pb-[16px] px-[20px] text-right">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td colSpan={6} className="p-0">
                          <div className="flex items-center w-full px-[20px] py-[20px] gap-[16px]">
                            <div className="flex-1 h-[20px] bg-white/5 rounded-md animate-pulse" />
                            <div className="flex-1 h-[20px] bg-white/5 rounded-md animate-pulse" />
                            <div className="flex-1 h-[20px] bg-white/5 rounded-md animate-pulse" />
                            <div className="flex-1 h-[20px] bg-white/5 rounded-md animate-pulse" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredLatestPublished.map((row: any, i: number) => (
                      <tr 
                        key={i} 
                        className="group border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/[0.04] transition-colors"
                      >
                        <td colSpan={6} className="p-0">
                          <div className="flex items-center w-full px-[20px] py-[18px] transition-colors duration-200">
                            <span className="flex-1 font-sans font-bold text-[15px] text-white group-hover:text-[#D2F646] transition-colors">{row.ind}</span>
                            <span className="flex-1 font-sans font-medium text-[14px] text-[#A0A5B1] group-hover:text-white transition-colors flex items-center gap-[8px] whitespace-nowrap">
                              <img src={`/flags/${row.base}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#1E2028] shadow-sm flex-shrink-0" alt={row.base} />
                              <span>{row.country}</span>
                            </span>
                            <span className="flex-1 font-sans font-medium text-[14px] text-[#A0A5B1] font-mono">{row.month}</span>
                            <span className="flex-1 font-sans font-bold text-[15px] text-white font-mono">{row.val}</span>
                            <span className="flex-1 font-sans font-medium text-[14px] text-[#A0A5B1]">{row.pub}</span>
                            <span className="flex-1 text-right font-sans font-semibold text-[13px] text-[#A0A5B1] group-hover:text-[#D2F646] transition-colors">{row.src}</span>
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
          <div className={clsx("flex-[1.2] flex flex-col p-[32px] gap-[24px]", matteCard)}>
            <div className="flex items-center justify-between">
              <h2 className="font-sans font-bold text-[20px] text-white tracking-tight">Data Status</h2>
              <span className="text-[12px] font-mono text-[#A0A5B1]">Auto-refreshing</span>
            </div>

            <div className="flex flex-col gap-[14px] w-full">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-[12px] p-[18px] rounded-[20px] bg-[#1E202B]/50 border border-white/5">
                    <div className="w-full h-[22px] bg-white/5 rounded-md animate-pulse" />
                    <div className="w-[60%] h-[14px] bg-white/5 rounded-md animate-pulse" />
                  </div>
                ))
              ) : (
                filteredDataStatus.map((row: any, i: number) => (
                  <div 
                    key={i} 
                    className="flex flex-col gap-[10px] p-[16px] rounded-[20px] bg-[#1A1C26]/60 border border-white/5 hover:border-white/15 hover:bg-[#202330]/80 transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-[15px] text-white">{row.ind}</span>
                      <span className={clsx(
                        "px-[10px] py-[4px] rounded-[8px] text-[11px] font-mono font-bold tracking-wider",
                        row.status === "Updated" ? "bg-[#6FF542]/10 text-[#6FF542] border border-[#6FF542]/30" :
                        row.status === "Pending" ? "bg-[#F5D246]/10 text-[#F5D246] border border-[#F5D246]/30" :
                        row.status === "Neutral" ? "bg-[#A0A5B1]/10 text-[#A0A5B1] border border-white/10" :
                        "bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/30"
                      )}>
                        {row.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-sans font-medium text-[#A0A5B1]">
                      <span>Last: <span className="text-white/80 font-mono">{row.last}</span></span>
                      <span>Next: <span className="text-white/80 font-mono">{row.next}</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </motion.div>
  );
}
