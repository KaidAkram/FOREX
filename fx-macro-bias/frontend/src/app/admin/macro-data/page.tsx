"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  AlertCircle, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
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

import { COUNTRIES, PAIRS, INDICATORS, getMacroMatrixData, getCombinedDifferentialData } from "@/data/macroDataset";

const TABS = ["Macro Data Matrix", "Differential & Rating"];
const YEARS = Array.from({ length: new Date().getFullYear() - 2020 + 1 }).map((_, i) => new Date().getFullYear() - i);

// Translucent Glass Cards with Specular Highlight
const matteCard = "bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

const FlagStack = ({ base, quote }: { base: string; quote: string }) => (
  <div className="flex items-center flex-shrink-0">
    <img src={`/flags/${base}.svg`} className="w-[18px] h-[18px] rounded-full border border-white/20 z-10 shadow-sm" alt={base} />
    <img src={`/flags/${quote}.svg`} className="w-[18px] h-[18px] rounded-full border border-white/20 -ml-[6px] z-0 shadow-sm" alt={quote} />
  </div>
);

export default function MacroDataPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [activeInd, setActiveInd] = useState(INDICATORS[0]);
  const [activePair, setActivePair] = useState(PAIRS[0].name);
  const [selectedYear, setSelectedYear] = useState<number>(YEARS[0]);

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
          // Default demonstration assumptions for 2026-10 so the user immediately sees the visual distinction
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

  // Pagination states (5 items per page)
  const [matrixPage, setMatrixPage] = useState<number>(1);
  const matrixItemsPerPage = 5;

  const [diffPage, setDiffPage] = useState<number>(1);
  const diffItemsPerPage = 5;

  // Reset pagination on filter change
  useEffect(() => {
    setMatrixPage(1);
  }, [activeInd, selectedYear]);

  useEffect(() => {
    setDiffPage(1);
  }, [activePair, activeInd, selectedYear]);

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

  // Define months: 9 Published Official Months + 3 Upcoming Forward Assumption Months
  const publishedMonths = Array.from({ length: 9 }).map(
    (_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, "0")}`
  );
  const upcomingMonths = [
    `${selectedYear}-10`,
    `${selectedYear}-11`,
    `${selectedYear}-12`
  ];
  const displayMonths = [...publishedMonths, ...upcomingMonths];

  // Fetch Matrix Data with 9 published + 3 upcoming user assumption columns
  const fetchMatrixData = async (indicator: string, year: number) => {
    await new Promise(r => setTimeout(r, 100));
    const baseRows = getMacroMatrixData(indicator, year);

    return baseRows.map(row => {
      // 1. Published data slice (first 9 months)
      const publishedCells = row.data.slice(0, 9).map((cell, idx) => {
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

      // 2. 3 Upcoming Assumption Columns (months 10, 11, 12)
      const upcomingCells = upcomingMonths.map(m => {
        const assumptionKey = `${indicator}_${row.country}_${m}`;
        const val = assumptions[assumptionKey];
        return {
          value: val !== undefined ? val : "",
          status: "assumption" as const,
          isAssumption: true,
          isFilled: Boolean(val)
        };
      });

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

    // Compute upcoming assumption rows for this pair
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

  // Tab 1: Matrix Pagination
  const totalMatrixRows = matrixData?.length || 0;
  const totalMatrixPages = Math.ceil(totalMatrixRows / matrixItemsPerPage) || 1;
  const paginatedMatrixRows = matrixData?.slice(
    (matrixPage - 1) * matrixItemsPerPage,
    matrixPage * matrixItemsPerPage
  );

  // Tab 2: Differential Pagination
  const totalDiffRows = combinedData?.length || 0;
  const totalDiffPages = Math.ceil(totalDiffRows / diffItemsPerPage) || 1;
  const paginatedDiffRows = combinedData?.slice(
    (diffPage - 1) * diffItemsPerPage,
    diffPage * diffItemsPerPage
  );

  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-transparent relative justify-between">
      
      {/* 1. Header: Elegant comfortable spacing matching Dashboard & Analytics */}
      <header className="w-full flex items-center justify-between px-12 pt-9 pb-5 opacity-0 animate-fadeIn flex-shrink-0">
        <div className="flex flex-col gap-1">
          <span className="font-sans font-medium text-xs text-[#A0A5B1]">Engine Data Pipeline</span>
          <h1 className="font-sans font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Macro Data Center
          </h1>
        </div>
        
        <div className="flex items-center gap-3.5">
          <GlobalSearch placeholder="Search indicators, pairs, countries..." />
          <AuthHeaderWidget />
        </div>
      </header>

      {/* 2. Main Content Container: Clean spacious layout */}
      <main className="flex-1 flex flex-col px-12 gap-5 pb-8 max-w-[1600px] w-full mx-auto justify-between">
        
        {/* Controls Toolbar: Elevated z-index so dropdowns float ON TOP of tables */}
        <div className="relative z-50 flex items-center justify-between gap-3 opacity-0 animate-slideUp">
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#1D202B]/90 p-1 rounded-2xl border border-white/5 shadow-lg">
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
                    activeTab === tab ? "text-[#121418]" : "text-[#A0A5B1] hover:text-white"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeMacroDataTab"
                      className="absolute inset-0 bg-[#D2F646] rounded-xl z-[-1] shadow-[0_0_14px_rgba(210,246,70,0.35)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Indicator Pills for Matrix View */}
            {activeTab === "Macro Data Matrix" ? (
              <div className="flex items-center bg-[#1E2028]/90 backdrop-blur-xl border border-white/5 p-1 rounded-2xl shadow-lg">
                {INDICATORS.map(ind => (
                  <button 
                    key={ind} 
                    onClick={() => setActiveInd(ind)} 
                    className={clsx(
                      "px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 cursor-pointer", 
                      activeInd === ind ? "bg-white/10 text-white shadow-sm" : "text-[#A0A5B1] hover:text-white hover:bg-white/5"
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
                    className="flex items-center gap-2.5 bg-[#1E2028]/90 hover:bg-[#242733] border border-white/10 hover:border-white/20 rounded-2xl px-3.5 py-1.5 shadow-lg transition-all cursor-pointer min-w-[160px] text-left outline-none"
                  >
                    <FlagStack base={activePairObj.base} quote={activePairObj.quote} />
                    <span className="font-sans font-bold text-xs text-white">{activePair}</span>
                    <ChevronDown size={14} className={clsx("text-[#A0A5B1] transition-transform ml-auto", isOpenPairDropdown && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isOpenPairDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+8px)] left-0 w-[210px] bg-[#161822]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] p-1.5 flex flex-col gap-1"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-mono text-[#A0A5B1] uppercase tracking-wider">
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
                              activePair === p.name ? "bg-[#D2F646]/15 text-white" : "hover:bg-white/5 text-[#A0A5B1] hover:text-white"
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
                    className="flex items-center gap-2 bg-[#1E2028]/90 hover:bg-[#242733] border border-white/10 hover:border-white/20 rounded-2xl px-3.5 py-1.5 shadow-lg transition-all cursor-pointer min-w-[140px] text-left outline-none"
                  >
                    <span className="font-sans font-bold text-xs text-white">{activeInd}</span>
                    <ChevronDown size={14} className={clsx("text-[#A0A5B1] transition-transform ml-auto", isOpenIndDropdown && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isOpenIndDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+8px)] left-0 w-[170px] bg-[#161822]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] p-1.5 flex flex-col gap-1"
                      >
                        <div className="px-2 py-1 text-[10px] font-mono text-[#A0A5B1] uppercase tracking-wider">
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
                              activeInd === ind ? "bg-[#D2F646]/15 text-[#D2F646]" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
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
                className="flex items-center gap-2 bg-[#1E2028]/90 hover:bg-[#242733] border border-white/10 hover:border-white/20 rounded-2xl px-3.5 py-1.5 shadow-lg transition-all cursor-pointer text-left outline-none"
              >
                <Calendar size={13} className="text-[#A0A5B1]" />
                <span className="font-sans font-bold text-xs text-white">{selectedYear}</span>
                <ChevronDown size={14} className={clsx("text-[#A0A5B1] transition-transform", isOpenYearDropdown && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isOpenYearDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[calc(100%+8px)] right-0 w-[120px] bg-[#161822]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] p-1.5 flex flex-col gap-1"
                  >
                    <div className="px-2 py-1 text-[10px] font-mono text-[#A0A5B1] uppercase tracking-wider">
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
                          selectedYear === year ? "bg-[#D2F646]/15 text-[#D2F646]" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
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
            <div className="flex items-center gap-2 bg-[#1E2028]/90 backdrop-blur-xl border border-white/5 rounded-2xl px-3.5 py-1.5 shadow-lg">
               <CheckCircle2 size={15} className="text-[#6FF542]" />
               <span className="font-sans font-medium text-xs text-[#A0A5B1]">Status: <span className="text-white font-bold">Data Complete</span></span>
            </div>
          </div>
        </div>

        {/* 3. Table Card: Centered vertically in the middle of the screen */}
        <div className="flex-1 flex flex-col justify-center my-auto w-full py-2">
          <div className={clsx("flex flex-col relative z-0 overflow-hidden opacity-0 animate-slideUp shadow-2xl", matteCard)} style={{ animationDelay: "0.15s" }}>
            
            {/* ============================================================== */}
            {/* TAB 1: MACRO DATA MATRIX (Paginated 5 per page)                */}
            {/* ============================================================== */}
            {activeTab === "Macro Data Matrix" && (
              <div className="flex flex-col w-full">
                
                {/* Header Info Banner */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.01] flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Database size={17} className="text-[#D2F646]" />
                    <span className="font-sans font-bold text-sm text-white">
                      G10 Currency Sovereign Matrix: {activeInd} {activeInd === "FX Reserves" ? "(USD Millions)" : activeInd === "Interest Rate" ? "(% Policy Rate)" : activeInd === "CPI" ? "(% YoY Inflation)" : "(% Growth / Spread)"} ({selectedYear})
                    </span>
                  </div>
                  
                  {/* Visual Legend with Distinct Indicator for Forward Assumptions */}
                  <div className="flex items-center gap-4 text-xs font-mono text-[#A0A5B1]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6FF542]" />
                      Published (Official)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#A0A5B1]" />
                      Manual Override
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF4444]" />
                      Missing Print
                    </span>
                    <span className="flex items-center gap-1.5 text-[#FFD066] font-bold bg-[#F5A623]/15 border border-[#F5A623]/30 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(245,166,35,0.2)]">
                      <Sparkles size={13} className="text-[#FFD066] animate-pulse" />
                      User Assumption (Forward Dates)
                    </span>
                  </div>
                </div>

                {/* Matrix Table with 5 Sovereign Countries per Page */}
                <div className="overflow-x-auto w-full p-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-4 py-3 font-sans font-semibold text-sm text-[#A0A5B1] w-[200px] border-r border-white/5">
                          Country / Sovereign
                        </th>
                        {displayMonths.map((m, j) => {
                          const isUpcoming = j >= 9;
                          return (
                            <th 
                              key={m} 
                              className={clsx(
                                "px-3 py-2.5 text-center min-w-[95px] transition-colors",
                                isUpcoming ? 
                                  "bg-[#F5A623]/[0.08] border-b-2 border-[#F5A623]/50" : 
                                  "font-sans font-semibold text-sm text-[#A0A5B1]",
                                j === 9 && "border-l-2 border-dashed border-[#F5A623]/50"
                              )}
                            >
                              {isUpcoming ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-black text-[#F5A623] bg-[#F5A623]/25 border border-[#F5A623]/45 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                    <Sparkles size={9} className="text-[#FFD066]" /> Assumption
                                  </span>
                                  <span className="font-mono font-bold text-sm text-[#FFD066] tracking-tight">{m}</span>
                                </div>
                              ) : (
                                <span>{m}</span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {matrixLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 border-r border-white/5"><div className="w-[130px] h-[24px] bg-white/5 rounded-md animate-pulse" /></td>
                            {displayMonths.map((m, j) => (
                              <td key={j} className={clsx("p-2", j >= 9 && "bg-[#F5A623]/[0.02]", j === 9 && "border-l-2 border-dashed border-[#F5A623]/30")}>
                                <div className="w-[80px] h-[36px] bg-white/5 rounded-xl animate-pulse mx-auto" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        paginatedMatrixRows?.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 border-r border-white/5">
                              <div className="flex items-center gap-3 p-0.5 whitespace-nowrap">
                                <img src={`/flags/${row.base}.svg`} className="w-6 h-6 rounded-full border border-white/10 shadow-sm flex-shrink-0" alt={row.base} />
                                <span className="font-sans font-bold text-sm text-white">{row.country}</span>
                              </div>
                            </td>
                            {row.data.map((cell: any, j: number) => {
                              const isUpcoming = j >= 9;

                              if (isUpcoming) {
                                // 3 Upcoming User Assumption Columns
                                return (
                                  <td 
                                    key={j} 
                                    className={clsx(
                                      "px-2 py-2 text-center relative group/cell bg-[#F5A623]/[0.03] hover:bg-[#F5A623]/[0.08] transition-colors",
                                      j === 9 && "border-l-2 border-dashed border-[#F5A623]/50"
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
                                          "bg-[#F5A623]/15 hover:bg-[#F5A623]/25 border border-[#F5A623]/50 shadow-[0_0_12px_rgba(245,166,35,0.18)]" :
                                          "border border-dashed border-[#F5A623]/35 hover:border-[#F5A623]/70 bg-transparent hover:bg-[#F5A623]/10"
                                      )}
                                    >
                                      <span className={clsx(
                                        "font-mono text-sm font-black transition-transform",
                                        cell.value ? "text-[#FFD066] drop-shadow-[0_0_6px_rgba(245,166,35,0.3)]" : "text-[#F5A623]/70 italic font-medium"
                                      )}>
                                        {cell.value ? `${cell.value}${activeInd === "FX Reserves" ? "" : "%"}` : "+ Set"}
                                      </span>
                                      <div className="mt-0.5">
                                        {cell.value ? (
                                          <span className="inline-flex items-center gap-0.5 bg-[#F5A623]/25 text-[#FFD066] border border-[#F5A623]/50 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase shadow-sm">
                                            <Sparkles size={8} /> Est
                                          </span>
                                        ) : (
                                          <span className="bg-[#F5A623]/10 text-[#F5A623]/80 border border-[#F5A623]/25 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase group-hover:bg-[#F5A623]/20 group-hover:text-[#FFD066]">
                                            Assume
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  </td>
                                );
                              }

                              // 9 Published Official Data Columns
                              return (
                                <td key={j} className="px-2 py-2 text-center relative group/cell">
                                  <button 
                                    onClick={() => {
                                      setSelectedCell({ c: row.country, m: displayMonths[j], val: cell.value || "N/A" });
                                      setOverrideInputVal(cell.value || "");
                                    }}
                                    className="inline-flex flex-col items-center justify-center w-[88px] py-1.5 px-1.5 rounded-xl transition-all duration-150 hover:bg-[#242731] hover:scale-[1.03] cursor-pointer group-hover/cell:border-white/10 border border-transparent"
                                  >
                                    <span className={clsx(
                                      "font-mono text-sm font-bold transition-transform",
                                      cell.status === "missing" ? "text-[#FF4444]" : "text-white"
                                    )}>
                                      {cell.value || "—"}
                                    </span>
                                    <div className="mt-0.5">
                                      {cell.status === "published" && <span className="bg-[#6FF542]/10 text-[#6FF542] border border-[#6FF542]/20 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">Pub</span>}
                                      {cell.status === "manual" && <span className="bg-[#A0A5B1]/10 text-[#A0A5B1] border border-white/10 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">Man</span>}
                                      {cell.status === "missing" && <span className="bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/20 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">Mis</span>}
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

                {/* Bottom Pagination & Summary Bar */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-[#121418]/60 text-sm flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="font-sans text-[#A0A5B1]">
                      Showing <strong className="text-white font-mono">{totalMatrixRows > 0 ? ((matrixPage - 1) * matrixItemsPerPage) + 1 : 0}</strong>–<strong className="text-white font-mono">{Math.min(matrixPage * matrixItemsPerPage, totalMatrixRows)}</strong> of <strong className="text-white font-mono">{totalMatrixRows}</strong> sovereign economies
                    </span>
                    <span className="hidden sm:inline-block h-3.5 w-px bg-white/10" />
                    <span className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-[#6FF542] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#6FF542] animate-pulse" />
                      9 Published Prints • 3 Forward Assumption Slots Active
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[#A0A5B1] mr-1 hidden md:inline-block">
                      Page {matrixPage} of {totalMatrixPages}
                    </span>
                    <button
                      onClick={() => setMatrixPage(p => Math.max(1, p - 1))}
                      disabled={matrixPage === 1}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-sm font-bold transition-all disabled:opacity-30 disabled:pointer-events-none border border-white/10 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                      <span>Prev</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalMatrixPages }).map((_, idx) => (
                        <button
                          key={idx + 1}
                          onClick={() => setMatrixPage(idx + 1)}
                          className={clsx(
                            "w-8 h-8 rounded-xl font-mono text-sm font-bold transition-all cursor-pointer flex items-center justify-center",
                            matrixPage === idx + 1
                              ? "bg-[#D2F646] text-[#121418] font-black shadow-[0_0_12px_rgba(210,246,70,0.35)]"
                              : "bg-white/5 text-[#A0A5B1] hover:text-white hover:bg-white/10 border border-white/10"
                          )}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setMatrixPage(p => Math.min(totalMatrixPages, p + 1))}
                      disabled={matrixPage === totalMatrixPages}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-sm font-bold transition-all disabled:opacity-30 disabled:pointer-events-none border border-white/10 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: COMBINED DIFFERENTIAL & RATING (Paginated 5 per page)   */}
            {/* ============================================================== */}
            {activeTab === "Differential & Rating" && (
              <div className="flex flex-col w-full">
                
                {/* Header Info Banner */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.01] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <FlagStack base={activePairObj.base} quote={activePairObj.quote} />
                    <span className="font-sans font-bold text-sm text-white">
                      Differential Transformation: {activePair} • {activeInd} ({selectedYear})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-sm text-[#A0A5B1]">
                    <span>Formula: </span>
                    <span className="text-[#D2F646] font-bold">
                      {activeInd === "FX Reserves" ? `Diff = ${activePairObj.baseName} (USD M) − ${activePairObj.quoteName} (USD M)` : `Diff = ${activePairObj.baseName} (%) − ${activePairObj.quoteName} (%)`}
                    </span>
                  </div>
                </div>

                {/* Table with Monthly Releases & Forward Assumptions */}
                <div className="overflow-x-auto w-full p-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs font-mono font-bold uppercase tracking-wider text-[#A0A5B1]">
                        <th className="py-3.5 px-4 w-[160px]">Release Month</th>
                        <th className="py-3.5 px-4 text-center w-[170px]">Base ({activePairObj.baseName})</th>
                        <th className="py-3.5 px-4 text-center w-[170px]">Quote ({activePairObj.quoteName})</th>
                        <th className="py-3.5 px-4 text-center w-[190px]">Calculated Differential</th>
                        <th className="py-3.5 px-4 text-center w-[190px]">Rule Threshold</th>
                        <th className="py-3.5 px-4 text-center w-[230px]">Engine Sentiment Regime</th>
                        <th className="py-3.5 px-4 text-right w-[140px]">Rating Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {combinedLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={7} className="p-3"><div className="w-full h-[32px] bg-white/5 rounded-md animate-pulse" /></td>
                          </tr>
                        ))
                      ) : (
                        paginatedDiffRows?.map((row: any, i: number) => {
                          const isPositive = row.rating > 0;
                          const isNegative = row.rating < 0;
                          const isAssumptionRow = Boolean(row.isAssumption);

                          return (
                            <tr 
                              key={i} 
                              className={clsx(
                                "transition-colors",
                                isAssumptionRow ? "bg-[#F5A623]/[0.03] hover:bg-[#F5A623]/[0.06]" : "hover:bg-white/[0.02]"
                              )}
                            >
                              {/* Month */}
                              <td className="py-3.5 px-4">
                                <span className={clsx(
                                  "font-mono font-bold text-sm px-3 py-1 rounded-lg inline-flex items-center gap-1.5",
                                  isAssumptionRow ? 
                                    "text-[#FFD066] bg-[#F5A623]/15 border border-[#F5A623]/35" : 
                                    "text-white bg-white/5 border border-white/10"
                                )}>
                                  {isAssumptionRow && <Sparkles size={11} className="text-[#FFD066]" />}
                                  {row.month}
                                  {isAssumptionRow && <span className="text-[9px] uppercase font-bold text-[#F5A623]">Est</span>}
                                </span>
                              </td>

                              {/* Base */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex items-center gap-2 font-mono text-sm text-[#A0A5B1]">
                                  <img src={`/flags/${activePairObj.base}.svg`} className="w-5 h-5 rounded-full border border-white/10" alt={activePairObj.base} />
                                  <span className={clsx("font-bold", isAssumptionRow ? "text-[#FFD066]" : "text-white")}>
                                    {row.baseVal}{row.baseVal !== "—" && activeInd !== "FX Reserves" ? "%" : row.baseVal !== "—" ? "M" : ""}
                                  </span>
                                </div>
                              </td>

                              {/* Quote */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex items-center gap-2 font-mono text-sm text-[#A0A5B1]">
                                  <img src={`/flags/${activePairObj.quote}.svg`} className="w-5 h-5 rounded-full border border-white/10" alt={activePairObj.quote} />
                                  <span className={clsx("font-bold", isAssumptionRow ? "text-[#FFD066]" : "text-white")}>
                                    {row.quoteVal}{row.quoteVal !== "—" && activeInd !== "FX Reserves" ? "%" : row.quoteVal !== "—" ? "M" : ""}
                                  </span>
                                </div>
                              </td>

                              {/* Differential */}
                              <td className="py-3.5 px-4 text-center">
                                <span className={clsx(
                                  "inline-block font-mono font-extrabold text-sm px-3.5 py-1 rounded-xl",
                                  isAssumptionRow ? "text-[#FFD066] bg-[#F5A623]/15 border border-[#F5A623]/30" :
                                  row.diffNum > 0 ? "text-[#D2F646] bg-[#D2F646]/10 border border-[#D2F646]/20" :
                                  row.diffNum < 0 ? "text-[#FF5B5B] bg-[#FF4444]/10 border border-[#FF4444]/20" :
                                  "text-white bg-white/5 border border-white/10"
                                )}>
                                  {row.diff}{row.diff !== "—" && activeInd !== "FX Reserves" ? "%" : row.diff !== "—" ? "M" : ""}
                                </span>
                              </td>

                              {/* Rule Applied */}
                              <td className="py-3.5 px-4 text-center">
                                <span className="font-mono text-xs text-[#A0A5B1] bg-white/[0.03] border border-white/5 px-3 py-1 rounded-lg">
                                  {row.rule}
                                </span>
                              </td>

                              {/* Engine Sentiment Regime */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-semibold">
                                  {isAssumptionRow ? (
                                    <span className="flex items-center gap-1.5 text-[#FFD066] bg-[#F5A623]/15 border border-[#F5A623]/30 px-3.5 py-1 rounded-full">
                                      <Sparkles size={13} className="text-[#FFD066]" />
                                      <span>{row.regime}</span>
                                    </span>
                                  ) : isPositive ? (
                                    <span className="flex items-center gap-1.5 text-[#D2F646] bg-[#D2F646]/10 border border-[#D2F646]/25 px-3.5 py-1 rounded-full">
                                      <TrendingUp size={14} />
                                      <span>{row.regime}</span>
                                    </span>
                                  ) : isNegative ? (
                                    <span className="flex items-center gap-1.5 text-[#FF5B5B] bg-[#FF4444]/10 border border-[#FF4444]/25 px-3.5 py-1 rounded-full">
                                      <TrendingDown size={14} />
                                      <span>{row.regime}</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-[#A0A5B1] bg-white/5 border border-white/10 px-3.5 py-1 rounded-full">
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
                                  isAssumptionRow ? "bg-[#F5A623]/20 text-[#FFD066] border border-[#F5A623]/40" :
                                  isPositive ? "bg-[#D2F646]/15 text-[#D2F646] border border-[#D2F646]/30" :
                                  isNegative ? "bg-[#FF4444]/15 text-[#FF4444] border border-[#FF4444]/30" :
                                  "bg-white/5 text-[#A0A5B1] border border-white/10"
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

                {/* Bottom Pagination & Summary Bar */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-[#121418]/60 text-sm flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="font-sans text-[#A0A5B1]">
                      Showing <strong className="text-white font-mono">{totalDiffRows > 0 ? ((diffPage - 1) * diffItemsPerPage) + 1 : 0}</strong>–<strong className="text-white font-mono">{Math.min(diffPage * diffItemsPerPage, totalDiffRows)}</strong> of <strong className="text-white font-mono">{totalDiffRows}</strong> observations ({activePair})
                    </span>
                    <span className="hidden sm:inline-block h-3.5 w-px bg-white/10" />
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="text-[#A0A5B1]">Net Rating:</span>
                      <span className="text-[#D2F646] font-bold bg-[#D2F646]/10 border border-[#D2F646]/20 px-3 py-1 rounded-lg">
                        {combinedData ? combinedData.reduce((acc: number, r: any) => acc + r.rating, 0) : 0} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[#A0A5B1] mr-1 hidden md:inline-block">
                      Page {diffPage} of {totalDiffPages}
                    </span>
                    <button
                      onClick={() => setDiffPage(p => Math.max(1, p - 1))}
                      disabled={diffPage === 1}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-sm font-bold transition-all disabled:opacity-30 disabled:pointer-events-none border border-white/10 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                      <span>Prev</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalDiffPages }).map((_, idx) => (
                        <button
                          key={idx + 1}
                          onClick={() => setDiffPage(idx + 1)}
                          className={clsx(
                            "w-8 h-8 rounded-xl font-mono text-sm font-bold transition-all cursor-pointer flex items-center justify-center",
                            diffPage === idx + 1
                              ? "bg-[#D2F646] text-[#121418] font-black shadow-[0_0_12px_rgba(210,246,70,0.35)]"
                              : "bg-white/5 text-[#A0A5B1] hover:text-white hover:bg-white/10 border border-white/10"
                          )}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setDiffPage(p => Math.min(totalDiffPages, p + 1))}
                      disabled={diffPage === totalDiffPages}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-sm font-bold transition-all disabled:opacity-30 disabled:pointer-events-none border border-white/10 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ============================================================== */}
        {/* DRAWER 1: USER FORWARD ASSUMPTION DRAWER (NEW FUNCTIONALITY)   */}
        {/* ============================================================== */}
        {selectedAssumptionCell && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            className="fixed bottom-6 right-8 w-[380px] bg-[#161822]/95 backdrop-blur-3xl border border-[#F5A623]/40 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(245,166,35,0.18)] p-6 z-50 animate-slideUp"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F5A623]/15 border border-[#F5A623]/35 flex items-center justify-center">
                  <Sparkles size={16} className="text-[#FFD066]" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm text-white">Forward Date Assumption</h3>
                  <span className="text-[10px] font-mono text-[#F5A623] font-semibold">User Projection Model</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAssumptionCell(null)}
                className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-[#A0A5B1] hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            {/* Context Card */}
            <div className="bg-[#121418] border border-white/5 rounded-2xl p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img 
                  src={`/flags/${COUNTRIES.find(c => c.country === selectedAssumptionCell.c)?.base}.svg`} 
                  className="w-6 h-6 rounded-full border border-white/15" 
                  alt={selectedAssumptionCell.c} 
                />
                <div>
                  <div className="font-sans font-bold text-xs text-white">{selectedAssumptionCell.c}</div>
                  <div className="text-[10px] font-mono text-[#A0A5B1]">{activeInd}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-[#A0A5B1]">Upcoming Release</div>
                <div className="font-mono font-black text-sm text-[#FFD066]">{selectedAssumptionCell.m}</div>
              </div>
            </div>

            {/* Input Form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-sans font-medium text-[#A0A5B1] mb-1.5 block">
                  Fill Assumption Value {activeInd === "FX Reserves" ? "(USD Millions)" : "(%)"}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    autoFocus
                    value={assumptionInputVal} 
                    onChange={(e) => setAssumptionInputVal(e.target.value)}
                    placeholder="e.g. 2.4"
                    className="w-full bg-[#121418] border border-[#F5A623]/40 rounded-xl px-4 py-2.5 font-mono font-bold text-base text-[#FFD066] outline-none focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/25 transition-all placeholder:text-white/20" 
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveAssumption();
                    }}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#A0A5B1]">
                    {activeInd === "FX Reserves" ? "USD M" : "%"}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-[#A0A5B1] leading-relaxed">
                * This forward assumption allows you to model predictive macro differentials for future release dates without overwriting official historical releases.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-1">
                {selectedAssumptionCell.val && (
                  <button 
                    type="button"
                    onClick={handleClearAssumption}
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-[#FF4444]/15 hover:text-[#FF4444] border border-white/10 hover:border-[#FF4444]/30 text-xs font-sans font-bold text-[#A0A5B1] transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button 
                  type="button"
                  onClick={handleSaveAssumption}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A623] to-[#FFD066] text-[#121418] font-sans font-extrabold text-xs hover:brightness-110 transition-all flex justify-center items-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(245,166,35,0.35)]"
                >
                  <Sparkles size={14} className="text-[#121418]" />
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
          <div className="fixed bottom-6 right-8 w-[340px] bg-[#1E2028]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-6 z-50 animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans font-bold text-base text-white">Manual Value Override</h3>
              <button 
                onClick={() => setSelectedCell(null)}
                className="w-8 h-8 rounded-xl bg-[#121418] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronDown size={18} className="text-[#A0A5B1]" />
              </button>
            </div>
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between font-sans text-xs font-medium text-[#A0A5B1]">
                <span>{selectedCell.c} ({activeInd})</span>
                <span>{selectedCell.m}</span>
              </div>
              <input 
                type="text" 
                value={overrideInputVal} 
                onChange={(e) => setOverrideInputVal(e.target.value)}
                className="w-full bg-[#121418] border border-white/10 rounded-xl px-4 py-2.5 font-mono font-bold text-base text-white outline-none focus:border-[#D2F646] transition-all" 
              />
              <button 
                onClick={() => saveOverrideMutation.mutate({ country: selectedCell.c, month: selectedCell.m, value: overrideInputVal })}
                className="w-full py-2.5 rounded-xl bg-[#D2F646] text-[#121418] font-sans font-bold text-xs hover:brightness-110 transition-all flex justify-center items-center gap-2 cursor-pointer shadow-md"
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
