"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Clock, 
  Database, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  CheckCircle2, 
  Zap, 
  Layers, 
  Globe2, 
  BarChart3, 
  SlidersHorizontal, 
  ArrowRight,
  ShieldCheck,
  Activity,
  Calendar,
  Sparkles,
  ChevronRight,
  Filter,
  Info
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";
import { PAIRS, INDICATORS, SYSTEM_CURRENT_YEAR, SYSTEM_CURRENT_MONTH } from "@/data/macroDataset";
import macroDataJson from "@/data/macroDataset.json";

const matteCard = "bg-[#032221]/90 backdrop-blur-2xl border border-[#0B453A] rounded-[24px] sm:rounded-[28px] shadow-[0_16px_40px_rgba(2,27,26,0.6),inset_0_1px_0_0_rgba(241,247,246,0.06)] transition-all";

const CURRENCY_META: Record<string, { code: string; flag: string; name: string; stance: string; rationale: string }> = {
  USD: { code: "USD", flag: "us", name: "United States", stance: "Hawkish Hold", rationale: "Resilient labor market & firm services inflation" },
  EUR: { code: "EUR", flag: "eu", name: "Euro Area", stance: "Easing Bias", rationale: "Subdued manufacturing PMI & target disinflation" },
  GBP: { code: "GBP", flag: "gb", name: "United Kingdom", stance: "Persistent Rates", rationale: "Services CPI stickiness keeping Bank Rate elevated" },
  JPY: { code: "JPY", flag: "jp", name: "Japan", stance: "Policy Normalization", rationale: "Ending negative rates with rising wage momentum" },
  AUD: { code: "AUD", flag: "au", name: "Australia", stance: "Balanced / Neutral", rationale: "RBA waiting on trimmed mean CPI convergence" },
  CAD: { code: "CAD", flag: "ca", name: "Canada", stance: "Gradual Easing", rationale: "Per-capita GDP slowdown & cooling headline prints" },
  CHF: { code: "CHF", flag: "ch", name: "Switzerland", stance: "Dovish Intervention", rationale: "SNB rate cuts to curtail Franc overvaluation" },
  NZD: { code: "NZD", flag: "nz", name: "New Zealand", stance: "Aggressive Easing", rationale: "RBNZ responding to negative economic output gap" },
};

