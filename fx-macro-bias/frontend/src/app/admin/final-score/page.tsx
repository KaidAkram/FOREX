"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  ChevronDown, 
  Info, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Sparkles, 
  Layers, 
  Activity, 
  Filter, 
  Grid3X3, 
  LayoutGrid, 
  CheckCircle2, 
  Calendar, 
  Zap, 
  SlidersHorizontal,
  ArrowRight,
  ExternalLink,
  Flame,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  BarChart3,
  Edit3,
  RotateCcw,
  Save,
  Check
} from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { 
  AdminPageHeader, CatalogueKPICard, SculptedFilterPod, SculptedTableContainer 
} from "@/components/admin/AdminPrimitives";
import { FXPairFlags } from "@/components/ui/DopaminePrimitives";
import { soundFX } from "@/lib/soundEngine";
import { AnimatedMetricValue, GhostWireframeDissolve } from "@/components/motion/AnimatedNumberAndMorphChart";

import { 
  INDICATORS, 
  getCombinedDifferentialData, 
  SYSTEM_CURRENT_YEAR, 
  SYSTEM_CURRENT_MONTH, 
  MACRO_YEARS 
} from "@/data/macroDataset";

// ============================================================================
// ALL 28 G10 COMBINATIONS (EXACT SPECIFICATION FROM SENIOR QUANT / CLIENT)
// ============================================================================
export interface PairSpec {
  name: string;
  base: string;
  quote: string;
  baseCountry: string;
  quoteCountry: string;
  baseCur: string;
  quoteCur: string;
  group: "EUR" | "GBP" | "USD" | "JPY" | "CROSS";
}

const ALL_G10_PAIRS: PairSpec[] = [
  // 1. EUR Pairs (7)
  { name: "EUR/USD", base: "eu", quote: "us", baseCountry: "Euro Area", quoteCountry: "USA", baseCur: "EUR", quoteCur: "USD", group: "EUR" },
  { name: "EUR/GBP", base: "eu", quote: "gb", baseCountry: "Euro Area", quoteCountry: "United Kingdom", baseCur: "EUR", quoteCur: "GBP", group: "EUR" },
  { name: "EUR/JPY", base: "eu", quote: "jp", baseCountry: "Euro Area", quoteCountry: "Japan", baseCur: "EUR", quoteCur: "JPY", group: "EUR" },
  { name: "EUR/CHF", base: "eu", quote: "ch", baseCountry: "Euro Area", quoteCountry: "Switzerland", baseCur: "EUR", quoteCur: "CHF", group: "EUR" },
  { name: "EUR/CAD", base: "eu", quote: "ca", baseCountry: "Euro Area", quoteCountry: "Canada", baseCur: "EUR", quoteCur: "CAD", group: "EUR" },
  { name: "EUR/AUD", base: "eu", quote: "au", baseCountry: "Euro Area", quoteCountry: "Australia", baseCur: "EUR", quoteCur: "AUD", group: "EUR" },
  { name: "EUR/NZD", base: "eu", quote: "nz", baseCountry: "Euro Area", quoteCountry: "New Zealand", baseCur: "EUR", quoteCur: "NZD", group: "EUR" },

  // 2. GBP Pairs (6)
  { name: "GBP/USD", base: "gb", quote: "us", baseCountry: "United Kingdom", quoteCountry: "USA", baseCur: "GBP", quoteCur: "USD", group: "GBP" },
  { name: "GBP/JPY", base: "gb", quote: "jp", baseCountry: "United Kingdom", quoteCountry: "Japan", baseCur: "GBP", quoteCur: "JPY", group: "GBP" },
  { name: "GBP/CHF", base: "gb", quote: "ch", baseCountry: "United Kingdom", quoteCountry: "Switzerland", baseCur: "GBP", quoteCur: "CHF", group: "GBP" },
  { name: "GBP/CAD", base: "gb", quote: "ca", baseCountry: "United Kingdom", quoteCountry: "Canada", baseCur: "GBP", quoteCur: "CAD", group: "GBP" },
  { name: "GBP/AUD", base: "gb", quote: "au", baseCountry: "United Kingdom", quoteCountry: "Australia", baseCur: "GBP", quoteCur: "AUD", group: "GBP" },
  { name: "GBP/NZD", base: "gb", quote: "nz", baseCountry: "United Kingdom", quoteCountry: "New Zealand", baseCur: "GBP", quoteCur: "NZD", group: "GBP" },

  // 3. USD Pairs (5)
  { name: "USD/JPY", base: "us", quote: "jp", baseCountry: "USA", quoteCountry: "Japan", baseCur: "USD", quoteCur: "JPY", group: "USD" },
  { name: "USD/CHF", base: "us", quote: "ch", baseCountry: "USA", quoteCountry: "Switzerland", baseCur: "USD", quoteCur: "CHF", group: "USD" },
  { name: "USD/CAD", base: "us", quote: "ca", baseCountry: "USA", quoteCountry: "Canada", baseCur: "USD", quoteCur: "CAD", group: "USD" },
  { name: "USD/AUD", base: "us", quote: "au", baseCountry: "USA", quoteCountry: "Australia", baseCur: "USD", quoteCur: "AUD", group: "USD" },
  { name: "USD/NZD", base: "us", quote: "nz", baseCountry: "USA", quoteCountry: "New Zealand", baseCur: "USD", quoteCur: "NZD", group: "USD" },

  // 4. JPY Crosses (4)
  { name: "CHF/JPY", base: "ch", quote: "jp", baseCountry: "Switzerland", quoteCountry: "Japan", baseCur: "CHF", quoteCur: "JPY", group: "JPY" },
  { name: "CAD/JPY", base: "ca", quote: "jp", baseCountry: "Canada", quoteCountry: "Japan", baseCur: "CAD", quoteCur: "JPY", group: "JPY" },
  { name: "AUD/JPY", base: "au", quote: "jp", baseCountry: "Australia", quoteCountry: "Japan", baseCur: "AUD", quoteCur: "JPY", group: "JPY" },
  { name: "NZD/JPY", base: "nz", quote: "jp", baseCountry: "New Zealand", quoteCountry: "Japan", baseCur: "NZD", quoteCur: "JPY", group: "JPY" },

  // 5. Crosses (6)
  { name: "CAD/CHF", base: "ca", quote: "ch", baseCountry: "Canada", quoteCountry: "Switzerland", baseCur: "CAD", quoteCur: "CHF", group: "CROSS" },
  { name: "AUD/CHF", base: "au", quote: "ch", baseCountry: "Australia", quoteCountry: "Switzerland", baseCur: "AUD", quoteCur: "CHF", group: "CROSS" },
  { name: "NZD/CHF", base: "nz", quote: "ch", baseCountry: "New Zealand", quoteCountry: "Switzerland", baseCur: "NZD", quoteCur: "CHF", group: "CROSS" },
  { name: "AUD/CAD", base: "au", quote: "ca", baseCountry: "Australia", quoteCountry: "Canada", baseCur: "AUD", quoteCur: "CAD", group: "CROSS" },
  { name: "NZD/CAD", base: "nz", quote: "ca", baseCountry: "New Zealand", quoteCountry: "Canada", baseCur: "NZD", quoteCur: "CAD", group: "CROSS" },
  { name: "AUD/NZD", base: "au", quote: "nz", baseCountry: "Australia", quoteCountry: "New Zealand", baseCur: "AUD", quoteCur: "NZD", group: "CROSS" }
];

