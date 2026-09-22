"use client";

import { AlertCircle, ChevronDown, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

// Translucent Glass Cards
const matteCard = "bg-[#1E2028]/80 backdrop-blur-2xl border border-white/5 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]";

// API Fetchers
const fetchMatrixData = async (indicator: string, year: number) => {
  await new Promise(r => setTimeout(r, 800));
  const countries = [
    { country: "USA", base: "us" },
    { country: "Euro Area", base: "eu" },
    { country: "Japan", base: "jp" },
    { country: "United Kingdom", base: "gb" },
    { country: "Australia", base: "au" },
    { country: "Canada", base: "ca" },
    { country: "Switzerland", base: "ch" },
    { country: "New Zealand", base: "nz" }
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
  await new Promise(r => setTimeout(r, 800));
  const endMonth = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
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
  
  // Pagination for Matrix
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

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
    <div className="flex flex-col w-full h-full bg-transparent relative">
      <header className="w-full flex items-center justify-between p-[40px_48px] pb-[32px] opacity-0 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">Engine Data Pipeline</span>
          <h1 className="font-sans font-bold text-[40px] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Macro Data Center
          </h1>
        </div>
        
        <div className="flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 p-[8px] rounded-[20px] shadow-lg">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-[20px] py-[10px] rounded-[14px] font-sans text-[15px] font-bold transition-all duration-300 relative",
                activeTab === tab ? "bg-white/5 text-[#D2F646] shadow-sm" : "text-[#A0A5B1] hover:text-[#FFFFFF] hover:bg-white/5"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="flex flex-col px-[48px] gap-[32px] pb-[64px] max-w-[1400px]">
        <div className="flex items-center gap-[16px] opacity-0 animate-slideUp relative z-50" style={{ animationDelay: "0.2s" }}>
          {activeTab === "Macro Data Matrix" ? (
            <div className="flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 p-[6px] rounded-[16px] shadow-lg">
              {INDICATORS.map(ind => (
                <button key={ind} onClick={() => setActiveInd(ind)} className={clsx("px-[16px] py-[8px] rounded-[12px] font-sans font-bold text-[14px] transition-all duration-300", activeInd === ind ? "bg-white/5 text-white" : "text-[#A0A5B1] hover:text-white hover:bg-white/5")}>{ind}</button>
              ))}
            </div>
          ) : (
            <div className="flex gap-[16px]">
              <div className="relative group flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-[16px] px-[16px] py-[10px] shadow-lg cursor-pointer min-w-[200px]">
                <div className="flex items-center gap-[12px]">
                  <FlagStack base={PAIRS.find(p => p.name === activePair)?.base!} quote={PAIRS.find(p => p.name === activePair)?.quote!} />
                  <span className="font-sans font-bold text-[15px] text-white">{activePair}</span>
                </div>
                <ChevronDown size={18} className="text-[#A0A5B1] transition-transform group-hover:rotate-180 ml-auto" />
                
                <div className="absolute top-[calc(100%+8px)] left-0 w-[240px] bg-[#121418] border border-white/5 rounded-[16px] overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {PAIRS.map(pair => (
                    <button
                      key={pair.name}
                      onClick={() => setActivePair(pair.name)}
                      className={clsx(
                        "w-full px-[16px] py-[12px] text-left font-sans font-bold text-[14px] transition-colors flex items-center gap-[12px]",
                        activePair === pair.name ? "bg-white/10 text-white" : "text-[#A0A5B1] hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <FlagStack base={pair.base} quote={pair.quote} />
                      {pair.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative group flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-[16px] px-[16px] py-[10px] shadow-lg cursor-pointer min-w-[180px]">
                <span className="font-sans font-bold text-[15px] text-white mr-[8px]">{activeInd}</span>
                <ChevronDown size={18} className="text-[#A0A5B1] transition-transform group-hover:rotate-180 ml-auto" />
                
                <div className="absolute top-[calc(100%+8px)] left-0 w-[180px] bg-[#121418] border border-white/5 rounded-[16px] overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {INDICATORS.map(ind => (
                    <button
                      key={ind}
                      onClick={() => setActiveInd(ind)}
                      className={clsx(
                        "w-full px-[16px] py-[12px] text-left font-sans font-bold text-[14px] transition-colors",
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

          <div className="ml-auto flex items-center gap-[12px]">
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

            <div className="flex items-center gap-[12px] bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-[16px] px-[20px] py-[12px] shadow-lg">
               <CheckCircle2 size={20} className="text-[#D2F646]" />
               <span className="font-sans font-medium text-[15px] text-[#A0A5B1]">Status: <span className="text-white font-bold">Data Complete</span></span>
            </div>
          </div>
        </div>

        <div className={clsx("flex-1 flex flex-col overflow-hidden relative opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.3s" }}>
          
          {/* TAB 1: MACRO DATA MATRIX */}
          {activeTab === "Macro Data Matrix" && (() => {
            const matrixItems = matrixData || [];
            const totalPages = Math.max(1, Math.ceil(matrixItems.length / itemsPerPage));
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedMatrix = matrixItems.slice(startIndex, startIndex + itemsPerPage);

            return (
            <div className="flex flex-col w-full h-full">
              <div className="overflow-x-auto w-full flex-1 p-[24px]">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-[20px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 w-[200px] border-r">Country</th>
                    {displayMonths.map((m) => (
                      <th key={m} className="px-[20px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 text-center min-w-[140px]">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-[24px] py-[24px] border-r border-white/5"><div className="w-full h-[24px] bg-white/5 rounded-md animate-pulse" /></td>
                        {displayMonths.map((m, j) => <td key={j} className="p-[12px]"><div className="w-full h-[60px] bg-white/5 rounded-[12px] animate-pulse" /></td>)}
                      </tr>
                    ))
                  ) : (
                    paginatedMatrix.map((row: any, i: number) => (
                      <tr key={i} className="group border-b border-white/5 last:border-0 cursor-default hover:bg-white/5 transition-colors">
                        <td className="px-[24px] py-[16px] border-r border-white/5">
                          <div className="flex items-center gap-[16px] p-[12px] transition-colors duration-200 cursor-pointer whitespace-nowrap">
                            <img src={`/flags/${row.base}.svg`} className="w-[24px] h-[24px] rounded-full border border-[#1E2028] shadow-sm flex-shrink-0" alt={row.base} />
                            <span className="font-sans font-bold text-[16px] text-[#FFFFFF]">{row.country}</span>
                          </div>
                        </td>
                        {row.data.map((cell: any, j: number) => (
                          <td key={j} className="px-[12px] py-[12px] text-center relative group/cell">
                            <button 
                              onClick={() => setSelectedCell({ c: row.country, m: displayMonths[j], val: cell.value || "N/A" })}
                              className="inline-flex flex-col items-center justify-center w-[120px] p-[12px] rounded-[16px] transition-all duration-300 hover:bg-[#242731] hover:scale-[1.05] hover:shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:z-10 relative cursor-pointer group-hover/cell:border-white/10 border border-transparent"
                            >
                              <span className={clsx(
                                "font-sans text-[20px] font-bold transition-transform duration-300",
                                cell.status === "missing" ? "text-[#FF4444]" : "text-[#FFFFFF]"
                              )}>
                                {cell.value || "—"}
                              </span>
                              <div className="mt-[8px]">
                                {cell.status === "published" && <span className="bg-[#6FF542]/10 text-[#6FF542] border border-[#6FF542]/20 px-[10px] py-[2px] rounded-[6px] text-[11px] font-bold tracking-wider uppercase shadow-inner">Pub</span>}
                                {cell.status === "manual" && <span className="bg-[#A0A5B1]/10 text-[#A0A5B1] border border-white/10 px-[10px] py-[2px] rounded-[6px] text-[11px] font-bold tracking-wider uppercase shadow-inner">Man</span>}
                                {cell.status === "missing" && <span className="bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/20 px-[10px] py-[2px] rounded-[6px] text-[11px] font-bold tracking-wider uppercase shadow-inner">Mis</span>}
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

            <div className="flex items-center justify-between px-[32px] py-[20px] border-t border-white/5 bg-[#121418]/50 mt-auto">
              <span className="font-sans font-medium text-[14px] text-[#A0A5B1]">
                Showing {matrixItems.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, matrixItems.length)} of {matrixItems.length}
              </span>
              <div className="flex gap-[8px]">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-[16px] py-[8px] rounded-[10px] font-sans font-bold text-[14px] text-white bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 transition-colors"
                >
                  Prev
                </button>
                <div className="flex gap-[4px] items-center px-[8px]">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={clsx(
                        "w-[34px] h-[34px] rounded-[8px] font-sans font-bold text-[14px] transition-colors",
                        currentPage === idx + 1
                          ? "bg-white/10 text-white"
                          : "text-[#A0A5B1] hover:text-white hover:bg-white/5"
                      )}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-[16px] py-[8px] rounded-[10px] font-sans font-bold text-[13px] text-white bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          )})()}

          {/* TAB 2: COMBINED DIFFERENTIAL & RATING */}
          {activeTab === "Differential & Rating" && (
            <div className="overflow-x-auto w-full p-[24px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-[24px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5">Month</th>
                    <th className="px-[24px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5">Base ({activePair.split('/')[0]})</th>
                    <th className="px-[24px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5">Quote ({activePair.split('/')[1]})</th>
                    <th className="px-[24px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5">Difference</th>
                    <th className="px-[24px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5">Rule Applied</th>
                    <th className="px-[24px] py-[16px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 text-right">Rating Score</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td colSpan={6} className="p-[20px]"><div className="w-full h-[32px] bg-white/5 rounded-md animate-pulse" /></td>
                      </tr>
                    ))
                  ) : (
                    combinedData?.map((row: any, i: number) => (
                      <tr key={i} className="group border-b border-white/5 last:border-0 cursor-default hover:bg-white/5 transition-colors">
                        <td colSpan={6} className="p-0">
                          <div className="flex items-center w-full px-[24px] py-[20px] transition-colors duration-200">
                            <span className="flex-1 font-sans font-bold text-[16px] text-[#FFFFFF]">{row.month}</span>
                            <span className="flex-1 font-sans font-bold text-[16px] text-[#A0A5B1] group-hover:text-white transition-colors">{row.baseVal}</span>
                            <span className="flex-1 font-sans font-bold text-[16px] text-[#A0A5B1] group-hover:text-white transition-colors">{row.quoteVal}</span>
                            <span className="flex-1 font-sans font-bold text-[18px] text-[#FFFFFF]">{row.diff}</span>
                            <span className="flex-1 font-sans font-medium text-[15px] text-[#A0A5B1] group-hover:text-white transition-colors">{row.rule}</span>
                            <span className="flex-1 flex justify-end">
                              <span className={clsx(
                                "px-[14px] py-[8px] rounded-[10px] text-[15px] font-black shadow-inner transition-transform group-hover:scale-[1.05]",
                                row.rating > 0 ? "bg-[#6FF542]/10 text-[#6FF542] border border-[#6FF542]/20 shadow-[0_0_12px_rgba(111,245,66,0.2)]" :
                                row.rating < 0 ? "bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/20 shadow-[0_0_12px_rgba(255,68,68,0.2)]" :
                                "bg-[#A0A5B1]/10 text-[#A0A5B1] border border-white/10"
                              )}>
                                {row.rating > 0 ? `+${row.rating}` : row.rating}
                              </span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Manual Override Drawer */}
        {selectedCell && (
          <div className="fixed bottom-[40px] right-[40px] w-[360px] bg-[#1E2028]/90 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] p-[32px] z-50 animate-slideUp">
            <div className="flex items-center justify-between mb-[24px]">
              <h3 className="font-sans font-bold text-[20px] text-[#FFFFFF]">Manual Override</h3>
              <button 
                onClick={() => setSelectedCell(null)}
                className="w-[36px] h-[36px] rounded-[12px] bg-[#121418] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronDown size={20} className="text-[#A0A5B1]" />
              </button>
            </div>
            <div className="flex flex-col gap-[20px]">
              <div className="flex justify-between font-sans text-[14px] font-medium text-[#A0A5B1]">
                <span>{selectedCell.c} - {activeInd}</span>
                <span>{selectedCell.m}</span>
              </div>
              <input type="text" defaultValue={selectedCell.val} className="w-full bg-[#121418] border border-white/5 rounded-[16px] px-[20px] py-[16px] font-sans font-bold text-[18px] text-white outline-none focus:ring-2 focus:ring-[#D2F646]/50 transition-all shadow-inner" />
              <button 
                onClick={() => saveOverrideMutation.mutate({ country: selectedCell.c, month: selectedCell.m, value: "..." })}
                className="relative overflow-hidden w-full py-[16px] rounded-[16px] bg-[#D2F646] text-[#121418] font-sans font-bold text-[15px] hover:shadow-[0_0_20px_rgba(210,246,70,0.4)] transition-all group hover:-translate-y-1 flex justify-center items-center gap-[8px]"
              >
                {saveOverrideMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : "Save Value"}
                {!saveOverrideMutation.isPending && <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-shimmer" />}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
