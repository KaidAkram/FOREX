"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings2, 
  Clock, 
  Calendar, 
  Globe2, 
  Database, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  ArrowRight, 
  BookOpen, 
  Layers, 
  Cpu, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Save,
  Check,
  Zap,
  Terminal,
  Server,
  Bell,
  Code2,
  FileText,
  SlidersHorizontal,
  Info
} from "lucide-react";
import { clsx } from "clsx";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

const matteCard = "bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[28px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

// Presets
const CRON_PRESETS = [
  { id: "hourly", label: "Every Hour", expression: "0 * * * *", desc: "High frequency macro polling" },
  { id: "4hours", label: "Every 4 Hours", expression: "0 */4 * * *", desc: "Optimal balance for daily central bank updates" },
  { id: "12hours", label: "Every 12 Hours", expression: "0 */12 * * *", desc: "Twice daily (London & New York sessions)" },
  { id: "daily", label: "Daily at 00:00 UTC", expression: "0 0 * * *", desc: "End-of-day macroeconomic settlement" },
  { id: "weekly", label: "Weekly (Monday)", expression: "0 0 * * 1", desc: "Weekly macro bias reset" },
  { id: "custom", label: "Custom Expression", expression: "", desc: "Define explicit crontab expression" },
];

const DATE_RANGE_PRESETS = [
  { id: "30d", label: "Last 30 Days", desc: "Recent month high-frequency releases" },
  { id: "qtd", label: "Current Quarter (QTD)", desc: "Quarterly GDP and CPI alignment" },
  { id: "1y", label: "Rolling 1 Year", desc: "Annual trailing macro cycle" },
  { id: "5y", label: "Full Cycle (2020 - Present)", desc: "Multi-year monetary policy divergence" },
  { id: "custom", label: "Custom Date Range", desc: "Pick explicit start and end dates" },
];

const DATA_SOURCES = [
  { id: "trading_economics", name: "Trading Economics Feed", type: "Core Scraper", status: "Active", lang: "EN / FR", coverage: "CPI, GDP, Rates, FX Reserves" },
  { id: "fred", name: "FRED St. Louis Fed API", type: "Institutional API", status: "Active", lang: "EN", coverage: "US Macro Differentials & Treasuries" },
  { id: "ecb_sdw", name: "ECB Statistical Data Warehouse", type: "Official Central Bank", status: "Active", lang: "EN / FR", coverage: "Eurozone HICP, M3, Refi Rates" },
  { id: "boe_feed", name: "Bank of England Portal", type: "Official Central Bank", status: "Active", lang: "EN", coverage: "UK Bank Rate, CPI, Services Inflation" },
  { id: "boj_feed", name: "Bank of Japan Time Series", type: "Official Central Bank", status: "Active", lang: "EN", coverage: "Yield Curve Control, Tokyo CPI" },
  { id: "snb_feed", name: "Swiss National Bank Data Portal", type: "Official Central Bank", status: "Active", lang: "EN / FR", coverage: "SNB Policy Rate, Sight Deposits" },
  { id: "boc_feed", name: "Bank of Canada Ingestion", type: "Official Central Bank", status: "Active", lang: "EN / FR", coverage: "Overnight Rate, Trimmed CPI" },
  { id: "rba_feed", name: "Reserve Bank of Australia", type: "Official Central Bank", status: "Active", lang: "EN", coverage: "Cash Rate Target, Trimmed Mean CPI" },
  { id: "rbnz_feed", name: "Reserve Bank of New Zealand", type: "Official Central Bank", status: "Active", lang: "EN", coverage: "Official Cash Rate, Trade Differentials" },
  { id: "yahoo_fx", name: "G10 Equity & FX Ticker Feed", type: "Market Quotes", status: "Active", lang: "Global", coverage: "S&P 500, DAX, FTSE, Nikkei, SMI, ASX" }
];