const YEARS = MACRO_YEARS;
const STORAGE_FORECAST_KEY = "shiftfx_final_score_forecast_overrides";

const matteCard = "bg-[#101218] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] rounded-[22px]";

// Function to fetch and compute scores across all 28 pairs with client overrides support
const fetchFinalScores = async (year: number, userOverrides: Record<string, any>) => {
  // All 12 calendar months: 1-9 historical settled, 10-12 forward 3-month forecast
  const displayMonths = Array.from({ length: 12 }).map((_, i) => `${year}-${(i + 1).toString().padStart(2, '0')}`);
  const forecastMonthsSet = new Set([`${year}-10`, `${year}-11`, `${year}-12`]);

  // Compute differential ratings for all 28 pairs across 6 indicators
  const pairIndicatorData: Record<string, Record<string, Record<string, number>>> = {};
  for (const p of ALL_G10_PAIRS) {
    pairIndicatorData[p.name] = {};
    for (const ind of INDICATORS) {
      const diffList = getCombinedDifferentialData(p.name, ind, year);
      pairIndicatorData[p.name][ind] = {};
      for (const d of diffList) {
        pairIndicatorData[p.name][ind][d.month] = d.rating;
      }
    }
  }

  return ALL_G10_PAIRS.map((pairData) => ({
    pair: pairData.name,
    base: pairData.base,
    quote: pairData.quote,
    baseCountry: pairData.baseCountry,
    quoteCountry: pairData.quoteCountry,
    baseCur: pairData.baseCur,
    quoteCur: pairData.quoteCur,
    group: pairData.group,
    data: displayMonths.map((month) => {
      const isForecast = forecastMonthsSet.has(month);
      const overrideKey = `${pairData.name}_${month}`;
      const customOverride = userOverrides[overrideKey];

      // Default model consensus indicator ratings
      const defaultIndicators = INDICATORS.map(ind => ({
        ind,
        val: pairIndicatorData[pairData.name]?.[ind]?.[month] ?? 0
      }));

      if (customOverride && isForecast) {
        const scoreNum = parseFloat(customOverride.finalScorePct);
        const bias = scoreNum >= 20.0 ? "BULLISH" : scoreNum <= -20.0 ? "BEARISH" : "NEUTRAL";
        const indicators = customOverride.indicatorRatings 
          ? INDICATORS.map(ind => ({ ind, val: customOverride.indicatorRatings[ind] ?? 0 }))
          : defaultIndicators;
        const totalScore = indicators.reduce((sum, item) => sum + item.val, 0);

        return {
          month,
          indicators,
          totalScore,
          finalScorePct: customOverride.finalScorePct,
          bias,
          isForecast: true,
          isUserOverride: true,
          customNote: customOverride.customNote || ""
        };
      }

      const totalScore = defaultIndicators.reduce((sum, item) => sum + item.val, 0); 
      const finalScorePct = ((totalScore / 60) * 100).toFixed(1); 
      const bias = parseFloat(finalScorePct) >= 20.0 ? "BULLISH" : parseFloat(finalScorePct) <= -20.0 ? "BEARISH" : "NEUTRAL";
      
      return { 
        month, 
        indicators: defaultIndicators, 
        totalScore, 
        finalScorePct, 
        bias,
        isForecast,
        isUserOverride: false
      };
    })
  }));
};

const FlagStack = ({ base, quote, size = 20 }: { base: string; quote: string; size?: number }) => (
  <div className="flex items-center flex-shrink-0 mr-1.5">
    <img 
      src={`/flags/${base}.svg`} 
      style={{ width: size, height: size }} 
      className="rounded-full border border-white/10 z-10 shadow-sm object-cover" 
      alt={base} 
    />
    <img 
      src={`/flags/${quote}.svg`} 
      style={{ width: size, height: size, marginLeft: -(size * 0.38) }} 
      className="rounded-full border border-white/10 z-0 shadow-sm object-cover" 
      alt={quote} 
    />
  </div>
);

