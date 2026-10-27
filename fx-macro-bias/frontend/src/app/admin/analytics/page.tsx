"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createChart, ColorType, CrosshairMode, AreaSeries } from "lightweight-charts";
import { ChevronDown, Check, TrendingUp, TrendingDown, Activity, Database, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { 
  AdminPageHeader, CatalogueKPICard 
} from "@/components/admin/AdminPrimitives";
import { FXPairFlags } from "@/components/ui/DopaminePrimitives";

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

// --- Mock Data Generators ---
const generateTimeSeriesData = (points = 365, startYear = 2025, volatility = 1.2, startVal = 115, seed = 1) => {
  const res = [];
  let val = startVal;
  for (let i = 0; i < points; i++) {
    val += (Math.random() * volatility - (volatility / 2)) * seed;
    const date = new Date(startYear, 0, i + 1);
    const time = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    res.push({ time, value: parseFloat(val.toFixed(2)) });
  }
  return res;
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
        onClick={() => setIsOpen(!isOpen)}
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
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                  className={clsx(
                    "flex items-center justify-between w-full px-3 py-2 rounded-xl transition-colors text-left cursor-pointer text-xs font-mono",
                    value === opt ? "bg-[#D4FF00]/15 text-[#D4FF00] font-bold" : "text-slate-300 hover:bg-white/[0.06]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isPair && <FXPairFlags pair={opt} size="sm" />}
                    <span>{opt}</span>
                  </div>
                  {value === opt && <Check size={13} className="text-[#D4FF00]" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Reusable TradingView Chart Component ---
const LightweightAreaChart = ({ data, color = "#D4FF00" }: { data: any[]; color?: string }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94A3B8",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      width: container.clientWidth || 300,
      height: container.clientHeight || 340,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: "rgba(212, 255, 0, 0.18)",
      bottomColor: "rgba(212, 255, 0, 0.0)",
      lineWidth: 2,
    });
    
    series.setData(data);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          chart.applyOptions({ 
            width: entry.contentRect.width,
            height: entry.contentRect.height > 0 ? entry.contentRect.height : 340
          });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, color]);

  return <div ref={chartContainerRef} className="w-full h-[360px] relative" />;
};

export default function AnalyticsPage() {
  const [activePair, setActivePair] = useState("EUR/USD");
  const [activeIndicator, setActiveIndicator] = useState("Croissance PIB (GDP)");
  const [timeRange, setTimeRange] = useState("1A");
  const [windowRange, setWindowRange] = useState("12 Mois");
  const [searchQuery, setSearchQuery] = useState("");

  const [macroData, setMacroData] = useState<any[]>([]);

  useEffect(() => {
    const seed = activePair === "EUR/USD" ? 1 : 1.25;
    const points = timeRange === "1S" ? 7 : timeRange === "1M" ? 30 : timeRange === "3M" ? 90 : 365;
    setMacroData(generateTimeSeriesData(points, 2025, 1.2, 118, seed));
  }, [activeIndicator, activePair, timeRange]);

  return (
    <div className="w-full max-w-[1550px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col text-white">
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. UNIFIED ADMIN PAGE HEADER (Single row utilities, NO duplicate admin) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AdminPageHeader
        eyebrow="TÉLÉMÉTRIE PLATEFORME • SHIFTFX ENGINE"
        badgeText="FLUX TEMPS RÉEL"
        title="Analytique & Performance Modèle"
        searchPlaceholder="Rechercher un indicateur, paire..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        rightActions={
          <div className="h-10 px-4 rounded-full bg-[#101218] border border-white/[0.08] flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Calendar size={13} className="text-[#D4FF00]" />
            <select
              value={windowRange}
              onChange={(e) => setWindowRange(e.target.value)}
              aria-label="Sélectionner la fenêtre temporelle"
              className="bg-transparent font-mono text-xs text-slate-300 outline-none cursor-pointer pr-1"
            >
              <option value="12 Mois" className="bg-[#101218] text-white">Fenêtre : 12 Mois</option>
              <option value="6 Mois" className="bg-[#101218] text-white">Fenêtre : 6 Mois</option>
              <option value="3 Mois" className="bg-[#101218] text-white">Fenêtre : 3 Mois</option>
              <option value="Tout l'historique" className="bg-[#101218] text-white">Tout l'historique</option>
            </select>
          </div>
        }
      />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. TOP KPI ROW (4 Uniform CatalogueKPICard components)             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        
        {/* KPI 1: Bullish Confidence */}
        <CatalogueKPICard
          title="CONFIANCE BIAIS ACHETEUR"
          value="82.4%"
          unit="+14.2%"
          subtitle="Précision directionnelle Long"
          variant="emerald"
          icon={<TrendingUp size={14} />}
          bars={[40, 65, 75, 95]}
        />

        {/* KPI 2: Bearish Divergence Rate */}
        <CatalogueKPICard
          title="TAUX DIVERGENCE VENDEUR"
          value="14.1%"
          unit="-5.1%"
          subtitle="Écart de régime Short"
          variant="rose"
          icon={<TrendingDown size={14} />}
          bars={[65, 45, 30, 15]}
        />

        {/* KPI 3: Macro Data Ingestion */}
        <CatalogueKPICard
          title="INGESTION DONNÉES MACRO"
          value="99.9%"
          unit="Stable"
          subtitle="Flux banques centrales G10"
          variant="lime"
          icon={<Database size={14} />}
          bars={[80, 85, 95, 100]}
        />

        {/* KPI 4: Average G10 Dispersion */}
        <CatalogueKPICard
          title="DISPERSION MOYENNE G10"
          value="12.7%"
          unit="Élevée"
          subtitle="Écart-type inter-devises"
          variant="sky"
          icon={<Activity size={14} />}
          bars={[30, 50, 70, 85]}
        />

      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. MAIN CHART CONTAINER (Historical Macro Metric)                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="rounded-[24px] bg-[#101218] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_-15px_rgba(0,0,0,0.7)] p-6 mb-5">
        
        {/* Top Toolbar inside Card */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <h2 className="text-base font-bold text-white tracking-tight mr-2 whitespace-nowrap">
              Historique des Métriques Macroéconomiques
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <CustomDropdown
                label="Paire"
                value={activePair}
                options={FX_PAIRS}
                onChange={setActivePair}
                isPair={true}
              />
              <CustomDropdown
                label="Indicateur"
                value={activeIndicator}
                options={INDICATORS}
                onChange={setActiveIndicator}
                isPair={false}
              />
            </div>
          </div>

          {/* Timeframe pill track */}
          <div className="rounded-full bg-[#0A0B0F] border border-white/[0.06] p-1 inline-flex items-center gap-1 text-xs font-mono">
            {["1S", "1M", "3M", "1A"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={clsx(
                  "px-3.5 py-1 rounded-full transition-all cursor-pointer",
                  timeRange === t 
                    ? "bg-[#D4FF00] text-[#07080C] font-bold shadow-[0_0_12px_rgba(212,255,0,0.3)]" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Lightweight TradingView Area Chart */}
        <div className="w-full relative">
          <LightweightAreaChart data={macroData} color="#D4FF00" />
        </div>

        {/* Sub-footer stats */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/[0.06] text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <span>Points échantillonnés : <span className="text-white font-bold">{macroData.length}</span></span>
            <span>Régime observé : <span className="text-emerald-400 font-bold">Expansion Modérée</span></span>
          </div>
          <span>Dernière mise à jour du modèle : 26 Oct 2026</span>
        </div>

      </section>

    </div>
  );
}
