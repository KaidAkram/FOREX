"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, TrendingUp, TrendingDown, Activity, Database, Calendar, Layers, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { 
  AdminPageHeader, CatalogueKPICard 
} from "@/components/admin/AdminPrimitives";
import { FXPairFlags } from "@/components/ui/DopaminePrimitives";
import { 
  AnimatedMetricValue, 
  MorphingSplineChart, 
  StaggeredBaselineBars,
  GhostWireframeDissolve
} from "@/components/motion/AnimatedNumberAndMorphChart";
import { soundFX } from "@/lib/soundEngine";
import { useLanguage } from "@/context/LanguageContext";

// --- Constants ---
const INDICATORS = [
  "Croissance PIB (GDP)",
  "Taux Directeurs (Rates)",
  "Inflation (IPC / CPI)",
  "Balance Courante (CA)",
  "Réserves FX",
  "Marchés Actions"
];

const FX_PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CAD",
  "USD/CHF",
  "NZD/USD",
  "EUR/GBP",
  "GBP/JPY"
];

// Timeframe configuration with dynamic KPI values & spline dataset
const TIMEFRAME_CONFIG: Record<
  string,
  {
    label: string;
    confidence: number;
    divergence: number;
    ingestion: number;
    signals: number;
    splinePoints: number[];
    labels: string[];
    bars: { label: string; value: number; formatted?: string }[];
  }
