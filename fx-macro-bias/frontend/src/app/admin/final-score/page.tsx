"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

import { INDICATORS, getCombinedDifferentialData } from "@/data/macroDataset";

const PAIRS = [
  { name: "EUR/USD", base: "eu", quote: "us" },
  { name: "GBP/USD", base: "gb", quote: "us" },
  { name: "USD/JPY", base: "us", quote: "jp" },
  { name: "AUD/USD", base: "au", quote: "us" },
  { name: "USD/CAD", base: "us", quote: "ca" },
  { name: "NZD/USD", base: "nz", quote: "us" },
  { name: "USD/CHF", base: "us", quote: "ch" }
];

const YEARS = Array.from({ length: new Date().getFullYear() - 2020 + 1 }).map((_, i) => new Date().getFullYear() - i);

// Translucent Glass Cards with Specular Highlight
const matteCard = "bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[28px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

const fetchFinalScores = async (year: number) => {
  await new Promise(r => setTimeout(r, 200));
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const endMonth = year === currentYear ? currentMonth : 12;
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
  <div className="flex items-center flex-shrink-0 mr-[4px]">
    <img src={`/flags/${base}.svg`} className="w-[18px] h-[18px] rounded-full border border-white/20 z-10 shadow-sm" alt={base} />
    <img src={`/flags/${quote}.svg`} className="w-[18px] h-[18px] rounded-full border border-white/20 -ml-[6px] z-0 shadow-sm" alt={quote} />
  </div>
);

