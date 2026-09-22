"use client";

import React, { useState, useRef, useEffect } from "react";
import { AlertCircle, ChevronDown, CheckCircle2, Loader2, Sparkles, TrendingUp, TrendingDown, Minus, Calendar, Database } from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

const TABS = ["Macro Data Matrix", "Differential & Rating"];
const INDICATORS = ["GDP", "Current Account", "CPI", "Interest Rate", "FX Reserves", "Equity"];

const PAIRS = [
  { name: "EUR/USD", base: "eu", quote: "us", baseName: "EUR", quoteName: "USD" },
  { name: "GBP/USD", base: "gb", quote: "us", baseName: "GBP", quoteName: "USD" },
  { name: "USD/JPY", base: "us", quote: "jp", baseName: "USD", quoteName: "JPY" },
  { name: "AUD/USD", base: "au", quote: "us", baseName: "AUD", quoteName: "USD" },
  { name: "USD/CAD", base: "us", quote: "ca", baseName: "USD", quoteName: "CAD" },
  { name: "NZD/USD", base: "nz", quote: "us", baseName: "NZD", quoteName: "USD" },
  { name: "USD/CHF", base: "us", quote: "ch", baseName: "USD", quoteName: "CHF" }
];

const YEARS = Array.from({ length: new Date().getFullYear() - 2020 + 1 }).map((_, i) => new Date().getFullYear() - i);

const COUNTRIES = [
  { country: "USA", base: "us" },
  { country: "Euro Area", base: "eu" },
  { country: "Japan", base: "jp" },
  { country: "United Kingdom", base: "gb" },
  { country: "Australia", base: "au" },
  { country: "Canada", base: "ca" },
  { country: "Switzerland", base: "ch" },
  { country: "New Zealand", base: "nz" },
  { country: "Sweden", base: "se" },
  { country: "Norway", base: "no" }
];

// Translucent Glass Cards with Specular Highlight
const matteCard = "bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

// API Fetchers
const fetchMatrixData = async (indicator: string, year: number) => {
  await new Promise(r => setTimeout(r, 300));
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const endMonth = year === currentYear ? currentMonth : 12;
  const months = Array.from({ length: endMonth }).map((_, i) => `${year}-${(i + 1).toString().padStart(2, '0')}`);

  return COUNTRIES.map((c, i) => ({
    ...c,
    data: months.map((m, j) => ({
      value: (i === 2 && j === 4) ? null : (Math.random() * 4 - 1).toFixed(1),
      status: (i === 2 && j === 4) ? "missing" : (i === 0 && j === 5) ? "manual" : "published"
    }))
  }));
};