export default function FinalScorePage() {
  const [selectedCell, setSelectedCell] = useState<{ 
    pair: string; 
    base: string; 
    quote: string; 
    baseCountry: string; 
    quoteCountry: string; 
    data: any 
  } | null>(null);

  // Client Estimation Modal State for 3-Month Forecasting
  const [estimationModal, setEstimationModal] = useState<{
    pair: string;
    base: string;
    quote: string;
    baseCountry: string;
    quoteCountry: string;
    month: string;
    currentScorePct: string;
    currentBias: string;
    indicators: { ind: string; val: number }[];
    isUserOverride: boolean;
    customNote: string;
  } | null>(null);

  // Estimation form inputs
  const [customScoreInput, setCustomScoreInput] = useState<number>(0);
  const [customRatings, setCustomRatings] = useState<Record<string, number>>({});
  const [customNoteInput, setCustomNoteInput] = useState<string>("");
  const [estimationMode, setEstimationMode] = useState<"quick_score" | "pillars">("quick_score");

  // Persistent user overrides state initialized lazily to avoid double render
  const [userOverrides, setUserOverrides] = useState<Record<string, any>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_FORECAST_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to load forecast overrides", e);
      }
    }
    return {};
  });

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [viewMode, setViewMode] = useState<"matrix" | "cards">("matrix");
  const [currencyGroup, setCurrencyGroup] = useState<"ALL" | "EUR" | "GBP" | "USD" | "JPY" | "CROSS">("ALL");
  const [regimeFilter, setRegimeFilter] = useState<"ALL" | "BULLISH" | "BEARISH" | "NEUTRAL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [heatmapMode, setHeatmapMode] = useState<boolean>(true);
  const [activeKpiKey, setActiveKpiKey] = useState<string>("bullish");

  const { data: scoresData, isLoading, refetch } = useQuery({
    queryKey: ["final-scores", selectedYear, userOverrides],
    queryFn: () => fetchFinalScores(selectedYear, userOverrides),
    staleTime: 120_000,
    placeholderData: (previousData) => previousData,
  });

  const displayMonths = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`);
  }, [selectedYear]);

  const latestSettledMonth = `${selectedYear}-09`;
  const forecastMonthsList = [`${selectedYear}-10`, `${selectedYear}-11`, `${selectedYear}-12`];
  const forecastMonthsSet = useMemo(() => new Set(forecastMonthsList), [selectedYear]);

  // High-Level Executive Summary Statistics across all 28 pairs
  const stats = useMemo(() => {
    if (!scoresData || scoresData.length === 0) return null;
    
    let topBullish = { pair: "", score: -999, base: "", quote: "", baseCountry: "", quoteCountry: "" };
    let topBearish = { pair: "", score: 999, base: "", quote: "", baseCountry: "", quoteCountry: "" };
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let totalAbs = 0;

    scoresData.forEach(row => {
      // Evaluate latest settled release month
      const mData = row.data.find((d: any) => d.month === latestSettledMonth) || row.data[row.data.length - 1];
      if (!mData) return;
      const num = parseFloat(mData.finalScorePct);
      totalAbs += Math.abs(num);

      if (num >= 20.0) bullishCount++;
      else if (num <= -20.0) bearishCount++;
      else neutralCount++;

      if (num > topBullish.score) {
        topBullish = { 
          pair: row.pair, 
          score: num, 
          base: row.base, 
          quote: row.quote,
          baseCountry: row.baseCountry,
          quoteCountry: row.quoteCountry
        };
      }
      if (num < topBearish.score) {
        topBearish = { 
          pair: row.pair, 
          score: num, 
          base: row.base, 
          quote: row.quote,
          baseCountry: row.baseCountry,
          quoteCountry: row.quoteCountry
        };
      }
    });

    const avgAbs = (totalAbs / scoresData.length).toFixed(1);

    return {
      topBullish,
      topBearish,
      bullishCount,
      bearishCount,
      neutralCount,
      avgAbs,
      latestSettledMonth,
      totalPairs: scoresData.length
    };
  }, [scoresData, latestSettledMonth]);

  // Filtered dataset with Group, Search, and Regime support
  const filteredScores = useMemo(() => {
    if (!scoresData) return [];
    return scoresData.filter(row => {
      // 1. Currency Group filter
      if (currencyGroup !== "ALL" && row.group !== currencyGroup) {
        return false;
      }
      // 2. Text Search filter (Pair or Country)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPair = row.pair.toLowerCase().includes(q);
        const matchesCountry = (row.baseCountry?.toLowerCase().includes(q) || row.quoteCountry?.toLowerCase().includes(q));
        if (!matchesPair && !matchesCountry) return false;
      }
      // 3. Regime Filter
      if (regimeFilter !== "ALL") {
        const mData = row.data.find((d: any) => d.month === latestSettledMonth) || row.data[row.data.length - 1];
        if (!mData || mData.bias !== regimeFilter) return false;
      }
      return true;
    });
  }, [scoresData, currencyGroup, searchQuery, regimeFilter, latestSettledMonth]);

  // Dynamic styling for historical cells
  const getCellStyling = (pctNum: number, bias: string) => {
    if (bias === "BULLISH") {
      return {
        container: heatmapMode
          ? "bg-emerald-500/15 border-emerald-500/35 hover:border-emerald-500/60"
          : "bg-emerald-500/10 border-emerald-500/25 hover:border-emerald-500/50",
        numColor: "text-emerald-400",
        labelColor: "text-emerald-400 font-semibold",
        badgeBg: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
      };
    }
    if (bias === "BEARISH") {
      return {
        container: heatmapMode
          ? "bg-rose-500/15 border-rose-500/35 hover:border-rose-500/60"
          : "bg-rose-500/10 border-rose-500/25 hover:border-rose-500/50",
        numColor: "text-rose-400",
        labelColor: "text-rose-400 font-semibold",
        badgeBg: "bg-rose-500/15 border border-rose-500/30 text-rose-400"
      };
    }
    // Neutral
    if (pctNum > 0) {
      return {
        container: "bg-[#161922] border-white/[0.06] hover:border-white/20",
        numColor: "text-emerald-400",
        labelColor: "text-slate-400",
        badgeBg: "bg-slate-400/10 border border-slate-400/20 text-slate-400"
      };
    }
    return {
      container: "bg-[#161922] border-white/[0.06] hover:border-white/20",
      numColor: "text-slate-300",
      labelColor: "text-slate-400",
      badgeBg: "bg-slate-400/10 border border-slate-400/20 text-slate-400"
    };
  };

  // Open the Client Estimation Modal when clicking a Forecast month cell
  const handleOpenEstimation = (row: any, cell: any) => {
    const initialScore = parseFloat(cell.finalScorePct) || 0;
    const initialRatings: Record<string, number> = {};
    cell.indicators.forEach((ind: any) => {
      initialRatings[ind.ind] = ind.val;
    });

    setCustomScoreInput(initialScore);
    setCustomRatings(initialRatings);
    setCustomNoteInput(cell.customNote || "");
    setEstimationModal({
      pair: row.pair,
      base: row.base,
      quote: row.quote,
      baseCountry: row.baseCountry,
      quoteCountry: row.quoteCountry,
      month: cell.month,
      currentScorePct: cell.finalScorePct,
      currentBias: cell.bias,
      indicators: cell.indicators,
      isUserOverride: cell.isUserOverride,
      customNote: cell.customNote || ""
    });
  };

  // Handle saving the client's custom estimation
  const handleSaveEstimation = () => {
    if (!estimationModal) return;

    let finalScorePct = customScoreInput.toFixed(1);
    let ratingMap = { ...customRatings };

    // If in pillars mode, calculate directly from indicator sum
    if (estimationMode === "pillars") {
      const sum = Object.values(customRatings).reduce((a, b) => a + b, 0);
      finalScorePct = ((sum / 60) * 100).toFixed(1);
    } else {
      // In quick score mode, distribute proportionately across indicators
      const targetRating = (customScoreInput / 100) * 60;
      const perInd = Math.round(targetRating / 6);
      INDICATORS.forEach(ind => {
        ratingMap[ind] = Math.max(-10, Math.min(10, perInd));
      });
    }

    const num = parseFloat(finalScorePct);
    const bias = num >= 20.0 ? "BULLISH" : num <= -20.0 ? "BEARISH" : "NEUTRAL";
    const key = `${estimationModal.pair}_${estimationModal.month}`;

    const nextOverrides = {
      ...userOverrides,
      [key]: {
        finalScorePct,
        bias,
        customNote: customNoteInput.trim(),
        indicatorRatings: ratingMap,
        updatedAt: new Date().toISOString()
      }
    };

    setUserOverrides(nextOverrides);
    try {
      localStorage.setItem(STORAGE_FORECAST_KEY, JSON.stringify(nextOverrides));
    } catch (e) {
      console.error(e);
    }

    soundFX.playChime();
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.6 }
    });

    setEstimationModal(null);
  };

  // Handle resetting a custom estimation back to consensus model
  const handleResetEstimation = () => {
    if (!estimationModal) return;
    const key = `${estimationModal.pair}_${estimationModal.month}`;
    const nextOverrides = { ...userOverrides };
    delete nextOverrides[key];

    setUserOverrides(nextOverrides);
    try {
      localStorage.setItem(STORAGE_FORECAST_KEY, JSON.stringify(nextOverrides));
    } catch (e) {
      console.error(e);
    }

    setEstimationModal(null);
  };

  return (
    <div className="w-full max-w-[1550px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col text-white font-sans">
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. UNIFIED ADMIN PAGE HEADER (Single row utilities, NO duplicate admin) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AdminPageHeader
        eyebrow="MATRICE DE CONVICTION • SHIFTFX ENGINE"
        badgeText="28 COMBINAISONS G10"
        title="Score Final & Matrice de Prévision 3 Mois"
        searchPlaceholder="Filtrer les 28 paires..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        rightActions={
          <>
            {/* Horizon Year Picker */}
            <div className="h-10 px-3.5 rounded-full bg-[#101218] border border-white/[0.08] flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Calendar size={13} className="text-[#D4FF00]" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="Sélectionner l'horizon"
                className="bg-transparent font-mono text-xs text-slate-300 outline-none cursor-pointer pr-1"
              >
                {YEARS.map(y => (
                  <option key={y} value={y} className="bg-[#101218] text-white">
                    Horizon : {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Heatmap toggle */}
            <button
              type="button"
              onClick={() => {
                soundFX.playPop(1.1);
                setHeatmapMode(!heatmapMode);
              }}
              className={clsx(
                "h-10 px-4 rounded-full font-mono text-xs transition-all cursor-pointer border flex items-center gap-1.5 whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                heatmapMode 
                  ? "bg-[#D4FF00]/15 text-[#D4FF00] border-[#D4FF00]/40 font-bold" 
                  : "bg-[#101218] text-slate-400 border-white/[0.08] hover:text-white"
              )}
            >
              <Flame size={13} className={heatmapMode ? "text-[#D4FF00] fill-[#D4FF00]" : "text-slate-400"} />
              <span>Mode Heatmap</span>
            </button>
          </>
        }
      />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. TOP 4 KPI CARDS (CatalogueKPICard standard)                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          
          {/* Card 1: Top Bullish Bias */}
          <CatalogueKPICard
            title="PLUS FORT VENT PORTEUR"
            variant="emerald"
            icon={<TrendingUp size={14} />}
            isActive={activeKpiKey === "bullish"}
            layoutId="final-score-kpi-focus"
            onClick={() => {
              soundFX.playPop(1);
              setActiveKpiKey("bullish");
            }}
            customHero={
              <div className="flex items-baseline justify-between my-1">
                <div className="flex items-center gap-2">
                  <FXPairFlags pair={stats.topBullish.pair} size="sm" />
                  <span className="text-[26px] leading-none font-mono font-extrabold text-emerald-400 tracking-tight">
                    <AnimatedMetricValue value={stats.topBullish.score} prefix="+" suffix="%" decimals={1} />
                  </span>
                </div>
                <span className="font-sans font-bold text-sm text-white">{stats.topBullish.pair}</span>
              </div>
            }
            subtitle="Top Alpha Acheteur G10"
            bars={[45, 65, 80, 100]}
          />

          {/* Card 2: Top Bearish Bias */}
          <CatalogueKPICard
            title="PLUS FORT VENT CONTRAIRE"
            variant="rose"
            icon={<TrendingDown size={14} />}
            isActive={activeKpiKey === "bearish"}
            layoutId="final-score-kpi-focus"
            onClick={() => {
              soundFX.playPop(1.05);
              setActiveKpiKey("bearish");
            }}
            customHero={
              <div className="flex items-baseline justify-between my-1">
                <div className="flex items-center gap-2">
                  <FXPairFlags pair={stats.topBearish.pair} size="sm" />
                  <span className="text-[26px] leading-none font-mono font-extrabold text-rose-400 tracking-tight">
                    <AnimatedMetricValue value={stats.topBearish.score} suffix="%" decimals={1} />
                  </span>
                </div>
                <span className="font-sans font-bold text-sm text-white">{stats.topBearish.pair}</span>
              </div>
            }
            subtitle="Déficit de Portage Majeur"
            bars={[90, 70, 45, 20]}
          />

          {/* Card 3: Active Month Distribution */}
          <CatalogueKPICard
            title={`LARGEUR DE RÉGIME (${stats.latestSettledMonth})`}
            variant="sky"
            icon={<Activity size={14} />}
            isActive={activeKpiKey === "distribution"}
            layoutId="final-score-kpi-focus"
            onClick={() => {
              soundFX.playPop(1.1);
              setActiveKpiKey("distribution");
            }}
            customHero={
              <div className="flex flex-col gap-1.5 my-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[28px] leading-none font-mono font-extrabold text-white tracking-tight flex items-baseline">
                    <AnimatedMetricValue value={stats.totalPairs} decimals={0} />
                    <span className="text-xs font-mono text-slate-400 font-normal ml-1">Paires</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    <span className="text-emerald-400 font-bold">+{stats.bullishCount}</span> / {stats.neutralCount} / <span className="text-rose-400 font-bold">-{stats.bearishCount}</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-white/[0.06] p-0.5 border border-white/[0.08]">
                  <div style={{ width: `${(stats.bullishCount / stats.totalPairs) * 100}%` }} className="h-full bg-emerald-400 rounded-l-full shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500" />
                  <div style={{ width: `${(stats.neutralCount / stats.totalPairs) * 100}%` }} className="h-full bg-slate-400 transition-all duration-500" />
                  <div style={{ width: `${(stats.bearishCount / stats.totalPairs) * 100}%` }} className="h-full bg-rose-400 rounded-r-full shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-500" />
                </div>
              </div>
            }
            subtitle={`${stats.bullishCount} Acheteur • ${stats.neutralCount} Neutre • ${stats.bearishCount} Vendeur`}
            customRightFooter={<div />}
          />

          {/* Card 4: Macro Dispersion Index */}
          <CatalogueKPICard
            title="DISPERSION ABSOLUE G10"
            value={`${stats.avgAbs}%`}
            numericValue={parseFloat(stats.avgAbs)}
            unit="Haute Conviction"
            subtitle="Divergence Moyenne Absolue"
            variant="lime"
            icon={<Sparkles size={14} />}
            isActive={activeKpiKey === "dispersion"}
            layoutId="final-score-kpi-focus"
            onClick={() => {
              soundFX.playPop(1.15);
              setActiveKpiKey("dispersion");
            }}
            bars={[40, 65, 80, 95]}
          />

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. SCULPTED FILTER POD                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SculptedFilterPod>
        <div className="flex flex-col gap-3.5">
          {/* Row 1: Universe Quick-Chips & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-slate-400 mr-2 shrink-0">
                UNIVERS :
              </span>
              {[
                { key: "ALL", label: "Toutes (28)" },
                { key: "EUR", label: "EUR (7)" },
                { key: "GBP", label: "GBP (6)" },
                { key: "USD", label: "USD (5)" },
                { key: "JPY", label: "JPY (4)" },
                { key: "CROSS", label: "Croisées (6)" },
              ].map((grp) => (
                <button
                  key={grp.key}
                  onClick={() => {
                    soundFX.playPop(1);
                    setCurrencyGroup(grp.key as any);
                  }}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap",
                    currencyGroup === grp.key
                      ? "bg-[#D4FF00] text-[#07080C] font-bold shadow-[0_0_15px_rgba(212,255,0,0.3)]"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {grp.label}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="rounded-full bg-[#0A0B0F] border border-white/[0.06] p-1 inline-flex items-center gap-1 text-xs font-mono shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("matrix")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all cursor-pointer",
                  viewMode === "matrix" ? "bg-white/[0.12] text-white" : "text-slate-400 hover:text-white"
                )}
              >
                <Grid3X3 size={13} />
                <span>Matrice</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all cursor-pointer",
                  viewMode === "cards" ? "bg-white/[0.12] text-white" : "text-slate-400 hover:text-white"
                )}
              >
                <LayoutGrid size={13} />
                <span>Classement</span>
              </button>
            </div>
          </div>

          {/* Row 2: Regime Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-slate-400 mr-2 shrink-0">
              RÉGIME :
            </span>
            <button
              onClick={() => setRegimeFilter("ALL")}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap",
                regimeFilter === "ALL" ? "bg-white/[0.12] text-white font-bold" : "text-slate-400 hover:text-white"
              )}
            >
              Tous Régimes
            </button>
            <button
              onClick={() => setRegimeFilter("BULLISH")}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap",
                regimeFilter === "BULLISH" ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30" : "text-emerald-400/70 hover:text-emerald-400"
              )}
            >
              Acheteur (≥ +20%)
            </button>
            <button
              onClick={() => setRegimeFilter("BEARISH")}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap",
                regimeFilter === "BEARISH" ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30" : "text-rose-400/70 hover:text-rose-400"
              )}
            >
              Vendeur (≤ −20%)
            </button>
            <button
              onClick={() => setRegimeFilter("NEUTRAL")}
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap",
                regimeFilter === "NEUTRAL" ? "bg-white/[0.12] text-white font-bold" : "text-slate-400 hover:text-white"
              )}
            >
              Neutre
            </button>
          </div>
        </div>
      </SculptedFilterPod>
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. VIEW MODE 1: MATRIX GRID VIEW WITH ZERO RIGHT-EDGE CLIPPING    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <GhostWireframeDissolve isRefreshing={isLoading}>
      {viewMode === "matrix" && (
        <SculptedTableContainer className="overflow-hidden mb-8">
          {/* Header Info Banner */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02] gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/30 flex items-center justify-center text-[#D4FF00] shrink-0">
                <Layers size={15} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-sans font-bold text-sm text-white">
                    Matrice Composite des Biais Macro &amp; Prévisions 3 Mois ({selectedYear})
                  </span>
                  <span className="text-[10px] font-mono text-[#D4FF00] bg-[#D4FF00]/10 border border-[#D4FF00]/25 px-2 py-0.5 rounded-full font-bold">
                    28 Paires G10
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Cliquez sur les cellules historiques (Jan–Sep) pour la preuve mathématique 6 piliers. Cliquez sur les prévisions (Oct–Déc) pour ajuster les estimations.
                </span>
              </div>
            </div>

            {/* Legend with Forecast Theme */}
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <strong className="text-white">Acheteur</strong> (≥ +20%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <strong className="text-white">Neutre</strong> ([-20%, +20%])
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                <strong className="text-white">Vendeur</strong> (≤ -20%)
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                <Sparkles size={11} className="text-purple-400" />
                <strong className="text-purple-300">Prévision 3M</strong> (Éditable)
              </span>
            </div>
          </div>

          {/* Matrix Table with Impermeable Sticky Left Column & Independent Cell Box Model */}
          <div className="w-full overflow-x-auto pb-3">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[1350px]">
              <thead>
                <tr>
                  {/* Sticky Left Header */}
                  <th className="sticky left-0 z-30 bg-[#101218] pl-6 pr-4 py-4 font-mono font-semibold text-xs text-slate-400 w-[210px] min-w-[210px] max-w-[210px] border-b border-r border-white/[0.08] shadow-[4px_0_12px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-white tracking-wide">PAIRE FX</span>
                      <span className="text-[10px] font-mono font-bold text-[#D4FF00] bg-[#D4FF00]/10 border border-[#D4FF00]/25 px-1.5 py-0.5 rounded-full">
                        28 G10
                      </span>
                    </div>
                  </th>

                  {/* Monthly Headers: Historical (01-09) and 3-Month Forecast (10-12) */}
                  {displayMonths.map((m, mIdx) => {
                    const isFcst = forecastMonthsSet.has(m);
                    const isCurrentLive = m === latestSettledMonth;
                    const isLast = mIdx === displayMonths.length - 1;
                    return (
                      <th 
                        key={m} 
                        className={clsx(
                          "px-2 py-3.5 font-mono text-xs text-center min-w-[96px] whitespace-nowrap transition-colors border-b border-white/[0.08]",
                          isLast && "pr-6",
                          isFcst
                            ? "bg-purple-500/[0.04] border-x border-purple-500/15 text-purple-300"
                            : isCurrentLive 
                            ? "bg-[#D4FF00]/[0.05] text-[#D4FF00] font-bold border-x border-[#D4FF00]/20" 
                            : "bg-[#101218] text-slate-400 font-semibold border-r border-white/[0.03]"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={clsx("font-mono font-bold", isFcst ? "text-purple-300" : isCurrentLive ? "text-[#D4FF00]" : "text-slate-300")}>
                            {m}
                          </span>
                          {isFcst ? (
                            <span className="text-[8px] font-mono font-extrabold uppercase tracking-wider text-purple-300 bg-purple-500/25 border border-purple-400/40 px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.3)] flex items-center gap-0.5">
                              <Sparkles size={8} /> PRÉVISION
                            </span>
                          ) : isCurrentLive ? (
                            <span className="text-[9px] font-mono font-black uppercase tracking-wider text-[#07080C] bg-[#D4FF00] px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(212,255,0,0.5)]">
                              LIVE
                            </span>
                          ) : null}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i}>
                      <td className="sticky left-0 z-20 bg-[#101218] pl-6 pr-4 py-3.5 border-b border-r border-white/[0.08] w-[210px] min-w-[210px]">
                        <div className="w-[160px] h-[32px] bg-white/5 rounded-xl animate-pulse" />
                      </td>
                      {displayMonths.map((m, j) => (
                        <td key={j} className="p-2 border-b border-white/[0.04]">
                          <div className="w-full h-[52px] bg-white/5 rounded-[14px] animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredScores.length === 0 ? (
                  <tr>
                    <td colSpan={displayMonths.length + 1} className="py-12 text-center text-slate-400 border-b border-white/[0.04]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Filter size={24} className="text-slate-500" />
                        <span className="font-sans font-semibold text-sm text-white">Aucune paire ne correspond aux filtres</span>
                        <button 
                          onClick={() => { setCurrencyGroup("ALL"); setRegimeFilter("ALL"); setSearchQuery(""); }}
                          className="text-xs font-mono text-[#D4FF00] hover:underline mt-1"
                        >
                          Réinitialiser les filtres
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredScores.map((row: any) => (
                    <tr key={row.pair} className="hover:bg-white/[0.02] transition-colors group">
                      
                      {/* Sticky Left Data Cell */}
                      <td className="sticky left-0 z-20 bg-[#101218] group-hover:bg-[#15171f] pl-6 pr-4 py-3 border-b border-r border-white/[0.08] shadow-[4px_0_12px_rgba(0,0,0,0.6)] w-[210px] min-w-[210px] max-w-[210px] transition-colors">
                        <div className="flex items-center gap-3 w-full">
                          <FXPairFlags pair={row.pair} size="sm" />
                          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-sans font-bold text-sm text-white group-hover:text-[#D4FF00] transition-colors leading-tight">
                                {row.pair}
                              </span>
                              <span className="text-[9px] font-mono font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-full">
                                {row.group}
                              </span>
                            </div>
                            <span 
                              className="text-[11px] text-slate-400 group-hover:text-slate-300 font-sans truncate leading-tight mt-0.5" 
                              title={`${row.baseCountry} / ${row.quoteCountry}`}
                            >
                              {row.baseCountry} / {row.quoteCountry}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Month Cells: Historical & 3-Month Forecast */}
                      {row.data.map((cell: any, j: number) => {
                        const num = parseFloat(cell.finalScorePct);
                        const prevCell = j > 0 ? row.data[j - 1] : undefined;
                        const prevNum = prevCell ? parseFloat(prevCell.finalScorePct) : undefined;
                        const delta = prevNum !== undefined ? parseFloat((num - prevNum).toFixed(1)) : 0;
                        const isFcst = cell.isForecast;
                        const isUserOverride = cell.isUserOverride;
                        const isCurrentLive = cell.month === latestSettledMonth;
                        const isLast = j === row.data.length - 1;

                        return (
                          <td 
                            key={cell.month} 
                            className={clsx(
                              "px-1.5 py-2 text-center relative border-b border-white/[0.04] min-w-[96px]",
                              isLast && "pr-6",
                              isFcst 
                                ? "bg-purple-500/[0.04] border-x border-purple-500/15" 
                                : isCurrentLive 
                                ? "bg-[#D4FF00]/[0.03] border-x border-[#D4FF00]/10" 
                                : "border-r border-white/[0.02]"
                            )}
                          >
                            <motion.button 
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => {
                                if (isFcst) {
                                  handleOpenEstimation(row, cell);
                                } else {
                                  setSelectedCell({ 
                                    pair: row.pair, 
                                    base: row.base, 
                                    quote: row.quote, 
                                    baseCountry: row.baseCountry, 
                                    quoteCountry: row.quoteCountry, 
                                    data: cell 
                                  });
                                }
                              }}
                              title={
                                isFcst 
                                  ? `Ajuster l'estimation client pour ${row.pair} (${cell.month})` 
                                  : `Détail 6 indicateurs pour ${row.pair} (${cell.month})`
                              }
                              className={clsx(
                                "inline-flex flex-col items-center justify-center w-full py-1.5 px-2 min-h-[50px] rounded-[14px] transition-all duration-200 cursor-pointer border",
                                isFcst
                                  ? isUserOverride
                                    ? "bg-purple-500/25 border-purple-400/60 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                                    : "bg-purple-500/[0.08] border-purple-500/25 hover:border-purple-400/50 hover:shadow-[0_0_12px_rgba(168,85,247,0.2)] text-purple-300"
                                  : num >= 20.0
                                  ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-300 hover:border-emerald-500/50"
                                  : num <= -20.0
                                  ? "bg-rose-500/12 border-rose-500/30 text-rose-300 hover:border-rose-500/50"
                                  : "bg-white/[0.02] border-white/[0.06] text-slate-200 hover:border-white/20"
                              )}
                            >
                              {/* Percentage & Trend Arrow */}
                              <div className="flex items-center gap-1">
                                <span className={clsx(
                                  "font-mono text-xs font-bold tracking-tight", 
                                  isFcst 
                                    ? isUserOverride ? "text-purple-200 font-extrabold" : "text-purple-300"
                                    : num >= 20.0 ? "text-emerald-400" : num <= -20.0 ? "text-rose-400" : "text-slate-200"
                                )}>
                                  {num > 0 ? `+${cell.finalScorePct}%` : `${cell.finalScorePct}%`}
                                </span>

                                {/* Micro Delta Arrow */}
                                {j > 0 && Math.abs(delta) >= 1.0 && (
                                  <span className={clsx("text-[9px] font-mono", delta > 0 ? "text-[#D4FF00]" : "text-rose-400")}>
                                    {delta > 0 ? "↑" : "↓"}
                                  </span>
                                )}
                              </div>

                              {/* Macro Bias or Client Estimate Label */}
                              {isFcst ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={clsx(
                                    "font-mono text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
                                    isUserOverride 
                                      ? "bg-purple-500/35 text-purple-200 border border-purple-400/60" 
                                      : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                  )}>
                                    {isUserOverride ? (
                                      <>★ CLIENT</>
                                    ) : (
                                      <>{cell.bias} <Edit3 size={8} className="opacity-70 ml-0.5" /></>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className={clsx(
                                  "mt-0.5 font-mono text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full",
                                  num >= 20.0
                                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                    : num <= -20.0
                                    ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                    : "text-slate-400 bg-white/5 border border-white/5"
                                )}>
                                  {cell.bias === "BULLISH" ? "ACHETEUR" : cell.bias === "BEARISH" ? "VENDEUR" : "NEUTRE"}
                                </span>
                              )}
                            </motion.button>
                          </td>
                        );
                      })}

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Summary Footer Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-3.5 border-t border-white/[0.08] bg-[#0A0B0F] text-xs gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity size={14} className="text-[#D4FF00]" />
              <span>
                Affichage de <strong className="text-white">{filteredScores.length} sur 28 Combinaisons G10</strong> (9 Publiées + 3 Estimations Prévisionnelles).
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-purple-300 flex items-center gap-1 font-semibold">
                <Sparkles size={12} /> Cliquez sur Oct, Nov ou Déc pour ajuster l'estimation
              </span>
              <span className="text-[#D4FF00] font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                Moteur Synchronisé
              </span>
            </div>
          </div>
        </SculptedTableContainer>
      )}

        {/* ============================================================== */}
        {/* VIEW MODE 2: LEADERBOARD CARDS VIEW (RANKED ACROSS 28 PAIRS)  */}
        {/* ============================================================== */}
        {viewMode === "cards" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
            {filteredScores
              .sort((a, b) => {
                const aLatest = parseFloat(a.data[a.data.length - 1]?.finalScorePct || "0");
                const bLatest = parseFloat(b.data[b.data.length - 1]?.finalScorePct || "0");
                return bLatest - aLatest;
              })
              .map((row, idx) => {
                const latestCell = row.data[row.data.length - 1];
                const latestNum = parseFloat(latestCell.finalScorePct);
                const styling = getCellStyling(latestNum, latestCell.bias);

                return (
                  <motion.div
                    key={row.pair}
                    whileHover={{ y: -3 }}
                    onClick={() => setSelectedCell({ 
                      pair: row.pair, 
                      base: row.base, 
                      quote: row.quote, 
                      baseCountry: row.baseCountry, 
                      quoteCountry: row.quoteCountry, 
                      data: latestCell 
                    })}
                    className={clsx("p-4 sm:p-5 flex flex-col justify-between gap-3.5 cursor-pointer transition-all hover:border-[#D4FF00]/40", matteCard)}
                  >
                    {/* Card Top: 2 clean non-overlapping rows (Zero Collisions!) */}
                    <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
                      {/* Row 1: Left has #1 badge + Dual Circular Flags + Single-Line Ticker. Right has large score */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-bold text-white/35 shrink-0">#{idx + 1}</span>
                          <FXPairFlags pair={row.pair} size="sm" />
                          <span className="font-display font-bold text-base text-white whitespace-nowrap tracking-tight">
                            {row.pair}
                          </span>
                        </div>
                        <span className={clsx("font-mono font-bold text-lg whitespace-nowrap shrink-0", styling.numColor)}>
                          {latestNum > 0 ? `+${latestCell.finalScorePct}%` : `${latestCell.finalScorePct}%`}
                        </span>
                      </div>

                      {/* Row 2: Left has full country names. Right has compact regime pill */}
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="font-sans text-[11px] text-slate-400 truncate max-w-[170px]" title={`${row.baseCountry} / ${row.quoteCountry}`}>
                          {row.baseCountry} / {row.quoteCountry}
                        </span>
                        <span className={clsx("px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0", styling.badgeBg)}>
                          {latestCell.bias === "BULLISH" ? "ACHETEUR" : latestCell.bias === "BEARISH" ? "VENDEUR" : "NEUTRE"}
                        </span>
                      </div>
                    </div>

                    {/* Trailing 6-Month Trend Mini Sparkline */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Trajectoire Macro 6M</span>
                        <span className="text-white font-bold">{latestCell.month}</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1 h-9 items-end">
                        {row.data.slice(-6).map((mCell: any) => {
                          const mNum = parseFloat(mCell.finalScorePct);
                          const heightPct = Math.min(100, Math.max(15, (Math.abs(mNum) / 50) * 100));
                          const isFcst = mCell.isForecast;
                          return (
                            <div key={mCell.month} className="flex flex-col items-center gap-0.5">
                              <div className="w-full bg-white/5 rounded-md h-8 flex items-end p-0.5">
                                <div 
                                  style={{ height: `${heightPct}%` }}
                                  className={clsx(
                                    "w-full rounded-sm transition-all",
                                    isFcst 
                                      ? "bg-purple-400" 
                                      : mCell.bias === "BULLISH" 
                                      ? "bg-emerald-400" 
                                      : mCell.bias === "BEARISH" 
                                      ? "bg-rose-400" 
                                      : "bg-slate-400"
                                  )}
                                />
                              </div>
                              <span className="text-[8px] font-mono text-slate-500">{mCell.month.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Net Rating Summary */}
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[#A0A5B1] text-[11px]">Net Rating:</span>
                      <span className="font-mono font-bold text-white text-xs">
                        {latestCell.totalScore > 0 ? `+${latestCell.totalScore}` : latestCell.totalScore} / 60
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#D2F646] font-semibold pt-1 border-t border-white/5">
                      <span className="text-[11px]">Inspect 6-pillar breakdown</span>
                      <ArrowRight size={13} />
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </GhostWireframeDissolve>

        {/* ============================================================== */}
        {/* MODAL: CLIENT MACRO ESTIMATION & 3-MONTH SCENARIO STUDIO      */}
        {/* ============================================================== */}
        <AnimatePresence>
          {estimationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="w-full max-w-lg bg-[#121418] border border-[#A855F7]/40 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(168,85,247,0.25)] flex flex-col gap-5 overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <FlagStack base={estimationModal.base} quote={estimationModal.quote} size={28} />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="font-sans font-black text-xl text-white">
                          {estimationModal.pair} Forecast
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-[#E9D5FF] bg-[#8B5CF6]/30 border border-[#A855F7]/40 px-2 py-0.5 rounded-full">
                          {estimationModal.month}
                        </span>
                      </div>
                      <span className="text-xs text-[#A0A5B1] mt-0.5">
                        Client Estimation &amp; Scenario Simulator (3M Forecast Horizon)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setEstimationModal(null)}
                    className="p-2 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Estimation Mode Toggle */}
                <div className="flex items-center bg-[#181A20] p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setEstimationMode("quick_score")}
                    className={clsx(
                      "flex-1 py-1.5 rounded-xl font-sans text-xs font-bold transition-all text-center cursor-pointer",
                      estimationMode === "quick_score" ? "bg-[#8B5CF6] text-white shadow-md" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Score Direct (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstimationMode("pillars")}
                    className={clsx(
                      "flex-1 py-1.5 rounded-xl font-sans text-xs font-bold transition-all text-center cursor-pointer",
                      estimationMode === "pillars" ? "bg-[#8B5CF6] text-white shadow-md" : "text-slate-400 hover:text-white"
                    )}
                  >
                    6 Piliers Macro (−10 à +10)
                  </button>
                </div>

                {/* Mode 1: Direct Final Score Slider & Presets */}
                {estimationMode === "quick_score" && (
                  <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-sans text-slate-300">Votre Score Estimé Final (Client) :</span>
                      <span className={clsx(
                        "font-mono text-2xl font-black",
                        customScoreInput >= 20 ? "text-[#D4FF00]" : customScoreInput <= -20 ? "text-rose-400" : "text-white"
                      )}>
                        {customScoreInput > 0 ? `+${customScoreInput.toFixed(1)}%` : `${customScoreInput.toFixed(1)}%`}
                      </span>
                    </div>

                    {/* Interactive Range Slider */}
                    <input 
                      type="range"
                      min={-100}
                      max={100}
                      step={1}
                      value={customScoreInput}
                      onChange={(e) => setCustomScoreInput(parseFloat(e.target.value))}
                      className="w-full accent-[#8B5CF6] cursor-pointer"
                    />

                    {/* Quick Presets */}
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {[
                        { label: "+40%", val: 40, color: "text-[#D4FF00]" },
                        { label: "+20%", val: 20, color: "text-[#D4FF00]" },
                        { label: "0%", val: 0, color: "text-white" },
                        { label: "-20%", val: -20, color: "text-rose-400" },
                        { label: "-40%", val: -40, color: "text-rose-400" }
                      ].map(p => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setCustomScoreInput(p.val)}
                          className={clsx(
                            "py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer text-center",
                            customScoreInput === p.val 
                              ? "bg-[#8B5CF6]/30 border-[#A855F7] text-white" 
                              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode 2: 6 Macro Indicator Sliders */}
                {estimationMode === "pillars" && (
                  <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto no-scrollbar pr-1">
                    {INDICATORS.map(ind => {
                      const val = customRatings[ind] ?? 0;
                      const indFr: Record<string, string> = {
                        "GDP": "PIB",
                        "Current Account": "Balance Courante",
                        "CPI": "IPC (Inflation)",
                        "Interest Rate": "Taux Directeurs",
                        "FX Reserves": "Réserves FX",
                        "Equity": "Marchés Actions"
                      };
                      return (
                        <div key={ind} className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-sans font-bold text-white text-xs">{indFr[ind] || ind}</span>
                            <span className={clsx(
                              "font-mono font-bold text-xs px-2 py-0.2 rounded",
                              val > 0 ? "bg-[#D4FF00]/15 text-[#D4FF00]" : val < 0 ? "bg-rose-500/15 text-rose-400" : "bg-white/5 text-slate-400"
                            )}>
                              {val > 0 ? `+${val}` : val}
                            </span>
                          </div>
                          <input 
                            type="range"
                            min={-10}
                            max={10}
                            step={1}
                            value={val}
                            onChange={(e) => {
                              setCustomRatings({
                                ...customRatings,
                                [ind]: parseInt(e.target.value, 10)
                              });
                            }}
                            className="w-full accent-[#8B5CF6] cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Thesis / Rationale Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-sans text-slate-300">Thèse Client &amp; Scénario Anticipé (Optionnel) :</label>
                  <input
                    type="text"
                    value={customNoteInput}
                    onChange={(e) => setCustomNoteInput(e.target.value)}
                    placeholder="ex. Baisse de 25 pb anticipée, désinflation accélérée"
                    className="w-full bg-[#181A20] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-sans text-white placeholder:text-slate-500 focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                  {estimationModal.isUserOverride && (
                    <button
                      type="button"
                      onClick={handleResetEstimation}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Réinitialiser au Modèle</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setEstimationModal(null)}
                      className="px-4 py-2 rounded-xl text-xs font-sans font-semibold text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEstimation}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-sans font-bold bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-[0_0_15px_rgba(139,92,246,0.4)] cursor-pointer"
                    >
                      <Save size={14} />
                      <span>Enregistrer l'Estimation Client</span>
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* SLIDE-OVER DRAWER: DETAILED HISTORICAL SCORE DRILL-DOWN       */}
        {/* ============================================================== */}
        <AnimatePresence>
          {selectedCell && (
            <>
              {/* Dark Ambient Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 cursor-pointer" 
                onClick={() => setSelectedCell(null)}
              />

              {/* Slide-over Panel */}
              <motion.div 
                initial={{ opacity: 0, x: 360 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 360 }}
                transition={{ type: "spring", stiffness: 350, damping: 32 }}
                className="fixed top-0 right-0 h-full w-full sm:w-[540px] max-w-full bg-[#101218]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-30px_0_70px_rgba(0,0,0,0.95),inset_0_1px_0_0_rgba(255,255,255,0.08)] p-6 sm:p-8 z-50 overflow-y-auto flex flex-col gap-6 scrollbar-thin scrollbar-thumb-white/10" 
              >
                
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D4FF00] bg-[#D4FF00]/10 px-2.5 py-0.5 rounded-full border border-[#D4FF00]/30 font-bold">
                        {selectedCell.data.month}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Décomposition du Biais Macro</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <FXPairFlags pair={selectedCell.pair} size="lg" />
                      <div className="flex flex-col">
                        <h3 className="font-display font-black text-2xl text-white tracking-tight leading-none">
                          {selectedCell.pair}
                        </h3>
                        <span className="text-xs text-slate-400 mt-1 font-sans">
                          {selectedCell.baseCountry} c. {selectedCell.quoteCountry}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedCell(null)} 
                    className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
                    aria-label="Fermer les détails"
                  >
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>

                {/* Score Hero Banner */}
                <div className={clsx(
                  "p-5 rounded-2xl border flex items-center justify-between shadow-lg",
                  selectedCell.data.bias === "BULLISH" ? "bg-emerald-500/10 border-emerald-500/30" :
                  selectedCell.data.bias === "BEARISH" ? "bg-rose-500/10 border-rose-500/30" :
                  "bg-white/[0.03] border-white/10"
                )}>
                  <div className="flex flex-col">
                    <span className="font-sans text-xs text-slate-400">Régime Macro Composite</span>
                    <span className={clsx(
                      "font-display font-black text-xl tracking-tight mt-0.5",
                      selectedCell.data.bias === "BULLISH" ? "text-emerald-400" :
                      selectedCell.data.bias === "BEARISH" ? "text-rose-400" : "text-white"
                    )}>
                      {selectedCell.data.bias === "BULLISH" ? "ACHETEUR (BULLISH)" :
                       selectedCell.data.bias === "BEARISH" ? "VENDEUR (BEARISH)" : "NEUTRE"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {selectedCell.data.bias === "BULLISH" ? "Seuil ≥ +20.0% Atteint (Conviction Forte)" :
                       selectedCell.data.bias === "BEARISH" ? "Seuil ≤ −20.0% Atteint (Conviction Forte)" :
                       "Zone Neutre [-20%, +20%]"}
                    </span>
                  </div>

                  <div className={clsx(
                    "px-4 py-2 rounded-2xl font-mono font-black text-2xl sm:text-3xl border",
                    selectedCell.data.bias === "BULLISH" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" :
                    selectedCell.data.bias === "BEARISH" ? "bg-rose-500/15 border-rose-500/40 text-rose-400" :
                    "bg-white/5 border-white/10 text-white"
                  )}>
                    {parseFloat(selectedCell.data.finalScorePct) > 0 ? `+${selectedCell.data.finalScorePct}%` : `${selectedCell.data.finalScorePct}%`}
                  </div>
                </div>

                {/* 6 Macro Indicator Rating Breakdown (Horizontal Bidirectional Bars) */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-sans font-bold text-white">Contribution des 6 Piliers Macroéconomiques</span>
                    <span className="font-mono text-slate-400 text-[11px]">Échelle : −10 à +10</span>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl bg-[#0A0C10] border border-white/5 p-4 shadow-inner">
                    {selectedCell.data.indicators.map((item: any) => {
                      const val = item.val;
                      const isPositive = val > 0;
                      const isNegative = val < 0;
                      const barWidth = Math.min(100, (Math.abs(val) / 10) * 100);
                      const indicatorFr: Record<string, string> = {
                        "GDP": "PIB",
                        "Current Account": "Balance Courante",
                        "CPI": "IPC (Inflation)",
                        "Interest Rate": "Taux Directeurs",
                        "FX Reserves": "Réserves FX",
                        "Equity": "Marchés Actions"
                      };
                      const displayName = indicatorFr[item.ind] || item.ind;

                      return (
                        <div key={item.ind} className="flex flex-col gap-1 py-1.5 border-b border-white/[0.04] last:border-none">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-sans font-bold text-white flex items-center gap-1.5">
                              <span className={clsx("w-2 h-2 rounded-full", isPositive ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]" : isNegative ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.7)]" : "bg-slate-400")} />
                              {displayName}
                            </span>
                            <span className={clsx(
                              "font-mono font-bold text-xs px-2 py-0.5 rounded-md",
                              isPositive ? "bg-emerald-500/15 text-emerald-400" :
                              isNegative ? "bg-rose-500/15 text-rose-400" :
                              "bg-white/5 text-slate-400"
                            )}>
                              {val > 0 ? `+${val}` : val}
                            </span>
                          </div>

                          {/* Bidirectional Bar (Center Line 0) */}
                          <div className="w-full h-2 rounded-full bg-white/5 flex items-center relative overflow-hidden">
                            {/* Center Line Marker */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 z-10" />
                            
                            {/* Negative Left Bar */}
                            <div className="w-1/2 h-full flex justify-end">
                              {isNegative && (
                                <div 
                                  style={{ width: `${barWidth}%` }} 
                                  className="h-full bg-rose-400 rounded-l-full" 
                                />
                              )}
                            </div>

                            {/* Positive Right Bar */}
                            <div className="w-1/2 h-full flex justify-start">
                              {isPositive && (
                                <div 
                                  style={{ width: `${barWidth}%` }} 
                                  className="h-full bg-emerald-400 rounded-r-full" 
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mathematical Formula Verification */}
                <div className="p-4 rounded-2xl bg-[#0E1016] border border-[#D4FF00]/30 shadow-[0_0_20px_rgba(212,255,0,0.06)] flex flex-col gap-2 text-xs">
                  <span className="font-mono font-bold uppercase text-[#D4FF00] tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                    VÉRIFICATION DE L'ÉQUATION DE NORMALISATION
                  </span>
                  <div className="font-mono text-white font-semibold">
                    Score Final (%) = (&Sigma; Notes des 6 Piliers / 60) &times; 100
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 bg-black/50 p-2.5 rounded-xl border border-white/5">
                    ({selectedCell.data.indicators.map((i: any) => i.val > 0 ? `+${i.val}` : String(i.val)).join(" + ")}) = 
                    <strong className="text-white"> {selectedCell.data.totalScore > 0 ? `+${selectedCell.data.totalScore}` : selectedCell.data.totalScore} / 60 &times; 100 </strong> = 
                    <strong className="text-[#D4FF00]"> {parseFloat(selectedCell.data.finalScorePct) > 0 ? `+${selectedCell.data.finalScorePct}` : selectedCell.data.finalScorePct}%</strong>
                  </div>
                </div>

                {/* Audit & Compliance Note */}
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-400">
                  <CheckCircle2 size={16} className="text-[#D4FF00] shrink-0" />
                  <span>Validé selon les différentiels officiels des banques centrales et flux SDMX 3.0 du FMI.</span>
                </div>

              </motion.div>
            </>
          )}
        </AnimatePresence>
    </div>
  );
}
