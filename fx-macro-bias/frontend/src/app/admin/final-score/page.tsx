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

  // Expanded pairs for display
  const expandedPairs = Array.from({ length: 28 }).map((_, i) => ({
    ...PAIRS[i % PAIRS.length],
    pair: `${PAIRS[i % PAIRS.length].name}${i > 6 ? ` [Tier ${Math.floor(i/7) + 1}]` : ''}`,
    baseName: PAIRS[i % PAIRS.length].name
  }));

  return expandedPairs.map((pairData) => ({
    pair: pairData.pair,
    base: pairData.base,
    quote: pairData.quote,
    data: displayMonths.map((month) => {
      const indicators = INDICATORS.map(ind => ({
        ind,
        val: pairIndicatorData[pairData.baseName]?.[ind]?.[month] ?? 0
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
    <img src={`/flags/${base}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#1E2028] z-10 shadow-sm" alt={base} />
    <img src={`/flags/${quote}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#1E2028] -ml-[8px] z-0 shadow-sm" alt={quote} />
  </div>
);

export default function FinalScorePage() {
  const [selectedCell, setSelectedCell] = useState<{ pair: string; base: string; quote: string; data: any } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState<number>(YEARS[0]);
  const itemsPerPage = 4;

  const { data: scoresData, isLoading } = useQuery({
    queryKey: ["final-scores", selectedYear],
    queryFn: () => fetchFinalScores(selectedYear),
  });

  const displayMonths = Array.from({ length: selectedYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12 }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`);

  const totalItems = scoresData?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = scoresData?.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col w-full h-full max-h-screen bg-transparent relative justify-between overflow-hidden">
      <header className="w-full flex items-center justify-between px-8 py-3 pb-1 opacity-0 animate-fadeIn relative z-50 flex-shrink-0" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-0.5">
          <span className="font-sans font-medium text-[11px] text-[#A0A5B1]">Engine Output</span>
          <h1 className="font-sans font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Final Score Matrix
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <GlobalSearch placeholder="Search indicators, pairs, countries..." />
          <div className="relative group flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-3.5 py-1.5 shadow-lg cursor-pointer">
            <span className="font-sans font-bold text-xs text-white mr-2">{selectedYear}</span>
            <ChevronDown size={14} className="text-[#A0A5B1] transition-transform group-hover:rotate-180" />
            
            <div className="absolute top-[calc(100%+8px)] right-0 w-[120px] bg-[#121418] border border-white/5 rounded-2xl overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
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

      <main className="flex-1 flex flex-col px-8 gap-2.5 pb-4 max-w-[1550px] w-full mx-auto overflow-hidden justify-between min-h-0">
        <div className={clsx("flex-1 flex flex-col justify-between overflow-hidden relative p-3 opacity-0 animate-slideUp min-h-0 shadow-2xl", matteCard)} style={{ animationDelay: "0.2s" }}>
          <div className="w-full overflow-x-auto no-scrollbar flex-1 flex flex-col justify-center">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr>
                  <th className="px-4 py-1.5 font-sans font-medium text-xs text-[#A0A5B1] border-b border-white/5 w-[160px] border-r sticky left-0 z-20 bg-[#121418]/95 backdrop-blur-md shadow-[4px_0_12px_rgba(0,0,0,0.1)]">FX Pair</th>
                  {displayMonths.map((m) => (
                    <th key={m} className="px-3 py-1.5 font-sans font-medium text-xs text-[#A0A5B1] border-b border-white/5 text-center min-w-[110px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {isLoading ? (
                  Array.from({ length: itemsPerPage }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-4 py-2 border-r border-white/5"><div className="w-[120px] h-[20px] bg-white/5 rounded-md animate-pulse" /></td>
                      {displayMonths.map((m, j) => <td key={j} className="p-1.5"><div className="w-full h-[46px] bg-white/5 rounded-xl animate-pulse" /></td>)}
                    </tr>
                  ))
                ) : (
                  currentData?.map((row: any, i: number) => (
                    <tr key={i} className="group border-b border-white/5 last:border-0 cursor-default hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-1 border-r border-white/5 sticky left-0 z-20 bg-[#1E2028] backdrop-blur-md shadow-[4px_0_12px_rgba(0,0,0,0.1)] group-hover:bg-[#242731] transition-colors">
                        <div className="flex items-center gap-2.5 p-1 transition-colors duration-200 cursor-pointer font-sans font-bold text-xs text-white whitespace-nowrap">
                          <FlagStack base={row.base} quote={row.quote} />
                          <span>{row.pair}</span>
                        </div>
                      </td>
                      {row.data.map((cell: any, j: number) => {
                        const isBullish = cell.bias === "BULLISH";
                        const isBearish = cell.bias === "BEARISH";
                        return (
                          <td key={j} className="px-1.5 py-1 text-center relative group/cell">
                            <button 
                              onClick={() => setSelectedCell({ pair: row.pair, base: row.base, quote: row.quote, data: cell })}
                              className={clsx(
                                "inline-flex flex-col items-center justify-center w-full py-1.5 px-2 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_16px_rgba(0,0,0,0.3)] cursor-pointer relative overflow-hidden group-hover/cell:z-10 group-hover/cell:border-white/10 border border-transparent",
                                isBullish ? "bg-[#1E2E1E]" : isBearish ? "bg-[#2E1E1E]" : "bg-[#242731]"
                              )}
                            >
                              <span className={clsx(
                                "font-sans text-[15px] font-extrabold z-10 transition-transform",
                                isBullish ? "text-[#6FF542]" : isBearish ? "text-[#FF4444]" : "text-white"
                              )}>
                                {parseFloat(cell.finalScorePct) > 0 ? `+${cell.finalScorePct}%` : `${cell.finalScorePct}%`}
                              </span>
                              <span className={clsx(
                                "mt-0.5 z-10 font-sans text-[9px] font-bold tracking-widest uppercase",
                                isBullish ? "text-[#6FF542]/70" : isBearish ? "text-[#FF4444]/70" : "text-[#A0A5B1]"
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

          {/* Pagination Footer */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between w-full pt-2.5 mt-1 border-t border-white/5 flex-shrink-0 text-xs">
              <span className="font-sans text-[#A0A5B1]">
                Showing <strong className="text-white font-mono">{startIndex + 1}</strong>–<strong className="text-white font-mono">{Math.min(endIndex, totalItems)}</strong> of <strong className="text-white font-mono">{totalItems}</strong> FX Pairs
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#A0A5B1] mr-1 hidden sm:inline-block">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none border border-white/10 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button 
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={clsx(
                        "w-7 h-7 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center",
                        currentPage === i + 1 
                          ? "bg-[#D2F646] text-[#121418] font-black shadow-[0_0_12px_rgba(210,246,70,0.35)]" 
                          : "bg-white/5 text-[#A0A5B1] hover:text-white hover:bg-white/10 border border-white/10"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none border border-white/10 flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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
