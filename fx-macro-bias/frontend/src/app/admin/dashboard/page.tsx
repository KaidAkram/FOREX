"use client";

import React from "react";
import { Clock, Database, ArrowUpRight, TrendingUp, RefreshCw, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

const matteCard = "bg-[#032221]/90 backdrop-blur-2xl border border-[#0B453A] rounded-[24px] sm:rounded-[28px] shadow-[0_16px_40px_rgba(2,27,26,0.6),inset_0_1px_0_0_rgba(241,247,246,0.06)] transition-all";

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
        className="w-full flex flex-col md:flex-row items-start md:items-center justify-between p-4 sm:p-6 lg:p-[32px_44px] pb-4 sm:pb-6 gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-sans font-medium text-xs sm:text-sm text-[#AACBC4]">Overview</span>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#00DF81] bg-[#00DF81]/10 border border-[#00DF81]/25 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,223,129,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00DF81] animate-pulse" />
              LIVE ENGINE
            </span>
          </div>
          <h1 className="font-sans font-bold text-2xl sm:text-3xl lg:text-[38px] text-[#F1F7F6] tracking-tight leading-none">
            Terminal Dashboard
          </h1>
        </div>
        
        <div className="flex items-center gap-2.5 sm:gap-3.5 w-full md:w-auto justify-between md:justify-end flex-wrap sm:flex-nowrap">
          <GlobalSearch onSearch={(q) => setSearchQuery(q)} />
          
          <div className="hidden sm:flex items-center gap-2.5 bg-[#032221]/90 backdrop-blur-xl border border-[#0B453A] rounded-2xl px-3.5 py-2.5 shadow-[0_8px_32px_rgba(2,27,26,0.4)] shrink-0">
            <Clock size={16} className="text-[#00DF81]" />
            <div className="flex flex-col">
              <span className="font-sans font-medium text-[10px] text-[#AACBC4] leading-none mb-0.5">Last Update</span>
              <span className="font-mono font-bold text-xs text-[#F1F7F6] leading-none">Oct 24, 14:02 UTC</span>
            </div>
          </div>

          <AuthHeaderWidget />
        </div>
      </motion.header>

      {/* Main Container */}
      <main className="flex flex-col px-4 sm:px-6 lg:px-10 gap-5 sm:gap-8 pb-12 sm:pb-16 max-w-[1600px] w-full mx-auto">
        
        {/* KPI Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Total Pairs */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("p-5 sm:p-7 flex flex-col justify-between", matteCard)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-[#00DF81]/10 border border-[#00DF81]/25 text-[#00DF81]">
                <Database size={20} />
              </div>
              <span className="font-sans font-medium text-sm sm:text-15px text-[#AACBC4]">Total Pairs Tracked</span>
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="font-sans font-black text-3xl sm:text-4xl lg:text-[46px] text-[#F1F7F6] tracking-tight leading-none">28</span>
                <span className="font-sans font-bold text-xs sm:text-sm text-[#00DF81] ml-3">+4 this week</span>
              </div>
            </div>
          </motion.div>

          {/* Macro Bias Distribution */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("flex flex-col justify-center p-5 sm:p-7 gap-4", matteCard)}
          >
            <div className="flex justify-between items-end">
              <span className="font-sans font-medium text-xs sm:text-sm leading-none text-[#AACBC4]">Macro Bias Distribution</span>
              <div className="flex gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#00DF81] shadow-[0_0_6px_rgba(0,223,129,0.8)]" />
                  <span className="text-xs font-bold text-[#F1F7F6] font-mono">{isLoading ? "-" : dashboard?.kpis.biasDistribution.bullish}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#AACBC4]" />
                  <span className="text-xs font-bold text-[#F1F7F6] font-mono">{isLoading ? "-" : dashboard?.kpis.biasDistribution.neutral}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#FF5555] shadow-[0_0_6px_rgba(255,85,85,0.8)]" />
                  <span className="text-xs font-bold text-[#F1F7F6] font-mono">{isLoading ? "-" : dashboard?.kpis.biasDistribution.bearish}</span>
                </div>
              </div>
            </div>

            {/* Gradient Visual Distribution Bar */}
            <div className="w-full h-2.5 rounded-full flex overflow-hidden bg-[#06302B] p-0.5 border border-[#0B453A]">
              {isLoading ? (
                <div className="h-full w-full bg-[#0B453A]/50 animate-pulse rounded-full" />
              ) : (
                <>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(dashboard!.kpis.biasDistribution.bullish / 28) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#2CC295] to-[#00DF81] rounded-l-full shadow-[0_0_10px_rgba(0,223,129,0.5)]" 
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(dashboard!.kpis.biasDistribution.neutral / 28) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    className="h-full bg-[#AACBC4]/70" 
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(dashboard!.kpis.biasDistribution.bearish / 28) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-[#FF5555] to-[#FF7777] rounded-r-full shadow-[0_0_10px_rgba(255,85,85,0.5)]" 
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#AACBC4]">
              <span>50% Bullish</span>
              <span>21% Neutral</span>
              <span>29% Bearish</span>
            </div>
          </motion.div>

          {/* Active Indicators */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("flex flex-col justify-center p-5 sm:p-7 gap-3.5", matteCard)}
          >
            <span className="font-sans font-medium text-xs sm:text-sm leading-none text-[#AACBC4]">Active Indicators</span>
            <div className="flex items-baseline gap-2">
              {isLoading ? (
                 <div className="w-[100px] h-[38px] bg-[#06302B] rounded-md animate-pulse" />
              ) : (
                <>
                  <span className="font-sans font-black text-3xl sm:text-4xl lg:text-[46px] text-[#F1F7F6] tracking-tight leading-none">
                    {dashboard?.kpis.activeIndicators.current}
                  </span>
                  <span className="font-sans font-bold text-lg sm:text-xl text-[#AACBC4]/60">
                    / {dashboard?.kpis.activeIndicators.total}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-sans text-[#00DF81] mt-1 font-semibold">
              <CheckCircle2 size={15} />
              <span>All economic pipelines healthy</span>
            </div>
          </motion.div>

          {/* Timestamps Panel */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("flex flex-col justify-between p-5 sm:p-7 gap-3", matteCard)}
          >
            <div className="flex flex-col gap-1">
              <span className="font-sans font-medium text-xs sm:text-sm text-[#AACBC4]">Last Data Update</span>
              <span className="font-sans font-bold text-sm sm:text-base text-[#F1F7F6] font-mono">
                {isLoading ? <span className="inline-block w-28 h-4 bg-[#06302B] rounded animate-pulse" /> : dashboard?.kpis.timestamps.lastDataUpdate}
              </span>
            </div>
            <div className="w-full h-[1px] bg-[#0B453A]" />
            <div className="flex flex-col gap-1">
              <span className="font-sans font-medium text-xs sm:text-sm text-[#AACBC4]">Last Model Calculation</span>
              <div className="flex items-center gap-2">
                {!isLoading && <div className="w-2 h-2 rounded-full bg-[#00DF81] animate-pulse" />}
                {isLoading ? <div className="w-full h-4 bg-[#06302B] rounded animate-pulse" /> : <span className="font-sans font-bold text-sm sm:text-base text-[#F1F7F6] font-mono">{dashboard?.kpis.timestamps.lastCalculation}</span>}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Data Tables Row */}
        <motion.div variants={itemVariants} className="w-full flex flex-col lg:flex-row gap-5 sm:gap-6">
          
          {/* Latest Published Data */}
          <div className={clsx("flex-[2] flex flex-col p-4 sm:p-6 lg:p-7 gap-5", matteCard)}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sans font-bold text-base sm:text-lg lg:text-xl text-[#F1F7F6] tracking-tight">Latest Published Data</h2>
                <p className="font-sans text-xs sm:text-sm text-[#AACBC4] mt-0.5">Real-time macro statistics ingested into the bias pipeline</p>
              </div>
              <button 
                onClick={() => refetch()}
                className="p-2 rounded-xl bg-[#06302B] hover:bg-[#095544] text-[#AACBC4] hover:text-[#F1F7F6] border border-[#0B453A] transition-colors cursor-pointer"
                title="Refresh Feed"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            <div className="overflow-x-auto w-full -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-[#0B453A] text-xs font-sans font-semibold text-[#AACBC4]">
                    <th className="pb-3 px-3">Indicator</th>
                    <th className="pb-3 px-3">Country</th>
                    <th className="pb-3 px-3">Month</th>
                    <th className="pb-3 px-3">Value</th>
                    <th className="pb-3 px-3">Published</th>
                    <th className="pb-3 px-3 text-right">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B453A]/40 text-sm">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="py-3 px-3">
                          <div className="h-5 bg-[#06302B] rounded animate-pulse w-full" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredLatestPublished.map((row: any, i: number) => (
                      <tr 
                        key={i} 
                        className="group hover:bg-[#06302B]/40 transition-colors"
                      >
                        <td className="py-3 px-3 font-sans font-bold text-[#F1F7F6] group-hover:text-[#00DF81] transition-colors">
                          {row.ind}
                        </td>
                        <td className="py-3 px-3 font-sans font-medium text-[#AACBC4] group-hover:text-[#F1F7F6] transition-colors">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <img src={`/flags/${row.base}.svg`} className="w-4 h-4 rounded-full border border-[#0B453A] shadow-sm flex-shrink-0" alt={row.base} />
                            <span>{row.country}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-[#AACBC4] whitespace-nowrap">
                          {row.month}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#F1F7F6] whitespace-nowrap">
                          {row.val}
                        </td>
                        <td className="py-3 px-3 font-sans text-xs text-[#AACBC4] whitespace-nowrap">
                          {row.pub}
                        </td>
                        <td className="py-3 px-3 text-right font-sans font-semibold text-xs text-[#AACBC4] group-hover:text-[#00DF81] transition-colors whitespace-nowrap">
                          {row.src}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Status */}
          <div className={clsx("flex-[1.2] flex flex-col p-4 sm:p-6 lg:p-7 gap-5", matteCard)}>
            <div className="flex items-center justify-between">
              <h2 className="font-sans font-bold text-base sm:text-lg lg:text-xl text-[#F1F7F6] tracking-tight">Data Status</h2>
              <span className="text-[11px] font-mono text-[#AACBC4]">Auto-refreshing</span>
            </div>

            <div className="flex flex-col gap-3 w-full">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[#06302B]/50 border border-[#0B453A]">
                    <div className="w-full h-5 bg-[#06302B] rounded animate-pulse" />
                    <div className="w-[60%] h-3.5 bg-[#06302B] rounded animate-pulse" />
                  </div>
                ))
              ) : (
                filteredDataStatus.map((row: any, i: number) => (
                  <div 
                    key={i} 
                    className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[#06302B]/60 border border-[#0B453A] hover:border-[#03624C] hover:bg-[#06302B] transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-sm text-[#F1F7F6]">{row.ind}</span>
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider",
                        row.status === "Updated" ? "bg-[#00DF81]/15 text-[#00DF81] border border-[#00DF81]/30 shadow-[0_0_10px_rgba(0,223,129,0.15)]" :
                        row.status === "Pending" ? "bg-[#2CC295]/15 text-[#2CC295] border border-[#2CC295]/30" :
                        row.status === "Neutral" ? "bg-[#AACBC4]/10 text-[#AACBC4] border border-[#0B453A]" :
                        "bg-[#FF5555]/15 text-[#FF5555] border border-[#FF5555]/30"
                      )}>
                        {row.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-sans font-medium text-[#AACBC4]">
                      <span>Last: <span className="text-[#F1F7F6]/90 font-mono">{row.last}</span></span>
                      <span>Next: <span className="text-[#F1F7F6]/90 font-mono">{row.next}</span></span>
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
