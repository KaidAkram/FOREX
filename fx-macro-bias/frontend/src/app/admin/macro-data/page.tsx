"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  AlertCircle, 
  ChevronDown, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Database,
  X
} from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

import { COUNTRIES, PAIRS, INDICATORS, getMacroMatrixData, getCombinedDifferentialData, SYSTEM_CURRENT_YEAR, SYSTEM_CURRENT_MONTH, MACRO_YEARS } from "@/data/macroDataset";

const TABS = ["Macro Data Matrix", "Differential & Rating"];
const YEARS = MACRO_YEARS;

// Translucent Glass Cards with Specular Highlight and Basil borders
const matteCard = "bg-[#032221]/90 backdrop-blur-2xl border border-[#0B453A] rounded-[24px] shadow-[0_16px_40px_rgba(2,27,26,0.6),inset_0_1px_0_0_rgba(241,247,246,0.06)]";

const FlagStack = ({ base, quote }: { base: string; quote: string }) => (
  <div className="flex items-center flex-shrink-0">
    <img src={`/flags/${base}.svg`} className="w-[18px] h-[18px] rounded-full border border-[#0B453A] z-10 shadow-sm" alt={base} />
    <img src={`/flags/${quote}.svg`} className="w-[18px] h-[18px] rounded-full border border-[#0B453A] -ml-[6px] z-0 shadow-sm" alt={quote} />
  </div>
);