> = {
  "1S": {
    label: "7 Jours",
    confidence: 76.4,
    divergence: 18.2,
    ingestion: 99.8,
    signals: 142,
    splinePoints: [58, 62, 71, 65, 74, 82, 76.4],
    labels: ["J-6", "J-5", "J-4", "J-3", "J-2", "Hier", "Aujourd'hui"],
    bars: [
      { label: "PIB", value: 3.2 },
      { label: "IPC", value: -1.4 },
      { label: "Taux", value: 4.5 },
      { label: "BC", value: 0.8 },
      { label: "RÉS", value: -2.1 },
      { label: "ACT", value: 5.6 },
    ],
  },
  "1M": {
    label: "30 Jours",
    confidence: 82.4,
    divergence: 14.1,
    ingestion: 99.9,
    signals: 576,
    splinePoints: [48, 52, 55, 68, 62, 75, 71, 79, 84, 80, 82.4],
    labels: ["Sem 1", "Sem 1.5", "Sem 2", "Sem 2.5", "Sem 3", "Sem 3.5", "Sem 4", "Sem 4.2", "Sem 4.5", "Sem 4.8", "Clôture"],
    bars: [
      { label: "PIB", value: 4.8 },
      { label: "IPC", value: -2.2 },
      { label: "Taux", value: 6.1 },
      { label: "BC", value: 1.5 },
      { label: "RÉS", value: -0.9 },
      { label: "ACT", value: 7.4 },
    ],
  },
  "3M": {
    label: "90 Jours",
    confidence: 86.8,
    divergence: 11.2,
    ingestion: 100.0,
    signals: 1480,
    splinePoints: [38, 45, 52, 60, 58, 67, 74, 70, 79, 85, 82, 86.8],
    labels: ["Mois -3", "S1", "S2", "S3", "Mois -2", "S5", "S6", "S7", "Mois -1", "S9", "S10", "Récent"],
    bars: [
      { label: "PIB", value: 6.2 },
      { label: "IPC", value: -3.5 },
      { label: "Taux", value: 8.4 },
      { label: "BC", value: 2.1 },
      { label: "RÉS", value: 1.2 },
      { label: "ACT", value: 9.8 },
    ],
  },
  "1A": {
    label: "12 Mois",
    confidence: 91.5,
    divergence: 8.7,
    ingestion: 99.9,
    signals: 4890,
    splinePoints: [28, 34, 42, 51, 63, 59, 68, 77, 83, 80, 87, 91.5],
    labels: ["T4 '25", "Nov", "Déc", "Jan '26", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep '26"],
    bars: [
      { label: "PIB", value: 7.9 },
      { label: "IPC", value: -4.1 },
      { label: "Taux", value: 11.2 },
      { label: "BC", value: 3.4 },
      { label: "RÉS", value: 2.5 },
      { label: "ACT", value: 12.0 },
    ],
  },
};

// --- Reusable Animated Dropdown Component ---
const CustomDropdown = ({ 
  options, 
  value, 
  onChange, 
  label, 
  isPair = false 
}: { 
  options: string[]; 
  value: string; 
  onChange: (val: string) => void; 
  label: string; 
  isPair?: boolean; 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-40" ref={dropdownRef}>
      <button 
        onClick={() => {
          soundFX.playPop(1.1);
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 bg-[#0A0B0F] hover:bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-full transition-colors h-10 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      >
        <span className="font-mono text-xs text-slate-400">{label} :</span>
        <div className="flex items-center gap-2">
          {isPair && <FXPairFlags pair={value} size="sm" />}
          <span className="font-mono font-bold text-xs text-white">{value}</span>
        </div>
        <ChevronDown size={13} className={clsx("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[calc(100%+6px)] left-0 min-w-[210px] bg-[#101218] border border-white/[0.1] rounded-[18px] shadow-2xl overflow-hidden z-50 p-1.5 backdrop-blur-2xl"
          >
            <div className="flex flex-col gap-0.5 max-h-[260px] overflow-y-auto no-scrollbar">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    soundFX.playPop(1.2);
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-colors text-left w-full cursor-pointer",
                    value === opt ? "bg-[var(--fx-accent,#D4FF00)] text-[#07090D] font-bold" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  {isPair && <FXPairFlags pair={opt} size="sm" />}
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function AnalyticsPage() {
  const { t, lang } = useLanguage();
  const [activePair, setActivePair] = useState("EUR/USD");
  const [activeIndicator, setActiveIndicator] = useState("Croissance PIB (GDP)");
  const [timeRange, setTimeRange] = useState<"1S" | "1M" | "3M" | "1A">("1M");
  const [windowRange, setWindowRange] = useState("12 Mois");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentTf = TIMEFRAME_CONFIG[timeRange];

  const handleTimeframeChange = (tf: "1S" | "1M" | "3M" | "1A") => {
    soundFX.playPop(1);
    setIsRefreshing(true);
    setTimeRange(tf);
    setTimeout(() => setIsRefreshing(false), 160);
  };

  return (
    <div className="w-full max-w-[1550px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col text-white">
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. UNIFIED ADMIN PAGE HEADER                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AdminPageHeader
        eyebrow={t("analytics.eyebrow")}
        badgeText={t("analytics.badge")}
        title={t("analytics.title")}
        searchPlaceholder={t("analytics.search_placeholder")}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        rightActions={
          <div className="h-10 px-4 rounded-full bg-[#101218] border border-white/[0.08] flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Calendar size={13} style={{ color: "var(--fx-accent, #D4FF00)" }} />
            <select
              value={windowRange}
              onChange={(e) => {
                soundFX.playPop(1.1);
                setWindowRange(e.target.value);
              }}
              aria-label={t("analytics.window")}
              className="bg-transparent font-mono text-xs text-slate-300 outline-none cursor-pointer pr-1"
            >
              <option value="12 Mois" className="bg-[#101218] text-white">{t("analytics.window")} 12 {lang === "fr" ? "Mois" : "Months"}</option>
              <option value="6 Mois" className="bg-[#101218] text-white">{t("analytics.window")} 6 {lang === "fr" ? "Mois" : "Months"}</option>
              <option value="3 Mois" className="bg-[#101218] text-white">{t("analytics.window")} 3 {lang === "fr" ? "Mois" : "Months"}</option>
              <option value="Tout l'historique" className="bg-[#101218] text-white">{lang === "fr" ? "Tout l'historique" : "All History"}</option>
            </select>
          </div>
        }
      />

      <GhostWireframeDissolve isRefreshing={isRefreshing}>
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 2. TOP KPI ROW - STRICTLY HOVER-ONLY, NON-CLICKABLE STAT PODS      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          
          {/* KPI 1: Bullish Confidence */}
          <CatalogueKPICard
            title={t("analytics.kpi_confidence")}
            numericValue={currentTf.confidence}
            decimals={1}
            unit="%"
            subtitle={t("analytics.kpi_confidence_sub")}
            variant="emerald"
            icon={<TrendingUp size={14} />}
            bars={[40, 65, 75, 95]}
          />

          {/* KPI 2: Bearish Divergence Rate */}
          <CatalogueKPICard
            title={t("analytics.kpi_divergence")}
            numericValue={currentTf.divergence}
            decimals={1}
            unit="%"
            subtitle={t("analytics.kpi_divergence_sub")}
            variant="rose"
            icon={<TrendingDown size={14} />}
            bars={[65, 45, 30, 15]}
          />

          {/* KPI 3: Macro Data Ingestion */}
          <CatalogueKPICard
            title={t("analytics.kpi_ingestion")}
            numericValue={currentTf.ingestion}
            decimals={1}
            unit="%"
            subtitle={t("analytics.kpi_ingestion_sub")}
            variant="lime"
            icon={<Database size={14} />}
            bars={[90, 95, 99, 100]}
          />

          {/* KPI 4: Total Signals Evaluated */}
          <CatalogueKPICard
            title={t("analytics.kpi_signals")}
            numericValue={currentTf.signals}
            decimals={0}
            unit="Pts"
            subtitle={`${lang === "fr" ? "Échantillon sur" : "Sample over"} ${currentTf.label}`}
            variant="sky"
            icon={<Activity size={14} />}
            bars={[30, 50, 70, 85]}
          />

        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 3. MORPHING SVG SPLINE CHART + INTERACTIVE SCRUBBER                */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="rounded-[24px] bg-[#101218] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_-15px_rgba(0,0,0,0.7)] p-4 sm:p-6 mb-5">
          
          {/* Top Toolbar inside Card */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <h2 className="text-base font-bold text-white tracking-tight mr-2 whitespace-nowrap flex items-center gap-2">
                <Sparkles size={16} style={{ color: "var(--fx-accent, #D4FF00)" }} />
                <span>{t("analytics.spline_title")}</span>
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <CustomDropdown
                  label={t("analytics.dropdown_pair")}
                  value={activePair}
                  options={FX_PAIRS}
                  onChange={setActivePair}
                  isPair={true}
                />
                <CustomDropdown
                  label={t("analytics.dropdown_indicator")}
                  value={activeIndicator}
                  options={INDICATORS}
                  onChange={setActiveIndicator}
                  isPair={false}
                />
              </div>
            </div>

            {/* Timeframe pill track with audio pop */}
            <div className="rounded-full bg-[#0A0B0F] border border-white/[0.06] p-1 inline-flex items-center gap-1 text-xs font-mono">
              {(["1S", "1M", "3M", "1A"] as const).map((tVal) => (
                <button
                  key={tVal}
                  onClick={() => handleTimeframeChange(tVal)}
                  className={clsx(
                    "px-3.5 py-1 rounded-full transition-all cursor-pointer font-bold",
                    timeRange === tVal 
                      ? "bg-[var(--fx-accent,#D4FF00)] text-[#07080C] shadow-[0_0_12px_rgba(var(--fx-accent-rgb),0.35)]" 
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {tVal}
                </button>
              ))}
            </div>
          </div>

          {/* Morphing Liquid SVG Spline Wave with Scrubbing Readout */}
          <div className="w-full relative py-2">
            <MorphingSplineChart
              data={currentTf.splinePoints}
              labels={currentTf.labels}
              accentColor="var(--fx-accent, #D4FF00)"
              height={140}
            />
          </div>

          {/* Sub-footer stats */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 mt-2 border-t border-white/[0.06] text-xs font-mono text-slate-400 gap-2">
            <div className="flex items-center gap-4">
              <span>{t("analytics.interpolated_points")} <span className="text-white font-bold">{currentTf.splinePoints.length}</span></span>
              <span>{t("analytics.observed_regime")} <span className="text-emerald-400 font-bold">{t("analytics.regime_val")}</span></span>
            </div>
            <span>{t("analytics.last_update")}</span>
          </div>

        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 4. STAGGERED BASELINE BARS FACTOR DISTRIBUTION                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="rounded-[24px] bg-[#101218] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_-15px_rgba(0,0,0,0.7)] p-4 sm:p-6 mb-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                {t("analytics.decomp_title")} ({currentTf.label})
              </h3>
              <p className="font-sans text-xs text-slate-400 mt-0.5">
                {t("analytics.decomp_sub")}
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {t("analytics.scale")} <span className="text-[var(--fx-accent,#D4FF00)] font-bold">±15%</span>
            </span>
          </div>

          <StaggeredBaselineBars
            bars={currentTf.bars}
            accentColor="var(--fx-accent, #D4FF00)"
            height={70}
            className="w-full"
          />
        </section>
      </GhostWireframeDissolve>

    </div>
  );
}
