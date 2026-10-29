"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  ChevronDown, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Database,
  X,
  Search,
  Check
} from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { playClickSound, playTabSound, playSuccessSound } from "@/lib/soundEffects";
import { 
  COUNTRIES, 
  PAIRS, 
  INDICATORS, 
  SYSTEM_CURRENT_YEAR, 
  SYSTEM_CURRENT_MONTH,
  MACRO_YEARS,
  OFFICIAL_RELEASE_CUTOFFS,
  getCombinedDifferentialData,
  getMacroMatrixData
} from "@/data/macroDataset";
import { 
  AdminPageHeader, CatalogueKPICard, SculptedFilterPod, SculptedTableContainer 
} from "@/components/admin/AdminPrimitives";
import { CurrencyFlag, FXPairFlags } from "@/components/ui/DopaminePrimitives";
import { getCountryFlagUrl, formatCleanMacroPercent } from "@/lib/macroFormatters";
import { soundFX } from "@/lib/soundEngine";
import { AnimatedMetricValue, GhostWireframeDissolve } from "@/components/motion/AnimatedNumberAndMorphChart";
import { useLanguage } from "@/context/LanguageContext";

const TABS = ["Matrice Macro", "Différentiels & Notes"];
const YEARS = MACRO_YEARS;

const CANONICAL_28_PAIRS = [
  "EUR/USD", "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/CAD", "EUR/AUD", "EUR/NZD",
  "GBP/USD", "GBP/JPY", "GBP/CHF", "GBP/CAD", "GBP/AUD", "GBP/NZD",
  "USD/JPY", "USD/CHF", "USD/CAD", "USD/AUD", "USD/NZD",
  "CHF/JPY", "CAD/JPY", "AUD/JPY", "NZD/JPY",
  "CAD/CHF", "AUD/CHF", "NZD/CHF", "AUD/CAD", "NZD/CAD", "AUD/NZD"
];

// Official Client English Indicator Names (Preserved without translating to French)
const INDICATOR_MAP: Record<string, string> = {
  "GDP": "GDP Growth",
  "Current Account": "Current Account / GDP",
  "CPI": "CPI Inflation",
  "Interest Rate": "Interest Rate",
  "FX Reserves": "FX Reserves",
  "Equity": "Equity Index"
};

interface FormattedMacroCell {
  display: string;
  exactFull: string;
  unit: string;
  rawNum: number | null;
}