const STORAGE_SETTINGS_KEY = "shiftfx_scraper_settings";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"orchestration" | "architecture">("orchestration");
  const [guideLang, setGuideLang] = useState<"EN" | "FR">("EN");

  // Settings State
  const [cronPreset, setCronPreset] = useState("4hours");
  const [customCron, setCustomCron] = useState("0 */4 * * *");
  const [timezone, setTimezone] = useState("UTC");
  const [cronActive, setCronActive] = useState(true);

  // Date Range State
  const [rangePreset, setRangePreset] = useState("1y");
  const [startDate, setStartDate] = useState("2023-10-01");
  const [endDate, setEndDate] = useState("2026-09-22");

  // Language & Parser State
  const [scraperLang, setScraperLang] = useState<"bilingual" | "en" | "fr">("bilingual");
  const [systemUIRefLang, setSystemUIRefLang] = useState<"en" | "fr">("en");

  // Scraping Performance
  const [concurrency, setConcurrency] = useState(4);
  const [timeoutSec, setTimeoutSec] = useState(30);
  const [proxyRotation, setProxyRotation] = useState(true);
  const [retryAttempts, setRetryAttempts] = useState(3);

  // Notifications
  const [notifyOnSuccess, setNotifyOnSuccess] = useState(true);
  const [notifyOnError, setNotifyOnError] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("https://discord.com/api/webhooks/macro-alerts");

  // Save state
  const [isSaved, setIsSaved] = useState(false);

  // Live Scraping Trigger Simulation
  const [isScrapingNow, setIsScrapingNow] = useState(false);
  const [scrapeStep, setScrapeStep] = useState(0);
  const [lastScrapeTime, setLastScrapeTime] = useState<string>("Oct 24, 14:00 UTC");
  const [cronFinishedNotice, setCronFinishedNotice] = useState<string | null>(null);

  // Load saved settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.cronPreset) setCronPreset(parsed.cronPreset);
        if (parsed.customCron) setCustomCron(parsed.customCron);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.rangePreset) setRangePreset(parsed.rangePreset);
        if (parsed.startDate) setStartDate(parsed.startDate);
        if (parsed.endDate) setEndDate(parsed.endDate);
        if (parsed.scraperLang) setScraperLang(parsed.scraperLang);
        if (parsed.lastScrapeTime) setLastScrapeTime(parsed.lastScrapeTime);
      }
    } catch {}
  }, []);

  const handleSaveSettings = () => {
    const payload = {
      cronPreset,
      customCron,
      timezone,
      cronActive,
      rangePreset,
      startDate,
      endDate,
      scraperLang,
      systemUIRefLang,
      concurrency,
      timeoutSec,
      proxyRotation,
      retryAttempts,
      notifyOnSuccess,
      notifyOnError,
      webhookUrl,
      lastScrapeTime
    };
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(payload));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch {}
  };

  const handleTriggerScraperNow = async () => {
    if (isScrapingNow) return;
    setIsScrapingNow(true);
    setCronFinishedNotice(null);
    setScrapeStep(1);

    // Simulated 5-stage pipeline
    await new Promise(r => setTimeout(r, 700));
    setScrapeStep(2);
    await new Promise(r => setTimeout(r, 800));
    setScrapeStep(3);
    await new Promise(r => setTimeout(r, 700));
    setScrapeStep(4);
    await new Promise(r => setTimeout(r, 600));
    setScrapeStep(5);
    await new Promise(r => setTimeout(r, 500));

    const nowFormatted = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    });

    setLastScrapeTime(nowFormatted);
    setIsScrapingNow(false);
    setScrapeStep(0);
    setCronFinishedNotice(`Cron Job execution successfully completed at ${nowFormatted}! Ingested 60 economic time series across 10 currencies with 0 errors. Macro Differentials and Final Scores are updated.`);
  };

  return (
    <div className="flex flex-col w-full h-full bg-transparent overflow-y-auto no-scrollbar">
      {/* --- Top Header --- */}
      <header className="w-full flex items-center justify-between p-[40px_48px] pb-[28px] opacity-0 animate-fadeIn">
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-center gap-3">
            <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">Engine Configuration & Pipeline</span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D2F646]/10 border border-[#D2F646]/25 text-[#D2F646] font-mono text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D2F646] animate-pulse" />
              Cron Engine: {cronActive ? "Active" : "Paused"}
            </span>
          </div>
          <h1 className="font-sans font-bold text-[40px] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Settings & Architecture
          </h1>
        </div>

        <div className="flex items-center gap-[16px]">
          <GlobalSearch placeholder="Search cron, date ranges, sources..." />

          {/* Quick Trigger Button */}
          <motion.button
            whileHover={{ scale: 1.02, filter: "brightness(1.08)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTriggerScraperNow}
            disabled={isScrapingNow}
            className={clsx(
              "flex items-center gap-2 px-5 py-3 rounded-2xl font-sans font-bold text-xs shadow-lg transition-all cursor-pointer",
              isScrapingNow
                ? "bg-white/10 text-white border border-white/10 cursor-not-allowed"
                : "bg-[#D2F646] text-[#121418] shadow-[0_0_20px_rgba(210,246,70,0.35)]"
            )}
          >
            {isScrapingNow ? (
              <>
                <RefreshCw size={15} className="animate-spin text-[#D2F646]" />
                <span>Running Pipeline ({scrapeStep}/5)...</span>
              </>
            ) : (
              <>
                <Play size={15} fill="currentColor" />
                <span>Run Scraper Now</span>
              </>
            )}
          </motion.button>

          <AuthHeaderWidget />
        </div>
      </header>

      {/* --- Completion Notice Alert --- */}
      <AnimatePresence>
        {cronFinishedNotice && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="mx-[48px] mb-6 p-4 rounded-2xl bg-[#6FF542]/10 border border-[#6FF542]/30 flex items-start justify-between gap-4 shadow-[0_0_30px_rgba(111,245,66,0.15)]"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-[#6FF542] flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-sans font-bold text-sm text-white">Cron Scrape Job Done & Validated</span>
                <span className="font-sans text-xs text-[#A0A5B1]">{cronFinishedNotice}</span>
              </div>
            </div>
            <button
              onClick={() => setCronFinishedNotice(null)}
              className="text-xs font-mono text-[#A0A5B1] hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Main Content Container --- */}
      <main className="flex flex-col px-[48px] gap-[32px] pb-[64px] max-w-[1550px] w-full mx-auto">

        {/* Section Tabs Switcher */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center bg-[#1A1C25]/90 border border-white/10 rounded-2xl p-1 shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTab("orchestration")}
              className={clsx(
                "flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer",
                activeTab === "orchestration"
                  ? "bg-[#D2F646] text-[#121418] shadow-md shadow-[#D2F646]/20"
                  : "text-[#A0A5B1] hover:text-white"
              )}
            >
              <SlidersHorizontal size={15} />
              <span>Scraper & Cron Orchestration</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("architecture")}
              className={clsx(
                "flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer",
                activeTab === "architecture"
                  ? "bg-[#D2F646] text-[#121418] shadow-md shadow-[#D2F646]/20"
                  : "text-[#A0A5B1] hover:text-white"
              )}
            >
              <BookOpen size={15} />
              <span>How It Works: Model & Scraper Architecture</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-1.5 text-xs font-mono text-[#A0A5B1]">
              <Clock size={14} className="text-[#D2F646]" />
              <span>Last Ingestion: <strong className="text-white">{lastScrapeTime}</strong></span>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-sans font-bold text-xs transition-all cursor-pointer"
            >
              {isSaved ? <Check size={14} className="text-[#6FF542]" /> : <Save size={14} />}
              <span>{isSaved ? "Saved Successfully!" : "Save Settings"}</span>
            </motion.button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: SCRAPER & CRON ORCHESTRATION                           */}
        {/* ============================================================== */}
        {activeTab === "orchestration" && (
          <div className="flex flex-col gap-8 opacity-0 animate-fadeIn">

            {/* Live Progress Bar when Running */}
            <AnimatePresence>
              {isScrapingNow && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={clsx("p-6 overflow-hidden border border-[#D2F646]/30", matteCard)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#D2F646]/15 border border-[#D2F646]/30 flex items-center justify-center text-[#D2F646]">
                        <RefreshCw size={16} className="animate-spin" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sans font-bold text-sm text-white">Automated Ingestion In Progress</span>
                        <span className="text-xs font-mono text-[#D2F646]">
                          {scrapeStep === 1 && "Connecting to 9 Central Bank & Trading Economics endpoints..."}
                          {scrapeStep === 2 && "Scraping & parsing 6 indicators across 10 currencies (EN & FR)..."}
                          {scrapeStep === 3 && "Computing pairwise country differentials (Country A - Country B)..."}
                          {scrapeStep === 4 && "Evaluating Rating Rules (-10 to +10) for all macro metrics..."}
                          {scrapeStep === 5 && "Summing 6 indicators, calculating Final Score % and updating Radar..."}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-[#A0A5B1]">Stage {scrapeStep} / 5</span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#D2F646] to-[#00E5FF]"
                      animate={{ width: `${(scrapeStep / 5) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grid Row 1: Cron Job Scheduling & Date Range */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Card 1: Cron Job Execution Schedule */}
              <div className={clsx("p-8 flex flex-col gap-6", matteCard)}>
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#D2F646]/10 border border-[#D2F646]/20 flex items-center justify-center text-[#D2F646]">
                      <Clock size={20} />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="font-sans font-bold text-lg text-white">Cron Job Scheduling</h2>
                      <span className="text-xs text-[#A0A5B1]">Configure automated scraping cadence & triggers</span>
                    </div>
                  </div>

                  {/* Daemon Toggle */}
                  <button
                    type="button"
                    onClick={() => setCronActive(!cronActive)}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition-all cursor-pointer",
                      cronActive
                        ? "bg-[#6FF542]/10 border-[#6FF542]/30 text-[#6FF542]"
                        : "bg-white/5 border-white/10 text-[#A0A5B1]"
                    )}
                  >
                    <span className={clsx("w-2 h-2 rounded-full", cronActive ? "bg-[#6FF542] animate-pulse" : "bg-[#A0A5B1]")} />
                    <span>{cronActive ? "Cron Active" : "Cron Paused"}</span>
                  </button>
                </div>

                {/* Preset Frequency Cards */}
                <div className="flex flex-col gap-3">
                  <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Scraping Frequency Preset</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CRON_PRESETS.map((p) => {
                      const isSelected = cronPreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setCronPreset(p.id);
                            if (p.expression) setCustomCron(p.expression);
                          }}
                          className={clsx(
                            "flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer",
                            isSelected
                              ? "bg-[#D2F646]/10 border-[#D2F646]/40 shadow-sm"
                              : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={clsx("font-sans font-bold text-xs", isSelected ? "text-[#D2F646]" : "text-white")}>
                              {p.label}
                            </span>
                            {p.expression && (
                              <span className="font-mono text-[10px] text-[#A0A5B1] bg-white/5 px-2 py-0.5 rounded-md">
                                {p.expression}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#A0A5B1] leading-tight">{p.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Cron Expression Input */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Crontab Expression</label>
                    <span className="font-mono text-[11px] text-[#00E5FF]">UTC Timezone</span>
                  </div>
                  <div className="flex items-center gap-3 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#D2F646]/50">
                    <Terminal size={16} className="text-[#A0A5B1]" />
                    <input
                      type="text"
                      value={customCron}
                      onChange={(e) => {
                        setCustomCron(e.target.value);
                        setCronPreset("custom");
                      }}
                      placeholder="0 */4 * * *"
                      className="w-full bg-transparent border-none outline-none font-mono text-sm text-white placeholder:text-[#A0A5B1]/40"
                    />
                  </div>
                  <span className="text-[11px] text-[#A0A5B1]">
                    Evaluates to: <span className="text-white font-mono font-medium">Runs every 4 hours on minute 0</span>
                  </span>
                </div>

                {/* Timezone Configuration */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="font-sans text-xs text-[#A0A5B1]">Execution Timezone</span>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="bg-[#1A1C25] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none cursor-pointer"
                  >
                    <option value="UTC">UTC (Universal Coordinated)</option>
                    <option value="Europe/London">Europe/London (GMT / BST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET / CEST)</option>
                    <option value="America/New_York">America/New_York (EST / EDT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  </select>
                </div>
              </div>

              {/* Card 2: Scraping Date Range (From Where to Where) */}
              <div className={clsx("p-8 flex flex-col gap-6", matteCard)}>
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF]">
                      <Calendar size={20} />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="font-sans font-bold text-lg text-white">Scraping Date Range</h2>
                      <span className="text-xs text-[#A0A5B1]">Lookback window & historical horizon</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/20 px-2.5 py-1 rounded-full">
                    G10 Cycle
                  </span>
                </div>

                {/* Preset Ranges */}
                <div className="flex flex-col gap-3">
                  <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Select Ingestion Horizon</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DATE_RANGE_PRESETS.map((r) => {
                      const isSelected = rangePreset === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRangePreset(r.id)}
                          className={clsx(
                            "flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer",
                            isSelected
                              ? "bg-[#00E5FF]/10 border-[#00E5FF]/40 shadow-sm"
                              : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                          )}
                        >
                          <span className={clsx("font-sans font-bold text-xs mb-1", isSelected ? "text-[#00E5FF]" : "text-white")}>
                            {r.label}
                          </span>
                          <span className="text-[11px] text-[#A0A5B1] leading-tight">{r.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Explicit Date From / To Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Scrape From (Start Date)</label>
                    <div className="flex items-center gap-2 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#00E5FF]/50">
                      <Calendar size={16} className="text-[#A0A5B1]" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setRangePreset("custom");
                        }}
                        className="w-full bg-transparent border-none outline-none font-mono text-xs text-white cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Scrape To (End Date)</label>
                    <div className="flex items-center gap-2 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#00E5FF]/50">
                      <Calendar size={16} className="text-[#A0A5B1]" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setRangePreset("custom");
                        }}
                        className="w-full bg-transparent border-none outline-none font-mono text-xs text-white cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[#A0A5B1]">Historical GDP & CPI Revision Handling</span>
                  <span className="text-[#6FF542] font-semibold">Auto-Retrofit Enabled</span>
                </div>
              </div>

            </div>

            {/* Grid Row 2: Language (EN/FR) & Performance Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Card 3: Language & Multi-Lingual Ingestion Parser */}
              <div className={clsx("p-8 flex flex-col gap-6", matteCard)}>
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#D2F646]/10 border border-[#D2F646]/20 flex items-center justify-center text-[#D2F646]">
                      <Globe2 size={20} />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="font-sans font-bold text-lg text-white">Language & Localization (FR / EN)</h2>
                      <span className="text-xs text-[#A0A5B1]">Parser mappings for French & English releases</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#D2F646] bg-[#D2F646]/10 border border-[#D2F646]/20 px-2.5 py-1 rounded-full">
                    Multi-Lingual
                  </span>
                </div>

                {/* Scraper Parsing Language */}
                <div className="flex flex-col gap-3">
                  <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Scraper Source Extraction Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setScraperLang("bilingual")}
                      className={clsx(
                        "p-3 rounded-2xl border text-center transition-all cursor-pointer",
                        scraperLang === "bilingual"
                          ? "bg-[#D2F646]/10 border-[#D2F646]/40 text-[#D2F646] font-bold"
                          : "bg-white/[0.02] border-white/5 text-[#A0A5B1] hover:text-white"
                      )}
                    >
                      <span className="block text-xs">Bilingual (FR + EN)</span>
                      <span className="text-[10px] text-[#A0A5B1] block mt-0.5">Auto-Standardized</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScraperLang("en")}
                      className={clsx(
                        "p-3 rounded-2xl border text-center transition-all cursor-pointer",
                        scraperLang === "en"
                          ? "bg-[#D2F646]/10 border-[#D2F646]/40 text-[#D2F646] font-bold"
                          : "bg-white/[0.02] border-white/5 text-[#A0A5B1] hover:text-white"
                      )}
                    >
                      <span className="block text-xs">English Only (EN)</span>
                      <span className="text-[10px] text-[#A0A5B1] block mt-0.5">Fed, BoE, TE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScraperLang("fr")}
                      className={clsx(
                        "p-3 rounded-2xl border text-center transition-all cursor-pointer",
                        scraperLang === "fr"
                          ? "bg-[#D2F646]/10 border-[#D2F646]/40 text-[#D2F646] font-bold"
                          : "bg-white/[0.02] border-white/5 text-[#A0A5B1] hover:text-white"
                      )}
                    >
                      <span className="block text-xs">Français Only (FR)</span>
                      <span className="text-[10px] text-[#A0A5B1] block mt-0.5">INSEE, BdF</span>
                    </button>
                  </div>
                </div>

                {/* Dictionary Mapping Preview */}
                <div className="flex flex-col gap-2">
                  <span className="font-sans text-xs font-semibold text-[#A0A5B1]">Indicator Dual-Language Mapping Lexicon</span>
                  <div className="bg-[#14161E] border border-white/5 rounded-2xl p-4 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between text-[#A0A5B1] pb-1 border-b border-white/5 font-mono text-[11px]">
                      <span>Indicator Code</span>
                      <span>Français (FR)</span>
                      <span>English (EN)</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="font-mono text-[#D2F646]">CPI</span>
                      <span className="text-white">Indice des prix à la consommation</span>
                      <span className="text-[#A0A5B1]">Consumer Price Index</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="font-mono text-[#D2F646]">GDP</span>
                      <span className="text-white">Croissance du PIB (Glissement annuel)</span>
                      <span className="text-[#A0A5B1]">GDP Annual Growth Rate</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="font-mono text-[#D2F646]">RATE</span>
                      <span className="text-white">Taux directeur de la banque centrale</span>
                      <span className="text-[#A0A5B1]">Central Bank Policy Rate</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="font-mono text-[#D2F646]">CA</span>
                      <span className="text-white">Compte courant / PIB</span>
                      <span className="text-[#A0A5B1]">Current Account to GDP</span>
                    </div>
                  </div>
                </div>

                {/* System UI Reference Language */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="font-sans text-xs text-[#A0A5B1]">System Documentation & Export Language</span>
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSystemUIRefLang("en")}
                      className={clsx("px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer", systemUIRefLang === "en" ? "bg-[#D2F646] text-[#121418]" : "text-[#A0A5B1]")}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setSystemUIRefLang("fr")}
                      className={clsx("px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer", systemUIRefLang === "fr" ? "bg-[#D2F646] text-[#121418]" : "text-[#A0A5B1]")}
                    >
                      Français
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 4: Performance, Safety & Alert Webhooks */}
              <div className={clsx("p-8 flex flex-col gap-6", matteCard)}>
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#6FF542]/10 border border-[#6FF542]/20 flex items-center justify-center text-[#6FF542]">
                      <Server size={20} />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="font-sans font-bold text-lg text-white">Engine Performance & Safety</h2>
                      <span className="text-xs text-[#A0A5B1]">Concurrency, proxies, retry budgets & alerts</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#6FF542] bg-[#6FF542]/10 border border-[#6FF542]/20 px-2.5 py-1 rounded-full">
                    Resilient
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Concurrency */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Scraper Concurrency</label>
                    <div className="bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3">
                      <select
                        value={concurrency}
                        onChange={(e) => setConcurrency(Number(e.target.value))}
                        className="w-full bg-transparent border-none outline-none font-mono text-xs text-white cursor-pointer"
                      >
                        <option value={1} className="bg-[#1A1C25]">1 Worker (Gentle)</option>
                        <option value={2} className="bg-[#1A1C25]">2 Workers (Balanced)</option>
                        <option value={4} className="bg-[#1A1C25]">4 Workers (Recommended)</option>
                        <option value={8} className="bg-[#1A1C25]">8 Workers (High Throughput)</option>
                      </select>
                    </div>
                  </div>

                  {/* Timeout */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Request Timeout</label>
                    <div className="bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3">
                      <select
                        value={timeoutSec}
                        onChange={(e) => setTimeoutSec(Number(e.target.value))}
                        className="w-full bg-transparent border-none outline-none font-mono text-xs text-white cursor-pointer"
                      >
                        <option value={15} className="bg-[#1A1C25]">15 Seconds</option>
                        <option value={30} className="bg-[#1A1C25]">30 Seconds (Default)</option>
                        <option value={60} className="bg-[#1A1C25]">60 Seconds (Slow Feeds)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Proxy & IP Rotation */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex flex-col">
                    <span className="font-sans font-bold text-xs text-white">Proxy & Header Rotation</span>
                    <span className="text-[11px] text-[#A0A5B1]">Prevents HTTP 429 rate limiting on Trading Economics</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProxyRotation(!proxyRotation)}
                    className={clsx(
                      "w-11 h-6 rounded-full transition-colors relative cursor-pointer",
                      proxyRotation ? "bg-[#D2F646]" : "bg-white/10"
                    )}
                  >
                    <span className={clsx(
                      "w-5 h-5 rounded-full bg-[#121418] absolute top-0.5 transition-transform",
                      proxyRotation ? "right-0.5" : "left-0.5"
                    )} />
                  </button>
                </div>

                {/* Webhook Alert URL */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Completion & Error Webhook</label>
                    <span className="text-[10px] font-mono text-[#A0A5B1]">Discord / Slack / Telegram</span>
                  </div>
                  <div className="flex items-center gap-3 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#D2F646]/50">
                    <Bell size={16} className="text-[#A0A5B1]" />
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://webhook.site/..."
                      className="w-full bg-transparent border-none outline-none font-mono text-xs text-white placeholder:text-[#A0A5B1]/40"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Ingestion Data Sources Table */}
            <div className={clsx("p-8 flex flex-col gap-6", matteCard)}>
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                    <Database size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="font-sans font-bold text-lg text-white">Ingestion Feed Registry</h2>
                    <span className="text-xs text-[#A0A5B1]">Connected central bank statistical feeds & market APIs</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#6FF542]">10 / 10 Feeds Operational</span>
              </div>

              <div className="w-full overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] font-mono uppercase tracking-wider text-[#A0A5B1]">
                      <th className="py-3 px-4">Source Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Languages</th>
                      <th className="py-3 px-4">Coverage</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-xs">
                    {DATA_SOURCES.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-sans font-bold text-white flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-[#6FF542]" />
                          <span>{s.name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#A0A5B1]">{s.type}</td>
                        <td className="py-3.5 px-4 font-mono text-[#00E5FF]">{s.lang}</td>
                        <td className="py-3.5 px-4 text-[#A0A5B1]">{s.coverage}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="px-2.5 py-1 rounded-full bg-[#6FF542]/10 border border-[#6FF542]/20 text-[#6FF542] font-mono text-[10px] font-bold">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: HOW IT WORKS: ARCHITECTURE & CLIENT EXPLANATION GUIDE   */}
        {/* ============================================================== */}
        {activeTab === "architecture" && (
          <div className="flex flex-col gap-8 opacity-0 animate-fadeIn">
            
            {/* Guide Language Selector Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#161822] border border-white/10">
              <div className="flex items-center gap-3">
                <Info size={18} className="text-[#D2F646]" />
                <span className="font-sans text-xs text-white">
                  {guideLang === "EN" 
                    ? "Interactive client guide explaining where data is scrapped from, how differentials are calculated, and how rating rules work."
                    : "Guide client interactif expliquant d'où proviennent les données scrapées, le calcul des différentiels et le moteur de scoring."}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setGuideLang("EN")}
                  className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer", guideLang === "EN" ? "bg-[#D2F646] text-[#121418]" : "text-[#A0A5B1]")}
                >
                  English Version
                </button>
                <button
                  type="button"
                  onClick={() => setGuideLang("FR")}
                  className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer", guideLang === "FR" ? "bg-[#D2F646] text-[#121418]" : "text-[#A0A5B1]")}
                >
                  Version Française
                </button>
              </div>
            </div>

            {/* Step-by-Step Interactive Pipeline Diagram */}
            <div className={clsx("p-8 md:p-10 flex flex-col gap-8", matteCard)}>
              <div className="flex flex-col gap-2 border-b border-white/5 pb-6">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D2F646]">
                  {guideLang === "EN" ? "End-to-End Pipeline Workflow" : "Flux de Traitement de Bout en Bout"}
                </span>
                <h2 className="font-sans font-bold text-2xl text-white">
                  {guideLang === "EN" ? "How ShiftFX Scrapes & Processes Macro Bias" : "Fonctionnement du Moteur Macro FX Differential"}
                </h2>
                <p className="text-sm text-[#A0A5B1]">
                  {guideLang === "EN" 
                    ? "ShiftFX is an institutional macroeconomic analysis service for Forex traders. Proposition: 'Know the macro bias before looking for a trade.'"
                    : "FX Differential est un service web d'analyse macroéconomique destiné aux traders Forex. Proposition de valeur : 'Know the macro bias before looking for a trade.'"}
                </p>
              </div>

              {/* 5-Stage Diagram Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                
                {/* Stage 1 */}
                <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group hover:border-[#D2F646]/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-[#D2F646]/10 text-[#D2F646] font-mono font-bold text-xs flex items-center justify-center">
                    01
                  </div>
                  <span className="font-sans font-bold text-sm text-white">
                    {guideLang === "EN" ? "Data Ingestion" : "Ingestion des Données"}
                  </span>
                  <p className="text-xs text-[#A0A5B1] leading-relaxed">
                    {guideLang === "EN"
                      ? "Scrapes 6 core indicators across G10 economies from Trading Economics, FRED, and Central Banks."
                      : "Scraping de 6 indicateurs fondamentaux des économies du G10 via Trading Economics, FRED et Banques Centrales."}
                  </p>
                  <div className="mt-auto pt-2 text-[10px] font-mono text-[#D2F646]">Raw Economic Data</div>
                </div>

                {/* Stage 2 */}
                <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group hover:border-[#00E5FF]/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF] font-mono font-bold text-xs flex items-center justify-center">
                    02
                  </div>
                  <span className="font-sans font-bold text-sm text-white">
                    {guideLang === "EN" ? "Country Differential" : "Calcul du Différentiel"}
                  </span>
                  <p className="text-xs text-[#A0A5B1] leading-relaxed">
                    {guideLang === "EN"
                      ? "Compares Country A against Country B: Differential = Country A − Country B."
                      : "Compare le Pays A au Pays B : Différentiel = Pays A − Pays B pour chaque indicateur."}
                  </p>
                  <div className="mt-auto pt-2 text-[10px] font-mono text-[#00E5FF]">Diff = Country A - Country B</div>
                </div>

                {/* Stage 3 */}
                <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group hover:border-[#D2F646]/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-[#D2F646]/10 text-[#D2F646] font-mono font-bold text-xs flex items-center justify-center">
                    03
                  </div>
                  <span className="font-sans font-bold text-sm text-white">
                    {guideLang === "EN" ? "Rating Tables" : "Tables de Rating"}
                  </span>
                  <p className="text-xs text-[#A0A5B1] leading-relaxed">
                    {guideLang === "EN"
                      ? "Maps differential intervals into standardized scores ranging from -10 to +10."
                      : "Convertit chaque différentiel en score borné entre -10 et +10 selon les intervalles configurés."}
                  </p>
                  <div className="mt-auto pt-2 text-[10px] font-mono text-[#D2F646]">Indicator Score (-10 to +10)</div>
                </div>

                {/* Stage 4 */}
                <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group hover:border-[#00E5FF]/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-[#00E5FF]/10 text-[#00E5FF] font-mono font-bold text-xs flex items-center justify-center">
                    04
                  </div>
                  <span className="font-sans font-bold text-sm text-white">
                    {guideLang === "EN" ? "Score Normalization" : "Normalisation du Score"}
                  </span>
                  <p className="text-xs text-[#A0A5B1] leading-relaxed">
                    {guideLang === "EN"
                      ? "Sums all 6 indicator scores (-60 to +60) and normalizes to -100% to +100%."
                      : "Additionne les 6 scores (-60 à +60) et normalise de -100% à +100% via la formule / 60 × 100."}
                  </p>
                  <div className="mt-auto pt-2 text-[10px] font-mono text-[#00E5FF]">Final Score % (-100% to +100%)</div>
                </div>

                {/* Stage 5 */}
                <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group hover:border-[#6FF542]/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-[#6FF542]/10 text-[#6FF542] font-mono font-bold text-xs flex items-center justify-center">
                    05
                  </div>
                  <span className="font-sans font-bold text-sm text-white">
                    {guideLang === "EN" ? "Bias Regime Radar" : "Biais & Radar Terminal"}
                  </span>
                  <p className="text-xs text-[#A0A5B1] leading-relaxed">
                    {guideLang === "EN"
                      ? "Dispatches final bias (Bullish, Bearish, Neutral) to the Trader Terminal & Admin Suite."
                      : "Attribue le biais (Bullish, Bearish, Neutre) et diffuse le résultat dans le terminal de trading."}
                  </p>
                  <div className="mt-auto pt-2 text-[10px] font-mono text-[#6FF542]">BULLISH / BEARISH / NEUTRAL</div>
                </div>

              </div>
            </div>

            {/* Deep-Dive Technical Explanation Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Box 1: The 6 Macro Indicators */}
              <div className={clsx("p-8 flex flex-col gap-5", matteCard)}>
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#D2F646]/10 text-[#D2F646] flex items-center justify-center">
                    <Layers size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-sans font-bold text-base text-white">
                      {guideLang === "EN" ? "The 6 Core Economic Indicators" : "Les 6 Indicateurs Fondamentaux"}
                    </h3>
                    <span className="text-xs text-[#A0A5B1]">
                      {guideLang === "EN" ? "Why these 6 metrics govern currency strength" : "Pourquoi ces 6 métriques déterminent la valeur des devises"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">1. GDP Annual Growth (Croissance du PIB)</span>
                      <span className="font-mono text-[#D2F646]">Growth Engine</span>
                    </div>
                    <span className="text-[#A0A5B1]">
                      {guideLang === "EN" 
                        ? "Measures economic expansion. A faster growing economy attracts capital inflows and institutional foreign direct investment."
                        : "Mesure l'expansion économique. Une économie en croissance attire les flux de capitaux et investissements étrangers."}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">2. Current Account / GDP (Compte Courant / PIB)</span>
                      <span className="font-mono text-[#00E5FF]">Trade Balance</span>
                    </div>
                    <span className="text-[#A0A5B1]">
                      {guideLang === "EN"
                        ? "Reflects the net flow of goods, services, and transfers. A surplus creates structural demand for the domestic currency."
                        : "Reflète le solde net des échanges. Un surplus génère une demande structurelle pour la devise nationale."}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">3. FX Reserves Excluding Gold (Réserves de Change)</span>
                      <span className="font-mono text-[#D2F646]">Liquidity Shield</span>
                    </div>
                    <span className="text-[#A0A5B1]">
                      {guideLang === "EN"
                        ? "Buffer held by the central bank to intervene and stabilize exchange rates during liquidity crunches."
                        : "Coussin financier de la banque centrale pour stabiliser sa devise et absorber les chocs de liquidité."}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">4. CPI Inflation (Indice des Prix à la Consommation)</span>
                      <span className="font-mono text-[#FF5B5B]">Price Pressures</span>
                    </div>
                    <span className="text-[#A0A5B1]">
                      {guideLang === "EN"
                        ? "Purchasing power dynamics. Influences whether central banks will raise or slash benchmark rates."
                        : "Dynamique du pouvoir d'achat. Influence directement les hausses ou baisses de taux des banques centrales."}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">5. Central Bank Interest Rate (Taux Directeur)</span>
                      <span className="font-mono text-[#6FF542]">Yield & Carry</span>
                    </div>
                    <span className="text-[#A0A5B1]">
                      {guideLang === "EN"
                        ? "The primary catalyst of carry trades. Capital shifts rapidly toward high-yielding currencies."
                        : "Le moteur principal du carry trade. Les capitaux migrent vers les devises offrant le rendement le plus élevé."}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">6. Benchmark Equity Index (Performance Boursière)</span>
                      <span className="font-mono text-[#00E5FF]">Risk Sentiment</span>
                    </div>
                    <span className="text-[#A0A5B1]">
                      {guideLang === "EN"
                        ? "Serves as a barometer for market risk appetite and domestic equity market strength."
                        : "Baromètre de l'appétit pour le risque et de la vigueur des marchés actions domestiques."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Concrete Differential & Scoring Example */}
              <div className={clsx("p-8 flex flex-col gap-5", matteCard)}>
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center">
                    <Cpu size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-sans font-bold text-base text-white">
                      {guideLang === "EN" ? "EUR/USD Concrete Calculation Example" : "Exemple Chiffré : Calcul EUR/USD"}
                    </h3>
                    <span className="text-xs text-[#A0A5B1]">
                      {guideLang === "EN" ? "Walkthrough of exact math from raw data to final bias" : "Démonstration pas à pas du calcul mathématique exact"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 text-xs">
                  {/* Step 1: Raw Diff */}
                  <div className="p-4 rounded-xl bg-[#14161E] border border-white/5 flex flex-col gap-2">
                    <span className="font-bold text-white text-xs">
                      {guideLang === "EN" ? "Step 1: Compute Raw Differential (Zone Euro − USA)" : "Étape 1 : Calcul du Différentiel Brut (Zone Euro − USA)"}
                    </span>
                    <div className="font-mono text-[11px] text-[#A0A5B1] space-y-1">
                      <div>EUR GDP Growth = <span className="text-white">1.8%</span></div>
                      <div>USD GDP Growth = <span className="text-white">2.5%</span></div>
                      <div className="text-[#D2F646]">Differential = 1.8% − 2.5% = <strong className="text-white">−0.7%</strong></div>
                    </div>
                  </div>

                  {/* Step 2: Rating Tables Application */}
                  <div className="p-4 rounded-xl bg-[#14161E] border border-white/5 flex flex-col gap-2">
                    <span className="font-bold text-white text-xs">
                      {guideLang === "EN" ? "Step 2: Lookup in Rating Table (-10 to +10)" : "Étape 2 : Consultation de la Table de Rating (-10 à +10)"}
                    </span>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-[#A0A5B1]">
                      <div>GDP Growth: <strong className="text-white">+6</strong></div>
                      <div>Current Account: <strong className="text-white">+4</strong></div>
                      <div>FX Reserves: <strong className="text-white">+5</strong></div>
                      <div>CPI Inflation: <strong className="text-white">−2</strong></div>
                      <div>Interest Rate: <strong className="text-white">+8</strong></div>
                      <div>Equity Index: <strong className="text-white">+3</strong></div>
                    </div>
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between font-mono text-xs text-white">
                      <span>Total Differential Score:</span>
                      <span className="text-[#D2F646] font-bold">+24 / 60</span>
                    </div>
                  </div>

                  {/* Step 3: Final Normalization */}
                  <div className="p-4 rounded-xl bg-[#14161E] border border-white/5 flex flex-col gap-2">
                    <span className="font-bold text-white text-xs">
                      {guideLang === "EN" ? "Step 3: Normalization to Percentage" : "Étape 3 : Normalisation en Pourcentage"}
                    </span>
                    <div className="font-mono text-xs bg-white/5 p-2.5 rounded-lg text-center text-[#D2F646]">
                      Final Score (%) = Total Score / 60 × 100 = 24 / 60 × 100 = <strong>+40.0%</strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[#A0A5B1]">Classification Threshold:</span>
                      <span className="px-2.5 py-1 rounded-full bg-[#6FF542]/10 text-[#6FF542] font-bold border border-[#6FF542]/20">
                        BULLISH (Favorable to EUR)
                      </span>
                    </div>
                  </div>

                  {/* Core Value Proposition Quote */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#D2F646]/10 to-transparent border-l-2 border-[#D2F646] text-[#A0A5B1] italic leading-relaxed">
                    {guideLang === "EN"
                      ? "“A currency is not simply 'strong' or 'weak' in a vacuum. It is strong or weak relative to another currency. ShiftFX reveals this structural divergence.”"
                      : "« Une devise n'est pas simplement « forte » ou « faible » de manière isolée. Elle est forte ou faible relativement à une autre devise. FX Differential révèle cette divergence structurelle. »"}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
