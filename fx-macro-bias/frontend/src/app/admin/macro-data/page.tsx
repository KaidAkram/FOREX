"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  ChevronDown, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Database,
  X,
  Lock
} from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

import { 
  COUNTRIES, 
  PAIRS, 
  INDICATORS, 
  getMacroMatrixData, 
  getCombinedDifferentialData, 
  SYSTEM_CURRENT_YEAR, 
  MACRO_YEARS 
} from "@/data/macroDataset";

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

  // User Assumptions & Forward Overrides state
  const [assumptions, setAssumptions] = useState<Record<string, string>>({});
  const [selectedAssumptionCell, setSelectedAssumptionCell] = useState<{ c: string; m: string; val: string; isForecast: boolean } | null>(null);
  const [assumptionInputVal, setAssumptionInputVal] = useState<string>("");

  // Load assumptions from localStorage on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("shiftfx_macro_user_assumptions");
        if (stored) {
          setAssumptions(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to load user assumptions", err);
      }
    }
  }, []);

  // Dropdown Open States (Click-controlled)
  const [isOpenYearDropdown, setIsOpenYearDropdown] = useState(false);
  const yearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setIsOpenYearDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCurrentLiveYear = selectedYear === SYSTEM_CURRENT_YEAR;
  const displayMonths = Array.from({ length: 12 }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, "0")}`);

  // Fetch Matrix Data: returns all 12 months with dynamic status (published, forecast, missing)
  const fetchMatrixData = async (indicator: string, year: number) => {
    await new Promise(r => setTimeout(r, 60));
    const baseRows = getMacroMatrixData(indicator, year);

    return baseRows.map(row => {
      const allCells = row.data.map((cell, idx) => {
        const monthKey = `${year}-${(idx + 1).toString().padStart(2, "0")}`;
        const assumptionKey = `${indicator}_${row.country}_${monthKey}`;
        const userSavedVal = assumptions[assumptionKey];

        // If user manually customized a forecast or missing period
        if (userSavedVal !== undefined && userSavedVal !== "" && cell.status !== "published") {
          return {
            ...cell,
            value: userSavedVal,
            status: "manual" as const,
            isAssumption: true
          };
        }

        return {
          ...cell,
          isAssumption: cell.status === "forecast"
        };
      });

      return {
        ...row,
        data: allCells
      };
    });
  };

  // Fetch Combined Differential Data for all 12 months
  const fetchCombinedData = async (pair: string, indicator: string, year: number) => {
    await new Promise(r => setTimeout(r, 60));
    const baseReleases = getCombinedDifferentialData(pair, indicator, year);
    const pairObj = PAIRS.find(p => p.name === pair) || PAIRS[0];

    return baseReleases.map(row => {
      const baseKey = `${indicator}_${pairObj.baseCountry}_${row.month}`;
      const quoteKey = `${indicator}_${pairObj.quoteCountry}_${row.month}`;
      const baseAssump = assumptions[baseKey];
      const quoteAssump = assumptions[quoteKey];

      // If user customized values for forecast/missing month
      if ((baseAssump || quoteAssump) && row.isForecast) {
        const bNum = baseAssump ? parseFloat(baseAssump) : parseFloat(row.baseVal) || 0;
        const qNum = quoteAssump ? parseFloat(quoteAssump) : parseFloat(row.quoteVal) || 0;
        const diffNum = parseFloat((bNum - qNum).toFixed(2));

        let rating = 0;
        let rule = "-1.0 to 1.0";
        let regime = "Neutral / Balanced";
        if (diffNum >= 2.0) { rating = 10; rule = "≥ +2.0"; regime = "Strong Bullish Bias"; }
        else if (diffNum >= 1.0) { rating = 5; rule = "+1.0 to +2.0"; regime = "Moderate Bullish Bias"; }
        else if (diffNum <= -2.0) { rating = -10; rule = "≤ -2.0"; regime = "Strong Bearish Bias"; }
        else if (diffNum <= -1.0) { rating = -5; rule = "-2.0 to -1.0"; regime = "Moderate Bearish Bias"; }

        return {
          ...row,
          baseVal: baseAssump ? `${bNum}` : row.baseVal,
          quoteVal: quoteAssump ? `${qNum}` : row.quoteVal,
          diffNum,
          diff: (diffNum > 0 ? "+" : "") + diffNum,
          rule: `${rule} (Custom)`,
          regime,
          rating,
          isAssumption: true
        };
      }

      return row;
    });
  };

  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: ["macro-matrix", activeInd, selectedYear, assumptions],
    queryFn: () => fetchMatrixData(activeInd, selectedYear),
    enabled: activeTab === "Macro Data Matrix"
  });

  const { data: combinedData, isLoading: combinedLoading } = useQuery({
    queryKey: ["macro-combined", activePair, activeInd, selectedYear, assumptions],
    queryFn: () => fetchCombinedData(activePair, activeInd, selectedYear),
    enabled: activeTab === "Differential & Rating"
  });

  // Save user customized forecast / estimate
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

  // Reset to default Trading Economics forecast / missing state
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
      <header className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 lg:pt-8 pb-4 opacity-0 animate-fadeIn relative z-40 flex-shrink-0 gap-4" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-1">
          <span className="font-sans font-medium text-xs text-[#AACBC4]">Engine Data Pipeline</span>
          <h1 className="font-sans font-bold text-2xl sm:text-3xl text-[#F1F7F6] tracking-tight leading-none">
            Macro Data Center
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
          <GlobalSearch placeholder="Search indicators, pairs, countries..." />
          <AuthHeaderWidget />
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-10 gap-4 pb-8 max-w-[1600px] w-full mx-auto justify-between">
        
        {/* Controls Toolbar */}
        <div className="relative z-40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 opacity-0 animate-slideUp">
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#06302B]/90 p-1 rounded-2xl border border-[#0B453A] shadow-lg shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "relative px-3.5 sm:px-4 py-1.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 z-10 cursor-pointer whitespace-nowrap",
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

            {/* Indicator Pills: Clickable in BOTH views */}
            <div className="flex items-center bg-[#06302B]/90 backdrop-blur-xl border border-[#0B453A] p-1 rounded-2xl shadow-lg overflow-x-auto no-scrollbar shrink-0">
              {INDICATORS.map(ind => (
                <button 
                  key={ind} 
                  onClick={() => setActiveInd(ind)} 
                  className={clsx(
                    "px-2.5 sm:px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap", 
                    activeInd === ind 
                      ? "bg-[#00DF81]/20 text-[#00DF81] border border-[#00DF81]/40 shadow-sm" 
                      : "text-[#AACBC4] hover:text-[#F1F7F6] hover:bg-[#095544]/50"
                  )}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Right Toolbar: Year Selector & Status Badge */}
          <div className="flex items-center gap-2.5">
            {/* Year Dropdown */}
            <div className="relative" ref={yearRef}>
              <button
                type="button"
                onClick={() => setIsOpenYearDropdown(!isOpenYearDropdown)}
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
        <div className="flex-1 flex flex-col justify-center my-auto w-full py-1">
          <div className={clsx("flex flex-col relative z-0 overflow-hidden opacity-0 animate-slideUp shadow-2xl", matteCard)} style={{ animationDelay: "0.15s" }}>
            
            {/* ============================================================== */}
            {/* TAB 1: MACRO DATA MATRIX (All Sovereign Economies)            */}
            {/* ============================================================== */}
            {activeTab === "Macro Data Matrix" && (
              <div className="flex flex-col w-full">
                
                {/* Header Info Banner */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-3.5 border-b border-[#0B453A] bg-[#021B1A]/40 flex-shrink-0 gap-3">
                  <div className="flex items-center gap-2.5">
                    <Database size={17} className="text-[#00DF81]" />
                    <span className="font-sans font-bold text-sm text-[#F1F7F6]">
                      G10 Currency Sovereign Matrix: {activeInd} {activeInd === "FX Reserves" ? "(USD Millions)" : activeInd === "Interest Rate" ? "(% Policy Rate)" : activeInd === "CPI" ? "(% YoY Inflation)" : "(% Growth / Spread)"} ({selectedYear})
                    </span>
                  </div>
                  
                  {/* Visual Legend */}
                  <div className="flex items-center gap-3 sm:gap-5 text-xs font-mono text-[#AACBC4] flex-wrap">
                    <span className="flex items-center gap-1.5" title="Official prints released by statistical agencies (Read-only)">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00DF81]" />
                      Published (Official)
                    </span>
                    <span className="flex items-center gap-1.5" title="Trading Economics forecast for unreleased periods (Editable)">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2CC295]" />
                      Forecast (Trading Economics)
                    </span>
                    <span className="flex items-center gap-1.5" title="User modified value">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#AACBC4]" />
                      Manual Override
                    </span>
                    <span className="flex items-center gap-1.5" title="Period not yet published with no forecast (Empty / Editable)">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5555]" />
                      Missing Print
                    </span>
                  </div>
                </div>

                {/* Matrix Table with All Sovereign Economies */}
                <div className="overflow-x-auto overflow-y-auto max-h-[660px] w-full p-2 sm:p-4">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="sticky top-0 bg-[#032221] z-30 shadow-md">
                      <tr className="border-b border-[#0B453A] bg-[#032221]">
                        <th className="sticky top-0 left-0 bg-[#032221] z-40 px-3 sm:px-4 py-3 font-sans font-semibold text-xs sm:text-sm text-[#AACBC4] w-[150px] sm:w-[200px] border-r border-[#0B453A] shadow-[4px_0_12px_rgba(2,27,26,0.8)]">
                          Country / Sovereign
                        </th>
                        {displayMonths.map((m, j) => {
                          const isQ4 = isCurrentLiveYear && j >= 9;
                          return (
                            <th 
                              key={m} 
                              className={clsx(
                                "px-2 sm:px-3 py-2.5 text-center min-w-[85px] sm:min-w-[95px] transition-colors whitespace-nowrap",
                                isQ4 ? 
                                  "bg-[#06302B]/80 border-b-2 border-[#2CC295]/60" : 
                                  "font-sans font-semibold text-xs sm:text-sm text-[#AACBC4] bg-[#032221]",
                                isQ4 && j === 9 && "border-l-2 border-dashed border-[#2CC295]/50"
                              )}
                            >
                              {isQ4 ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-mono font-black text-[#2CC295] bg-[#2CC295]/20 border border-[#2CC295]/40 px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                    <Sparkles size={8} className="text-[#00DF81]" /> Forward
                                  </span>
                                  <span className="font-mono font-bold text-xs sm:text-sm text-[#2CC295] tracking-tight">{m}</span>
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
                            <td className="sticky left-0 bg-[#032221] z-20 px-3 sm:px-4 py-3 border-r border-[#0B453A] shadow-[4px_0_12px_rgba(2,27,26,0.8)]"><div className="w-[110px] h-[22px] bg-[#06302B] rounded-md animate-pulse" /></td>
                            {displayMonths.map((m, j) => (
                              <td key={j} className={clsx("p-2", isCurrentLiveYear && j >= 9 && "bg-[#06302B]/30", isCurrentLiveYear && j === 9 && "border-l-2 border-dashed border-[#2CC295]/30")}>
                                <div className="w-[70px] sm:w-[80px] h-[36px] bg-[#06302B] rounded-xl animate-pulse mx-auto" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        matrixData?.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-[#06302B]/30 transition-colors">
                            <td className="sticky left-0 bg-[#032221] z-20 px-3 sm:px-4 py-2 sm:py-2.5 border-r border-[#0B453A] shadow-[4px_0_12px_rgba(2,27,26,0.8)]">
                              <div className="flex items-center gap-2 sm:gap-3 p-0.5 whitespace-nowrap">
                                <img src={`/flags/${row.base}.svg`} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#0B453A] shadow-sm flex-shrink-0" alt={row.base} />
                                <span className="font-sans font-bold text-xs sm:text-sm text-[#F1F7F6]">{row.country}</span>
                              </div>
                            </td>
                            {row.data.map((cell: any, j: number) => {
                              const isPublished = cell.status === "published";
                              const isForecast = cell.status === "forecast";
                              const isMissing = cell.status === "missing";
                              const isManual = cell.status === "manual";
                              const isForwardCol = isCurrentLiveYear && j >= 9;

                              return (
                                <td 
                                  key={j} 
                                  className={clsx(
                                    "px-2 py-2 text-center relative group/cell transition-colors",
                                    isForwardCol && "bg-[#06302B]/20",
                                    isForwardCol && j === 9 && "border-l-2 border-dashed border-[#2CC295]/40"
                                  )}
                                >
                                  <button
                                    type="button"
                                    disabled={isPublished}
                                    onClick={() => {
                                      if (!isPublished) {
                                        setSelectedAssumptionCell({ 
                                          c: row.country, 
                                          m: displayMonths[j], 
                                          val: cell.value || "",
                                          isForecast: isForecast || isManual
                                        });
                                        setAssumptionInputVal(cell.value || "");
                                      }
                                    }}
                                    title={
                                      isPublished 
                                        ? `Officially published release for ${row.country} (${displayMonths[j]}) — Locked (Read-only)` 
                                        : isForecast 
                                        ? `Trading Economics forecast for ${row.country} (${displayMonths[j]}) — Click to customize` 
                                        : `Unpublished missing period for ${row.country} (${displayMonths[j]}) — Click to enter estimate`
                                    }
                                    className={clsx(
                                      "inline-flex flex-col items-center justify-center w-[88px] py-1.5 px-1.5 rounded-xl transition-all duration-150 border",
                                      isPublished && "cursor-default border-transparent",
                                      !isPublished && "cursor-pointer hover:scale-[1.04]",
                                      isForecast && "bg-[#06302B]/60 hover:bg-[#095544] border-[#2CC295]/40 shadow-[0_0_10px_rgba(44,194,149,0.15)]",
                                      isManual && "bg-[#06302B] hover:bg-[#095544] border-[#AACBC4]/40 shadow-sm",
                                      isMissing && "border border-dashed border-[#FF5555]/30 hover:border-[#FF5555]/60 hover:bg-[#06302B]/40"
                                    )}
                                  >
                                    <span className={clsx(
                                      "font-mono text-sm font-bold transition-transform",
                                      isPublished ? "text-[#F1F7F6]" :
                                      isForecast ? "text-[#2CC295] font-black" :
                                      isManual ? "text-[#AACBC4] font-black" :
                                      "text-[#FF5555]/60 italic font-medium"
                                    )}>
                                      {cell.value !== null && cell.value !== "" 
                                        ? `${cell.value}${activeInd === "FX Reserves" ? "" : "%"}` 
                                        : "—"}
                                    </span>
                                    <div className="mt-0.5">
                                      {isPublished && (
                                        <span className="bg-[#00DF81]/15 text-[#00DF81] border border-[#00DF81]/30 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">
                                          Pub
                                        </span>
                                      )}
                                      {isForecast && (
                                        <span className="inline-flex items-center gap-0.5 bg-[#2CC295]/20 text-[#2CC295] border border-[#2CC295]/40 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase shadow-sm">
                                          <Sparkles size={8} /> Est
                                        </span>
                                      )}
                                      {isManual && (
                                        <span className="bg-[#AACBC4]/15 text-[#AACBC4] border border-[#0B453A] px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">
                                          Man
                                        </span>
                                      )}
                                      {isMissing && (
                                        <span className="text-[9px] font-mono text-[#AACBC4]/30">
                                          —
                                        </span>
                                      )}
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
                      {isCurrentLiveYear ? "Official Releases + Dynamic Trading Economics Forecasts Active" : "12/12 Historical Releases Published • Cycle Settled"}
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
                
                {/* ALWAYS-VISIBLE HORIZONTAL PAIR SELECTOR STRIP (21 PAIRS) */}
                <div className="px-6 py-3 border-b border-[#0B453A] bg-[#021B1A]/70 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#AACBC4]">Select Currency Pair:</span>
                      <span className="text-xs font-mono font-black text-[#00DF81] bg-[#00DF81]/10 border border-[#00DF81]/20 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                        <FlagStack base={activePairObj.base} quote={activePairObj.quote} />
                        {activePair}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#AACBC4]/60 hidden sm:inline-block">
                      All 21 Pairs Always Visible • Instant Switch
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-[#0B453A] scrollbar-track-transparent">
                    {PAIRS.map(p => {
                      const isSelected = activePair === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setActivePair(p.name)}
                          className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap flex-shrink-0 border",
                            isSelected
                              ? "bg-[#00DF81]/20 text-[#00DF81] border-[#00DF81]/60 shadow-[0_0_12px_rgba(0,223,129,0.3)] scale-[1.03]"
                              : "bg-[#06302B]/80 text-[#AACBC4] hover:text-[#F1F7F6] hover:bg-[#095544] border-[#0B453A]"
                          )}
                        >
                          <FlagStack base={p.base} quote={p.quote} />
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subheader Banner */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[#0B453A] bg-[#021B1A]/40 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <FlagStack base={activePairObj.base} quote={activePairObj.quote} />
                    <span className="font-sans font-bold text-sm text-[#F1F7F6]">
                      {activePair} Differential Spread Matrix: {activeInd} ({selectedYear})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-[#AACBC4]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00DF81]" />
                      Bullish Bias (&gt; 0)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5555]" />
                      Bearish Bias (&lt; 0)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2CC295]" />
                      Forecast Period (Est)
                    </span>
                  </div>
                </div>

                {/* Differential Observations Table */}
                <div className="overflow-x-auto overflow-y-auto max-h-[620px] w-full p-2 sm:p-4">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead className="sticky top-0 bg-[#032221] z-20 shadow-md">
                      <tr className="border-b border-[#0B453A] text-xs font-sans text-[#AACBC4]">
                        <th className="py-3 px-4 font-semibold">Release Date</th>
                        <th className="py-3 px-4 text-center font-semibold">{activePairObj.baseName} ({activePairObj.baseCountry})</th>
                        <th className="py-3 px-4 text-center font-semibold">{activePairObj.quoteName} ({activePairObj.quoteCountry})</th>
                        <th className="py-3 px-4 text-center font-semibold">Differential Spread</th>
                        <th className="py-3 px-4 text-center font-semibold">Applied Rule Grid</th>
                        <th className="py-3 px-4 font-semibold">Macro Bias Regime</th>
                        <th className="py-3 px-4 text-right font-semibold">Rating Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0B453A]/40 text-sm">
                      {combinedLoading ? (
                        Array.from({ length: 12 }).map((_, i) => (
                          <tr key={i}>
                            <td className="py-3 px-4"><div className="w-[80px] h-[20px] bg-[#06302B] rounded animate-pulse" /></td>
                            <td className="py-3 px-4"><div className="w-[60px] h-[20px] bg-[#06302B] rounded animate-pulse mx-auto" /></td>
                            <td className="py-3 px-4"><div className="w-[60px] h-[20px] bg-[#06302B] rounded animate-pulse mx-auto" /></td>
                            <td className="py-3 px-4"><div className="w-[60px] h-[20px] bg-[#06302B] rounded animate-pulse mx-auto" /></td>
                            <td className="py-3 px-4"><div className="w-[90px] h-[20px] bg-[#06302B] rounded animate-pulse mx-auto" /></td>
                            <td className="py-3 px-4"><div className="w-[120px] h-[20px] bg-[#06302B] rounded animate-pulse" /></td>
                            <td className="py-3 px-4"><div className="w-[45px] h-[20px] bg-[#06302B] rounded animate-pulse ml-auto" /></td>
                          </tr>
                        ))
                      ) : (
                        combinedData?.map((row: any, i: number) => {
                          const isPositive = row.rating > 0;
                          const isNegative = row.rating < 0;
                          const isAssumptionRow = row.isAssumption || row.isForecast;
                          const isMissing = row.isMissing;

                          return (
                            <tr key={i} className="hover:bg-[#06302B]/30 transition-colors">
                              {/* Release Month with Forecast / Published Badge */}
                              <td className="py-3 px-4 font-mono font-bold text-xs sm:text-sm text-[#F1F7F6]">
                                <div className="flex items-center gap-2">
                                  <span>{row.month}</span>
                                  {isAssumptionRow && (
                                    <span className="inline-flex items-center gap-0.5 bg-[#2CC295]/20 text-[#2CC295] border border-[#2CC295]/40 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                      <Sparkles size={8} /> Est
                                    </span>
                                  )}
                                  {isMissing && (
                                    <span className="bg-[#FF5555]/15 text-[#FF5555] border border-[#FF5555]/30 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                                      Pending
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Base Country Value */}
                              <td className="py-3 px-4 text-center font-mono font-semibold text-xs sm:text-sm text-[#AACBC4]">
                                {row.baseVal}
                              </td>

                              {/* Quote Country Value */}
                              <td className="py-3 px-4 text-center font-mono font-semibold text-xs sm:text-sm text-[#AACBC4]">
                                {row.quoteVal}
                              </td>

                              {/* Raw Spread / Differential */}
                              <td className="py-3 px-4 text-center font-mono font-bold text-xs sm:text-sm text-[#F1F7F6]">
                                {row.diff}
                              </td>

                              {/* Applied Rule Grid */}
                              <td className="py-3 px-4 text-center font-mono text-xs text-[#AACBC4]">
                                {row.rule}
                              </td>

                              {/* Macro Bias Regime */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {isPositive ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-[#00DF81] bg-[#00DF81]/10 px-2.5 py-1 rounded-lg">
                                      <TrendingUp size={14} />
                                      <span>{row.regime}</span>
                                    </span>
                                  ) : isNegative ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-[#FF5555] bg-[#FF5555]/10 px-2.5 py-1 rounded-lg">
                                      <TrendingDown size={14} />
                                      <span>{row.regime}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-[#AACBC4] bg-[#06302B] px-2.5 py-1 rounded-lg">
                                      <Minus size={14} />
                                      <span>{row.regime}</span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Rating Score Impact */}
                              <td className="py-3 px-4 text-right">
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
        {/* DRAWER: EDIT FORECAST / USER ASSUMPTION (NON-PUBLISHED PERIODS)*/}
        {/* ============================================================== */}
        {selectedAssumptionCell && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            className="fixed bottom-4 sm:bottom-6 right-4 sm:right-8 w-[calc(100%-2rem)] sm:w-[380px] max-w-[420px] bg-[#032221]/95 backdrop-blur-3xl border border-[#2CC295]/40 rounded-3xl shadow-[0_25px_60px_rgba(2,27,26,0.95),0_0_30px_rgba(44,194,149,0.18)] p-5 sm:p-6 z-50 animate-slideUp"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2CC295]/15 border border-[#2CC295]/35 flex items-center justify-center">
                  <Sparkles size={16} className="text-[#00DF81]" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm text-[#F1F7F6]">
                    {selectedAssumptionCell.isForecast ? "Edit Forward Forecast" : "Macro Value / Assumption"}
                  </h3>
                  <span className="text-[10px] font-mono text-[#2CC295] font-semibold">
                    {selectedAssumptionCell.isForecast ? "Trading Economics Model" : "User Assumption Input"}
                  </span>
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
                  src={`/flags/${COUNTRIES.find(c => c.country === selectedAssumptionCell.c)?.base || 'us'}.svg`} 
                  className="w-6 h-6 rounded-full border border-[#0B453A]" 
                  alt={selectedAssumptionCell.c} 
                />
                <div>
                  <div className="font-sans font-bold text-xs text-[#F1F7F6]">{selectedAssumptionCell.c}</div>
                  <div className="text-[10px] font-mono text-[#AACBC4]">{activeInd}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-[#AACBC4]">Release Period</div>
                <div className="font-mono font-black text-sm text-[#2CC295]">{selectedAssumptionCell.m}</div>
              </div>
            </div>

            {/* Input Form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-sans font-medium text-[#AACBC4] mb-1.5 block">
                  Custom Value / Forecast {activeInd === "FX Reserves" ? "(USD Millions)" : "(%)"}
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

              <div className="flex items-center gap-1.5 text-[10px] text-[#AACBC4] leading-relaxed bg-[#021B1A]/60 p-2.5 rounded-xl border border-[#0B453A]/50">
                <Lock size={12} className="text-[#00DF81] shrink-0" />
                <span>
                  Officially published historical releases are locked as read-only. Forward forecasts and unpublished release periods remain fully editable.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-1">
                <button 
                  type="button"
                  onClick={handleClearAssumption}
                  className="px-3.5 py-2.5 rounded-xl bg-[#06302B] hover:bg-[#FF5555]/15 hover:text-[#FF5555] border border-[#0B453A] hover:border-[#FF5555]/30 text-xs font-sans font-bold text-[#AACBC4] transition-all cursor-pointer"
                >
                  Reset Default
                </button>
                <button 
                  type="button"
                  onClick={handleSaveAssumption}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#2CC295] to-[#00DF81] text-[#021B1A] font-sans font-extrabold text-xs hover:brightness-110 transition-all flex justify-center items-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(0,223,129,0.35)]"
                >
                  <Sparkles size={14} className="text-[#021B1A]" />
                  <span>Save Estimate</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