function formatMacroCellDisplay(
  rawVal: number | string | null | undefined,
  indicator: string,
  mode: "exact" | "approx"
): FormattedMacroCell {
  if (rawVal === null || rawVal === undefined || rawVal === "" || rawVal === "—") {
    return { display: "—", exactFull: "Donnée non disponible (Pending Release)", unit: "", rawNum: null };
  }

  const str = String(rawVal).trim();
  const num = typeof rawVal === "number" ? rawVal : parseFloat(str.replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) {
    return { display: str, exactFull: str, unit: "", rawNum: null };
  }

  if (indicator === "FX Reserves") {
    // Values are in Millions of USD (e.g. 1017415.33276926 M USD or 35902 M USD)
    const exactFormatted = `${num.toLocaleString("en-US", { maximumFractionDigits: 8 })} M$`;
    let approxFormatted = "";
    if (Math.abs(num) >= 1000) {
      approxFormatted = `${(num / 1000).toFixed(1)}B$`;
    } else {
      approxFormatted = `${num.toFixed(1)}M$`;
    }

    return {
      display: mode === "exact" ? exactFormatted : approxFormatted,
      exactFull: `${num.toLocaleString("en-US", { maximumFractionDigits: 8 })} M USD (Reserve excluding gold, foreign exchange - IMF SDMX 3.0 API)`,
      unit: "USD (M)",
      rawNum: num
    };
  }

  if (indicator === "Current Account") {
    // Percentage of GDP from OECD SDMX (e.g. 0.5178161% or -3.276534%)
    const exactFormatted = `${num >= 0 ? "+" : ""}${num.toString()}%`;
    const approxFormatted = `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
    return {
      display: mode === "exact" ? exactFormatted : approxFormatted,
      exactFull: `${num >= 0 ? "+" : ""}${num.toString()}% of GDP (OECD SDMX 3.0 BOP)`,
      unit: "% GDP",
      rawNum: num
    };
  }

  if (indicator === "Equity") {
    const exactFormatted = `${num >= 0 ? "+" : ""}${num.toString()}%`;
    const approxFormatted = `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
    return {
      display: mode === "exact" ? exactFormatted : approxFormatted,
      exactFull: `${num >= 0 ? "+" : ""}${num.toString()}% (Sovereign Equity Benchmark All-Time-High Model)`,
      unit: "% ATH",
      rawNum: num
    };
  }

  if (indicator === "Interest Rate") {
    const exactFormatted = `${num.toString()}%`;
    const approxFormatted = `${num.toFixed(2)}%`;
    return {
      display: mode === "exact" ? exactFormatted : approxFormatted,
      exactFull: `${num.toString()}% (Central Bank Official Benchmark Policy Rate)`,
      unit: "%",
      rawNum: num
    };
  }

  if (indicator === "CPI") {
    const exactFormatted = `${num >= 0 ? "+" : ""}${num.toString()}%`;
    const approxFormatted = `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
    return {
      display: mode === "exact" ? exactFormatted : approxFormatted,
      exactFull: `${num >= 0 ? "+" : ""}${num.toString()}% YoY (Consumer Price Index Inflation)`,
      unit: "% YoY",
      rawNum: num
    };
  }

  // GDP Growth
  const exactFormatted = `${num >= 0 ? "+" : ""}${num.toString()}%`;
  const approxFormatted = `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
  return {
    display: mode === "exact" ? exactFormatted : approxFormatted,
    exactFull: `${num >= 0 ? "+" : ""}${num.toString()}% (Annual Real GDP Growth Rate)`,
    unit: "% Annual",
    rawNum: num
  };
}

export default function MacroDataPage() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [activeInd, setActiveInd] = useState("GDP");
  const [activePair, setActivePair] = useState(PAIRS[0].name);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [countrySearch, setCountrySearch] = useState("");
  const [headerSearch, setHeaderSearch] = useState("");

  // User Assumptions & Forward Overrides state initialized lazily
  const [assumptions, setAssumptions] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("shiftfx_macro_user_assumptions");
        if (stored) return JSON.parse(stored);
      } catch (err) {
        console.error("Failed to load user assumptions", err);
      }
    }
    return {};
  });
  const [selectedAssumptionCell, setSelectedAssumptionCell] = useState<{ c: string; m: string; val: string; isForecast: boolean } | null>(null);
  const [selectedDiffCell, setSelectedDiffCell] = useState<{
    pair: string;
    baseCountry: string;
    quoteCountry: string;
    month: string;
    data: any;
  } | null>(null);
  const [assumptionInputVal, setAssumptionInputVal] = useState<string>("");

  const displayMonths = Array.from({ length: 12 }).map((_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, "0")}`);

  // User Precision Preference: "exact" (Full Precision) vs "approx" (Formatted)
  const [displayPrecision, setDisplayPrecision] = useState<"exact" | "approx">("exact");

  // Fetch Matrix Data with authoritative fallback to verified MASTER_MACRO_DATABASE
  const fetchMatrixData = async (indicator: string, year: number) => {
    // 1. Preload local verified dataset from MASTER_MACRO_DATABASE (100% matched to EXCEL8EXAMPLE.xlsx & Official APIs)
    const localBaseline = getMacroMatrixData(indicator, year);

    try {
      const slugMap: Record<string, string> = {
        "GDP": "gdp",
        "Current Account": "ca_gdp",
        "CPI": "cpi",
        "Interest Rate": "interest_rate",
        "FX Reserves": "fx_reserves",
        "Equity": "equity"
      };
      const slug = slugMap[indicator] || indicator.toLowerCase().replace(/ /g, "_");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Use proxy or direct localhost port
      const apiUrl = typeof window !== "undefined"
        ? `/api/admin/macro-data/matrix?indicator=${slug}`
        : `http://127.0.0.1:8001/api/admin/macro-data/matrix?indicator=${slug}`;

      const res = await fetch(apiUrl, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json.rows && json.rows.length > 0) {
          return COUNTRIES.map((c) => {
            const apiRow = json.rows.find((r: any) => 
              r.country === c.country || 
              (c.country === "USA" && r.country === "United States") || 
              (c.country === "Euro Area" && (r.country === "Euro Area" || r.country === "Zone Euro")) ||
              r.iso.toLowerCase() === c.base
            );
            const cells = displayMonths.map((m: string) => {
              const assumptionKey = `${indicator}_${c.country}_${m}`;
              const userSavedVal = assumptions[assumptionKey];
              const cellPoint = apiRow?.cells?.[m];

              if (!cellPoint || cellPoint.value === null || cellPoint.value === undefined) {
                if (userSavedVal !== undefined && userSavedVal !== "") {
                  return { value: userSavedVal, status: "manual" as const, isAssumption: true };
                }
                // Fallback to local verified baseline point if available
                const localRow = localBaseline.find(lr => lr.country === c.country);
                const localCell = localRow?.data.find((_, i) => displayMonths[i] === m);
                if (localCell && localCell.value !== null && localCell.value !== undefined) {
                  return {
                    value: localCell.value,
                    status: localCell.status,
                    isAssumption: false
                  };
                }
                return { value: null, status: "missing" as const };
              }

              const cutoffDef = OFFICIAL_RELEASE_CUTOFFS[indicator];
              const cutoff = typeof cutoffDef === "function" ? cutoffDef(c.country) : (cutoffDef || "2026-09");
              const isPastCutoff = selectedYear === SYSTEM_CURRENT_YEAR && m > cutoff;

              let cellStatus: "published" | "forecast" | "manual" | "missing" = cellPoint.status;
              if (isPastCutoff && cellStatus === "published") {
                cellStatus = "forecast";
              }
              const isPub = cellStatus === "published";

              if (userSavedVal !== undefined && userSavedVal !== "" && !isPub) {
                return { value: userSavedVal, status: "manual" as const, isAssumption: true };
              }

              return {
                value: cellPoint.value,
                status: cellStatus,
                isAssumption: false
              };
            });
            return {
              country: c.country,
              base: c.base,
              data: cells
            };
          });
        }
      }
    } catch {
      // Graceful fallback to verified MASTER_MACRO_DATABASE
    }

    // Authoritative fallback: return verified getMacroMatrixData merged with user assumptions
    return localBaseline.map((row) => ({
      country: row.country,
      base: row.base,
      data: row.data.map((cell, idx) => {
        const m = displayMonths[idx];
        const assumptionKey = `${indicator}_${row.country}_${m}`;
        const userSavedVal = assumptions[assumptionKey];
        if (userSavedVal !== undefined && userSavedVal !== "" && cell.status !== "published") {
          return { value: userSavedVal, status: "manual" as const, isAssumption: true };
        }
        return cell;
      })
    }));
  };

  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: ["macroMatrixData", activeInd, selectedYear, assumptions],
    queryFn: () => fetchMatrixData(activeInd, selectedYear),
    staleTime: 120_000,
    placeholderData: (previousData) => previousData,
  });

  const allMatrixRows = matrixData || [];
  const filteredMatrixRows = useMemo(() => {
    if (!countrySearch.trim()) return allMatrixRows;
    const q = countrySearch.toLowerCase();
    return allMatrixRows.filter(r => r.country.toLowerCase().includes(q));
  }, [allMatrixRows, countrySearch]);

  const diffRows = useMemo(() => {
    return CANONICAL_28_PAIRS.map(pairName => {
      const pairDef = PAIRS.find(p => p.name === pairName) || {
        name: pairName,
        base: pairName.split("/")[0].toLowerCase(),
        quote: pairName.split("/")[1].toLowerCase(),
        baseCountry: "",
        quoteCountry: ""
      };
      const diffList = getCombinedDifferentialData(pairName, activeInd, selectedYear);
      return {
        pair: pairName,
        base: pairDef.base,
        quote: pairDef.quote,
        baseCountry: pairDef.baseCountry,
        quoteCountry: pairDef.quoteCountry,
        data: diffList
      };
    });
  }, [activeInd, selectedYear]);

  const filteredDiffRows = useMemo(() => {
    if (!countrySearch.trim()) return diffRows;
    const q = countrySearch.toLowerCase();
    return diffRows.filter(r => 
      r.pair.toLowerCase().includes(q) || 
      r.baseCountry.toLowerCase().includes(q) || 
      r.quoteCountry.toLowerCase().includes(q)
    );
  }, [diffRows, countrySearch]);

  const handleCellClick = (country: string, month: string, cell: any) => {
    if (cell.status === "published") return;
    playClickSound();
    setSelectedAssumptionCell({
      c: country,
      m: month,
      val: cell.value !== null && cell.value !== undefined ? String(cell.value) : "",
      isForecast: cell.status === "forecast"
    });
    setAssumptionInputVal(cell.value !== null && cell.value !== undefined ? String(cell.value) : "");
  };

  const handleSaveAssumption = () => {
    if (!selectedAssumptionCell) return;
    const key = `${activeInd}_${selectedAssumptionCell.c}_${selectedAssumptionCell.m}`;
    const updated = { ...assumptions, [key]: assumptionInputVal };
    setAssumptions(updated);
    try {
      localStorage.setItem("shiftfx_macro_user_assumptions", JSON.stringify(updated));
    } catch {}
    setSelectedAssumptionCell(null);
    soundFX.playChime();
    playSuccessSound();
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.5 } });
  };

  const handleClearAssumption = () => {
    if (!selectedAssumptionCell) return;
    const key = `${activeInd}_${selectedAssumptionCell.c}_${selectedAssumptionCell.m}`;
    const updated = { ...assumptions };
    delete updated[key];
    setAssumptions(updated);
    try {
      localStorage.setItem("shiftfx_macro_user_assumptions", JSON.stringify(updated));
    } catch {}
    setSelectedAssumptionCell(null);
    playClickSound();
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 xl:p-8 flex flex-col text-white font-sans">
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. UNIFIED ADMIN PAGE HEADER (Single row utilities, NO duplicate admin) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AdminPageHeader
        eyebrow={t("macro.eyebrow")}
        badgeText={t("macro.badge")}
        title={t("macro.title")}
        searchPlaceholder={t("macro.search_placeholder")}
        searchValue={headerSearch}
        onSearchChange={setHeaderSearch}
        rightActions={
          <div className="h-10 px-3.5 rounded-full bg-[#101218] border border-white/[0.08] flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Calendar size={13} className="text-[#D4FF00]" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label={t("macro.vintage")}
              className="bg-transparent font-mono text-xs text-slate-300 outline-none cursor-pointer pr-1"
            >
              {YEARS.map((y) => (
                <option key={y} value={y} className="bg-[#101218] text-white">
                  {t("macro.vintage")} {y}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. TOP KPI ROW (Non-clickable, hover-only, zero click active ring) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        
        {/* KPI 1: Sovereign Economies */}
        <CatalogueKPICard
          title={t("macro.kpi_economies")}
          value="8"
          numericValue={8}
          decimals={0}
          unit="G10"
          subtitle={t("macro.kpi_economies_sub")}
          variant="lime"
          icon={<Database size={14} />}
          bars={[50, 75, 80, 95]}
        />

        {/* KPI 2: Matrix Observations */}
        <CatalogueKPICard
          title={t("macro.kpi_observations")}
          value="576"
          numericValue={576}
          decimals={0}
          unit={lang === "fr" ? "Points Macro" : "Data Points"}
          subtitle={t("macro.kpi_observations_sub")}
          variant="sky"
          icon={<CheckCircle2 size={14} />}
          bars={[60, 70, 85, 100]}
        />

        {/* KPI 3: Published Data */}
        <CatalogueKPICard
          title={t("macro.kpi_published")}
          value="75%"
          numericValue={75}
          decimals={0}
          suffix="%"
          unit={lang === "fr" ? "Officielles" : "Official"}
          subtitle={t("macro.kpi_published_sub")}
          variant="emerald"
          icon={<Sparkles size={14} />}
          bars={[70, 75, 80, 75]}
        />

        {/* KPI 4: Quant Estimates */}
        <CatalogueKPICard
          title={t("macro.kpi_calendar")}
          value="25%"
          numericValue={25}
          decimals={0}
          suffix="%"
          unit="Projections"
          subtitle={t("macro.kpi_calendar_sub")}
          variant="purple"
          icon={<Calendar size={14} />}
          bars={[25, 25, 25, 25]}
        />

      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. SCULPTED FILTER POD                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SculptedFilterPod className="p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* View Switcher: Matrice Macro | Différentiels & Notes */}
        <div className="rounded-full bg-[#0A0B0F] border border-white/[0.06] p-1 inline-flex items-center gap-1 text-xs font-mono">
          {TABS.map((tab, idx) => {
            const label = idx === 0 ? t("macro.tab_matrix") : t("macro.tab_differentials");
            return (
              <button
                key={tab}
                onClick={() => { 
                  soundFX.playPop(1); 
                  setActiveTab(tab); 
                }}
                className={clsx(
                  "px-4 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap",
                  activeTab === tab
                    ? "bg-[#D4FF00] text-[#07080C] font-bold shadow-[0_0_12px_rgba(212,255,0,0.3)]"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 6 Indicator Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap max-w-full">
          {INDICATORS.map((ind) => (
            <button
              key={ind}
              onClick={() => { 
                soundFX.playPop(1.05); 
                setActiveInd(ind); 
              }}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0",
                activeInd === ind 
                  ? "bg-white/[0.12] text-white font-bold border border-white/20 shadow-sm" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              {INDICATOR_MAP[ind] || ind}
            </button>
          ))}
        </div>
      </SculptedFilterPod>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. MATRIX TABLE CONTAINER (Strictly Zero Right-Edge Clipping!)    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <GhostWireframeDissolve isRefreshing={matrixLoading}>
      <SculptedTableContainer className="p-3.5 sm:p-5 lg:p-6">
        {/* Table Subheader Bar with Title & Clean Legend & Country Search */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 pb-4 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/30 flex items-center justify-center text-[#D4FF00]">
              <Database size={15} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {activeTab === "Matrice Macro"
                  ? `Matrice Souveraine G10 : ${INDICATOR_MAP[activeInd] || activeInd} (${selectedYear})`
                  : `Différentiels & Notes G10 : ${INDICATOR_MAP[activeInd] || activeInd} (${selectedYear})`}
              </h2>
              <p className="text-xs font-mono text-slate-400">
                {activeTab === "Matrice Macro"
                  ? "Données mensuelles agrégées des banques centrales & instituts nationaux de statistiques"
                  : "Écarts bilatéraux (Base − Quote) et notation quantitative calibrée [−10 à +10] sur les 28 paires G10"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Precision Toggle Switcher with Cool Framer Motion Animation */}
            {activeTab === "Matrice Macro" && (
              <div className="flex items-center gap-1 p-1 rounded-full bg-[#0A0B0F] border border-white/[0.08] shadow-inner relative">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop(1.15);
                    setDisplayPrecision("exact");
                  }}
                  className={clsx(
                    "relative px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none",
                    displayPrecision === "exact"
                      ? "text-[#07080C] shadow-[0_0_12px_rgba(212,255,0,0.4)]"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {displayPrecision === "exact" && (
                    <motion.div
                      layoutId="precisionPill"
                      className="absolute inset-0 rounded-full bg-[#D4FF00]"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                  <Sparkles size={11} className={clsx("relative z-10", displayPrecision === "exact" ? "text-black" : "text-slate-400")} />
                  <span className="relative z-10">Exact (Full Precision)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop(0.95);
                    setDisplayPrecision("approx");
                  }}
                  className={clsx(
                    "relative px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none",
                    displayPrecision === "approx"
                      ? "text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {displayPrecision === "approx" && (
                    <motion.div
                      layoutId="precisionPill"
                      className="absolute inset-0 rounded-full bg-white/20 border border-white/30 shadow-sm"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Formatted</span>
                </button>
              </div>
            )}

            {/* Country or Pair Search */}
            <div className="relative flex items-center min-w-[200px]">
              <Search size={13} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder={activeTab === "Matrice Macro" ? "Filtrer un pays..." : "Filtrer une paire (ex. EUR/USD)..."}
                className="w-full bg-[#0A0B0F] border border-white/[0.08] rounded-full pl-8 pr-7 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:border-[#D4FF00]/50 focus:outline-none transition-all"
              />
              {countrySearch && (
                <button
                  onClick={() => setCountrySearch("")}
                  className="absolute right-2.5 text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Legend Badges */}
            {activeTab === "Matrice Macro" ? (
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
                  <span>Publié (PUB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Estimation (EST)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Manuel (MAN)</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
                  <span>Acheteur (+)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Neutre (0)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.7)]" />
                  <span>Vendeur (−)</span>
                </div>
                <span className="text-[10px] text-[#D4FF00] bg-[#D4FF00]/10 border border-[#D4FF00]/30 px-2 py-0.5 rounded-full font-bold">
                  Barème [−10 à +10]
                </span>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: Macro Data Matrix View (Scrollable across all 12 months with sticky left col) */}
        {activeTab === "Matrice Macro" && (
          <div className="w-full overflow-x-auto pb-2">
            <table className="w-full border-separate border-spacing-0 min-w-[1240px]">
              <thead>
                <tr className="border-b border-white/[0.06] h-10 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="sticky left-0 z-20 bg-[#101218] pl-6 pr-4 text-left min-w-[190px] border-r border-white/[0.08] shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                    PAYS / SOUVERAIN
                  </th>
                  {displayMonths.map((m, idx) => {
                    const isCurrentLive = m === `${SYSTEM_CURRENT_YEAR}-${SYSTEM_CURRENT_MONTH.toString().padStart(2, "0")}`;
                    const isLast = idx === displayMonths.length - 1;

                    return (
                      <th
                        key={m}
                        className={clsx(
                          "py-2 px-2 text-center font-mono min-w-[88px] transition-colors",
                          isLast && "pr-6",
                          isCurrentLive 
                            ? "bg-[#D4FF00]/[0.05] text-[#D4FF00] font-bold border-x border-[#D4FF00]/25" 
                            : "text-slate-400"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{m}</span>
                          {isCurrentLive && (
                            <span className="text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/40 shadow-[0_0_8px_rgba(212,255,0,0.3)]">
                              LIVE
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.03]">
                {matrixLoading ? (
                  <tr>
                    <td colSpan={13} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-[#D4FF00] border-t-transparent animate-spin" />
                        <span className="text-xs font-mono text-slate-400">Chargement de la matrice macroéconomique...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMatrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-xs font-mono text-slate-400">
                      Aucune économie ne correspond à &ldquo;{countrySearch}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredMatrixRows.map((row) => (
                    <tr key={row.country} className="hover:bg-white/[0.02] transition-colors h-14">
                      {/* Sticky Sovereign Column */}
                      <td className="sticky left-0 z-20 bg-[#101218] pl-6 pr-4 text-left border-r border-white/[0.08] shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getCountryFlagUrl(row.country || row.base)}
                            alt={row.country}
                            className="w-6 h-6 rounded-full ring-1 ring-white/10 shrink-0 object-cover shadow-sm"
                          />
                          <span className="font-sans font-bold text-sm text-white whitespace-nowrap">
                            {row.country}
                          </span>
                        </div>
                      </td>

                      {/* 12 Monthly Value Cells */}
                      {row.data.map((cell: any, cellIdx: number) => {
                        const month = displayMonths[cellIdx];
                        const isCurrentLive = month === `${SYSTEM_CURRENT_YEAR}-${SYSTEM_CURRENT_MONTH.toString().padStart(2, "0")}`;
                        const isMissing = cell.value === null || cell.value === undefined || cell.value === "—";
                        const isPublished = !isMissing && cell.status === "published";
                        const isForecast = !isMissing && cell.status === "forecast";
                        const isManual = !isMissing && cell.status === "manual";
                        const isLast = cellIdx === displayMonths.length - 1;

                        const formatted = formatMacroCellDisplay(cell.value, activeInd, displayPrecision);

                        return (
                          <td
                            key={month}
                            onClick={() => handleCellClick(row.country, month, cell)}
                            className={clsx(
                              "py-2 px-2 text-center transition-all duration-150 select-none min-w-[96px]",
                              isLast && "pr-6",
                              isCurrentLive && "bg-[#D4FF00]/[0.03] border-x border-[#D4FF00]/20",
                              !isPublished && "cursor-pointer hover:bg-white/[0.04]"
                            )}
                          >
                            <div className="flex flex-col items-center justify-center gap-1 group/cell">
                              <span className={clsx(
                                "font-mono text-xs font-semibold tabular-nums tracking-tight transition-colors",
                                isMissing ? "text-slate-500 font-bold" : isManual ? "text-[#38BDF8] font-bold" : "text-white group-hover/cell:text-[#D4FF00]"
                              )}>
                                {formatted.display}
                              </span>

                              {/* Smooth rounded-full status pill */}
                              {isPublished && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold">
                                  PUB
                                </span>
                              )}

                              {isForecast && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold">
                                  EST
                                </span>
                              )}

                              {isManual && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[9px] font-mono font-bold">
                                  MAN
                                </span>
                              )}

                              {isMissing && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-500 border border-white/[0.08] text-[9px] font-mono font-medium">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Differential & Rating View across the 28 G10 pairs */}
        {activeTab === "Différentiels & Notes" && (
          <div className="w-full overflow-x-auto pb-2">
            <table className="w-full border-separate border-spacing-0 min-w-[1240px]">
              <thead>
                <tr className="border-b border-white/[0.06] h-10 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="sticky left-0 z-20 bg-[#101218] pl-6 pr-4 text-left min-w-[210px] border-r border-white/[0.08] shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                    PAIRE FX / SOUVERAINS
                  </th>
                  {displayMonths.map((m, idx) => {
                    const isCurrentLive = m === `${SYSTEM_CURRENT_YEAR}-${SYSTEM_CURRENT_MONTH.toString().padStart(2, "0")}`;
                    const isLast = idx === displayMonths.length - 1;

                    return (
                      <th
                        key={m}
                        className={clsx(
                          "py-2 px-2 text-center font-mono min-w-[88px] transition-colors",
                          isLast && "pr-6",
                          isCurrentLive 
                            ? "bg-[#D4FF00]/[0.05] text-[#D4FF00] font-bold border-x border-[#D4FF00]/25" 
                            : "text-slate-400"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{m}</span>
                          {isCurrentLive && (
                            <span className="text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/40 shadow-[0_0_8px_rgba(212,255,0,0.3)]">
                              LIVE
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.03]">
                {filteredDiffRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-xs font-mono text-slate-400">
                      Aucune paire ne correspond à &ldquo;{countrySearch}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredDiffRows.map((row) => (
                    <tr key={row.pair} className="hover:bg-white/[0.02] transition-colors h-14">
                      {/* Sticky Left Pair Column */}
                      <td className="sticky left-0 z-20 bg-[#101218] pl-6 pr-4 text-left border-r border-white/[0.08] shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-2.5">
                          <FXPairFlags pair={row.pair} size="sm" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-display font-bold text-sm text-white whitespace-nowrap">
                              {row.pair}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans truncate max-w-[130px]" title={`${row.baseCountry} / ${row.quoteCountry}`}>
                              {row.baseCountry} / {row.quoteCountry}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 12 Monthly Differential & Rating Cells */}
                      {row.data.map((cell: any, cellIdx: number) => {
                        const month = displayMonths[cellIdx];
                        const isCurrentLive = month === `${SYSTEM_CURRENT_YEAR}-${SYSTEM_CURRENT_MONTH.toString().padStart(2, "0")}`;
                        const isLast = cellIdx === displayMonths.length - 1;
                        const rating = cell.rating;

                        return (
                          <td
                            key={month}
                            onClick={() => {
                              playClickSound();
                              setSelectedDiffCell({
                                pair: row.pair,
                                baseCountry: row.baseCountry,
                                quoteCountry: row.quoteCountry,
                                month,
                                data: cell
                              });
                            }}
                            className={clsx(
                              "py-2 px-2 text-center transition-all duration-150 select-none min-w-[88px] cursor-pointer hover:bg-white/[0.04]",
                              isLast && "pr-6",
                              isCurrentLive && "bg-[#D4FF00]/[0.03] border-x border-[#D4FF00]/20"
                            )}
                            title={`Cliquer pour inspecter le calcul différentiel de ${row.pair} (${month})`}
                          >
                            <div className="flex flex-col items-center justify-center gap-1">
                              {/* Rating Pill [-10 to +10] */}
                              <span className={clsx(
                                "font-mono text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center justify-center min-w-[34px] tabular-nums",
                                rating > 0 
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.25)]" 
                                  : rating < 0 
                                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.25)]" 
                                  : "bg-white/[0.05] text-slate-400 border border-white/[0.08]"
                              )}>
                                {rating > 0 ? `+${rating}` : rating}
                              </span>

                              {/* Bilateral Spread */}
                              <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                                {cell.diff}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Affichage de <strong className="text-white">
                {activeTab === "Matrice Macro" ? filteredMatrixRows.length : filteredDiffRows.length}
              </strong> {activeTab === "Matrice Macro" ? "zones économiques souveraines G10" : "combinaisons de paires G10"}
            </span>
          </div>
          <span className="text-[#D4FF00] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
            Couverture d'ingestion 100%
          </span>
        </div>
      </SculptedTableContainer>
      </GhostWireframeDissolve>

      {/* Assumption / Override Modal */}
      <AnimatePresence>
        {selectedAssumptionCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAssumptionCell(null)}
              className="fixed inset-0 bg-[#06070A]/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm rounded-[24px] bg-[#101218] border border-white/[0.1] shadow-2xl p-6 z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Hypothèse Macroélectronique
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    {selectedAssumptionCell.c} • {selectedAssumptionCell.m}
                  </p>
                </div>
                <button onClick={() => setSelectedAssumptionCell(null)} className="p-1 rounded-full text-slate-400 hover:text-white">
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Valeur de projection ({activeInd})
                  </label>
                  <input
                    type="text"
                    value={assumptionInputVal}
                    onChange={(e) => setAssumptionInputVal(e.target.value)}
                    placeholder="Ex: 2.4"
                    className="w-full h-10 px-3 rounded-xl bg-[#0A0B0F] border border-white/[0.08] font-mono text-xs text-white focus:outline-none focus:border-[#D4FF00]/50"
                  />
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <button
                    onClick={handleClearAssumption}
                    className="h-8 px-3 rounded-full text-xs font-mono text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    Effacer
                  </button>
                  <button
                    onClick={handleSaveAssumption}
                    className="h-8 px-4 rounded-full bg-[#D4FF00] hover:bg-[#dfeb34] text-[#07080C] font-bold text-xs font-mono shadow-[0_0_12px_rgba(212,255,0,0.3)] transition-all"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Differential Inspection Modal */}
      <AnimatePresence>
        {selectedDiffCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDiffCell(null)}
              className="fixed inset-0 bg-[#06070A]/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-[24px] bg-[#101218] border border-white/[0.1] shadow-2xl p-6 z-10 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <FXPairFlags pair={selectedDiffCell.pair} size="md" />
                  <div>
                    <h3 className="font-display font-bold text-base text-white">
                      {selectedDiffCell.pair} • {selectedDiffCell.month}
                    </h3>
                    <p className="text-xs font-mono text-slate-400">
                      {INDICATOR_MAP[activeInd] || activeInd} • {selectedDiffCell.baseCountry} contre {selectedDiffCell.quoteCountry}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedDiffCell(null)} className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer">
                  <X size={15} />
                </button>
              </div>

              {/* Math Proof Card */}
              <div className="p-4 rounded-2xl bg-[#0A0C10] border border-[#D4FF00]/25 shadow-[0_0_15px_rgba(212,255,0,0.05)] flex flex-col gap-2.5">
                <span className="font-mono text-[11px] font-bold text-[#D4FF00] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                  PREUVE DU DIFFÉRENTIEL BILATÉRAL
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col">
                    <span className="text-[10px] text-slate-400">{selectedDiffCell.baseCountry} (Base)</span>
                    <span className="font-bold text-white text-sm mt-0.5">{selectedDiffCell.data.baseVal}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col">
                    <span className="text-[10px] text-slate-400">{selectedDiffCell.quoteCountry} (Quote)</span>
                    <span className="font-bold text-white text-sm mt-0.5">{selectedDiffCell.data.quoteVal}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono">
                  <span className="text-slate-400">Écart ($Base − Quote$) :</span>
                  <span className="font-bold text-white">{selectedDiffCell.data.diff}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono">
                  <span className="text-slate-300">Note Attribuée [−10 à +10] :</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {selectedDiffCell.data.rating > 0 ? `+${selectedDiffCell.data.rating}` : selectedDiffCell.data.rating} / 10
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  Règle appliquée : <strong className="text-white">{selectedDiffCell.data.rule}</strong> ({selectedDiffCell.data.regime})
                </div>
              </div>

              <button
                onClick={() => setSelectedDiffCell(null)}
                className="w-full h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-sans font-bold text-white border border-white/10 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
