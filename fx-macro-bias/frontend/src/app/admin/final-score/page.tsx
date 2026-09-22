"use client";

import React, { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

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

const matteCard = "bg-[#1E2028]/80 backdrop-blur-2xl border border-white/5 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]";

const fetchFinalScores = async (year: number) => {
  await new Promise(r => setTimeout(r, 800));
  // Let's generate 45 pairs for pagination demonstration (replicating the 7 base pairs over and over)
  const expandedPairs = Array.from({ length: 45 }).map((_, i) => ({
    ...PAIRS[i % PAIRS.length],
    pair: `${PAIRS[i % PAIRS.length].name} ${i > 6 ? `(${Math.floor(i/7)})` : ''}`
  }));

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const endMonth = year === currentYear ? currentMonth : 12;
  const displayMonths = Array.from({ length: endMonth }).map((_, i) => `${year}-${(i + 1).toString().padStart(2, '0')}`);

  return expandedPairs.map((pairData) => ({
    pair: pairData.pair,
    base: pairData.base,
    quote: pairData.quote,
    data: displayMonths.map((month) => {
      const indicators = [
        { ind: "GDP", val: Math.floor(Math.random() * 20 - 10) },
        { ind: "Current Account", val: Math.floor(Math.random() * 20 - 10) },
        { ind: "CPI", val: Math.floor(Math.random() * 20 - 10) },
        { ind: "Interest Rate", val: Math.floor(Math.random() * 20 - 10) },
        { ind: "FX Reserves", val: Math.floor(Math.random() * 20 - 10) },
        { ind: "Equity", val: Math.floor(Math.random() * 20 - 10) },
      ];
      
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
  const itemsPerPage = 8;

  const { data: scoresData, isLoading } = useQuery({
    queryKey: ["final-scores", selectedYear],
    queryFn: () => fetchFinalScores(selectedYear),
  });

  const displayMonths = Array.from({ length: selectedYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12 }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`);

  const totalItems = scoresData?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = scoresData?.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col w-full h-full bg-transparent relative">
      <header className="w-full flex items-center justify-between p-[40px_48px] pb-[32px] opacity-0 animate-fadeIn relative z-50" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">Engine Output</span>
          <h1 className="font-sans font-bold text-[40px] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Final Score Matrix
          </h1>
        </div>
        <div className="flex items-center gap-[16px]">
          <GlobalSearch />
          <div className="relative group flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-[16px] px-[16px] py-[10px] shadow-lg cursor-pointer">
            <span className="font-sans font-bold text-[15px] text-white mr-[8px]">{selectedYear}</span>
            <ChevronDown size={18} className="text-[#A0A5B1] transition-transform group-hover:rotate-180" />
            
            <div className="absolute top-[calc(100%+8px)] right-0 w-[120px] bg-[#121418] border border-white/5 rounded-[16px] overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              {YEARS.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={clsx(
                    "w-full px-[16px] py-[12px] text-left font-sans font-bold text-[14px] transition-colors",
                    selectedYear === year ? "bg-white/10 text-white" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col px-[48px] gap-[24px] pb-[64px] max-w-[1400px]">
        <div className={clsx("flex-1 flex flex-col overflow-hidden relative p-[32px] opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.2s" }}>
          <div className="w-full overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr>
                  <th className="px-[16px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 w-[160px] border-r sticky left-0 z-20 bg-[#121418]/95 backdrop-blur-md shadow-[4px_0_12px_rgba(0,0,0,0.1)]">FX Pair</th>
                  {displayMonths.map((m) => (
                    <th key={m} className="px-[16px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 text-center min-w-[140px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: itemsPerPage }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-[24px] py-[24px] border-r border-white/5"><div className="w-full h-[24px] bg-white/5 rounded-md animate-pulse" /></td>
                      {displayMonths.map((m, j) => <td key={j} className="p-[12px]"><div className="w-full h-[70px] bg-white/5 rounded-[16px] animate-pulse" /></td>)}
                    </tr>
                  ))
                ) : (
                  currentData?.map((row: any, i: number) => (
                    <tr key={i} className="group border-b border-white/5 last:border-0 cursor-default hover:bg-white/5 transition-colors">
                      <td className="px-[24px] py-[16px] border-r border-white/5 sticky left-0 z-20 bg-[#1E2028] backdrop-blur-md shadow-[4px_0_12px_rgba(0,0,0,0.1)] group-hover:bg-[#242731] transition-colors">
                        <div className="flex items-center gap-[12px] p-[12px] transition-colors duration-200 cursor-pointer font-sans font-bold text-[17px] text-[#FFFFFF] whitespace-nowrap">
                          <FlagStack base={row.base} quote={row.quote} />
                          <span>{row.pair}</span>
                        </div>
                      </td>
                      {row.data.map((cell: any, j: number) => {
                        const isBullish = cell.bias === "BULLISH";
                        const isBearish = cell.bias === "BEARISH";
                        return (
                          <td key={j} className="px-[12px] py-[12px] text-center relative group/cell">
                            <button 
                              onClick={() => setSelectedCell({ pair: row.pair, base: row.base, quote: row.quote, data: cell })}
                              className={clsx(
                                "inline-flex flex-col items-center justify-center w-full p-[16px] rounded-[16px] transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_10px_20px_rgba(0,0,0,0.4)] cursor-pointer relative overflow-hidden group-hover/cell:z-10 group-hover/cell:border-white/10 border border-transparent",
                                isBullish ? "bg-[#1E2E1E]" : isBearish ? "bg-[#2E1E1E]" : "bg-[#242731]"
                              )}
                            >
                              <span className={clsx(
                                "font-sans text-[20px] font-bold z-10 transition-transform duration-300",
                                isBullish ? "text-[#6FF542]" : isBearish ? "text-[#FF4444]" : "text-[#FFFFFF]"
                              )}>
                                {parseFloat(cell.finalScorePct) > 0 ? `+${cell.finalScorePct}%` : `${cell.finalScorePct}%`}
                              </span>
                              <span className={clsx(
                                "mt-[8px] z-10 font-sans text-[11px] font-bold tracking-widest uppercase",
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
            <div className="flex items-center justify-between w-full pt-[24px] mt-[16px] border-t border-white/5">
              <span className="font-sans font-bold text-[12px] text-[#A0A5B1] tracking-widest uppercase">
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} Entries
              </span>
              <div className="flex items-center gap-[8px]">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-[12px] py-[8px] font-sans font-bold text-[12px] text-[#A0A5B1] hover:text-white disabled:opacity-50 transition-colors uppercase tracking-wider"
                >Prev</button>
                
                {Array.from({ length: Math.min(3, totalPages) }).map((_, i) => {
                  let pageNum = currentPage;
                  if (currentPage === 1) pageNum = i + 1;
                  else if (currentPage === totalPages) pageNum = totalPages - 2 + i;
                  else pageNum = currentPage - 1 + i;
                  
                  if (pageNum < 1 || pageNum > totalPages) return null;

                  return (
                    <button 
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={clsx(
                        "w-[32px] h-[32px] rounded-[8px] flex items-center justify-center font-sans font-bold text-[13px] transition-all",
                        currentPage === pageNum ? "bg-[#D2F646]/10 text-[#D2F646] border border-[#D2F646]/20" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-[12px] py-[8px] font-sans font-bold text-[12px] text-[#A0A5B1] hover:text-white disabled:opacity-50 transition-colors uppercase tracking-wider"
                >Next</button>
              </div>
            </div>
          )}
        </div>

        {selectedCell && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn" 
              onClick={() => setSelectedCell(null)}
            />
            <div 
              className="fixed top-0 right-0 h-full w-[460px] bg-[#1E2028]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-30px_0_60px_rgba(0,0,0,0.8)] p-[40px] z-50 overflow-y-auto flex flex-col gap-[32px] transition-transform duration-500 animate-in slide-in-from-right" 
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
          </div>
          </>
        )}
      </main>
    </div>
  );
}
