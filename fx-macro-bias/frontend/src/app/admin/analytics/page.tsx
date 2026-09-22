"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SparkAreaChart } from "@tremor/react";
import { createChart, ColorType, CrosshairMode, LineSeries, AreaSeries } from "lightweight-charts";
import { ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

// --- Constants ---
const INDICATORS = ["Interest Rates", "GDP Growth", "Inflation", "Unemployment", "Retail Sales"];
const FX_PAIRS = [
  { name: "EUR/USD", base: "eu", quote: "us" },
  { name: "GBP/USD", base: "gb", quote: "us" },
  { name: "USD/JPY", base: "us", quote: "jp" },
  { name: "AUD/USD", base: "au", quote: "us" },
  { name: "USD/CAD", base: "us", quote: "ca" },
  { name: "USD/CHF", base: "us", quote: "ch" },
  { name: "NZD/USD", base: "nz", quote: "us" }
];
const FX_PAIR_NAMES = FX_PAIRS.map(p => p.name);

// --- Mock Data Generators ---
const generateTimeSeriesData = (points = 365, startYear = 2024, volatility = 2, startVal = 100, seed = 1) => {
  let res = [];
  let val = startVal;
  for (let i = 0; i < points; i++) {
    val += (Math.random() * volatility - (volatility / 2)) * seed;
    const date = new Date(startYear, 0, i + 1);
    const time = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    res.push({ time, value: parseFloat(val.toFixed(2)) });
  }
  return res;
};

const generateTremorData = (points = 20) => {
  return Array.from({ length: points }).map((_, i) => ({
    month: `M${i}`,
    Performance: Math.floor(Math.random() * 100)
  }));
};

const FlagStack = ({ base, quote }: { base: string; quote: string }) => (
  <div className="flex items-center flex-shrink-0 mr-[4px]">
    <img src={`/flags/${base}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#1E2028] z-10 shadow-sm" alt={base} />
    <img src={`/flags/${quote}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#1E2028] -ml-[8px] z-0 shadow-sm" alt={quote} />
  </div>
);

// --- Reusable Animated Dropdown Component ---
const CustomDropdown = ({ options, value, onChange, label, isPair = false }: { options: string[], value: string, onChange: (val: string) => void, label: string, isPair?: boolean }) => {
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

  const getFlags = (pairName: string) => {
    const pair = FX_PAIRS.find(p => p.name === pairName);
    if (!pair) return null;
    return <FlagStack base={pair.base} quote={pair.quote} />;
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-[8px] bg-[#1E2028] hover:bg-[#242731] border border-white/10 px-[16px] py-[8px] rounded-[12px] transition-colors h-[40px]"
      >
        <span className="font-sans font-medium text-[13px] text-[#A0A5B1]">{label}:</span>
        <div className="flex items-center gap-[6px]">
          {isPair && getFlags(value)}
          <span className="font-sans font-bold text-[13px] text-white">{value}</span>
        </div>
        <ChevronDown size={14} className={clsx("text-[#A0A5B1] transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-[calc(100%+8px)] left-0 w-[200px] bg-[#1E2028] border border-white/10 rounded-[12px] shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col py-[8px]">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                  className="flex items-center justify-between w-full px-[16px] py-[10px] hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-[6px]">
                    {isPair && getFlags(opt)}
                    <span className={clsx("font-sans text-[13px]", value === opt ? "font-bold text-[#D2F646]" : "font-medium text-white")}>
                      {opt}
                    </span>
                  </div>
                  {value === opt && <Check size={14} className="text-[#D2F646]" />}
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
const LightweightChart = ({ data, color, type = "line" }: { data: any[], color: string, type?: "line" | "area" }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Initialize chart only once
    if (!chartInstanceRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#8B949E",
          fontFamily: "'JetBrains Mono', monospace",
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.03)" },
          horzLines: { color: "rgba(255, 255, 255, 0.03)" },
        },
        crosshair: { mode: CrosshairMode.Magnet },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });

      let series;
      if (type === "area") {
        series = chart.addSeries(AreaSeries, {
          lineColor: color,
          topColor: `${color}80`,
          bottomColor: `${color}00`,
          lineWidth: 2,
        });
      } else {
        series = chart.addSeries(LineSeries, { color, lineWidth: 2 });
      }
      
      chartInstanceRef.current = chart;
      seriesRef.current = series;
      
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", handleResize);
    }
    
    // Update data on prop change seamlessly
    seriesRef.current.setData(data);
    chartInstanceRef.current.timeScale().fitContent();

  }, [data, color, type]); // We intentionally depend on data here

  return <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />;
};

// --- Page Component ---
export default function AnalyticsPage() {
  const [activePairMacro, setActivePairMacro] = useState("EUR/USD");
  const [activeIndicator, setActiveIndicator] = useState("GDP Growth");
  const [activePairScore, setActivePairScore] = useState("EUR/USD");
  const [timeRange, setTimeRange] = useState("1Y");

  // Dynamic state for charts that updates when dropdowns change
  const [macroData, setMacroData] = useState<any[]>([]);
  const [scoreData, setScoreData] = useState<any[]>([]);

  useEffect(() => {
    // Generate new mock data when indicator changes to simulate fetching
    const seed = Math.random() > 0.5 ? 1 : -1;
    const points = timeRange === "1W" ? 7 : timeRange === "1M" ? 30 : 365;
    setMacroData(generateTimeSeriesData(points, 2024, 1.5, 120, seed));
  }, [activeIndicator, activePairMacro, timeRange]);

  useEffect(() => {
    // Generate new mock score data when pair changes
    const seed = Math.random() > 0.5 ? 1.2 : 0.8;
    setScoreData(generateTimeSeriesData(730, 2024, 0.5, 5, seed));
  }, [activePairScore]);
  
  const [tremorData1] = useState(generateTremorData());
  const [tremorData2] = useState(generateTremorData());
  const [tremorData3] = useState(generateTremorData());

  const springConfig = { type: "spring" as const, stiffness: 300, damping: 30 };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
      className="flex flex-col w-full h-full bg-transparent overflow-y-auto no-scrollbar"
    >
      <header className="w-full flex items-center justify-between p-[40px_48px] pb-[32px]">
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">Platform Telemetry</span>
          <h1 className="font-sans font-bold text-[40px] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Analytics Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-[16px]">
          <GlobalSearch />
          <AuthHeaderWidget />
        </div>
      </header>

      <main className="flex flex-col px-[48px] gap-[24px] pb-[64px] max-w-[1600px] w-full mx-auto">
        
        {/* KPI Sparkline Row (Tremor) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[28px] p-[26px] shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col justify-between h-[170px]"
          >
            <div className="flex justify-between items-start">
              <span className="font-sans font-medium text-[15px] text-[#A0A5B1]">Bullish Bias Confidence</span>
              <span className="bg-[#6FF542]/10 text-[#6FF542] border border-[#6FF542]/30 px-[10px] py-[3px] rounded-full font-mono font-bold text-[12px]">+14.2%</span>
            </div>
            <div className="flex items-end gap-[16px] h-[60px] w-full">
              <span className="font-sans font-bold text-[36px] text-white leading-none font-mono">82.4%</span>
              <div className="h-full flex-1 w-full ml-auto">
                <SparkAreaChart
                  data={tremorData1}
                  categories={["Performance"]}
                  index="month"
                  colors={["emerald"]}
                  className="h-full w-full"
                />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[28px] p-[26px] shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col justify-between h-[170px]"
          >
            <div className="flex justify-between items-start">
              <span className="font-sans font-medium text-[15px] text-[#A0A5B1]">Bearish Divergence Rate</span>
              <span className="bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/30 px-[10px] py-[3px] rounded-full font-mono font-bold text-[12px]">-5.1%</span>
            </div>
            <div className="flex items-end gap-[16px] h-[60px] w-full">
              <span className="font-sans font-bold text-[36px] text-white leading-none font-mono">14.1%</span>
              <div className="h-full flex-1 w-full ml-auto">
                <SparkAreaChart
                  data={tremorData2}
                  categories={["Performance"]}
                  index="month"
                  colors={["rose"]}
                  className="h-full w-full"
                />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[28px] p-[26px] shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col justify-between h-[170px]"
          >
            <div className="flex justify-between items-start">
              <span className="font-sans font-medium text-[15px] text-[#A0A5B1]">Macro Data Ingestion</span>
              <span className="bg-[#D2F646]/10 text-[#D2F646] border border-[#D2F646]/30 px-[10px] py-[3px] rounded-full font-mono font-bold text-[12px]">Stable</span>
            </div>
            <div className="flex items-end gap-[16px] h-[60px] w-full">
              <span className="font-sans font-bold text-[36px] text-white leading-none font-mono">99.9%</span>
              <div className="h-full flex-1 w-full ml-auto opacity-70">
                <SparkAreaChart
                  data={tremorData3}
                  categories={["Performance"]}
                  index="month"
                  colors={["slate"]}
                  className="h-full w-full"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* TradingView Heavy Chart Row 1 - MACRO METRIC */}
        <div className="bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[28px] p-[28px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col h-[420px] relative overflow-hidden z-20">
          <div className="flex justify-between items-start z-10 mb-[16px]">
            <div className="flex flex-col">
              <h3 className="font-sans font-bold text-[20px] text-white mb-[8px]">Historical Macro Metric</h3>
              <div className="flex gap-[12px]">
                <CustomDropdown options={FX_PAIR_NAMES} value={activePairMacro} onChange={setActivePairMacro} label="Pair" isPair />
                <CustomDropdown options={INDICATORS} value={activeIndicator} onChange={setActiveIndicator} label="Metric" />
              </div>
            </div>
            <div className="flex items-center bg-[#1D202B]/80 p-1.5 rounded-2xl border border-white/5">
              {["1W", "1M", "1Y"].map((range) => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={clsx(
                    "relative px-[16px] py-[6px] rounded-xl text-[12px] font-bold font-mono transition-colors z-10",
                    timeRange === range ? "text-[#121418]" : "text-[#A0A5B1] hover:text-white"
                  )}
                >
                  {range}
                  {timeRange === range && (
                    <motion.div
                      layoutId="activeRangePill"
                      className="absolute inset-0 bg-[#D2F646] rounded-xl z-[-1] shadow-[0_0_12px_rgba(210,246,70,0.4)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full relative mt-[8px]">
             {macroData.length > 0 && <LightweightChart data={macroData} color="#D2F646" type="line" />}
          </div>
        </div>

        {/* TradingView Heavy Chart Row 2 - FINAL SCORE */}
        <div className="bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[28px] p-[28px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col h-[420px] relative overflow-hidden z-10">
          <div className="flex justify-between items-start z-10 mb-[16px]">
            <div className="flex flex-col">
              <h3 className="font-sans font-bold text-[20px] text-white mb-[8px]">Final Score Trajectory</h3>
              <div className="flex gap-[12px]">
                 <CustomDropdown options={FX_PAIR_NAMES} value={activePairScore} onChange={setActivePairScore} label="Pair" isPair />
              </div>
            </div>
          </div>
          <div className="flex-1 w-full relative mt-[8px]">
             {scoreData.length > 0 && <LightweightChart data={scoreData} color="#00E5FF" type="area" />}
          </div>
        </div>

      </main>
    </motion.div>
  );
}
