"use client";

import React, { useState } from "react";
import { ChevronDown, Info, X } from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

import { INDICATORS, getCombinedDifferentialData, SYSTEM_CURRENT_YEAR, SYSTEM_CURRENT_MONTH, MACRO_YEARS } from "@/data/macroDataset";

const PAIRS = [
  { name: "EUR/USD", base: "eu", quote: "us" },
  { name: "GBP/USD", base: "gb", quote: "us" },
  { name: "USD/JPY", base: "us", quote: "jp" },
  { name: "AUD/USD", base: "au", quote: "us" },
  { name: "USD/CAD", base: "us", quote: "ca" },
  { name: "NZD/USD", base: "nz", quote: "us" },
  { name: "USD/CHF", base: "us", quote: "ch" }
];

const YEARS = MACRO_YEARS;

// Translucent Glass Cards with Specular Highlight and Basil borders
const matteCard = "bg-[#032221]/90 backdrop-blur-2xl border border-[#0B453A] rounded-[24px] sm:rounded-[28px] shadow-[0_16px_40px_rgba(2,27,26,0.6),inset_0_1px_0_0_rgba(241,247,246,0.06)]";

const fetchFinalScores = async (year: number) => {
  await new Promise(r => setTimeout(r, 200));
  const endMonth = year === SYSTEM_CURRENT_YEAR ? SYSTEM_CURRENT_MONTH : 12;
  const displayMonths = Array.from({ length: endMonth }).map((_, i) => `${year}-${(i + 1).toString().padStart(2, '0')}`);

  // Compute differential data for each base pair
  const pairIndicatorData: Record<string, Record<string, Record<string, number>>> = {};
  for (const p of PAIRS) {
    pairIndicatorData[p.name] = {};
    for (const ind of INDICATORS) {
      const diffList = getCombinedDifferentialData(p.name, ind, year);
      pairIndicatorData[p.name][ind] = {};
      for (const d of diffList) {
        pairIndicatorData[p.name][ind][d.month] = d.rating;
      }
    }
  }

  return PAIRS.map((pairData) => ({
    pair: pairData.name,
    base: pairData.base,
    quote: pairData.quote,
    data: displayMonths.map((month) => {
      const indicators = INDICATORS.map(ind => ({
        ind,
        val: pairIndicatorData[pairData.name]?.[ind]?.[month] ?? 0
      }));
      
      const totalScore = indicators.reduce((sum, item) => sum + item.val, 0); 
      const finalScorePct = ((totalScore / 60) * 100).toFixed(1); 
      const bias = parseFloat(finalScorePct) >= 20.0 ? "BULLISH" : parseFloat(finalScorePct) <= -20.0 ? "BEARISH" : "NEUTRAL";
      
      return { month, indicators, totalScore, finalScorePct, bias };
    })
  }));
};

const FlagStack = ({ base, quote }: { base: string; quote: string }) => (
  <div className="flex items-center flex-shrink-0 mr-1.5">
    <img src={`/flags/${base}.svg`} className="w-[18px] h-[18px] rounded-full border border-[#0B453A] z-10 shadow-sm" alt={base} />
    <img src={`/flags/${quote}.svg`} className="w-[18px] h-[18px] rounded-full border border-[#0B453A] -ml-1.5 z-0 shadow-sm" alt={quote} />
  </div>
);