const fetchCombinedData = async (pair: string, indicator: string, year: number) => {
  await new Promise(r => setTimeout(r, 300));
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const endMonth = year === currentYear ? currentMonth : 12;
  const months = Array.from({ length: endMonth }).map((_, i) => `${year}-${(i + 1).toString().padStart(2, '0')}`);
  
  return months.map(m => {
    const baseVal = (Math.random() * 2.5 + 0.5).toFixed(1);
    const quoteVal = (Math.random() * 2.5 + 0.5).toFixed(1);
    const diff = (parseFloat(baseVal) - parseFloat(quoteVal)).toFixed(1);
    const diffNum = parseFloat(diff);
    
    let rating = 0;
    let rule = "-1.0 to 1.0";
    let regime = "Neutral / Balanced";
    
    if (diffNum >= 2.0) {
      rating = 10;
      rule = "2.0 to +∞";
      regime = "Strong Bullish Bias";
    } else if (diffNum >= 1.0) {
      rating = 5;
      rule = "1.0 to 2.0";
      regime = "Moderate Bullish Bias";
    } else if (diffNum <= -2.0) {
      rating = -10;
      rule = "-∞ to -2.0";
      regime = "Strong Bearish Bias";
    } else if (diffNum <= -1.0) {
      rating = -5;
      rule = "-2.0 to -1.0";
      regime = "Moderate Bearish Bias";
    }

    return { 
      month: m, 
      baseVal, 
      quoteVal, 
      diff: diffNum > 0 ? `+${diff}` : diff, 
      diffNum,
      rating, 
      rule,
      regime
    };
  });
};

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
  const [selectedCell, setSelectedCell] = useState<{ c: string; m: string; val: string } | null>(null);

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

  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: ["macro-matrix", activeInd, selectedYear],
    queryFn: () => fetchMatrixData(activeInd, selectedYear),
    enabled: activeTab === "Macro Data Matrix"
  });

  const { data: combinedData, isLoading: combinedLoading } = useQuery({
    queryKey: ["macro-combined", activePair, activeInd, selectedYear],
    queryFn: () => fetchCombinedData(activePair, activeInd, selectedYear),
    enabled: activeTab === "Differential & Rating"
  });

  // Calculate dynamic months based on selectedYear
  const currentYear = new Date().getFullYear();
  const endMonth = selectedYear === currentYear ? new Date().getMonth() + 1 : 12;
  const displayMonths = Array.from({ length: endMonth }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`);

  const saveOverrideMutation = useMutation({
    mutationFn: async (payload: any) => {
      await new Promise(r => setTimeout(r, 600));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["macro-matrix", activeInd] });
      setSelectedCell(null);
    }
  });

  const activePairObj = PAIRS.find(p => p.name === activePair) || PAIRS[0];

  return (
    <div className="flex flex-col w-full h-full bg-transparent relative justify-between overflow-x-hidden">
      
      {/* 1. Header: Clean placement with GlobalSearch & AuthHeaderWidget */}
      <header className="w-full flex items-center justify-between px-8 py-5 pb-2 opacity-0 animate-fadeIn">
        <div className="flex flex-col gap-1">
          <span className="font-sans font-medium text-xs text-[#A0A5B1]">Engine Data Pipeline</span>
          <h1 className="font-sans font-bold text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Macro Data Center
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <GlobalSearch placeholder="Search indicators, pairs, countries..." />
          <AuthHeaderWidget />
        </div>
      </header>

      {/* 2. Main Content Container: Sized to fit comfortably with FULL tables */}
      <main className="flex-1 flex flex-col px-8 gap-3.5 pb-6 max-w-[1550px] w-full mx-auto">
        
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
                        {PAIRS.map(pair => (
                          <button
                            key={pair.name}
                            type="button"
                            onClick={() => {
                              setActivePair(pair.name);
                              setIsOpenPairDropdown(false);
                            }}
                            className={clsx(
                              "w-full px-3 py-2 text-left font-sans font-bold text-xs transition-colors rounded-xl flex items-center gap-2.5 cursor-pointer",
                              activePair === pair.name ? "bg-[#D2F646]/15 text-[#D2F646]" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <FlagStack base={pair.base} quote={pair.quote} />
                            <span>{pair.name}</span>
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
                        className="absolute top-[calc(100%+8px)] left-0 w-[180px] bg-[#161822]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] p-1.5 flex flex-col gap-1"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-mono text-[#A0A5B1] uppercase tracking-wider">
                          Select Indicator
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

        {/* 3. Table Card: FULL content without empty voids */}
        <div className={clsx("flex flex-col relative z-0 overflow-hidden opacity-0 animate-slideUp shadow-2xl", matteCard)} style={{ animationDelay: "0.15s" }}>
          
          {/* ============================================================== */}
          {/* TAB 1: MACRO DATA MATRIX (All 10 G10 Countries Full Table)     */}
          {/* ============================================================== */}
          {activeTab === "Macro Data Matrix" && (
            <div className="flex flex-col w-full">
              
              {/* Header Info Banner */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-2.5">
                  <Database size={15} className="text-[#D2F646]" />
                  <span className="font-sans font-bold text-xs text-white">
                    G10 Currency Sovereign Matrix: {activeInd} ({selectedYear})
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-mono text-[#A0A5B1]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6FF542]" />
                    Published (Official)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#A0A5B1]" />
                    Manual Override
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF4444]" />
                    Missing Print
                  </span>
                </div>
              </div>

              {/* Matrix Table with All 10 G10 Countries (FULL) */}
              <div className="overflow-x-auto w-full p-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-4 py-2 font-sans font-medium text-xs text-[#A0A5B1] w-[180px] border-r border-white/5">Country / Sovereign</th>
                      {displayMonths.map((m) => (
                        <th key={m} className="px-3 py-2 font-sans font-medium text-xs text-[#A0A5B1] text-center min-w-[95px]">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {matrixLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5 border-r border-white/5"><div className="w-[120px] h-[20px] bg-white/5 rounded-md animate-pulse" /></td>
                          {displayMonths.map((m, j) => <td key={j} className="p-2"><div className="w-[75px] h-[36px] bg-white/5 rounded-xl animate-pulse mx-auto" /></td>)}
                        </tr>
                      ))
                    ) : (
                      matrixData?.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2 border-r border-white/5">
                            <div className="flex items-center gap-2.5 p-1 whitespace-nowrap">
                              <img src={`/flags/${row.base}.svg`} className="w-5 h-5 rounded-full border border-white/10 shadow-sm flex-shrink-0" alt={row.base} />
                              <span className="font-sans font-bold text-xs text-white">{row.country}</span>
                            </div>
                          </td>
                          {row.data.map((cell: any, j: number) => (
                            <td key={j} className="px-1.5 py-1 text-center relative group/cell">
                              <button 
                                onClick={() => setSelectedCell({ c: row.country, m: displayMonths[j], val: cell.value || "N/A" })}
                                className="inline-flex flex-col items-center justify-center w-[84px] py-1 px-1 rounded-xl transition-all duration-150 hover:bg-[#242731] hover:scale-[1.03] cursor-pointer group-hover/cell:border-white/10 border border-transparent"
                              >
                                <span className={clsx(
                                  "font-sans text-xs font-bold transition-transform",
                                  cell.status === "missing" ? "text-[#FF4444]" : "text-white"
                                  )}>
                                  {cell.value || "—"}
                                </span>
                                <div className="mt-0.5">
                                  {cell.status === "published" && <span className="bg-[#6FF542]/10 text-[#6FF542] border border-[#6FF542]/20 px-1.5 py-0.2 rounded text-[8px] font-bold tracking-wider uppercase">Pub</span>}
                                  {cell.status === "manual" && <span className="bg-[#A0A5B1]/10 text-[#A0A5B1] border border-white/10 px-1.5 py-0.2 rounded text-[8px] font-bold tracking-wider uppercase">Man</span>}
                                  {cell.status === "missing" && <span className="bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/20 px-1.5 py-0.2 rounded text-[8px] font-bold tracking-wider uppercase">Mis</span>}
                                </div>
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary Bar - Fills bottom neatly */}
              <div className="flex items-center justify-between px-6 py-2.5 border-t border-white/5 bg-[#121418]/60 text-xs">
                <span className="font-sans text-[#A0A5B1]">
                  Displaying complete <strong className="text-white">10 of 10 G10 economies</strong> across {displayMonths.length} monthly statistical releases.
                </span>
                <span className="font-mono text-[#6FF542] text-[11px] font-bold">
                  100% Ingestion Coverage
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: COMBINED DIFFERENTIAL & RATING (FULL TABLE NO VOID)     */}
          {/* ============================================================== */}
          {activeTab === "Differential & Rating" && (
            <div className="flex flex-col w-full">
              
              {/* Header Info Banner */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-2.5">
                  <FlagStack base={activePairObj.base} quote={activePairObj.quote} />
                  <span className="font-sans font-bold text-xs text-white">
                    Differential Transformation: {activePair} • {activeInd} ({selectedYear})
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-[#A0A5B1]">
                  <span>Formula: </span>
                  <span className="text-[#D2F646] font-bold">Diff = {activePairObj.baseName} − {activePairObj.quoteName}</span>
                </div>
              </div>

              {/* Table with ALL Available Months of the Year (FULL) */}
              <div className="overflow-x-auto w-full p-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] font-mono uppercase tracking-wider text-[#A0A5B1]">
                      <th className="py-2.5 px-4 w-[140px]">Release Month</th>
                      <th className="py-2.5 px-4 text-center w-[160px]">Base ({activePairObj.baseName})</th>
                      <th className="py-2.5 px-4 text-center w-[160px]">Quote ({activePairObj.quoteName})</th>
                      <th className="py-2.5 px-4 text-center w-[180px]">Calculated Differential</th>
                      <th className="py-2.5 px-4 text-center w-[180px]">Rule Threshold</th>
                      <th className="py-2.5 px-4 text-center w-[220px]">Engine Sentiment Regime</th>
                      <th className="py-2.5 px-4 text-right w-[130px]">Rating Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-xs">
                    {combinedLoading ? (
                      Array.from({ length: 9 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="p-3"><div className="w-full h-[28px] bg-white/5 rounded-md animate-pulse" /></td>
                        </tr>
                      ))
                    ) : (
                      combinedData?.map((row: any, i: number) => {
                        const isPositive = row.rating > 0;
                        const isNegative = row.rating < 0;

                        return (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            {/* Month */}
                            <td className="py-2.5 px-4">
                              <span className="font-mono font-bold text-xs text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                {row.month}
                              </span>
                            </td>

                            {/* Base */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[#A0A5B1]">
                                <img src={`/flags/${activePairObj.base}.svg`} className="w-4 h-4 rounded-full border border-white/10" alt={activePairObj.base} />
                                <span className="text-white font-bold">{row.baseVal}%</span>
                              </div>
                            </td>

                            {/* Quote */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[#A0A5B1]">
                                <img src={`/flags/${activePairObj.quote}.svg`} className="w-4 h-4 rounded-full border border-white/10" alt={activePairObj.quote} />
                                <span className="text-white font-bold">{row.quoteVal}%</span>
                              </div>
                            </td>

                            {/* Differential */}
                            <td className="py-2.5 px-4 text-center">
                              <span className={clsx(
                                "inline-block font-mono font-bold text-xs px-2.5 py-1 rounded-lg",
                                row.diffNum > 0 ? "text-[#D2F646] bg-[#D2F646]/10 border border-[#D2F646]/20" :
                                row.diffNum < 0 ? "text-[#FF5B5B] bg-[#FF4444]/10 border border-[#FF4444]/20" :
                                "text-white bg-white/5 border border-white/10"
                              )}>
                                {row.diff}%
                              </span>
                            </td>

                            {/* Rule Applied */}
                            <td className="py-2.5 px-4 text-center">
                              <span className="font-mono text-xs text-[#A0A5B1] bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-lg">
                                {row.rule}
                              </span>
                            </td>

                            {/* Engine Sentiment Regime */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                {isPositive && (
                                  <span className="flex items-center gap-1 text-[#D2F646] bg-[#D2F646]/10 border border-[#D2F646]/25 px-2.5 py-0.5 rounded-full">
                                    <TrendingUp size={12} />
                                    <span>{row.regime}</span>
                                  </span>
                                )}
                                {isNegative && (
                                  <span className="flex items-center gap-1 text-[#FF5B5B] bg-[#FF4444]/10 border border-[#FF4444]/25 px-2.5 py-0.5 rounded-full">
                                    <TrendingDown size={12} />
                                    <span>{row.regime}</span>
                                  </span>
                                )}
                                {!isPositive && !isNegative && (
                                  <span className="flex items-center gap-1 text-[#A0A5B1] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                                    <Minus size={12} />
                                    <span>{row.regime}</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Rating Score Impact */}
                            <td className="py-2.5 px-4 text-right">
                              <span className={clsx(
                                "inline-block px-3 py-1 rounded-xl font-mono font-bold text-xs shadow-sm",
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

              {/* Bottom Summary Bar - Fills bottom neatly */}
              <div className="flex items-center justify-between px-6 py-2.5 border-t border-white/5 bg-[#121418]/60 text-xs">
                <span className="font-sans text-[#A0A5B1]">
                  Total of <strong className="text-white">{combinedData?.length || 0} monthly observations</strong> evaluated for {activePair} across {selectedYear}.
                </span>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#A0A5B1]">Net Annual Rating Sum:</span>
                  <span className="text-[#D2F646] font-bold bg-[#D2F646]/10 border border-[#D2F646]/20 px-2 py-0.5 rounded-lg">
                    {combinedData ? combinedData.reduce((acc: number, r: any) => acc + r.rating, 0) : 0} pts
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Manual Override Drawer */}
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
                defaultValue={selectedCell.val} 
                className="w-full bg-[#121418] border border-white/10 rounded-xl px-4 py-2.5 font-mono font-bold text-base text-white outline-none focus:border-[#D2F646] transition-all" 
              />
              <button 
                onClick={() => saveOverrideMutation.mutate({ country: selectedCell.c, month: selectedCell.m, value: "..." })}
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
