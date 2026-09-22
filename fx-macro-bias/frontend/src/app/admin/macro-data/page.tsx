"use client";

import { AlertCircle, ChevronDown, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

const TABS = ["Macro Data Matrix", "Differential & Rating"];
const INDICATORS = ["GDP", "Current Account", "CPI", "Interest Rate", "FX Reserves", "Equity"];

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
const matteCard = "bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

// API Fetchers
const fetchMatrixData = async (indicator: string, year: number) => {
  await new Promise(r => setTimeout(r, 400));
  const countries = [
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
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const endMonth = year === currentYear ? currentMonth : 12;
  const months = Array.from({ length: endMonth }).map((_, i) => `${year}-${(i + 1).toString().padStart(2, '0')}`);

  return countries.map((c, i) => ({
    ...c,
    data: months.map((m, j) => ({
      value: (i === 2 && j === 4) ? null : (Math.random() * 4 - 1).toFixed(1),
      status: (i === 2 && j === 4) ? "missing" : (i === 0 && j === 5) ? "manual" : "published"
    }))
  }));
};

const fetchCombinedData = async (pair: string, indicator: string, year: number) => {
  await new Promise(r => setTimeout(r, 400));
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const endMonth = year === currentYear ? currentMonth : 12;
  const months = Array.from({ length: endMonth }).map((_, i) => `${year}-${(i + 1).toString().padStart(2, '0')}`);
  return months.map(m => {
    const baseVal = (Math.random() * 3).toFixed(1);
    const quoteVal = (Math.random() * 3).toFixed(1);
    const diff = (parseFloat(baseVal) - parseFloat(quoteVal)).toFixed(1);
    const rating = parseFloat(diff) > 0 ? 5 : parseFloat(diff) < 0 ? -5 : 0;
    return { month: m, baseVal, quoteVal, diff, rating, rule: rating > 0 ? "0.0 to 2.0" : "-2.0 to 0.0" };
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
  
  // Pagination for Matrix Tab (default 3 countries per page to prevent ANY vertical scrolling!)
  const [matrixPage, setMatrixPage] = useState(1);
  const [matrixItemsPerPage, setMatrixItemsPerPage] = useState(3);

  // Pagination for Combined Differential Tab
  const [combinedPage, setCombinedPage] = useState(1);
  const combinedItemsPerPage = 4;

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
  const displayMonths = Array.from({ length: selectedYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12 }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`);

  const saveOverrideMutation = useMutation({
    mutationFn: async (payload: any) => {
      await new Promise(r => setTimeout(r, 600));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["macro-matrix", activeInd] });
      setSelectedCell(null);
    }
  });

  return (
    <div className="flex flex-col w-full h-full bg-transparent relative overflow-hidden justify-between">
      
      {/* 1. Header Row: Title & Subtitle on Left | Search & Auth on Right (clean & well-placed!) */}
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

      {/* 2. Main Content Container: Compact to ensure ZERO vertical scrolling */}
      <main className="flex-1 flex flex-col px-8 gap-3 pb-5 max-w-[1500px] w-full mx-auto overflow-hidden">
        
        {/* Controls Toolbar: Placed harmoniously below header */}
        <div className="flex items-center justify-between gap-3 opacity-0 animate-slideUp">
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#1D202B]/85 p-1 rounded-2xl border border-white/5 shadow-lg">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setMatrixPage(1);
                    setCombinedPage(1);
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
              <div className="flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 p-1 rounded-2xl shadow-lg">
                {INDICATORS.map(ind => (
                  <button 
                    key={ind} 
                    onClick={() => {
                      setActiveInd(ind);
                      setMatrixPage(1);
                    }} 
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
              /* Dropdowns for Differential View */
              <div className="flex items-center gap-2">
                <div className="relative group flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-3.5 py-1.5 shadow-lg cursor-pointer min-w-[170px]">
                  <div className="flex items-center gap-2">
                    <FlagStack base={PAIRS.find(p => p.name === activePair)?.base!} quote={PAIRS.find(p => p.name === activePair)?.quote!} />
                    <span className="font-sans font-bold text-xs text-white">{activePair}</span>
                  </div>
                  <ChevronDown size={14} className="text-[#A0A5B1] transition-transform group-hover:rotate-180 ml-auto" />
                  
                  <div className="absolute top-[calc(100%+8px)] left-0 w-[200px] bg-[#121418] border border-white/10 rounded-2xl overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-1">
                    {PAIRS.map(pair => (
                      <button
                        key={pair.name}
                        onClick={() => setActivePair(pair.name)}
                        className={clsx(
                          "w-full px-3 py-2 text-left font-sans font-bold text-xs transition-colors rounded-xl flex items-center gap-2.5",
                          activePair === pair.name ? "bg-white/10 text-white" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <FlagStack base={pair.base} quote={pair.quote} />
                        {pair.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative group flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-3.5 py-1.5 shadow-lg cursor-pointer min-w-[150px]">
                  <span className="font-sans font-bold text-xs text-white mr-2">{activeInd}</span>
                  <ChevronDown size={14} className="text-[#A0A5B1] transition-transform group-hover:rotate-180 ml-auto" />
                  
                  <div className="absolute top-[calc(100%+8px)] left-0 w-[170px] bg-[#121418] border border-white/10 rounded-2xl overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-1">
                    {INDICATORS.map(ind => (
                      <button
                        key={ind}
                        onClick={() => setActiveInd(ind)}
                        className={clsx(
                          "w-full px-3 py-2 text-left font-sans font-bold text-xs transition-colors rounded-xl",
                          activeInd === ind ? "bg-white/10 text-white" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Toolbar: Year and Status */}
          <div className="flex items-center gap-2.5">
            <div className="relative group flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-3.5 py-1.5 shadow-lg cursor-pointer">
              <span className="font-sans font-bold text-xs text-white mr-2">{selectedYear}</span>
              <ChevronDown size={14} className="text-[#A0A5B1] transition-transform group-hover:rotate-180" />
              
              <div className="absolute top-[calc(100%+8px)] right-0 w-[110px] bg-[#121418] border border-white/10 rounded-2xl overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-1">
                {YEARS.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={clsx(
                      "w-full px-3 py-1.5 text-left font-sans font-bold text-xs transition-colors rounded-xl",
                      selectedYear === year ? "bg-white/10 text-white" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-3.5 py-1.5 shadow-lg">
               <CheckCircle2 size={16} className="text-[#D2F646]" />
               <span className="font-sans font-medium text-xs text-[#A0A5B1]">Status: <span className="text-white font-bold">Data Complete</span></span>
            </div>
          </div>
        </div>

        {/* 3. Table Card with Controlled Height & ZERO Vertical Scrolling */}
        <div className={clsx("flex-1 min-h-0 flex flex-col justify-between overflow-hidden opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.2s" }}>
          
          {/* TAB 1: MACRO DATA MATRIX */}
          {activeTab === "Macro Data Matrix" && (() => {
            const matrixItems = matrixData || [];
            const totalPages = Math.max(1, Math.ceil(matrixItems.length / matrixItemsPerPage));
            const startIndex = (matrixPage - 1) * matrixItemsPerPage;
            const paginatedMatrix = matrixItems.slice(startIndex, startIndex + matrixItemsPerPage);

            return (
              <div className="flex flex-col w-full h-full justify-between overflow-hidden">
                <div className="overflow-x-auto w-full flex-1 p-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 font-sans font-medium text-xs text-[#A0A5B1] border-b border-white/5 w-[170px] border-r">Country</th>
                        {displayMonths.map((m) => (
                          <th key={m} className="px-3 py-2 font-sans font-medium text-xs text-[#A0A5B1] border-b border-white/5 text-center min-w-[100px]">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="px-4 py-3 border-r border-white/5"><div className="w-[120px] h-[20px] bg-white/5 rounded-md animate-pulse" /></td>
                            {displayMonths.map((m, j) => <td key={j} className="p-2"><div className="w-[70px] h-[40px] bg-white/5 rounded-xl animate-pulse mx-auto" /></td>)}
                          </tr>
                        ))
                      ) : (
                        paginatedMatrix.map((row: any, i: number) => (
                          <tr key={i} className="group border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-2 border-r border-white/5">
                              <div className="flex items-center gap-2.5 p-1 transition-colors whitespace-nowrap">
                                <img src={`/flags/${row.base}.svg`} className="w-5 h-5 rounded-full border border-white/10 shadow-sm flex-shrink-0" alt={row.base} />
                                <span className="font-sans font-bold text-sm text-white">{row.country}</span>
                              </div>
                            </td>
                            {row.data.map((cell: any, j: number) => (
                              <td key={j} className="px-1.5 py-1 text-center relative group/cell">
                                <button 
                                  onClick={() => setSelectedCell({ c: row.country, m: displayMonths[j], val: cell.value || "N/A" })}
                                  className="inline-flex flex-col items-center justify-center w-[84px] py-1.5 px-1 rounded-xl transition-all duration-200 hover:bg-[#242731] hover:scale-[1.03] hover:shadow-lg cursor-pointer group-hover/cell:border-white/10 border border-transparent"
                                >
                                  <span className={clsx(
                                    "font-sans text-sm font-bold transition-transform",
                                    cell.status === "missing" ? "text-[#FF4444]" : "text-white"
                                  )}>
                                    {cell.value || "—"}
                                  </span>
                                  <div className="mt-1">
                                    {cell.status === "published" && <span className="bg-[#6FF542]/10 text-[#6FF542] border border-[#6FF542]/20 px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase">Pub</span>}
                                    {cell.status === "manual" && <span className="bg-[#A0A5B1]/10 text-[#A0A5B1] border border-white/10 px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase">Man</span>}
                                    {cell.status === "missing" && <span className="bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/20 px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase">Mis</span>}
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

                {/* Compact Pagination Bar: Prevents ANY vertical scrolling! */}
                <div className="flex items-center justify-between px-6 py-2 border-t border-white/5 bg-[#121418]/60 mt-auto">
                  <div className="flex items-center gap-3">
                    <span className="font-sans font-medium text-xs text-[#A0A5B1]">
                      Showing {matrixItems.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + matrixItemsPerPage, matrixItems.length)} of {matrixItems.length} Countries
                    </span>
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg text-[10px] text-[#A0A5B1]">
                      <span>Rows:</span>
                      {[3, 4, 5].map((count) => (
                        <button
                          key={count}
                          onClick={() => {
                            setMatrixItemsPerPage(count);
                            setMatrixPage(1);
                          }}
                          className={clsx(
                            "px-1.5 py-0.2 rounded font-mono font-bold transition-colors cursor-pointer",
                            matrixItemsPerPage === count ? "bg-[#D2F646] text-[#121418]" : "hover:text-white"
                          )}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMatrixPage(p => Math.max(1, p - 1))}
                      disabled={matrixPage === 1}
                      className="px-3 py-1 rounded-lg font-sans font-bold text-xs text-white bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Prev
                    </button>
                    
                    <div className="flex gap-1 items-center px-1">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setMatrixPage(idx + 1)}
                          className={clsx(
                            "w-7 h-7 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer",
                            matrixPage === idx + 1
                              ? "bg-[#D2F646] text-[#121418] shadow-sm"
                              : "text-[#A0A5B1] hover:text-white hover:bg-white/5"
                          )}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setMatrixPage(p => Math.min(totalPages, p + 1))}
                      disabled={matrixPage === totalPages}
                      className="px-3 py-1 rounded-lg font-sans font-bold text-xs text-white bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 2: COMBINED DIFFERENTIAL & RATING */}
          {activeTab === "Differential & Rating" && (() => {
            const combinedList = combinedData || [];
            const totalCombinedPages = Math.max(1, Math.ceil(combinedList.length / combinedItemsPerPage));
            const startCombinedIndex = (combinedPage - 1) * combinedItemsPerPage;
            const paginatedCombined = combinedList.slice(startCombinedIndex, startCombinedIndex + combinedItemsPerPage);

            return (
              <div className="flex flex-col w-full h-full justify-between overflow-hidden">
                <div className="overflow-x-auto w-full flex-1 p-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[11px] font-mono uppercase tracking-wider text-[#A0A5B1]">
                        <th className="px-4 py-2.5">Month</th>
                        <th className="px-4 py-2.5">Base ({activePair.split('/')[0]})</th>
                        <th className="px-4 py-2.5">Quote ({activePair.split('/')[1]})</th>
                        <th className="px-4 py-2.5">Differential</th>
                        <th className="px-4 py-2.5">Rule Applied</th>
                        <th className="px-4 py-2.5 text-right">Rating Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03] text-xs">
                      {combinedLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={6} className="p-3"><div className="w-full h-[24px] bg-white/5 rounded-md animate-pulse" /></td>
                          </tr>
                        ))
                      ) : (
                        paginatedCombined.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-white">{row.month}</td>
                            <td className="px-4 py-3 font-mono text-[#A0A5B1]">{row.baseVal}%</td>
                            <td className="px-4 py-3 font-mono text-[#A0A5B1]">{row.quoteVal}%</td>
                            <td className="px-4 py-3 font-mono font-bold text-white">{row.diff}%</td>
                            <td className="px-4 py-3 font-mono text-[#D2F646]">{row.rule}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={clsx(
                                "inline-block px-3 py-1 rounded-xl font-mono font-bold text-xs",
                                row.rating > 0 ? "bg-[#D2F646]/15 text-[#D2F646] border border-[#D2F646]/30" :
                                row.rating < 0 ? "bg-[#FF4444]/15 text-[#FF4444] border border-[#FF4444]/30" :
                                "bg-white/5 text-[#A0A5B1] border border-white/10"
                              )}>
                                {row.rating > 0 ? `+${row.rating}` : row.rating}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginated Footer for Differential Tab */}
                <div className="flex items-center justify-between px-6 py-2 border-t border-white/5 bg-[#121418]/60 mt-auto">
                  <span className="font-sans font-medium text-xs text-[#A0A5B1]">
                    Showing {combinedList.length > 0 ? startCombinedIndex + 1 : 0}–{Math.min(startCombinedIndex + combinedItemsPerPage, combinedList.length)} of {combinedList.length} Months
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCombinedPage(p => Math.max(1, p - 1))}
                      disabled={combinedPage === 1}
                      className="px-3 py-1 rounded-lg font-sans font-bold text-xs text-white bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Prev
                    </button>
                    <div className="flex gap-1 items-center px-1">
                      {Array.from({ length: totalCombinedPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCombinedPage(idx + 1)}
                          className={clsx(
                            "w-7 h-7 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer",
                            combinedPage === idx + 1
                              ? "bg-[#D2F646] text-[#121418] shadow-sm"
                              : "text-[#A0A5B1] hover:text-white hover:bg-white/5"
                          )}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCombinedPage(p => Math.min(totalCombinedPages, p + 1))}
                      disabled={combinedPage === totalCombinedPages}
                      className="px-3 py-1 rounded-lg font-sans font-bold text-xs text-white bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
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