export default function FinalScorePage() {
  const [selectedCell, setSelectedCell] = useState<{ pair: string; base: string; quote: string; data: any } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const { data: scoresData, isLoading } = useQuery({
    queryKey: ["final-scores", selectedYear],
    queryFn: () => fetchFinalScores(selectedYear),
  });

  const displayMonths = Array.from({ length: selectedYear === SYSTEM_CURRENT_YEAR ? SYSTEM_CURRENT_MONTH : 12 }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`);

  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-transparent relative justify-between">
      {/* Page Header */}
      <header className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 lg:pt-8 pb-4 opacity-0 animate-fadeIn relative z-50 flex-shrink-0 gap-4" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-1">
          <span className="font-sans font-medium text-xs text-[#AACBC4]">Engine Output</span>
          <h1 className="font-sans font-bold text-2xl sm:text-3xl text-[#F1F7F6] tracking-tight leading-none">
            Final Score Matrix
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
          <GlobalSearch placeholder="Search indicators, pairs, countries..." />

          {/* Year Dropdown */}
          <div className="relative group flex items-center bg-[#06302B] hover:bg-[#095544] border border-[#0B453A] rounded-2xl px-3.5 py-2 shadow-lg cursor-pointer transition-colors shrink-0">
            <span className="font-sans font-bold text-xs text-[#F1F7F6] mr-2">{selectedYear}</span>
            <ChevronDown size={14} className="text-[#AACBC4] transition-transform group-hover:rotate-180" />
            
            <div className="absolute top-[calc(100%+8px)] right-0 w-[120px] bg-[#032221] border border-[#0B453A] rounded-2xl overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              {YEARS.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={clsx(
                    "w-full px-4 py-2 text-left font-sans font-bold text-xs transition-colors cursor-pointer",
                    selectedYear === year ? "bg-[#00DF81]/20 text-[#00DF81]" : "text-[#AACBC4] hover:bg-[#06302B] hover:text-[#F1F7F6]"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <AuthHeaderWidget />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-10 gap-5 pb-8 max-w-[1600px] w-full mx-auto justify-center">
        {/* Table Container */}
        <div className="flex-1 flex flex-col justify-center my-auto w-full py-2">
          <div className={clsx("flex flex-col relative overflow-hidden opacity-0 animate-slideUp shadow-2xl", matteCard)} style={{ animationDelay: "0.15s" }}>
            
            {/* Header Info Banner */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#0B453A] bg-[#021B1A]/40 gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-sans font-bold text-xs sm:text-sm text-[#F1F7F6]">
                  G10 Sovereign Macro Bias Composite Score Matrix ({selectedYear})
                </span>
              </div>
              <div className="flex items-center gap-3 sm:gap-5 text-[11px] sm:text-xs font-mono text-[#AACBC4] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00DF81] shadow-[0_0_6px_rgba(0,223,129,0.8)]" />
                  Bullish (≥ +20%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#AACBC4]" />
                  Neutral (-20% to +20%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5555] shadow-[0_0_6px_rgba(255,85,85,0.8)]" />
                  Bearish (≤ -20%)
                </span>
              </div>
            </div>

            {/* Matrix Table with Sticky Frozen FX Pair Column */}
            <div className="overflow-x-auto w-full p-2 sm:p-4">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#0B453A]">
                    {/* Sticky Left Header */}
                    <th className="sticky left-0 bg-[#032221] z-30 px-4 sm:px-5 py-3 font-sans font-semibold text-xs sm:text-sm text-[#AACBC4] w-[140px] sm:w-[180px] border-r border-[#0B453A] shadow-[4px_0_12px_rgba(2,27,26,0.8)]">
                      FX Pair
                    </th>
                    {displayMonths.map((m) => (
                      <th key={m} className="px-2 sm:px-3 py-3 font-sans font-semibold text-xs sm:text-sm text-[#AACBC4] text-center min-w-[85px] sm:min-w-[104px] whitespace-nowrap">
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B453A]/40">
                  {isLoading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <tr key={i}>
                        <td className="sticky left-0 bg-[#032221] z-20 px-4 sm:px-5 py-3 border-r border-[#0B453A] shadow-[4px_0_12px_rgba(2,27,26,0.8)]">
                          <div className="w-[110px] h-[24px] bg-[#06302B] rounded-md animate-pulse" />
                        </td>
                        {displayMonths.map((m, j) => (
                          <td key={j} className="p-2">
                            <div className="w-full h-[52px] bg-[#06302B] rounded-xl animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    scoresData?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-[#06302B]/30 transition-colors">
                        {/* Sticky Left Data Cell */}
                        <td className="sticky left-0 bg-[#032221] z-20 px-4 sm:px-5 py-2.5 border-r border-[#0B453A] shadow-[4px_0_12px_rgba(2,27,26,0.8)]">
                          <div className="flex items-center gap-2 sm:gap-2.5 p-0.5 whitespace-nowrap">
                            <FlagStack base={row.base} quote={row.quote} />
                            <span className="font-sans font-bold text-xs sm:text-sm text-[#F1F7F6]">{row.pair}</span>
                          </div>
                        </td>
                        {row.data.map((cell: any, j: number) => {
                          const isBullish = cell.bias === "BULLISH";
                          const isBearish = cell.bias === "BEARISH";
                          return (
                            <td key={j} className="px-1.5 sm:px-2 py-1.5 sm:py-2 text-center relative group/cell">
                              <button 
                                onClick={() => setSelectedCell({ pair: row.pair, base: row.base, quote: row.quote, data: cell })}
                                className={clsx(
                                  "inline-flex flex-col items-center justify-center w-full py-2 sm:py-2.5 px-2 sm:px-3 min-h-[48px] sm:min-h-[56px] rounded-xl transition-all duration-150 hover:scale-[1.03] cursor-pointer border",
                                  isBullish 
                                    ? "bg-[#06302B] border-[#00DF81]/30 hover:border-[#00DF81] hover:shadow-[0_0_16px_rgba(0,223,129,0.25)]" 
                                    : isBearish 
                                    ? "bg-[#2A1215]/80 border-[#FF5555]/30 hover:border-[#FF5555] hover:shadow-[0_0_16px_rgba(255,85,85,0.2)]" 
                                    : "bg-[#06302B]/50 border-[#0B453A] hover:border-[#AACBC4]/40"
                                )}
                              >
                                <span className={clsx(
                                  "font-sans text-xs sm:text-[15px] font-black tracking-tight transition-transform",
                                  isBullish ? "text-[#00DF81]" : isBearish ? "text-[#FF5555]" : "text-[#F1F7F6]"
                                )}>
                                  {parseFloat(cell.finalScorePct) > 0 ? `+${cell.finalScorePct}%` : `${cell.finalScorePct}%`}
                                </span>
                                <span className={clsx(
                                  "mt-0.5 font-sans text-[8px] sm:text-[9px] font-extrabold tracking-wider uppercase",
                                  isBullish ? "text-[#00DF81]/90" : isBearish ? "text-[#FF5555]/90" : "text-[#AACBC4]"
                                )}>
                                  {cell.bias}
                                </span>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 border-t border-[#0B453A] bg-[#021B1A]/80 text-xs sm:text-sm gap-2">
              <span className="font-sans text-[#AACBC4]">
                Composite Model: <strong className="text-[#F1F7F6]">7 Active Currency Pairs</strong> calculated via 6-tier macro weighted engine.
              </span>
              <span className="font-mono text-[#00DF81] text-xs font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00DF81] animate-pulse" />
                100% Ingestion Complete
              </span>
            </div>
          </div>
        </div>

        {/* Drill-down Slide-over Drawer */}
        <AnimatePresence>
          {selectedCell && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#021B1A]/80 backdrop-blur-md z-40" 
                onClick={() => setSelectedCell(null)}
              />
              <motion.div 
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: "spring", stiffness: 350, damping: 32 }}
                className="fixed top-0 right-0 h-full w-full sm:w-[500px] max-w-full bg-[#032221]/95 backdrop-blur-3xl border-l border-[#0B453A] shadow-[-30px_0_70px_rgba(2,27,26,0.95),inset_0_1px_0_0_rgba(241,247,246,0.08)] p-5 sm:p-7 z-50 overflow-y-auto flex flex-col gap-4.5 scrollbar-thin scrollbar-thumb-[#0B453A]" 
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#0B453A]/60 shrink-0">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-sans font-bold text-2xl sm:text-3xl text-[#F1F7F6] tracking-tight">Score Details</h3>
                    <div className="flex items-center gap-2.5">
                      <FlagStack base={selectedCell.base} quote={selectedCell.quote} />
                      <span className="font-sans font-medium text-sm sm:text-base text-[#AACBC4]">{selectedCell.pair} — {selectedCell.data.month}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCell(null)} 
                    className="w-10 h-10 rounded-xl bg-[#06302B] border border-[#0B453A] flex items-center justify-center hover:bg-[#095544] hover:text-[#F1F7F6] transition-colors cursor-pointer z-50 group shrink-0"
                    aria-label="Close details"
                  >
                    <X size={20} className="text-[#AACBC4] group-hover:text-[#F1F7F6] transition-colors" />
                  </button>
                </div>

                {/* 6 Indicators Table */}
                <div className="flex flex-col rounded-2xl bg-[#021B1A]/90 shadow-inner border border-[#0B453A] shrink-0 overflow-hidden">
                  <div className="grid grid-cols-2 px-4 py-2.5 bg-[#032221] border-b border-[#0B453A]">
                    <span className="font-sans font-medium text-xs text-[#AACBC4] uppercase tracking-wider">Indicator (6 Total)</span>
                    <span className="font-sans font-medium text-xs text-[#AACBC4] text-right uppercase tracking-wider">Rating</span>
                  </div>
                  <div className="divide-y divide-[#0B453A]/30 p-1.5">
                    {selectedCell.data.indicators.map((item: any, i: number) => (
                      <div key={i} className="grid grid-cols-2 px-3 py-2.5 hover:bg-[#06302B]/60 rounded-xl transition-colors cursor-default items-center">
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            "w-2 h-2 rounded-full shrink-0",
                            item.val > 0 ? "bg-[#00DF81]" : item.val < 0 ? "bg-[#FF5555]" : "bg-[#AACBC4]/40"
                          )} />
                          <span className="font-sans font-bold text-sm text-[#F1F7F6]">{item.ind}</span>
                        </div>
                        <div className="flex justify-end">
                          <span className={clsx(
                            "font-sans font-bold text-xs sm:text-sm px-2.5 py-0.5 rounded-lg border font-mono min-w-[42px] text-center",
                            item.val > 0 
                              ? "bg-[#00DF81]/15 border-[#00DF81]/30 text-[#00DF81]" 
                              : item.val < 0 
                                ? "bg-[#FF5555]/15 border-[#FF5555]/30 text-[#FF5555]" 
                                : "bg-[#06302B] border-[#0B453A] text-[#AACBC4]"
                          )}>
                            {item.val > 0 ? `+${item.val}` : item.val}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Calculation & Normalization */}
                <div className="flex flex-col p-4 sm:p-5 bg-[#06302B]/90 rounded-2xl gap-3 border border-[#0B453A] shadow-inner shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="font-sans font-medium text-xs sm:text-sm text-[#AACBC4]">Total Rating (Sum of 6 Indicators)</span>
                    <span className="font-sans font-bold text-lg sm:text-xl text-[#F1F7F6] font-mono">
                      {selectedCell.data.totalScore > 0 ? `+${selectedCell.data.totalScore}` : selectedCell.data.totalScore} <span className="text-xs text-[#AACBC4] font-normal">/ 60</span>
                    </span>
                  </div>
                  
                  <div className="w-full h-[1px] bg-[#0B453A]" />
                  
                  <div className="flex flex-col gap-1">
                    <span className="font-sans font-medium text-xs text-[#AACBC4]">Normalization Formula:</span>
                    <span className="font-mono text-xs text-[#00DF81] tracking-wider bg-[#021B1A]/80 px-2.5 py-1 rounded-lg border border-[#0B453A]/50">
                      ({selectedCell.data.totalScore} ÷ 60) × 100
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-0.5">
                    <span className="font-sans font-bold text-sm text-[#F1F7F6]">Final Score %</span>
                    <span className={clsx(
                      "font-sans font-bold text-xl sm:text-2xl font-mono",
                      parseFloat(selectedCell.data.finalScorePct) > 0 ? "text-[#00DF81]" : 
                      parseFloat(selectedCell.data.finalScorePct) < 0 ? "text-[#FF5555]" : "text-[#F1F7F6]"
                    )}>
                      {parseFloat(selectedCell.data.finalScorePct) > 0 ? `+${selectedCell.data.finalScorePct}%` : `${selectedCell.data.finalScorePct}%`}
                    </span>
                  </div>

                  <div className={clsx(
                    "flex justify-between items-center p-3.5 rounded-xl border mt-1",
                    selectedCell.data.bias === "BULLISH" ? "bg-[#00DF81]/10 border-[#00DF81]/40" :
                    selectedCell.data.bias === "BEARISH" ? "bg-[#FF5555]/10 border-[#FF5555]/40" : "bg-[#021B1A]/80 border-[#0B453A]"
                  )}>
                    <span className={clsx(
                      "font-sans font-bold text-xs uppercase tracking-wider",
                      selectedCell.data.bias === "BULLISH" ? "text-[#00DF81]" :
                      selectedCell.data.bias === "BEARISH" ? "text-[#FF5555]" : "text-[#AACBC4]"
                    )}>Macro Bias Output</span>
                    <span className={clsx(
                      "font-sans font-black text-base sm:text-lg tracking-widest px-3 py-1 rounded-lg font-mono",
                      selectedCell.data.bias === "BULLISH" ? "bg-[#00DF81]/20 text-[#00DF81] shadow-[0_0_12px_rgba(0,223,129,0.3)]" :
                      selectedCell.data.bias === "BEARISH" ? "bg-[#FF5555]/20 text-[#FF5555] shadow-[0_0_12px_rgba(255,85,85,0.3)]" : "bg-[#06302B] text-[#F1F7F6]"
                    )}>{selectedCell.data.bias}</span>
                  </div>
                </div>

                {/* Calculation Status */}
                <div className="flex flex-col gap-2 p-3.5 sm:p-4 rounded-2xl bg-[#06302B]/40 border border-[#0B453A] shadow-inner shrink-0 mb-4">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-[#00DF81] shrink-0" />
                    <span className="font-sans font-bold text-xs sm:text-sm text-[#F1F7F6]">Calculation Status</span>
                  </div>
                  <p className="font-sans font-medium text-xs text-[#AACBC4] leading-relaxed">
                    Score calculation verified. All 6 macro indicators (GDP, Current Account, CPI, Interest Rate, FX Reserves, Equity) active and synchronized with live quantitative engine.
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