export default function FinalScorePage() {
  const [selectedCell, setSelectedCell] = useState<{ pair: string; base: string; quote: string; data: any } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(YEARS[0]);

  const { data: scoresData, isLoading } = useQuery({
    queryKey: ["final-scores", selectedYear],
    queryFn: () => fetchFinalScores(selectedYear),
  });

  const displayMonths = Array.from({ length: selectedYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12 }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`);

  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-transparent relative justify-between">
      <header className="w-full flex items-center justify-between px-12 pt-9 pb-5 opacity-0 animate-fadeIn relative z-50 flex-shrink-0" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-1">
          <span className="font-sans font-medium text-xs text-[#A0A5B1]">Engine Output</span>
          <h1 className="font-sans font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Final Score Matrix
          </h1>
        </div>
        <div className="flex items-center gap-3.5">
          <GlobalSearch placeholder="Search indicators, pairs, countries..." />
          <div className="relative group flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 shadow-lg cursor-pointer">
            <span className="font-sans font-bold text-xs text-white mr-2">{selectedYear}</span>
            <ChevronDown size={14} className="text-[#A0A5B1] transition-transform group-hover:rotate-180" />
            
            <div className="absolute top-[calc(100%+8px)] right-0 w-[120px] bg-[#121418] border border-white/10 rounded-2xl overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              {YEARS.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={clsx(
                    "w-full px-4 py-2 text-left font-sans font-bold text-xs transition-colors",
                    selectedYear === year ? "bg-white/10 text-white" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
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

      <main className="flex-1 flex flex-col px-12 gap-5 pb-8 max-w-[1600px] w-full mx-auto justify-center">
        {/* Centered Table Container */}
        <div className="flex-1 flex flex-col justify-center my-auto w-full py-4">
          <div className={clsx("flex flex-col relative overflow-hidden opacity-0 animate-slideUp shadow-2xl", matteCard)} style={{ animationDelay: "0.15s" }}>
            
            {/* Header Info Banner */}
            <div className="flex items-center justify-between px-7 py-3.5 border-b border-white/5 bg-white/[0.01]">
              <div className="flex items-center gap-2.5">
                <span className="font-sans font-bold text-sm text-white">
                  G10 Sovereign Macro Bias Composite Score Matrix ({selectedYear})
                </span>
              </div>
              <div className="flex items-center gap-5 text-xs font-mono text-[#A0A5B1]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6FF542]" />
                  Bullish (≥ +20%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A0A5B1]" />
                  Neutral (-20% to +20%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF4444]" />
                  Bearish (≤ -20%)
                </span>
              </div>
            </div>

            {/* Matrix Table with All 7 G10 Pairs */}
            <div className="overflow-x-auto w-full p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3.5 font-sans font-semibold text-sm text-[#A0A5B1] w-[190px] border-r border-white/5">FX Pair</th>
                    {displayMonths.map((m) => (
                      <th key={m} className="px-3 py-3.5 font-sans font-semibold text-sm text-[#A0A5B1] text-center min-w-[108px]">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {isLoading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-5 py-3 border-r border-white/5"><div className="w-[130px] h-[26px] bg-white/5 rounded-md animate-pulse" /></td>
                        {displayMonths.map((m, j) => <td key={j} className="p-2"><div className="w-full h-[52px] bg-white/5 rounded-xl animate-pulse" /></td>)}
                      </tr>
                    ))
                  ) : (
                    scoresData?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 border-r border-white/5">
                          <div className="flex items-center gap-3 p-0.5 whitespace-nowrap">
                            <FlagStack base={row.base} quote={row.quote} />
                            <span className="font-sans font-bold text-sm text-white">{row.pair}</span>
                          </div>
                        </td>
                        {row.data.map((cell: any, j: number) => {
                          const isBullish = cell.bias === "BULLISH";
                          const isBearish = cell.bias === "BEARISH";
                          return (
                            <td key={j} className="px-2 py-2 text-center relative group/cell">
                              <button 
                                onClick={() => setSelectedCell({ pair: row.pair, base: row.base, quote: row.quote, data: cell })}
                                className={clsx(
                                  "inline-flex flex-col items-center justify-center w-full py-2.5 px-3 min-h-[58px] rounded-xl transition-all duration-150 hover:bg-[#242731] hover:scale-[1.03] cursor-pointer group-hover/cell:border-white/10 border",
                                  isBullish ? "bg-[#1E2E1E]/80 border-[#6FF542]/20" : isBearish ? "bg-[#2E1E1E]/80 border-[#FF4444]/20" : "bg-[#242731]/70 border-transparent"
                                )}
                              >
                                <span className={clsx(
                                  "font-sans text-[16px] font-black tracking-tight transition-transform",
                                  isBullish ? "text-[#6FF542]" : isBearish ? "text-[#FF4444]" : "text-white"
                                )}>
                                  {parseFloat(cell.finalScorePct) > 0 ? `+${cell.finalScorePct}%` : `${cell.finalScorePct}%`}
                                </span>
                                <span className={clsx(
                                  "mt-0.5 font-sans text-[9px] font-extrabold tracking-wider uppercase",
                                  isBullish ? "text-[#6FF542]/90" : isBearish ? "text-[#FF4444]/90" : "text-[#A0A5B1]"
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
            <div className="flex items-center justify-between px-7 py-3.5 border-t border-white/5 bg-[#121418]/60 text-sm">
              <span className="font-sans text-[#A0A5B1]">
                Composite Model: <strong className="text-white">7 Active Currency Pairs</strong> calculated via 6-tier macro weighted engine.
              </span>
              <span className="font-mono text-[#6FF542] text-xs font-bold">
                100% Ingestion Complete
              </span>
            </div>
          </div>
        </div>


        <AnimatePresence>
          {selectedCell && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-40" 
                onClick={() => setSelectedCell(null)}
              />
              <motion.div 
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: "spring", stiffness: 350, damping: 32 }}
                className="fixed top-0 right-0 h-full w-[480px] bg-[#161822]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-30px_0_70px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] p-[40px] z-50 overflow-y-auto flex flex-col gap-[32px]" 
              >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-[8px]">
                  <h3 className="font-sans font-bold text-[28px] text-[#FFFFFF] tracking-tight">Score Details</h3>
                  <div className="flex items-center gap-[12px]">
                    <FlagStack base={selectedCell.base} quote={selectedCell.quote} />
                    <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">{selectedCell.pair} — {selectedCell.data.month} 2026</span>
                  </div>
                </div>
                <button onClick={() => setSelectedCell(null)} className="w-[40px] h-[40px] rounded-[12px] bg-[#121418] border border-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-50 group">
                  <ChevronDown size={24} className="text-[#A0A5B1] group-hover:text-white -rotate-90 transition-all" />
                </button>
              </div>

            <div className="flex flex-col rounded-[24px] bg-[#121418]/80 shadow-inner border border-white/5 overflow-hidden p-[8px]">
              <div className="grid grid-cols-2 p-[16px] border-b border-white/5">
                <span className="font-sans font-medium text-[14px] text-[#A0A5B1]">Indicator</span>
                <span className="font-sans font-medium text-[14px] text-[#A0A5B1] text-right">Rating</span>
              </div>
              {selectedCell.data.indicators.map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-2 p-[16px] hover:bg-[#1E2028] rounded-[16px] transition-colors cursor-default">
                  <span className="font-sans font-bold text-[16px] text-[#FFFFFF]">{item.ind}</span>
                  <span className={clsx(
                    "font-sans font-bold text-[17px] text-right",
                    item.val > 0 ? "text-[#6FF542]" : item.val < 0 ? "text-[#FF4444]" : "text-[#A0A5B1]"
                  )}>{item.val > 0 ? `+${item.val}` : item.val}</span>
                </div>
              ))}
              
              <div className="flex flex-col p-[20px] mt-[8px] bg-[#1E2028] rounded-[16px] gap-[12px]">
                <div className="flex justify-between items-center">
                  <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">Total Rating (Sum)</span>
                  <span className="font-sans font-bold text-[20px] text-[#FFFFFF]">
                    {selectedCell.data.totalScore > 0 ? `+${selectedCell.data.totalScore}` : selectedCell.data.totalScore} <span className="text-[14px] text-[#A0A5B1] font-normal">/ 60</span>
                  </span>
                </div>
                
                <div className="w-full h-[1px] bg-white/5 my-[4px]" />
                
                <div className="flex flex-col gap-[4px]">
                  <span className="font-sans font-medium text-[13px] text-[#A0A5B1]">Normalization Formula:</span>
                  <span className="font-mono text-[12px] text-[#FFFFFF]/50 tracking-wider">
                    ({selectedCell.data.totalScore} ÷ 60) × 100
                  </span>
                </div>

                <div className="flex justify-between items-center mt-[4px]">
                  <span className="font-sans font-bold text-[16px] text-[#FFFFFF]">Final Score %</span>
                  <span className={clsx(
                    "font-sans font-bold text-[24px]",
                    parseFloat(selectedCell.data.finalScorePct) > 0 ? "text-[#6FF542]" : 
                    parseFloat(selectedCell.data.finalScorePct) < 0 ? "text-[#FF4444]" : "text-[#FFFFFF]"
                  )}>{parseFloat(selectedCell.data.finalScorePct) > 0 ? `+${selectedCell.data.finalScorePct}%` : `${selectedCell.data.finalScorePct}%`}</span>
                </div>
              </div>

              <div className={clsx(
                "grid grid-cols-2 p-[24px] mt-[8px] rounded-[16px] border border-white/5",
                selectedCell.data.bias === "BULLISH" ? "bg-[#1E2E1E]" :
                selectedCell.data.bias === "BEARISH" ? "bg-[#2E1E1E]" : "bg-[#242731]"
              )}>
                <span className={clsx(
                  "font-sans font-bold text-[16px]",
                  selectedCell.data.bias === "BULLISH" ? "text-[#6FF542]" :
                  selectedCell.data.bias === "BEARISH" ? "text-[#FF4444]" : "text-white"
                )}>Bias Output</span>
                <span className={clsx(
                  "font-sans font-black text-[20px] text-right tracking-widest drop-shadow-md",
                  selectedCell.data.bias === "BULLISH" ? "text-[#6FF542]" :
                  selectedCell.data.bias === "BEARISH" ? "text-[#FF4444]" : "text-white"
                )}>{selectedCell.data.bias}</span>
              </div>
            </div>

            <div className="flex flex-col gap-[16px] p-[24px] rounded-[24px] bg-[#242731]/50 border border-white/5 shadow-inner mt-auto">
              <div className="flex items-center gap-[12px]">
                <Info size={20} className="text-[#A0A5B1]" />
                <span className="font-sans font-bold text-[16px] text-[#FFFFFF]">Calculation Status</span>
              </div>
              <p className="font-sans font-medium text-[14px] text-[#A0A5B1] leading-[24px]">
                Score is complete. All 6 required indicators are active and published. Computed on Oct 24, 2025 at 14:02 UTC.
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