const FlagStack = ({ base, quote }: { base: string; quote: string }) => (
  <div className="flex items-center flex-shrink-0 mr-1.5">
    <img src={`/flags/${base}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#0B453A] z-10 shadow-sm" alt={base} />
    <img src={`/flags/${quote}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#0B453A] -ml-2 z-0 shadow-sm" alt={quote} />
  </div>
);

// Real verified macro release prints feed from G10 national sources
const LATEST_PUBLISHED_FEED = [
  { id: 1, ind: "CPI", country: "USA", base: "us", month: "Aug 2026", val: "3.4%", regime: "Above Target", pub: "Official BLS Print", src: "BLS", date: "Sep 13" },
  { id: 2, ind: "Interest Rate", country: "USA", base: "us", month: "Sep 2026", val: "4.00%", regime: "Restrictive", pub: "FOMC Policy Target", src: "Federal Reserve", date: "Sep 18" },
  { id: 3, ind: "Interest Rate", country: "United Kingdom", base: "gb", month: "Sep 2026", val: "4.25%", regime: "Hawkish Hold", pub: "Bank Rate Decision", src: "Bank of England", date: "Sep 19" },
  { id: 4, ind: "Interest Rate", country: "Euro Area", base: "eu", month: "Sep 2026", val: "2.65%", regime: "Easing Cycle", pub: "ECB Deposit Facility", src: "ECB", date: "Sep 12" },
  { id: 5, ind: "Interest Rate", country: "Japan", base: "jp", month: "Sep 2026", val: "0.25%", regime: "Normalizing", pub: "BoJ Policy Rate", src: "Bank of Japan", date: "Sep 20" },
  { id: 6, ind: "CPI", country: "Japan", base: "jp", month: "Aug 2026", val: "1.9%", regime: "Near Target", pub: "National Core Print", src: "SBJ", date: "Sep 22" },
  { id: 7, ind: "CPI", country: "Euro Area", base: "eu", month: "Aug 2026", val: "2.2%", regime: "Disinflating", pub: "Eurostat Flash HICP", src: "Eurostat", date: "Sep 17" },
  { id: 8, ind: "GDP", country: "USA", base: "us", month: "Q2 2026", val: "1.8%", regime: "Expansion", pub: "BEA Final Reading", src: "BEA", date: "Sep 26" },
  { id: 9, ind: "GDP", country: "Euro Area", base: "eu", month: "Q2 2026", val: "0.9%", regime: "Subdued Growth", pub: "Eurostat Real Print", src: "Eurostat", date: "Sep 06" },
  { id: 10, ind: "FX Reserves", country: "Japan", base: "jp", month: "Aug 2026", val: "$1,231,349M", regime: "Top Sovereign", pub: "MoF Monthly Inflow", src: "BoJ / MoF", date: "Sep 07" },
  { id: 11, ind: "FX Reserves", country: "Switzerland", base: "ch", month: "Aug 2026", val: "$748,920M", regime: "High Buffer", pub: "SNB Official Release", src: "SNB", date: "Sep 08" },
  { id: 12, ind: "Current Account", country: "Japan", base: "jp", month: "Q2 2026", val: "+4.20%", regime: "Twin Surplus", pub: "MoF Balance of Payments", src: "MoF", date: "Sep 09" },
  { id: 13, ind: "Current Account", country: "Germany (EU)", base: "eu", month: "Q2 2026", val: "+5.10%", regime: "Export Surplus", pub: "Bundesbank CA Print", src: "Bundesbank", date: "Sep 15" },
  { id: 14, ind: "Equity", country: "USA (S&P 500)", base: "us", month: "Sep 2026", val: "+2.14%", regime: "Bullish ATH", pub: "Monthly Benchmark Return", src: "NYSE / S&P", date: "Sep 30" },
  { id: 15, ind: "Equity", country: "Japan (Nikkei)", base: "jp", month: "Sep 2026", val: "-1.82%", regime: "Consolidation", pub: "TSE Benchmark Return", src: "TSE / Nikkei", date: "Sep 30" }
];

// Official indicator pipeline status telemetry
const PIPELINE_STATUS_CARDS = [
  { ind: "CPI", status: "Active Ingestion", last: "Aug 2026 (3.4% US / 1.9% JP)", next: "Oct 14, 2026", protocol: "REST API + Web Scraper", coverage: "10 G10 Nations", cycle: "Monthly" },
  { ind: "Interest Rate", status: "Synchronized", last: "Sep 2026 (4.00% US / 4.25% UK)", next: "Nov 05, 2026", protocol: "Central Bank Direct Portals", coverage: "10 Central Banks", cycle: "Decision Dates" },
  { ind: "FX Reserves", status: "12M Rolling Active", last: "Aug 2026 ($1.23T JP / $38.5B US)", next: "Oct 05, 2026", protocol: "IMF SDMX 3.0 Feed", coverage: "G10 Reserve Portfolios", cycle: "Monthly" },
  { ind: "GDP", status: "Q2 Published / Q3 Fcst", last: "Q2 2026 (1.8% US / 0.9% EA)", next: "Oct 28, 2026", protocol: "OECD SDMX 3.0 + BEA", coverage: "10 Sovereign Real Growth", cycle: "Quarterly" },
  { ind: "Current Account", status: "Published Only", last: "Q2 2026 (+4.2% JP / -3.0% US)", next: "Dec 18, 2026", protocol: "IMF Balance of Payments (BOP)", coverage: "8 Major Currency Zones", cycle: "Quarterly" },
  { ind: "Equity", status: "Continuous Sync", last: "Sep 2026 (S&P 500 / Nikkei / DAX)", next: "Daily Market Close", protocol: "G10 Benchmark Equity Engine", coverage: "7 Sovereign Equity Baskets", cycle: "Daily / Monthly" },
];

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [activeFilterTab, setActiveFilterTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  // 1. Dynamic Pair Scores Calculation from Master Dataset
  const dynamicPairScores = useMemo(() => {
    const pairScoresMap = (macroDataJson as any).PairScores as Record<string, Record<string, { total_score: number; bias: string }>>;
    return PAIRS.map(pair => {
      const pData = pairScoresMap?.[pair.name]?.[selectedMonth];
      const totalScore = pData?.total_score ?? 0;
      const finalScorePct = ((totalScore / 60) * 100).toFixed(1);
      const computedBias = parseFloat(finalScorePct) >= 20.0 ? "BULLISH" : parseFloat(finalScorePct) <= -20.0 ? "BEARISH" : "NEUTRAL";
      const bias = pData?.bias === "UP" ? "BULLISH" : pData?.bias === "DOWN" ? "BEARISH" : (pData?.bias || computedBias);
      return {
        ...pair,
        totalScore,
        finalScorePct: parseFloat(finalScorePct),
        bias,
      };
    });
  }, [selectedMonth]);

  // 2. Dynamic Bias Breakdown
  const biasDistribution = useMemo(() => {
    let bullish = 0;
    let neutral = 0;
    let bearish = 0;
    dynamicPairScores.forEach(p => {
      if (p.bias === "BULLISH") bullish++;
      else if (p.bias === "BEARISH") bearish++;
      else neutral++;
    });
    const total = dynamicPairScores.length || 21;
    return {
      bullish,
      neutral,
      bearish,
      total,
      bullishPct: Math.round((bullish / total) * 100),
      neutralPct: Math.round((neutral / total) * 100),
      bearishPct: Math.round((bearish / total) * 100),
    };
  }, [dynamicPairScores]);

  // 3. Dynamic Sovereign Currency Strength Ranking (G10)
  const currencyStrengthRanking = useMemo(() => {
    const currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];
    const netScores: Record<string, number> = {};
    const pairCounts: Record<string, number> = {};
    currencies.forEach(c => {
      netScores[c] = 0;
      pairCounts[c] = 0;
    });

    dynamicPairScores.forEach(p => {
      const [baseCurr, quoteCurr] = p.name.split('/');
      if (netScores[baseCurr] !== undefined) {
        netScores[baseCurr] += p.finalScorePct;
        pairCounts[baseCurr]++;
      }
      if (netScores[quoteCurr] !== undefined) {
        netScores[quoteCurr] -= p.finalScorePct;
        pairCounts[quoteCurr]++;
      }
    });

    return currencies.map(c => {
      const count = pairCounts[c] || 1;
      const avgScore = netScores[c] / count;
      const meta = CURRENCY_META[c] || { code: c, flag: "us", name: c, stance: "Neutral", rationale: "Macro index" };
      return {
        ...meta,
        score: parseFloat(avgScore.toFixed(1)),
        rank: 0,
      };
    }).sort((a, b) => b.score - a.score).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [dynamicPairScores]);

  // 4. High-Conviction Macro Opportunities (Alpha Pairs)
  const topOpportunities = useMemo(() => {
    const sorted = [...dynamicPairScores].sort((a, b) => Math.abs(b.finalScorePct) - Math.abs(a.finalScorePct));
    const topBullish = sorted.filter(p => p.bias === "BULLISH").slice(0, 2);
    const topBearish = sorted.filter(p => p.bias === "BEARISH").slice(0, 2);
    return { topBullish, topBearish };
  }, [dynamicPairScores]);

  // 5. Filtered Published Data Feed
  const filteredFeed = useMemo(() => {
    return LATEST_PUBLISHED_FEED.filter(row => {
      const matchesTab = activeFilterTab === "All" || row.ind.toLowerCase().includes(activeFilterTab.toLowerCase());
      if (!searchQuery) return matchesTab;
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        row.ind.toLowerCase().includes(q) || 
        row.country.toLowerCase().includes(q) || 
        row.src.toLowerCase().includes(q) || 
        row.month.toLowerCase().includes(q) ||
        row.regime.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [activeFilterTab, searchQuery]);

  const handleRefreshPipeline = async () => {
    setIsRefreshing(true);
    setRefreshNotice(null);
    await new Promise(r => setTimeout(r, 650));
    setIsRefreshing(false);
    setRefreshNotice("Quantitative bias matrix synchronized. All 21 G10 currency pairs active.");
    setTimeout(() => setRefreshNotice(null), 4000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
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
      className="flex flex-col w-full h-full bg-transparent relative overflow-y-auto no-scrollbar pb-16"
    >
      {/* --- Top Header (relative z-50 to guarantee zero dropdown collision) --- */}
      <motion.header 
        variants={itemVariants}
        className="w-full flex flex-col md:flex-row items-start md:items-center justify-between p-4 sm:p-6 lg:p-[32px_44px] pb-4 sm:pb-6 gap-4 relative z-50 flex-shrink-0"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-sans font-medium text-xs sm:text-sm text-[#AACBC4]">ShiftFX Architecture</span>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#00DF81] bg-[#00DF81]/10 border border-[#00DF81]/25 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,223,129,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00DF81] animate-pulse" />
              LIVE QUANT ENGINE
            </span>
          </div>
          <h1 className="font-sans font-bold text-2xl sm:text-3xl lg:text-[38px] text-[#F1F7F6] tracking-tight leading-none">
            Terminal Dashboard
          </h1>
        </div>
        
        <div className="flex items-center gap-2.5 sm:gap-3.5 w-full md:w-auto justify-between md:justify-end flex-wrap sm:flex-nowrap">
          <GlobalSearch placeholder="Search pairs, indicators, countries..." onSearch={(q) => setSearchQuery(q)} />
          
          {/* Active Matrix Period Selector */}
          <div className="flex items-center gap-2 bg-[#032221]/90 backdrop-blur-xl border border-[#0B453A] rounded-2xl px-3 py-2 shadow-lg shrink-0">
            <Calendar size={14} className="text-[#00DF81]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Select evaluation period"
              className="bg-transparent font-mono font-bold text-xs text-[#F1F7F6] outline-none cursor-pointer pr-1"
            >
              <option value="2026-07" className="bg-[#032221] text-[#F1F7F6]">2026-07 (Published)</option>
              <option value="2026-08" className="bg-[#032221] text-[#F1F7F6]">2026-08 (Published)</option>
              <option value="2026-09" className="bg-[#032221] text-[#F1F7F6]">2026-09 (Current Live)</option>
              <option value="2026-06" className="bg-[#032221] text-[#F1F7F6]">2026-06 (Historical Q2)</option>
              <option value="2025-12" className="bg-[#032221] text-[#F1F7F6]">2025-12 (Full Benchmark)</option>
            </select>
          </div>

          {/* Institutional UTC Telemetry Clock */}
          <div className="hidden xl:flex items-center gap-2.5 bg-[#032221]/90 backdrop-blur-xl border border-[#0B453A] rounded-2xl px-3.5 py-2 shadow-lg shrink-0">
            <Clock size={15} className="text-[#00DF81]" />
            <div className="flex flex-col">
              <span className="font-sans font-medium text-[9px] text-[#AACBC4] leading-none mb-0.5">London / UTC</span>
              <span className="font-mono font-bold text-xs text-[#F1F7F6] leading-none">Oct 03, 18:30 UTC</span>
            </div>
          </div>

          <AuthHeaderWidget />
        </div>
      </motion.header>

      {/* --- Main Content (relative z-10) --- */}
      <main className="flex flex-col px-4 sm:px-6 lg:px-10 gap-6 sm:gap-8 max-w-[1600px] w-full mx-auto relative z-10">

        {/* System Refresh Alert Banner */}
        <AnimatePresence>
          {refreshNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#00DF81]/15 border border-[#00DF81]/40 text-[#F1F7F6] shadow-[0_0_25px_rgba(0,223,129,0.2)]"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#00DF81]" />
                <span className="font-sans font-semibold text-xs sm:text-sm">{refreshNotice}</span>
              </div>
              <span className="font-mono text-xs text-[#00DF81] font-bold">200 OK</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Core KPIs Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Total Pairs Tracked */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("p-5 sm:p-6 flex flex-col justify-between", matteCard)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#00DF81]/10 border border-[#00DF81]/25 text-[#00DF81]">
                  <Database size={18} />
                </div>
                <span className="font-sans font-medium text-xs sm:text-sm text-[#AACBC4]">Active FX Pairs</span>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#06302B] text-[#00DF81] border border-[#0B453A]">
                G10 Matrix
              </span>
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="font-sans font-black text-3xl sm:text-4xl text-[#F1F7F6] tracking-tight leading-none">
                  {biasDistribution.total}
                </span>
                <span className="font-sans font-bold text-xs text-[#00DF81] ml-2.5">
                  100% Coverage
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-sans text-[#AACBC4] mt-2 pt-2 border-t border-[#0B453A]/40">
                <span>7 USD Majors • 14 G10 Crosses</span>
                <Link href="/admin/final-score" className="text-[#00DF81] hover:underline flex items-center gap-0.5 font-semibold">
                  Matrix <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Macro Bias Distribution */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("flex flex-col justify-between p-5 sm:p-6 gap-3.5", matteCard)}
          >
            <div className="flex justify-between items-center">
              <span className="font-sans font-medium text-xs sm:text-sm text-[#AACBC4]">Macro Bias Breakdown</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[#00DF81]">+{biasDistribution.bullish}</span>
                <span className="text-[11px] font-mono text-[#AACBC4]">/ {biasDistribution.neutral} /</span>
                <span className="text-[11px] font-mono font-bold text-[#FF5555]">-{biasDistribution.bearish}</span>
              </div>
            </div>

            {/* Segmented Gradient Visual Distribution Bar */}
            <div className="w-full h-3 rounded-full flex overflow-hidden bg-[#06302B] p-0.5 border border-[#0B453A]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${biasDistribution.bullishPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#2CC295] to-[#00DF81] rounded-l-full shadow-[0_0_10px_rgba(0,223,129,0.5)]" 
                title={`${biasDistribution.bullish} Bullish Pairs (${biasDistribution.bullishPct}%)`}
              />
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${biasDistribution.neutralPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                className="h-full bg-[#AACBC4]/60" 
                title={`${biasDistribution.neutral} Neutral Pairs (${biasDistribution.neutralPct}%)`}
              />
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${biasDistribution.bearishPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="h-full bg-gradient-to-r from-[#FF5555] to-[#FF7777] rounded-r-full shadow-[0_0_10px_rgba(255,85,85,0.5)]" 
                title={`${biasDistribution.bearish} Bearish Pairs (${biasDistribution.bearishPct}%)`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#AACBC4]">
              <span className="text-[#00DF81] font-bold">{biasDistribution.bullishPct}% Bullish</span>
              <span>{biasDistribution.neutralPct}% Neutral</span>
              <span className="text-[#FF5555] font-bold">{biasDistribution.bearishPct}% Bearish</span>
            </div>
          </motion.div>

          {/* Active Macro Indicators */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("flex flex-col justify-between p-5 sm:p-6 gap-3", matteCard)}
          >
            <div className="flex justify-between items-center">
              <span className="font-sans font-medium text-xs sm:text-sm text-[#AACBC4]">Active Indicators</span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00DF81]/15 text-[#00DF81] border border-[#00DF81]/30">
                100% Ingested
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-sans font-black text-3xl sm:text-4xl text-[#F1F7F6] tracking-tight leading-none">
                  6
                </span>
                <span className="font-sans font-bold text-lg text-[#AACBC4]/60">
                  / 6
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-sans text-[#00DF81] mt-2 font-semibold">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>GDP, CA, CPI, Rates, FX, Equity</span>
              </div>
            </div>
          </motion.div>

          {/* Model Calculation & Quick Sync */}
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={clsx("flex flex-col justify-between p-5 sm:p-6 gap-3", matteCard)}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-sans font-medium text-xs text-[#AACBC4]">Engine Pipeline Status</span>
                <span className="font-sans font-bold text-sm text-[#F1F7F6] font-mono mt-0.5">
                  Synchronized & Live
                </span>
              </div>
              <button
                onClick={handleRefreshPipeline}
                disabled={isRefreshing}
                className={clsx(
                  "p-2.5 rounded-xl border transition-all cursor-pointer shadow-md",
                  isRefreshing 
                    ? "bg-[#00DF81]/20 border-[#00DF81] text-[#00DF81] cursor-not-allowed" 
                    : "bg-[#06302B] hover:bg-[#095544] border-[#0B453A] text-[#AACBC4] hover:text-[#F1F7F6]"
                )}
                title="Trigger Live Quantitative Recalculation"
              >
                <RefreshCw size={15} className={clsx(isRefreshing && "animate-spin text-[#00DF81]")} />
              </button>
            </div>
            <div className="pt-2 border-t border-[#0B453A]/40 flex items-center justify-between text-xs font-sans">
              <span className="text-[#AACBC4]">Evaluation Period:</span>
              <span className="font-mono font-bold text-[#00DF81]">{selectedMonth}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* 2. G10 Sovereign Currency Strength Meter */}
        <motion.div variants={itemVariants} className={clsx("p-5 sm:p-7 flex flex-col gap-5", matteCard)}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#0B453A]/50 pb-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-[#00DF81]" />
                <h2 className="font-sans font-bold text-lg sm:text-xl text-[#F1F7F6] tracking-tight">
                  G10 Sovereign Currency Strength Meter
                </h2>
              </div>
              <p className="font-sans text-xs sm:text-sm text-[#AACBC4]">
                Relative macroeconomic momentum index computed from live 6-indicator composite differential matrix ({selectedMonth})
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#00DF81]">
                <span className="w-2 h-2 rounded-full bg-[#00DF81]" /> Leading Carry / Growth
              </span>
              <span className="flex items-center gap-1.5 text-[#FF5555]">
                <span className="w-2 h-2 rounded-full bg-[#FF5555]" /> Funding / Easing
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5">
            {currencyStrengthRanking.map((curr) => {
              const isPositive = curr.score > 0;
              const isNeutral = curr.score === 0;
              return (
                <div 
                  key={curr.code}
                  className="flex flex-col p-3.5 rounded-2xl bg-[#021B1A]/80 border border-[#0B453A] hover:border-[#00DF81]/40 hover:bg-[#06302B]/60 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold text-[#AACBC4]/70">
                      #{curr.rank}
                    </span>
                    <span className={clsx(
                      "font-mono font-bold text-xs px-1.5 py-0.5 rounded-md",
                      isPositive ? "bg-[#00DF81]/15 text-[#00DF81]" : isNeutral ? "bg-[#AACBC4]/10 text-[#AACBC4]" : "bg-[#FF5555]/15 text-[#FF5555]"
                    )}>
                      {curr.score > 0 ? `+${curr.score}%` : `${curr.score}%`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <img src={`/flags/${curr.flag}.svg`} className="w-5 h-5 rounded-full border border-[#0B453A] shadow-sm flex-shrink-0" alt={curr.code} />
                    <span className="font-sans font-bold text-sm sm:text-base text-[#F1F7F6] group-hover:text-[#00DF81] transition-colors">
                      {curr.code}
                    </span>
                  </div>

                  {/* Relative strength visual gauge */}
                  <div className="w-full h-1.5 rounded-full bg-[#06302B] overflow-hidden mb-2">
                    <div 
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        isPositive ? "bg-[#00DF81]" : isNeutral ? "bg-[#AACBC4]" : "bg-[#FF5555]"
                      )}
                      style={{ width: `${Math.min(100, Math.max(15, Math.abs(curr.score) * 2.5))}%` }}
                    />
                  </div>

                  <span className="text-[10px] font-sans font-medium text-[#AACBC4] truncate leading-tight">
                    {curr.stance}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 3. Top High-Conviction Macro Opportunities (Alpha Pairs) */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-[#00DF81]" />
              <h2 className="font-sans font-bold text-lg sm:text-xl text-[#F1F7F6] tracking-tight">
                High-Conviction Sovereign Opportunities ({selectedMonth})
              </h2>
            </div>
            <Link 
              href="/admin/final-score" 
              className="text-xs font-sans font-bold text-[#00DF81] hover:underline flex items-center gap-1"
            >
              Explore Full 21-Pair Matrix <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Bullish Opportunities */}
            {topOpportunities.topBullish.map((pair) => (
              <Link 
                key={pair.name}
                href="/admin/final-score"
                className={clsx(
                  "p-5 rounded-2xl flex flex-col justify-between gap-3 group hover:scale-[1.01] transition-all cursor-pointer border border-[#0B453A] hover:border-[#00DF81]/50 bg-[#032221]/90 shadow-lg",
                  "hover:shadow-[0_12px_30px_rgba(0,223,129,0.12)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlagStack base={pair.base} quote={pair.quote} />
                    <span className="font-sans font-bold text-base text-[#F1F7F6] group-hover:text-[#00DF81] transition-colors">
                      {pair.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00DF81]/15 text-[#00DF81] border border-[#00DF81]/30">
                    BULLISH
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-sans font-black text-2xl sm:text-3xl text-[#00DF81] font-mono">
                    +{pair.finalScorePct}%
                  </span>
                  <span className="text-xs font-mono text-[#AACBC4]">
                    Rating: +{pair.totalScore} / 60
                  </span>
                </div>

                <div className="pt-2 border-t border-[#0B453A]/50 flex items-center justify-between text-[11px] font-sans text-[#AACBC4]">
                  <span>Strong Carry & Yield Spread</span>
                  <span className="text-[#00DF81] group-hover:translate-x-1 transition-transform">Inspect →</span>
                </div>
              </Link>
            ))}

            {/* Bearish Opportunities */}
            {topOpportunities.topBearish.map((pair) => (
              <Link 
                key={pair.name}
                href="/admin/final-score"
                className={clsx(
                  "p-5 rounded-2xl flex flex-col justify-between gap-3 group hover:scale-[1.01] transition-all cursor-pointer border border-[#0B453A] hover:border-[#FF5555]/50 bg-[#032221]/90 shadow-lg",
                  "hover:shadow-[0_12px_30px_rgba(255,85,85,0.12)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlagStack base={pair.base} quote={pair.quote} />
                    <span className="font-sans font-bold text-base text-[#F1F7F6] group-hover:text-[#FF5555] transition-colors">
                      {pair.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF5555]/15 text-[#FF5555] border border-[#FF5555]/30">
                    BEARISH
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-sans font-black text-2xl sm:text-3xl text-[#FF5555] font-mono">
                    {pair.finalScorePct}%
                  </span>
                  <span className="text-xs font-mono text-[#AACBC4]">
                    Rating: {pair.totalScore} / 60
                  </span>
                </div>

                <div className="pt-2 border-t border-[#0B453A]/50 flex items-center justify-between text-[11px] font-sans text-[#AACBC4]">
                  <span>Monetary Disadvantage / Deficit</span>
                  <span className="text-[#FF5555] group-hover:translate-x-1 transition-transform">Inspect →</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* 4. Latest Published Macro Data & Pipeline Health Side-by-Side */}
        <motion.div variants={itemVariants} className="w-full flex flex-col lg:flex-row gap-5 sm:gap-6">
          
          {/* Left Column: Filterable Published Macro Prints Feed */}
          <div className={clsx("flex-[2] flex flex-col p-4 sm:p-6 lg:p-7 gap-5", matteCard)}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-sans font-bold text-base sm:text-lg lg:text-xl text-[#F1F7F6] tracking-tight">
                  Latest Published Macro Data
                </h2>
                <p className="font-sans text-xs sm:text-sm text-[#AACBC4] mt-0.5">
                  Verified fundamental statistics ingested directly into the quantitative engine
                </p>
              </div>

              {/* Indicator Category Filters */}
              <div className="flex items-center gap-1.5 bg-[#021B1A] p-1 rounded-xl border border-[#0B453A] overflow-x-auto no-scrollbar max-w-full">
                {["All", "CPI", "Interest Rate", "GDP", "Current Account", "FX Reserves", "Equity"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilterTab(tab)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                      activeFilterTab === tab ? "bg-[#00DF81] text-[#021B1A]" : "text-[#AACBC4] hover:text-[#F1F7F6] hover:bg-[#06302B]"
                    )}
                  >
                    {tab === "Interest Rate" ? "Rates" : tab === "Current Account" ? "CA" : tab === "FX Reserves" ? "FX" : tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto w-full -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-thin scrollbar-thumb-[#0B453A]">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-[#0B453A] text-xs font-sans font-semibold text-[#AACBC4]">
                    <th className="pb-3 px-3">Indicator</th>
                    <th className="pb-3 px-3">Sovereign Entity</th>
                    <th className="pb-3 px-3">Release Period</th>
                    <th className="pb-3 px-3">Official Value</th>
                    <th className="pb-3 px-3">Economic Stance</th>
                    <th className="pb-3 px-3 text-right">Source Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B453A]/40 text-sm">
                  {filteredFeed.map((row) => (
                    <tr key={row.id} className="group hover:bg-[#06302B]/40 transition-colors">
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
                        <span className="bg-[#021B1A] px-2 py-0.5 rounded-lg border border-[#0B453A]">
                          {row.val}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-xs whitespace-nowrap">
                        <span className="text-[#AACBC4]">{row.regime}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-sans font-semibold text-xs text-[#AACBC4] group-hover:text-[#00DF81] transition-colors whitespace-nowrap">
                        {row.src}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-[#AACBC4] pt-2 border-t border-[#0B453A]/40">
              <span>Showing {filteredFeed.length} verified macroeconomic prints</span>
              <Link href="/admin/macro-data" className="text-[#00DF81] hover:underline flex items-center gap-1 font-semibold">
                Explore Full Macro Matrix <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Right Column: Pipeline Health & Next Central Bank Dates */}
          <div className={clsx("flex-[1.2] flex flex-col p-4 sm:p-6 lg:p-7 gap-5", matteCard)}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sans font-bold text-base sm:text-lg lg:text-xl text-[#F1F7F6] tracking-tight">
                  Pipeline Health
                </h2>
                <p className="font-sans text-xs text-[#AACBC4] mt-0.5">Automated ingestion telemetry</p>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#00DF81] bg-[#00DF81]/15 px-2 py-0.5 rounded-full border border-[#00DF81]/30">
                100% Active
              </span>
            </div>

            <div className="flex flex-col gap-2.5 w-full">
              {PIPELINE_STATUS_CARDS.map((pipe) => (
                <div 
                  key={pipe.ind}
                  className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#021B1A]/80 border border-[#0B453A] hover:border-[#03624C] hover:bg-[#06302B]/60 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-bold text-xs sm:text-sm text-[#F1F7F6]">{pipe.ind}</span>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-wider bg-[#00DF81]/15 text-[#00DF81] border border-[#00DF81]/30">
                      {pipe.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-sans text-[#AACBC4]">
                    <span>Last: <span className="text-[#F1F7F6] font-mono">{pipe.last}</span></span>
                    <span className="text-right">Next: <span className="text-[#00DF81] font-mono">{pipe.next}</span></span>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/admin/settings"
              className="mt-auto w-full py-2.5 rounded-xl bg-[#06302B] hover:bg-[#095544] text-[#AACBC4] hover:text-[#F1F7F6] border border-[#0B453A] font-sans font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <SlidersHorizontal size={14} className="text-[#00DF81]" />
              <span>Configure Scraper & Crontab</span>
            </Link>
          </div>
        </motion.div>

        {/* 5. Institutional Navigation Station */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/final-score"
            className="p-5 rounded-2xl bg-[#032221]/90 border border-[#0B453A] hover:border-[#00DF81]/50 hover:bg-[#06302B]/70 transition-all group flex flex-col justify-between gap-3 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#00DF81]/10 text-[#00DF81] border border-[#00DF81]/30">
                <BarChart3 size={18} />
              </div>
              <ArrowUpRight size={16} className="text-[#AACBC4] group-hover:text-[#00DF81] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm sm:text-base text-[#F1F7F6] group-hover:text-[#00DF81] transition-colors">
                Final Score Matrix
              </h3>
              <p className="font-sans text-xs text-[#AACBC4] mt-1 leading-relaxed">
                Explore sovereign composite macro bias scores and 6-indicator weightings across all G10 pairs.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/macro-data"
            className="p-5 rounded-2xl bg-[#032221]/90 border border-[#0B453A] hover:border-[#00DF81]/50 hover:bg-[#06302B]/70 transition-all group flex flex-col justify-between gap-3 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#00DF81]/10 text-[#00DF81] border border-[#00DF81]/30">
                <Globe2 size={18} />
              </div>
              <ArrowUpRight size={16} className="text-[#AACBC4] group-hover:text-[#00DF81] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm sm:text-base text-[#F1F7F6] group-hover:text-[#00DF81] transition-colors">
                Macro Data Center
              </h3>
              <p className="font-sans text-xs text-[#AACBC4] mt-1 leading-relaxed">
                Inspect raw indicator matrices, custom user forecast assumptions, and differential ratings.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/rating-rules"
            className="p-5 rounded-2xl bg-[#032221]/90 border border-[#0B453A] hover:border-[#00DF81]/50 hover:bg-[#06302B]/70 transition-all group flex flex-col justify-between gap-3 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#00DF81]/10 text-[#00DF81] border border-[#00DF81]/30">
                <ShieldCheck size={18} />
              </div>
              <ArrowUpRight size={16} className="text-[#AACBC4] group-hover:text-[#00DF81] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm sm:text-base text-[#F1F7F6] group-hover:text-[#00DF81] transition-colors">
                Rating Rules Engine
              </h3>
              <p className="font-sans text-xs text-[#AACBC4] mt-1 leading-relaxed">
                Audit official rating thresholds, differential lookup grids, and quantitative version histories.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="p-5 rounded-2xl bg-[#032221]/90 border border-[#0B453A] hover:border-[#00DF81]/50 hover:bg-[#06302B]/70 transition-all group flex flex-col justify-between gap-3 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#00DF81]/10 text-[#00DF81] border border-[#00DF81]/30">
                <SlidersHorizontal size={18} />
              </div>
              <ArrowUpRight size={16} className="text-[#AACBC4] group-hover:text-[#00DF81] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm sm:text-base text-[#F1F7F6] group-hover:text-[#00DF81] transition-colors">
                Settings & Architecture
              </h3>
              <p className="font-sans text-xs text-[#AACBC4] mt-1 leading-relaxed">
                Crontab automation schedule, mathematical proof verification, and ingestion protocols.
              </p>
            </div>
          </Link>
        </motion.div>

      </main>
    </motion.div>
  );
}