export default function MacroDataPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [activeInd, setActiveInd] = useState(INDICATORS[0]);
  const [activePair, setActivePair] = useState(PAIRS[0].name);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Published manual override state
  const [selectedCell, setSelectedCell] = useState<{ c: string; m: string; val: string } | null>(null);
  const [overrideInputVal, setOverrideInputVal] = useState<string>("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Upcoming User Assumptions state
  const [assumptions, setAssumptions] = useState<Record<string, string>>({});
  const [selectedAssumptionCell, setSelectedAssumptionCell] = useState<{ c: string; m: string; val: string } | null>(null);
  const [assumptionInputVal, setAssumptionInputVal] = useState<string>("");

  // Load assumptions from localStorage on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("shiftfx_macro_user_assumptions");
        if (stored) {
          setAssumptions(JSON.parse(stored));
        } else {
          // Default demonstration assumptions for 2026-10
          const defaultAssumptions: Record<string, string> = {
            "GDP_USA_2026-10": "2.2",
            "GDP_Euro Area_2026-10": "1.1",
            "GDP_Japan_2026-10": "0.8",
            "GDP_United Kingdom_2026-10": "1.4",
            "GDP_Australia_2026-10": "1.8",
          };
          setAssumptions(defaultAssumptions);
          localStorage.setItem("shiftfx_macro_user_assumptions", JSON.stringify(defaultAssumptions));
        }
      } catch (err) {
        console.error("Failed to load user assumptions", err);
      }
    }
  }, []);

  // Dropdown Open States (Click-controlled)
  const [isOpenPairDropdown, setIsOpenPairDropdown] = useState(false);
  const [isOpenIndDropdown, setIsOpenIndDropdown] = useState(false);
  const [isOpenYearDropdown, setIsOpenYearDropdown] = useState(false);

  // Refs for click outside
  const pairRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pairRef.current && !pairRef.current.contains(e.target as Node)) {
        setIsOpenPairDropdown(false);
      }
      if (indRef.current && !indRef.current.contains(e.target as Node)) {
        setIsOpenIndDropdown(false);
      }
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setIsOpenYearDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCurrentLiveYear = selectedYear === SYSTEM_CURRENT_YEAR;

  const publishedMonths = Array.from({ 
    length: isCurrentLiveYear ? SYSTEM_CURRENT_MONTH : 12 
  }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, "0")}`);

  const upcomingMonths = isCurrentLiveYear ? [
    `${SYSTEM_CURRENT_YEAR}-10`,
    `${SYSTEM_CURRENT_YEAR}-11`,
    `${SYSTEM_CURRENT_YEAR}-12`
  ] : [];

  const displayMonths = [...publishedMonths, ...upcomingMonths];

  // Fetch Matrix Data with published + upcoming user assumption columns
  const fetchMatrixData = async (indicator: string, year: number) => {
    await new Promise(r => setTimeout(r, 100));
    const baseRows = getMacroMatrixData(indicator, year);

    return baseRows.map(row => {
      const publishedCells = row.data.map((cell, idx) => {
        const monthKey = `${year}-${(idx + 1).toString().padStart(2, "0")}`;
        const overrideKey = `${indicator}_${row.country}_${monthKey}`;
        if (overrides[overrideKey] !== undefined) {
          return {
            value: overrides[overrideKey],
            status: "manual" as const,
            isAssumption: false
          };
        }
        return {
          ...cell,
          isAssumption: false
        };
      });

      const upcomingCells = isCurrentLiveYear ? upcomingMonths.map(m => {
        const assumptionKey = `${indicator}_${row.country}_${m}`;
        const val = assumptions[assumptionKey];
        return {
          value: val !== undefined ? val : "",
          status: "assumption" as const,
          isAssumption: true,
          isFilled: Boolean(val)
        };
      }) : [];

      return {
        ...row,
        data: [...publishedCells, ...upcomingCells]
      };
    });
  };

  // Fetch Combined Differential Data including forward assumptions
  const fetchCombinedData = async (pair: string, indicator: string, year: number) => {
    await new Promise(r => setTimeout(r, 100));
    const baseReleases = getCombinedDifferentialData(pair, indicator, year);
    const pairObj = PAIRS.find(p => p.name === pair) || PAIRS[0];

    const upcomingReleases = upcomingMonths.map(m => {
      const baseKey = `${indicator}_${pairObj.baseCountry}_${m}`;
      const quoteKey = `${indicator}_${pairObj.quoteCountry}_${m}`;
      const baseAssump = assumptions[baseKey];
      const quoteAssump = assumptions[quoteKey];

      if (baseAssump || quoteAssump) {
        const bNum = baseAssump ? parseFloat(baseAssump) : 0;
        const qNum = quoteAssump ? parseFloat(quoteAssump) : 0;
        const diffNum = parseFloat((bNum - qNum).toFixed(1));

        let rating = 0;
        let rule = "-1.0 to 1.0";
        let regime = "Neutral / Balanced";
        if (diffNum >= 2.0) { rating = 10; rule = "≥ +2.0"; regime = "Strong Bullish Bias"; }
        else if (diffNum >= 1.0) { rating = 5; rule = "+1.0 to +2.0"; regime = "Moderate Bullish Bias"; }
        else if (diffNum <= -2.0) { rating = -10; rule = "≤ -2.0"; regime = "Strong Bearish Bias"; }
        else if (diffNum <= -1.0) { rating = -5; rule = "-2.0 to -1.0"; regime = "Moderate Bearish Bias"; }

        return {
          month: m,
          baseVal: baseAssump ? `${bNum}` : "—",
          quoteVal: quoteAssump ? `${qNum}` : "—",
          diffNum,
          diff: (diffNum > 0 ? "+" : "") + diffNum,
          rule: `${rule} (Est)`,
          regime,
          rating,
          isAssumption: true
        };
      }

      return {
        month: m,
        baseVal: "—",
        quoteVal: "—",
        diffNum: 0,
        diff: "—",
        rule: "Forward Projection",
        regime: "Awaiting Assumptions",
        rating: 0,
        isAssumption: true
      };
    });

    return [...baseReleases, ...upcomingReleases];
  };

  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: ["macro-matrix", activeInd, selectedYear, overrides, assumptions],
    queryFn: () => fetchMatrixData(activeInd, selectedYear),
    enabled: activeTab === "Macro Data Matrix"
  });

  const { data: combinedData, isLoading: combinedLoading } = useQuery({
    queryKey: ["macro-combined", activePair, activeInd, selectedYear, assumptions],
    queryFn: () => fetchCombinedData(activePair, activeInd, selectedYear),
    enabled: activeTab === "Differential & Rating"
  });

  // Save published manual override
  const saveOverrideMutation = useMutation({
    mutationFn: async (payload: { country: string; month: string; value: string }) => {
      await new Promise(r => setTimeout(r, 200));
      setOverrides(prev => ({
        ...prev,
        [`${activeInd}_${payload.country}_${payload.month}`]: payload.value
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["macro-matrix", activeInd, selectedYear] });
      setSelectedCell(null);
    }
  });

  // Save user forward assumption
  const handleSaveAssumption = () => {
    if (!selectedAssumptionCell) return;
    const key = `${activeInd}_${selectedAssumptionCell.c}_${selectedAssumptionCell.m}`;
    const cleanVal = assumptionInputVal.trim();
    const updated = { ...assumptions, [key]: cleanVal };
    setAssumptions(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("shiftfx_macro_user_assumptions", JSON.stringify(updated));
    }
    queryClient.invalidateQueries({ queryKey: ["macro-matrix"] });
    queryClient.invalidateQueries({ queryKey: ["macro-combined"] });
    setSelectedAssumptionCell(null);
  };

  // Clear user forward assumption
  const handleClearAssumption = () => {
    if (!selectedAssumptionCell) return;
    const key = `${activeInd}_${selectedAssumptionCell.c}_${selectedAssumptionCell.m}`;
    const updated = { ...assumptions };
    delete updated[key];
    setAssumptions(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("shiftfx_macro_user_assumptions", JSON.stringify(updated));
    }
    queryClient.invalidateQueries({ queryKey: ["macro-matrix"] });
    queryClient.invalidateQueries({ queryKey: ["macro-combined"] });
    setSelectedAssumptionCell(null);
  };

  const activePairObj = PAIRS.find(p => p.name === activePair) || PAIRS[0];

  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-transparent relative justify-between">
      
      {/* 1. Header */}
      <header className="w-full flex items-center justify-between px-12 pt-9 pb-5 opacity-0 animate-fadeIn flex-shrink-0">
        <div className="flex flex-col gap-1">
          <span className="font-sans font-medium text-xs text-[#AACBC4]">Engine Data Pipeline</span>
          <h1 className="font-sans font-bold text-3xl text-[#F1F7F6] tracking-tight">
            Macro Data Center
          </h1>
        </div>
        
        <div className="flex items-center gap-3.5">
          <GlobalSearch placeholder="Search indicators, pairs, countries..." />
          <AuthHeaderWidget />
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 flex flex-col px-12 gap-5 pb-8 max-w-[1600px] w-full mx-auto justify-between">
        
        {/* Controls Toolbar */}
        <div className="relative z-50 flex items-center justify-between gap-3 opacity-0 animate-slideUp">
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#06302B]/90 p-1 rounded-2xl border border-[#0B453A] shadow-lg">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setIsOpenPairDropdown(false);
                    setIsOpenIndDropdown(false);
                  }}
                  className={clsx(
                    "relative px-4 py-1.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 z-10 cursor-pointer",
                    activeTab === tab ? "text-[#021B1A]" : "text-[#AACBC4] hover:text-[#F1F7F6]"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeMacroDataTab"
                      className="absolute inset-0 bg-[#00DF81] rounded-xl z-[-1] shadow-[0_0_14px_rgba(0,223,129,0.35)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Indicator Pills for Matrix View */}
            {activeTab === "Macro Data Matrix" ? (
              <div className="flex items-center bg-[#06302B]/90 backdrop-blur-xl border border-[#0B453A] p-1 rounded-2xl shadow-lg">
                {INDICATORS.map(ind => (
                  <button 
                    key={ind} 
                    onClick={() => setActiveInd(ind)} 
                    className={clsx(
                      "px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 cursor-pointer", 
                      activeInd === ind 
                        ? "bg-[#00DF81]/20 text-[#00DF81] border border-[#00DF81]/40 shadow-sm" 
                        : "text-[#AACBC4] hover:text-[#F1F7F6] hover:bg-[#095544]/50"
                    )}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            ) : (
              /* Clickable Dropdowns for Differential View */
              <div className="flex items-center gap-2">
                
                {/* 1. Pair Selector Dropdown */}
                <div className="relative" ref={pairRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpenPairDropdown(!isOpenPairDropdown);
                      setIsOpenIndDropdown(false);
                      setIsOpenYearDropdown(false);
                    }}
                    className="flex items-center gap-2.5 bg-[#06302B]/90 hover:bg-[#095544] border border-[#0B453A] hover:border-[#03624C] rounded-2xl px-3.5 py-1.5 shadow-lg transition-all cursor-pointer min-w-[160px] text-left outline-none"
                  >
                    <FlagStack base={activePairObj.base} quote={activePairObj.quote} />
                    <span className="font-sans font-bold text-xs text-[#F1F7F6]">{activePair}</span>
                    <ChevronDown size={14} className={clsx("text-[#AACBC4] transition-transform ml-auto", isOpenPairDropdown && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isOpenPairDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+8px)] left-0 w-[210px] bg-[#032221]/95 backdrop-blur-3xl border border-[#0B453A] rounded-2xl shadow-[0_20px_50px_rgba(2,27,26,0.9)] z-[100] p-1.5 flex flex-col gap-1"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-mono text-[#AACBC4] uppercase tracking-wider">
                          Select Currency Pair
                        </div>
                        {PAIRS.map(p => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setActivePair(p.name);
                              setIsOpenPairDropdown(false);
                            }}
                            className={clsx(
                              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all text-left cursor-pointer",
                              activePair === p.name ? "bg-[#00DF81]/15 text-[#00DF81]" : "hover:bg-[#06302B] text-[#AACBC4] hover:text-[#F1F7F6]"
                            )}
                          >
                            <FlagStack base={p.base} quote={p.quote} />
                            <span className="font-sans font-bold text-xs">{p.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Indicator Selector Dropdown */}
                <div className="relative" ref={indRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpenIndDropdown(!isOpenIndDropdown);
                      setIsOpenPairDropdown(false);
                      setIsOpenYearDropdown(false);
                    }}
                    className="flex items-center gap-2 bg-[#06302B]/90 hover:bg-[#095544] border border-[#0B453A] hover:border-[#03624C] rounded-2xl px-3.5 py-1.5 shadow-lg transition-all cursor-pointer min-w-[140px] text-left outline-none"
                  >
                    <span className="font-sans font-bold text-xs text-[#F1F7F6]">{activeInd}</span>
                    <ChevronDown size={14} className={clsx("text-[#AACBC4] transition-transform ml-auto", isOpenIndDropdown && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isOpenIndDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+8px)] left-0 w-[170px] bg-[#032221]/95 backdrop-blur-3xl border border-[#0B453A] rounded-2xl shadow-[0_20px_50px_rgba(2,27,26,0.9)] z-[100] p-1.5 flex flex-col gap-1"
                      >
                        <div className="px-2 py-1 text-[10px] font-mono text-[#AACBC4] uppercase tracking-wider">
                          Indicator
                        </div>
                        {INDICATORS.map(ind => (
                          <button
                            key={ind}
                            type="button"
                            onClick={() => {
                              setActiveInd(ind);
                              setIsOpenIndDropdown(false);
                            }}
                            className={clsx(
                              "w-full px-3 py-2 text-left font-sans font-bold text-xs transition-colors rounded-xl cursor-pointer",
                              activeInd === ind ? "bg-[#00DF81]/15 text-[#00DF81]" : "text-[#AACBC4] hover:bg-[#06302B] hover:text-[#F1F7F6]"
                            )}
                          >
                            {ind}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}
          </div>

          {/* Right Toolbar: Year Selector & Status Badge */}
          <div className="flex items-center gap-2.5">
            {/* Year Dropdown */}
            <div className="relative" ref={yearRef}>
              <button
                type="button"
                onClick={() => {
                  setIsOpenYearDropdown(!isOpenYearDropdown);
                  setIsOpenPairDropdown(false);
                  setIsOpenIndDropdown(false);
                }}
                className="flex items-center gap-2 bg-[#06302B]/90 hover:bg-[#095544] border border-[#0B453A] hover:border-[#03624C] rounded-2xl px-3.5 py-1.5 shadow-lg transition-all cursor-pointer text-left outline-none"
              >
                <Calendar size={13} className="text-[#AACBC4]" />
                <span className="font-sans font-bold text-xs text-[#F1F7F6]">{selectedYear}</span>
                <ChevronDown size={14} className={clsx("text-[#AACBC4] transition-transform", isOpenYearDropdown && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isOpenYearDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[calc(100%+8px)] right-0 w-[120px] bg-[#032221]/95 backdrop-blur-3xl border border-[#0B453A] rounded-2xl shadow-[0_20px_50px_rgba(2,27,26,0.9)] z-[100] p-1.5 flex flex-col gap-1"
                  >
                    <div className="px-2 py-1 text-[10px] font-mono text-[#AACBC4] uppercase tracking-wider">
                      Year
                    </div>
                    {YEARS.map(year => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setSelectedYear(year);
                          setIsOpenYearDropdown(false);
                        }}
                        className={clsx(
                          "w-full px-3 py-1.5 text-left font-sans font-bold text-xs transition-colors rounded-xl cursor-pointer",
                          selectedYear === year ? "bg-[#00DF81]/15 text-[#00DF81]" : "text-[#AACBC4] hover:bg-[#06302B] hover:text-[#F1F7F6]"
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 bg-[#06302B]/90 backdrop-blur-xl border border-[#0B453A] rounded-2xl px-3.5 py-1.5 shadow-lg">
               <CheckCircle2 size={15} className="text-[#00DF81]" />
               <span className="font-sans font-medium text-xs text-[#AACBC4]">Status: <span className="text-[#F1F7F6] font-bold">Data Complete</span></span>
            </div>
          </div>
        </div>

        {/* 3. Table Card */}
        <div className="flex-1 flex flex-col justify-center my-auto w-full py-2">
          <div className={clsx("flex flex-col relative z-0 overflow-hidden opacity-0 animate-slideUp shadow-2xl", matteCard)} style={{ animationDelay: "0.15s" }}>
            
            {/* ============================================================== */}
            {/* TAB 1: MACRO DATA MATRIX (All Sovereign Economies)            */}
            {/* ============================================================== */}
            {activeTab === "Macro Data Matrix" && (
              <div className="flex flex-col w-full">
                
                {/* Header Info Banner */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[#0B453A] bg-[#021B1A]/40 flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Database size={17} className="text-[#00DF81]" />
                    <span className="font-sans font-bold text-sm text-[#F1F7F6]">
                      G10 Currency Sovereign Matrix: {activeInd} {activeInd === "FX Reserves" ? "(USD Millions)" : activeInd === "Interest Rate" ? "(% Policy Rate)" : activeInd === "CPI" ? "(% YoY Inflation)" : "(% Growth / Spread)"} ({selectedYear})
                    </span>
                  </div>
                  
                  {/* Visual Legend */}
                  <div className="flex items-center gap-4 text-xs font-mono text-[#AACBC4]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00DF81]" />
                      Published (Official)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#AACBC4]" />
                      Manual Override
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5555]" />
                      Missing Print
                    </span>
                    {isCurrentLiveYear ? (
                      <span className="flex items-center gap-1.5 text-[#2CC295] font-bold bg-[#2CC295]/15 border border-[#2CC295]/30 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(44,194,149,0.2)]">
                        <Sparkles size={13} className="text-[#2CC295] animate-pulse" />
                        User Assumption (Forward Dates: 2026-10 to 2026-12)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[#00DF81] font-bold bg-[#00DF81]/10 border border-[#00DF81]/20 px-3 py-1 rounded-full">
                        <CheckCircle2 size={13} className="text-[#00DF81]" />
                        Historical Cycle Settled (12/12 Months Published)
                      </span>
                    )}
                  </div>
                </div>

                {/* Matrix Table with All Sovereign Economies */}
                <div className="overflow-x-auto overflow-y-auto max-h-[660px] w-full p-4">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#032221] z-20 shadow-md">
                      <tr className="border-b border-[#0B453A] bg-[#032221]">
                        <th className="px-4 py-3 font-sans font-semibold text-sm text-[#AACBC4] w-[200px] border-r border-[#0B453A] bg-[#032221]">
                          Country / Sovereign
                        </th>
                        {displayMonths.map((m, j) => {
                          const isUpcoming = isCurrentLiveYear && j >= 9;
                          return (
                            <th 
                              key={m} 
                              className={clsx(
                                "px-3 py-2.5 text-center min-w-[95px] transition-colors",
                                isUpcoming ? 
                                  "bg-[#06302B]/80 border-b-2 border-[#2CC295]/60" : 
                                  "font-sans font-semibold text-sm text-[#AACBC4] bg-[#032221]",
                                isUpcoming && j === 9 && "border-l-2 border-dashed border-[#2CC295]/50"
                              )}
                            >
                              {isUpcoming ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-black text-[#2CC295] bg-[#2CC295]/20 border border-[#2CC295]/40 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                    <Sparkles size={9} className="text-[#00DF81]" /> Assumption
                                  </span>
                                  <span className="font-mono font-bold text-sm text-[#2CC295] tracking-tight">{m}</span>
                                </div>
                              ) : (
                                <span>{m}</span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0B453A]/40">
                      {matrixLoading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 border-r border-[#0B453A]"><div className="w-[130px] h-[24px] bg-[#06302B] rounded-md animate-pulse" /></td>
                            {displayMonths.map((m, j) => (
                              <td key={j} className={clsx("p-2", isCurrentLiveYear && j >= 9 && "bg-[#06302B]/30", isCurrentLiveYear && j === 9 && "border-l-2 border-dashed border-[#2CC295]/30")}>
                                <div className="w-[80px] h-[36px] bg-[#06302B] rounded-xl animate-pulse mx-auto" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        matrixData?.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-[#06302B]/30 transition-colors">
                            <td className="px-4 py-3 border-r border-[#0B453A]">
                              <div className="flex items-center gap-3 p-0.5 whitespace-nowrap">
                                <img src={`/flags/${row.base}.svg`} className="w-6 h-6 rounded-full border border-[#0B453A] shadow-sm flex-shrink-0" alt={row.base} />
                                <span className="font-sans font-bold text-sm text-[#F1F7F6]">{row.country}</span>
                              </div>
                            </td>
                            {row.data.map((cell: any, j: number) => {
                              const isUpcoming = cell.isAssumption === true;

                              if (isUpcoming) {
                                return (
                                  <td 
                                    key={j} 
                                    className={clsx(
                                      "px-2 py-2 text-center relative group/cell bg-[#06302B]/20 hover:bg-[#06302B]/50 transition-colors",
                                      j === 9 && "border-l-2 border-dashed border-[#2CC295]/40"
                                    )}
                                  >
                                    <button
                                      onClick={() => {
                                        setSelectedAssumptionCell({ c: row.country, m: displayMonths[j], val: cell.value || "" });
                                        setAssumptionInputVal(cell.value || "");
                                      }}
                                      title={`Click to fill assumption for ${row.country} (${displayMonths[j]})`}
                                      className={clsx(
                                        "inline-flex flex-col items-center justify-center w-[88px] py-1.5 px-1.5 rounded-xl transition-all duration-150 cursor-pointer hover:scale-[1.04]",
                                        cell.value ? 
                                          "bg-[#06302B] hover:bg-[#095544] border border-[#2CC295]/50 shadow-[0_0_12px_rgba(44,194,149,0.2)]" : 
                                          "border border-dashed border-[#2CC295]/35 hover:border-[#2CC295]/70 bg-transparent hover:bg-[#06302B]/40"
                                      )}
                                    >
                                      <span className={clsx(
                                        "font-mono text-sm font-black transition-transform",
                                        cell.value ? "text-[#2CC295]" : "text-[#2CC295]/70 italic font-medium"
                                      )}>
                                        {cell.value ? `${cell.value}${activeInd === "FX Reserves" ? "" : "%"}` : "+ Set"}
                                      </span>
                                      <div className="mt-0.5">
                                        {cell.value ? (
                                          <span className="inline-flex items-center gap-0.5 bg-[#2CC295]/20 text-[#2CC295] border border-[#2CC295]/40 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase shadow-sm">
                                            <Sparkles size={8} /> Est
                                          </span>
                                        ) : (
                                          <span className="bg-[#2CC295]/10 text-[#2CC295]/80 border border-[#2CC295]/25 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase group-hover:bg-[#2CC295]/20 group-hover:text-[#F1F7F6]">
                                            Assume
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  </td>
                                );
                              }

                              // Published Official Data Columns
                              return (
                                <td key={j} className="px-2 py-2 text-center relative group/cell">
                                  <button 
                                    onClick={() => {
                                      setSelectedCell({ c: row.country, m: displayMonths[j], val: cell.value || "N/A" });
                                      setOverrideInputVal(cell.value || "");
                                    }}
                                    className="inline-flex flex-col items-center justify-center w-[88px] py-1.5 px-1.5 rounded-xl transition-all duration-150 hover:bg-[#06302B] hover:scale-[1.03] cursor-pointer group-hover/cell:border-[#0B453A] border border-transparent"
                                  >
                                    <span className={clsx(
                                      "font-mono text-sm font-bold transition-transform",
                                      cell.status === "missing" ? "text-[#FF5555]" : "text-[#F1F7F6]"
                                    )}>
                                      {cell.value || "—"}
                                    </span>
                                    <div className="mt-0.5">
                                      {cell.status === "published" && <span className="bg-[#00DF81]/15 text-[#00DF81] border border-[#00DF81]/30 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">Pub</span>}
                                      {cell.status === "manual" && <span className="bg-[#AACBC4]/15 text-[#AACBC4] border border-[#0B453A] px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">Man</span>}
                                      {cell.status === "missing" && <span className="bg-[#FF5555]/15 text-[#FF5555] border border-[#FF5555]/30 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">Mis</span>}
                                    </div>
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Summary Bar */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#0B453A] bg-[#021B1A]/80 text-sm flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="font-sans text-[#AACBC4]">
                      Showing all <strong className="text-[#F1F7F6] font-mono">{matrixData?.length || 10}</strong> sovereign economies • Unified macro view
                    </span>
                    <span className="hidden sm:inline-block h-3.5 w-px bg-[#0B453A]" />
                    <span className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-[#00DF81] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#00DF81] animate-pulse" />
                      {isCurrentLiveYear ? "9 Published Prints • 3 Forward Assumption Slots Active (Q4 2026)" : "12/12 Historical Releases Published • Cycle Settled"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs text-[#AACBC4]">
                    <span>Sovereign Universe: <strong className="text-[#F1F7F6] font-bold">G10 Core Economies</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: COMBINED DIFFERENTIAL & RATING (All Observations)       */}
            {/* ============================================================== */}
            {activeTab === "Differential & Rating" && (
              <div className="flex flex-col w-full">
                
                {/* Header Info Banner */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[#0B453A] bg-[#021B1A]/40 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <FlagStack base={activePairObj.base} quote={activePairObj.quote} />
                    <span className="font-sans font-bold text-sm text-[#F1F7F6]">
                      Differential Transformation: {activePair} • {activeInd} ({selectedYear})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-sm text-[#AACBC4]">
                    <span>Formula: </span>
                    <span className="text-[#00DF81] font-bold">
                      {activeInd === "FX Reserves" ? `Diff = ${activePairObj.baseName} (USD M) − ${activePairObj.quoteName} (USD M)` : `Diff = ${activePairObj.baseName} (%) − ${activePairObj.quoteName} (%)`}
                    </span>
                  </div>
                </div>

                {/* Table with Monthly Releases & Forward Assumptions */}
                <div className="overflow-x-auto overflow-y-auto max-h-[660px] w-full p-4">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#032221] z-20 shadow-md">
                      <tr className="border-b border-[#0B453A] text-xs font-mono font-bold uppercase tracking-wider text-[#AACBC4] bg-[#032221]">
                        <th className="py-3.5 px-4 w-[160px] bg-[#032221]">Release Month</th>
                        <th className="py-3.5 px-4 text-center w-[170px] bg-[#032221]">Base ({activePairObj.baseName})</th>
                        <th className="py-3.5 px-4 text-center w-[170px] bg-[#032221]">Quote ({activePairObj.quoteName})</th>
                        <th className="py-3.5 px-4 text-center w-[190px] bg-[#032221]">Calculated Differential</th>
                        <th className="py-3.5 px-4 text-center w-[190px] bg-[#032221]">Rule Threshold</th>
                        <th className="py-3.5 px-4 text-center w-[230px] bg-[#032221]">Engine Sentiment Regime</th>
                        <th className="py-3.5 px-4 text-right w-[140px] bg-[#032221]">Rating Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0B453A]/40">
                      {combinedLoading ? (
                        Array.from({ length: 12 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={7} className="p-3"><div className="w-full h-[32px] bg-[#06302B] rounded-md animate-pulse" /></td>
                          </tr>
                        ))
                      ) : (
                        combinedData?.map((row: any, i: number) => {
                          const isPositive = row.rating > 0;
                          const isNegative = row.rating < 0;
                          const isAssumptionRow = Boolean(row.isAssumption);

                          return (
                            <tr 
                              key={i} 
                              className={clsx(
                                "transition-colors",
                                isAssumptionRow ? "bg-[#06302B]/20 hover:bg-[#06302B]/40" : "hover:bg-[#06302B]/30"
                              )}
                            >
                              {/* Month */}
                              <td className="py-3.5 px-4">
                                <span className={clsx(
                                  "font-mono font-bold text-sm px-3 py-1 rounded-lg inline-flex items-center gap-1.5",
                                  isAssumptionRow ? 
                                    "text-[#2CC295] bg-[#2CC295]/15 border border-[#2CC295]/35" : 
                                    "text-[#F1F7F6] bg-[#06302B] border border-[#0B453A]"
                                )}>
                                  {isAssumptionRow && <Sparkles size={11} className="text-[#00DF81]" />}
                                  {row.month}
                                  {isAssumptionRow && <span className="text-[9px] uppercase font-bold text-[#2CC295]">Est</span>}
                                </span>
                              </td>

                              {/* Base */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex items-center gap-2 font-mono text-sm text-[#AACBC4]">
                                  <img src={`/flags/${activePairObj.base}.svg`} className="w-5 h-5 rounded-full border border-[#0B453A]" alt={activePairObj.base} />
                                  <span className={clsx("font-bold", isAssumptionRow ? "text-[#2CC295]" : "text-[#F1F7F6]")}>
                                    {row.baseVal}{row.baseVal !== "—" && activeInd !== "FX Reserves" ? "%" : row.baseVal !== "—" ? "M" : ""}
                                  </span>
                                </div>
                              </td>

                              {/* Quote */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex items-center gap-2 font-mono text-sm text-[#AACBC4]">
                                  <img src={`/flags/${activePairObj.quote}.svg`} className="w-5 h-5 rounded-full border border-[#0B453A]" alt={activePairObj.quote} />
                                  <span className={clsx("font-bold", isAssumptionRow ? "text-[#2CC295]" : "text-[#F1F7F6]")}>
                                    {row.quoteVal}{row.quoteVal !== "—" && activeInd !== "FX Reserves" ? "%" : row.quoteVal !== "—" ? "M" : ""}
                                  </span>
                                </div>
                              </td>

                              {/* Differential */}
                              <td className="py-3.5 px-4 text-center">
                                <span className={clsx(
                                  "inline-block font-mono font-extrabold text-sm px-3.5 py-1 rounded-xl",
                                  isAssumptionRow ? "text-[#2CC295] bg-[#2CC295]/15 border border-[#2CC295]/30" :
                                  row.diffNum > 0 ? "text-[#00DF81] bg-[#00DF81]/10 border border-[#00DF81]/25" :
                                  row.diffNum < 0 ? "text-[#FF5555] bg-[#FF5555]/10 border border-[#FF5555]/25" :
                                  "text-[#F1F7F6] bg-[#06302B] border border-[#0B453A]"
                                )}>
                                  {row.diff}{row.diff !== "—" && activeInd !== "FX Reserves" ? "%" : row.diff !== "—" ? "M" : ""}
                                </span>
                              </td>

                              {/* Rule Applied */}
                              <td className="py-3.5 px-4 text-center">
                                <span className="font-mono text-xs text-[#AACBC4] bg-[#06302B]/60 border border-[#0B453A] px-3 py-1 rounded-lg">
                                  {row.rule}
                                </span>
                              </td>

                              {/* Engine Sentiment Regime */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-semibold">
                                  {isAssumptionRow ? (
                                    <span className="flex items-center gap-1.5 text-[#2CC295] bg-[#2CC295]/15 border border-[#2CC295]/30 px-3.5 py-1 rounded-full">
                                      <Sparkles size={13} className="text-[#00DF81]" />
                                      <span>{row.regime}</span>
                                    </span>
                                  ) : isPositive ? (
                                    <span className="flex items-center gap-1.5 text-[#00DF81] bg-[#00DF81]/10 border border-[#00DF81]/25 px-3.5 py-1 rounded-full">
                                      <TrendingUp size={14} />
                                      <span>{row.regime}</span>
                                    </span>
                                  ) : isNegative ? (
                                    <span className="flex items-center gap-1.5 text-[#FF5555] bg-[#FF5555]/10 border border-[#FF5555]/25 px-3.5 py-1 rounded-full">
                                      <TrendingDown size={14} />
                                      <span>{row.regime}</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-[#AACBC4] bg-[#06302B] border border-[#0B453A] px-3.5 py-1 rounded-full">
                                      <Minus size={14} />
                                      <span>{row.regime}</span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Rating Score Impact */}
                              <td className="py-3.5 px-4 text-right">
                                <span className={clsx(
                                  "inline-block px-3.5 py-1 rounded-xl font-mono font-black text-sm shadow-sm",
                                  isAssumptionRow ? "bg-[#2CC295]/20 text-[#2CC295] border border-[#2CC295]/40" :
                                  isPositive ? "bg-[#00DF81]/15 text-[#00DF81] border border-[#00DF81]/30 shadow-[0_0_10px_rgba(0,223,129,0.15)]" :
                                  isNegative ? "bg-[#FF5555]/15 text-[#FF5555] border border-[#FF5555]/30" :
                                  "bg-[#06302B] text-[#AACBC4] border border-[#0B453A]"
                                )}>
                                  {isPositive ? `+${row.rating}` : row.rating}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Summary Bar */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#0B453A] bg-[#021B1A]/80 text-sm flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="font-sans text-[#AACBC4]">
                      Showing all <strong className="text-[#F1F7F6] font-mono">{combinedData?.length || 0}</strong> observations ({activePair}) • Full annual cycle
                    </span>
                    <span className="hidden sm:inline-block h-3.5 w-px bg-[#0B453A]" />
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="text-[#AACBC4]">Net Rating:</span>
                      <span className="text-[#00DF81] font-bold bg-[#00DF81]/10 border border-[#00DF81]/20 px-3 py-1 rounded-lg">
                        {combinedData ? combinedData.reduce((acc: number, r: any) => acc + r.rating, 0) : 0} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs text-[#AACBC4]">
                    <span>Pair Engine: <strong className="text-[#F1F7F6] font-bold">{activePair}</strong></span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ============================================================== */}
        {/* DRAWER 1: USER FORWARD ASSUMPTION DRAWER                       */}
        {/* ============================================================== */}
        {selectedAssumptionCell && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            className="fixed bottom-6 right-8 w-[380px] bg-[#032221]/95 backdrop-blur-3xl border border-[#2CC295]/40 rounded-3xl shadow-[0_25px_60px_rgba(2,27,26,0.95),0_0_30px_rgba(44,194,149,0.18)] p-6 z-50 animate-slideUp"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2CC295]/15 border border-[#2CC295]/35 flex items-center justify-center">
                  <Sparkles size={16} className="text-[#00DF81]" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm text-[#F1F7F6]">Forward Date Assumption</h3>
                  <span className="text-[10px] font-mono text-[#2CC295] font-semibold">User Projection Model</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAssumptionCell(null)}
                className="w-7 h-7 rounded-xl bg-[#06302B] border border-[#0B453A] flex items-center justify-center hover:bg-[#095544] transition-colors cursor-pointer text-[#AACBC4] hover:text-[#F1F7F6]"
              >
                <X size={15} />
              </button>
            </div>

            {/* Context Card */}
            <div className="bg-[#021B1A] border border-[#0B453A] rounded-2xl p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img 
                  src={`/flags/${COUNTRIES.find(c => c.country === selectedAssumptionCell.c)?.base}.svg`} 
                  className="w-6 h-6 rounded-full border border-[#0B453A]" 
                  alt={selectedAssumptionCell.c} 
                />
                <div>
                  <div className="font-sans font-bold text-xs text-[#F1F7F6]">{selectedAssumptionCell.c}</div>
                  <div className="text-[10px] font-mono text-[#AACBC4]">{activeInd}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-[#AACBC4]">Upcoming Release</div>
                <div className="font-mono font-black text-sm text-[#2CC295]">{selectedAssumptionCell.m}</div>
              </div>
            </div>

            {/* Input Form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-sans font-medium text-[#AACBC4] mb-1.5 block">
                  Fill Assumption Value {activeInd === "FX Reserves" ? "(USD Millions)" : "(%)"}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    autoFocus
                    value={assumptionInputVal} 
                    onChange={(e) => setAssumptionInputVal(e.target.value)}
                    placeholder="e.g. 2.4"
                    className="w-full bg-[#021B1A] border border-[#2CC295]/40 rounded-xl px-4 py-2.5 font-mono font-bold text-base text-[#2CC295] outline-none focus:border-[#00DF81] focus:ring-2 focus:ring-[#00DF81]/25 transition-all placeholder:text-[#AACBC4]/30" 
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveAssumption();
                    }}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#AACBC4]">
                    {activeInd === "FX Reserves" ? "USD M" : "%"}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-[#AACBC4] leading-relaxed">
                * This forward assumption allows you to model predictive macro differentials for future release dates without overwriting official historical releases.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-1">
                {selectedAssumptionCell.val && (
                  <button 
                    type="button"
                    onClick={handleClearAssumption}
                    className="px-3.5 py-2.5 rounded-xl bg-[#06302B] hover:bg-[#FF5555]/15 hover:text-[#FF5555] border border-[#0B453A] hover:border-[#FF5555]/30 text-xs font-sans font-bold text-[#AACBC4] transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button 
                  type="button"
                  onClick={handleSaveAssumption}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#2CC295] to-[#00DF81] text-[#021B1A] font-sans font-extrabold text-xs hover:brightness-110 transition-all flex justify-center items-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(0,223,129,0.35)]"
                >
                  <Sparkles size={14} className="text-[#021B1A]" />
                  <span>Save Assumption</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* DRAWER 2: MANUAL OVERRIDE DRAWER (FOR HISTORICAL PRINTS)       */}
        {/* ============================================================== */}
        {selectedCell && (
          <div className="fixed bottom-6 right-8 w-[340px] bg-[#032221]/95 backdrop-blur-3xl border border-[#0B453A] rounded-2xl shadow-2xl p-6 z-50 animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans font-bold text-base text-[#F1F7F6]">Manual Value Override</h3>
              <button 
                onClick={() => setSelectedCell(null)}
                className="w-8 h-8 rounded-xl bg-[#06302B] border border-[#0B453A] flex items-center justify-center hover:bg-[#095544] transition-colors cursor-pointer text-[#AACBC4] hover:text-[#F1F7F6]"
              >
                <ChevronDown size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between font-sans text-xs font-medium text-[#AACBC4]">
                <span>{selectedCell.c} ({activeInd})</span>
                <span>{selectedCell.m}</span>
              </div>
              <input 
                type="text" 
                value={overrideInputVal} 
                onChange={(e) => setOverrideInputVal(e.target.value)}
                className="w-full bg-[#021B1A] border border-[#0B453A] rounded-xl px-4 py-2.5 font-mono font-bold text-base text-[#F1F7F6] outline-none focus:border-[#00DF81] transition-all" 
              />
              <button 
                onClick={() => saveOverrideMutation.mutate({ country: selectedCell.c, month: selectedCell.m, value: overrideInputVal })}
                className="w-full py-2.5 rounded-xl bg-[#00DF81] text-[#021B1A] font-sans font-bold text-xs hover:brightness-110 transition-all flex justify-center items-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(0,223,129,0.3)]"
              >
                {saveOverrideMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : "Save Override"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
