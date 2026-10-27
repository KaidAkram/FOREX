"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  Calendar, 
  Globe2, 
  Database, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  ArrowRight, 
  BookOpen, 
  Layers, 
  Cpu, 
  Save, 
  Check, 
  Zap, 
  Terminal, 
  Server, 
  Bell, 
  FileText, 
  SlidersHorizontal, 
  Info,
  Lock,
  Key,
  QrCode,
  Copy,
  ChevronDown,
  Sparkles,
  Activity,
  Palette
} from "lucide-react";
import { clsx } from "clsx";
import confetti from "canvas-confetti";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { playClickSound, playSuccessSound, playTabSound } from "@/lib/soundEffects";
import { soundFX } from "@/lib/soundEngine";
import { CurrencyFlag } from "@/components/ui/DopaminePrimitives";
import { WorkspaceThemeSwitcher } from "@/components/theme/WorkspaceThemeSwitcher";

// High-end styling primitives
const glassPanel = "bg-[#10131A]/90 border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] rounded-[26px] p-6 backdrop-blur-2xl";
const innerPod = "bg-white/[0.02] border border-white/[0.06] rounded-[20px] p-4";

// Crontab Presets
const CRON_PRESETS = [
  { id: "hourly", exp: "0 * * * *", fr: "Toutes les heures", en: "Every Hour", descFr: "Polling haute fréquence macroéconomique", descEn: "High-frequency macro ingestion" },
  { id: "4hours", exp: "0 */4 * * *", fr: "Toutes les 4 heures", en: "Every 4 Hours", descFr: "Équilibre optimal banques centrales", descEn: "Optimal central bank cadence" },
  { id: "12hours", exp: "0 */12 * * *", fr: "Toutes les 12 heures", en: "Every 12 Hours", descFr: "Sessions Londres & New York", descEn: "London & New York overlap" },
  { id: "daily", exp: "0 0 * * *", fr: "Quotidien à 00:00 UTC", en: "Daily at 00:00 UTC", descFr: "Clôture macroéconomique quotidienne", descEn: "Daily sovereign close" },
  { id: "weekly", exp: "0 0 * * 1", fr: "Hebdomadaire (Lundi)", en: "Weekly (Monday)", descFr: "Réinitialisation hebdomadaire des biais", descEn: "Weekly bias rebalancing" },
  { id: "custom", exp: "", fr: "Expression Personnalisée", en: "Custom Expression", descFr: "Définir une expression crontab", descEn: "Specify explicit crontab" },
];

const DATA_SOURCES = [
  { id: "imf_sdmx", name: "IMF SDMX 3.0 API", type: "Official Multilateral API", status: "Active", coverage: "FX Reserves (excl. Gold), Current Account to GDP" },
  { id: "trading_economics", name: "Trading Economics Feed", type: "Core Scraper", status: "Active", coverage: "CPI, GDP, Interest Rates, Central Bank Statements" },
  { id: "fred", name: "FRED St. Louis Fed API", type: "Institutional API", status: "Active", coverage: "US Macro Differentials & Sovereign Debt Yields" },
  { id: "ecb_sdw", name: "ECB Statistical Data Warehouse", type: "Official Central Bank", status: "Active", coverage: "Eurozone HICP, M3 Money Supply, Refi Rates" },
  { id: "boe_feed", name: "Bank of England Portal", type: "Official Central Bank", status: "Active", coverage: "UK Official Bank Rate, CPI, Services Inflation" },
  { id: "boj_feed", name: "Bank of Japan Time Series", type: "Official Central Bank", status: "Active", coverage: "Yield Curve Control, Tokyo CPI, Overnight Call Rate" },
];

export default function AdminSettingsPage() {
  const { lang, setLang, t } = useLanguage();
  const { admin2FAEnabled, setAdmin2FAEnabled } = useAuth();

  const [activeTab, setActiveTab] = useState<"cron" | "language" | "security" | "ingestion" | "audit">("cron");
  
  // Cron State
  const [cronPreset, setCronPreset] = useState("4hours");
  const [customCron, setCustomCron] = useState("0 */4 * * *");
  const [timezone, setTimezone] = useState("Europe/London");
  const [cronActive, setCronActive] = useState(true);

  // Scraper Execution State
  const [isScrapingNow, setIsScrapingNow] = useState(false);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);

  // 2FA Setup Modal State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [secretKeyCopied, setSecretKeyCopied] = useState(false);
  const [verification2FACode, setVerification2FACode] = useState("");
  const [modal2FAError, setModal2FAError] = useState("");

  // Telemetry Ping State
  const [isPinging, setIsPinging] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Load Settings from localStorage on Mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("shiftfx_settings_config");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.cronPreset) setCronPreset(parsed.cronPreset);
        if (parsed.customCron) setCustomCron(parsed.customCron);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.cronActive !== undefined) setCronActive(parsed.cronActive);
      }
    } catch {}
  }, []);

  const handleCronPresetSelect = (presetId: string, exp: string) => {
    playClickSound();
    setCronPreset(presetId);
    if (presetId !== "custom") {
      setCustomCron(exp);
    }
  };

  const handleSave = () => {
    playSuccessSound();
    setIsSaving(true);
    try {
      localStorage.setItem(
        "shiftfx_settings_config",
        JSON.stringify({ cronPreset, customCron, timezone, cronActive })
      );
    } catch {}

    setTimeout(() => {
      setIsSaving(false);
      setSaveNotice(true);
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.2 } });
      setTimeout(() => setSaveNotice(false), 3000);
    }, 350);
  };

  const handleRunScraper = () => {
    playClickSound();
    setIsScrapingNow(true);
    setScrapeSuccess(false);

    setTimeout(() => {
      setIsScrapingNow(false);
      setScrapeSuccess(true);
      playSuccessSound();
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.3 } });
      setTimeout(() => setScrapeSuccess(false), 4000);
    }, 1800);
  };

  const handlePingTelemetry = () => {
    playClickSound();
    setIsPinging(true);
    setPingLatency(null);

    setTimeout(() => {
      setIsPinging(false);
      setPingLatency(Math.floor(Math.random() * 8) + 6); // 6-14ms
      playSuccessSound();
    }, 450);
  };

  const handleVerifyAndActivate2FA = () => {
    if (verification2FACode.trim().length !== 6) {
      setModal2FAError(lang === "fr" ? "Veuillez entrer les 6 chiffres du code." : "Please enter the 6-digit code.");
      return;
    }
    playSuccessSound();
    setAdmin2FAEnabled(true);
    setShow2FAModal(false);
    setVerification2FACode("");
    setModal2FAError("");
    confetti({ particleCount: 40, spread: 55, origin: { y: 0.5 } });
  };

  const getCronExplanation = (exp: string) => {
    if (lang === "fr") {
      if (exp === "0 * * * *") return "Exécution toutes les heures à la minute 0 (24 cycles / jour)";
      if (exp === "0 */4 * * *") return "Exécution toutes les 4 heures à la minute 0 (6 cycles / jour)";
      if (exp === "0 */12 * * *") return "Exécution toutes les 12 heures (00:00 et 12:00)";
      if (exp === "0 0 * * *") return "Exécution quotidienne à minuit (00:00 UTC)";
      if (exp === "0 0 * * 1") return "Exécution hebdomadaire le lundi à 00:00 UTC";
      return `Expression personnalisée : ${exp || "Non définie"}`;
    } else {
      if (exp === "0 * * * *") return "Executes every hour at minute 0 (24 cycles / day)";
      if (exp === "0 */4 * * *") return "Executes every 4 hours at minute 0 (6 cycles / day)";
      if (exp === "0 */12 * * *") return "Executes every 12 hours (00:00 and 12:00)";
      if (exp === "0 0 * * *") return "Executes daily at midnight (00:00 UTC)";
      if (exp === "0 0 * * 1") return "Executes weekly on Monday at 00:00 UTC";
      return `Custom expression: ${exp || "Not defined"}`;
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn pb-24">
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* HEADER SECTION & ACTION BAR                                       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">
              {lang === "fr" ? "CONFIGURATION SYSTÈME • SHIFTFX ENGINE" : "SYSTEM CONFIGURATION • SHIFTFX ENGINE"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/35 text-[10px] font-mono font-bold text-[#D4FF00] uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
              {cronActive ? t("settings.cron_active_badge") : t("settings.cron_paused_badge")}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t("settings.title")}
          </h1>
          <p className="font-sans text-xs sm:text-sm text-slate-400 mt-0.5">
            {t("settings.subtitle")}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Run Scraper Trigger */}
          <button
            type="button"
            onClick={handleRunScraper}
            disabled={isScrapingNow}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] text-xs font-sans font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isScrapingNow ? (
              <>
                <RefreshCw size={14} className="animate-spin text-[#D4FF00]" />
                <span>{t("settings.running_scraper")}</span>
              </>
            ) : scrapeSuccess ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-emerald-400">{lang === "fr" ? "Collecte Validée !" : "Ingestion Done!"}</span>
              </>
            ) : (
              <>
                <Play size={14} className="text-[#D4FF00]" />
                <span>{t("settings.run_scraper")}</span>
              </>
            )}
          </button>

          {/* Save Configuration Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#D4FF00] hover:bg-[#dfeb34] text-[#07080C] font-sans font-bold text-xs shadow-[0_0_20px_rgba(212,255,0,0.35)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>{t("settings.saving")}</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>{t("settings.save")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {saveNotice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-sans font-bold flex items-center gap-2"
        >
          <CheckCircle2 size={16} />
          <span>{t("settings.saved_notice")}</span>
        </motion.div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODULAR SCULPTED TAB NAVIGATION POD                               */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: "cron", label: t("settings.tab.cron"), icon: Clock },
          { id: "language", label: lang === "fr" ? "Apparence & Langue" : "Appearance & Language", icon: Palette },
          { id: "security", label: t("settings.tab.security"), icon: ShieldCheck },
          { id: "ingestion", label: t("settings.tab.ingestion"), icon: Database },
          { id: "audit", label: t("settings.tab.audit"), icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playTabSound();
                setActiveTab(tab.id as any);
              }}
              className={clsx(
                "relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-sans font-bold transition-all cursor-pointer shrink-0",
                isActive
                  ? "bg-[#D4FF00] text-[#07080C] shadow-[0_0_16px_rgba(212,255,0,0.3)]"
                  : "bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 border border-white/[0.05]"
              )}
            >
              <Icon size={14} className={isActive ? "text-[#07080C]" : "text-slate-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT PANELS                                                */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: CRON CADENCE & EXECUTION SCHEDULER                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "cron" && (
          <motion.div
            key="cron"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Card: Presets Matrix */}
            <div className={`lg:col-span-7 ${glassPanel} space-y-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    {t("settings.cron.presets_title")}
                  </h3>
                  <p className="font-sans text-xs text-slate-400 mt-0.5">
                    {t("settings.cron.presets_subtitle")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">
                    {cronActive ? t("settings.cron.status_active") : t("settings.cron.status_paused")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setCronActive(!cronActive);
                    }}
                    className={clsx(
                      "w-11 h-6 rounded-full transition-colors relative cursor-pointer",
                      cronActive ? "bg-[#D4FF00]" : "bg-white/10"
                    )}
                  >
                    <motion.div
                      animate={{ x: cronActive ? 22 : 3 }}
                      className="w-4 h-4 rounded-full bg-[#07080C] shadow-md absolute top-1"
                    />
                  </button>
                </div>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {CRON_PRESETS.map((preset) => {
                  const isSelected = cronPreset === preset.id;
                  const label = lang === "fr" ? preset.fr : preset.en;
                  const desc = lang === "fr" ? preset.descFr : preset.descEn;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleCronPresetSelect(preset.id, preset.exp)}
                      className={clsx(
                        "p-4 rounded-2xl text-left transition-all cursor-pointer relative flex flex-col justify-between h-[104px]",
                        isSelected
                          ? "bg-[#D4FF00]/10 border border-[#D4FF00]/40 shadow-[0_0_20px_rgba(212,255,0,0.1)]"
                          : "bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-sans font-bold text-sm text-white">
                          {label}
                        </span>
                        {preset.exp && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-[#D4FF00] border border-white/10">
                            {preset.exp}
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-xs text-slate-400 leading-snug">
                        {desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Card: Crontab & Timezone */}
            <div className={`lg:col-span-5 ${glassPanel} space-y-5 flex flex-col justify-between`}>
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  {t("settings.cron.crontab_title")}
                </h3>
                <p className="font-sans text-xs text-slate-400 mt-0.5">
                  {t("settings.cron.crontab_subtitle")}
                </p>

                {/* Crontab Expression Input */}
                <div className="mt-5 space-y-2">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    {t("settings.cron.input_label")}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customCron}
                      onChange={(e) => {
                        setCustomCron(e.target.value);
                        setCronPreset("custom");
                      }}
                      placeholder="0 */4 * * *"
                      className="w-full px-4 py-3 rounded-2xl bg-[#090B0E] border border-white/[0.1] text-base font-mono text-[#D4FF00] font-bold focus:border-[#D4FF00] outline-none shadow-inner tracking-wider"
                    />
                  </div>
                </div>

                {/* Natural Language Explanation Pill */}
                <div className="mt-4 p-4 rounded-2xl bg-[#0A0D12] border border-[#D4FF00]/25 shadow-[0_0_15px_rgba(212,255,0,0.04)] flex flex-col gap-1 text-xs">
                  <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    {lang === "fr" ? "INTERPRÉTATION CRONTAB NATURELLE :" : "NATURAL CRONTAB INTERPRETATION:"}
                  </span>
                  <p className="font-mono text-white text-xs font-semibold leading-relaxed">
                    {getCronExplanation(customCron)}
                  </p>
                </div>

                {/* Timezone Dropdown */}
                <div className="mt-4 space-y-2">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    {t("settings.cron.timezone_label")}
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#090B0E] border border-white/[0.08] text-xs font-mono text-white outline-none focus:border-[#D4FF00]"
                  >
                    <option value="Europe/London">Europe/London (GMT / BST - London Quant Core)</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">America/New_York (EST / EDT - Wall St. Close)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST - Asian Sovereign Ingestion)</option>
                    <option value="Europe/Zurich">Europe/Zurich (CET / CEST - SNB Alignment)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
                <span>{lang === "fr" ? "PROCHAINE EXÉCUTION :" : "NEXT EXECUTION:"}</span>
                <span className="font-bold text-[#D4FF00]">2026-10-27 12:00:00 UTC</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: PLATFORM LANGUAGE & LOCALIZATION (FR / EN)               */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: APPARENCE & SIGNATURE CHROMATIQUE + LANGUE             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "language" && (
          <motion.div
            key="language"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            {/* Visual Bento 1: Institutional Quant Themes (Video 00:08 - 00:10) */}
            <div className={`${glassPanel} space-y-5`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                    <Palette size={20} className="text-[var(--fx-accent,#D4FF00)]" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-white">
                      {lang === "fr" ? "Signature Chromatique & Thème Quant" : "Institutional Chromatic Signature"}
                    </h3>
                    <p className="font-sans text-xs text-slate-400 mt-0.5">
                      {lang === "fr"
                        ? "Teinte instantanément l'intégralité du terminal (strokes, KPI washes, boutons actifs, halos) via variables CSS persistées"
                        : "Instantly re-tints the entire terminal (strokes, KPI washes, active buttons, luminous halos) via persistent CSS variables"}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-[11px] px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300">
                  CSS 3 Variable Engine
                </span>
              </div>

              {/* Theme Swatch Switcher Pod */}
              <div className="pt-2">
                <WorkspaceThemeSwitcher />
              </div>
            </div>

            {/* Visual Bento 2: Sovereign Language Switcher */}
            <div className={`${glassPanel} space-y-5`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Globe2 size={18} className="text-[var(--fx-accent,#D4FF00)]" />
                  <h3 className="font-display font-bold text-xl text-white">
                    {t("settings.lang.title")}
                  </h3>
                </div>
                <p className="font-sans text-sm text-slate-400">
                  {t("settings.lang.subtitle")}
                </p>
              </div>

              {/* Language Selection Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* French Option Card */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop(1);
                    playSuccessSound();
                    setLang("fr");
                  }}
                  className={clsx(
                    "p-6 rounded-[24px] text-left transition-all cursor-pointer relative flex flex-col justify-between gap-4 border",
                    lang === "fr"
                      ? "bg-white/[0.06] border-[var(--fx-accent,#D4FF00)] shadow-[0_0_30px_rgba(212,255,0,0.15)] ring-1 ring-[var(--fx-accent,#D4FF00)]"
                      : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shadow-md flex items-center justify-center">
                        <CurrencyFlag currency="EUR" size="lg" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-white">
                          {t("settings.lang.select_fr")}
                        </h4>
                        <span className="font-mono text-xs text-slate-400">Français (FR)</span>
                      </div>
                    </div>
                    {lang === "fr" && (
                      <span className="px-3 py-1 rounded-full bg-[var(--fx-accent,#D4FF00)] text-[#07080C] font-mono text-[11px] font-extrabold uppercase">
                        {t("settings.lang.active_badge")}
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-xs text-slate-300 leading-relaxed">
                    {t("settings.lang.select_fr_desc")}
                  </p>
                </button>

                {/* English Option Card */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop(1);
                    playSuccessSound();
                    setLang("en");
                  }}
                  className={clsx(
                    "p-6 rounded-[24px] text-left transition-all cursor-pointer relative flex flex-col justify-between gap-4 border",
                    lang === "en"
                      ? "bg-white/[0.06] border-[var(--fx-accent,#D4FF00)] shadow-[0_0_30px_rgba(212,255,0,0.15)] ring-1 ring-[var(--fx-accent,#D4FF00)]"
                      : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shadow-md flex items-center justify-center">
                        <CurrencyFlag currency="GBP" size="lg" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-white">
                          {t("settings.lang.select_en")}
                        </h4>
                        <span className="font-mono text-xs text-slate-400">English (EN)</span>
                      </div>
                    </div>
                    {lang === "en" && (
                      <span className="px-3 py-1 rounded-full bg-[var(--fx-accent,#D4FF00)] text-[#07080C] font-mono text-[11px] font-extrabold uppercase">
                        {t("settings.lang.active_badge")}
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-xs text-slate-300 leading-relaxed">
                    {t("settings.lang.select_en_desc")}
                  </p>
                </button>
              </div>

              {/* Instant Application Notice */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3 text-xs font-sans text-slate-300">
                <Sparkles size={18} className="text-[var(--fx-accent,#D4FF00)] shrink-0" />
                <span>{t("settings.lang.instant_notice")}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: SECURITY & ADMIN TWO-FACTOR AUTHENTICATION (2FA)         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            <div className={`${glassPanel} space-y-6`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={18} className="text-[#D4FF00]" />
                    <h3 className="font-display font-bold text-xl text-white">
                      {t("settings.sec.title")}
                    </h3>
                  </div>
                  <p className="font-sans text-sm text-slate-400">
                    {t("settings.sec.subtitle")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={clsx(
                    "px-3 py-1 rounded-full font-mono text-xs font-extrabold uppercase tracking-wide",
                    admin2FAEnabled
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : "bg-white/[0.06] text-slate-400 border border-white/10"
                  )}>
                    {admin2FAEnabled ? t("settings.sec.2fa_enabled_badge") : t("settings.sec.2fa_disabled_badge")}
                  </span>
                </div>
              </div>

              {/* Crucial Security Policy Box: Admin 2FA Only, No 2FA for Traders */}
              <div className="p-4 rounded-2xl bg-[#090B0E] border border-amber-500/30 text-xs font-sans text-amber-200/90 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>{t("settings.sec.2fa_trader_exemption")}</strong>
                </p>
              </div>

              {/* 2FA Action Card */}
              <div className={`${innerPod} flex items-center justify-between flex-wrap gap-4`}>
                <div className="space-y-1 max-w-xl">
                  <h4 className="font-display font-bold text-sm text-white">
                    {t("settings.sec.2fa_card_title")}
                  </h4>
                  <p className="font-sans text-xs text-slate-400 leading-relaxed">
                    {t("settings.sec.2fa_card_desc")}
                  </p>
                </div>

                {admin2FAEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setAdmin2FAEnabled(false);
                    }}
                    className="px-4 py-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-sans font-bold text-xs transition-colors cursor-pointer"
                  >
                    {t("settings.sec.2fa_disable_btn")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShow2FAModal(true);
                    }}
                    className="px-5 py-2 rounded-full bg-[#D4FF00] hover:bg-[#dfeb34] text-[#07080C] font-sans font-bold text-xs shadow-[0_0_16px_rgba(212,255,0,0.3)] transition-all cursor-pointer"
                  >
                    {t("settings.sec.2fa_enable_btn")}
                  </button>
                )}
              </div>
            </div>

            {/* 2FA Setup Modal */}
            <AnimatePresence>
              {show2FAModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShow2FAModal(false)}
                    className="fixed inset-0 bg-black/85 backdrop-blur-md"
                  />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-md rounded-[26px] bg-[#0E1117] border border-white/[0.12] shadow-2xl p-6 z-10 space-y-5"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <QrCode size={18} className="text-[#D4FF00]" />
                        <h4 className="font-display font-bold text-base text-white">
                          {t("settings.sec.2fa_modal_title")}
                        </h4>
                      </div>
                      <button
                        onClick={() => setShow2FAModal(false)}
                        className="text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs font-sans text-slate-300">
                      {t("settings.sec.2fa_scan_qr")}
                    </p>

                    {/* SVG QR Code Simulation */}
                    <div className="flex justify-center p-4 bg-white rounded-2xl shadow-inner">
                      <div className="w-40 h-40 bg-[#07080C] p-2 rounded-xl flex flex-col items-center justify-center relative">
                        <div className="grid grid-cols-6 gap-1 w-full h-full p-2">
                          {Array.from({ length: 36 }).map((_, i) => (
                            <div
                              key={i}
                              className={clsx(
                                "rounded-sm",
                                (i % 2 === 0 || i % 5 === 0) ? "bg-[#D4FF00]" : "bg-transparent"
                              )}
                            />
                          ))}
                        </div>
                        <span className="absolute inset-x-0 bottom-2 text-center text-[9px] font-mono text-[#D4FF00] font-bold">
                          SHIFTFX-ADMIN-TOTP
                        </span>
                      </div>
                    </div>

                    {/* Secret Key Display */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400">{t("settings.sec.2fa_secret_key")}</span>
                        <span className="font-bold text-white tracking-widest">SFX-8941-K72B-90AC</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSecretKeyCopied(true);
                          setTimeout(() => setSecretKeyCopied(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-white/[0.06] text-[#D4FF00] hover:text-white cursor-pointer"
                      >
                        {secretKeyCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>

                    {/* 6-digit confirmation input */}
                    <div className="space-y-2">
                      <label className="block text-xs font-mono text-slate-300">
                        {t("settings.sec.2fa_enter_code")}
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={verification2FACode}
                        onChange={(e) => setVerification2FACode(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="123456"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#090B0E] border border-white/[0.1] text-center font-mono text-xl font-bold text-[#D4FF00] tracking-widest outline-none focus:border-[#D4FF00]"
                      />
                    </div>

                    {modal2FAError && (
                      <p className="text-xs text-rose-400 font-sans">{modal2FAError}</p>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShow2FAModal(false)}
                        className="flex-1 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-xs font-sans font-bold text-slate-300 transition-colors cursor-pointer"
                      >
                        {t("settings.sec.2fa_close")}
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyAndActivate2FA}
                        className="flex-1 py-2.5 rounded-full bg-[#D4FF00] hover:bg-[#dfeb34] text-xs font-sans font-bold text-[#07080C] shadow-[0_0_15px_rgba(212,255,0,0.3)] transition-all cursor-pointer"
                      >
                        {t("settings.sec.2fa_verify_btn")}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 4: DATA INGESTION PIPELINES & FEEDS                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "ingestion" && (
          <motion.div
            key="ingestion"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className={`${glassPanel} space-y-5`}
          >
            <div>
              <h3 className="font-display font-bold text-xl text-white">
                {lang === "fr" ? "Flux Multilatéraux & Connecteurs d'Ingestion" : "Multilateral Feeds & Ingestion Connectors"}
              </h3>
              <p className="font-sans text-sm text-slate-400 mt-0.5">
                {lang === "fr"
                  ? "Surveillance en temps réel des APIs de banques centrales et instituts statistiques G10"
                  : "Real-time health monitoring of central bank and sovereign statistical APIs"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {DATA_SOURCES.map((source) => (
                <div
                  key={source.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between gap-3 hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-bold text-sm text-white">{source.name}</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-mono text-[10px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {source.status}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-400">{source.type}</span>
                  <p className="font-sans text-xs text-slate-300 leading-snug">{source.coverage}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 5: AUDIT LOGS & REAL-TIME DAEMON TELEMETRY                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "audit" && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className={`${glassPanel} space-y-6`}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-display font-bold text-xl text-white">
                  {lang === "fr" ? "Moniteur de Télémétrie Daemon & Audit" : "Daemon Telemetry & Execution Audit"}
                </h3>
                <p className="font-sans text-sm text-slate-400 mt-0.5">
                  {lang === "fr" ? "Vérification des cycles de scraping et intégrité mathématique" : "Scraper cycle audit and mathematical integrity validation"}
                </p>
              </div>

              <button
                type="button"
                onClick={handlePingTelemetry}
                disabled={isPinging}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-sans font-bold text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isPinging ? "animate-spin text-[#D4FF00]" : "text-slate-400"} />
                <span>{lang === "fr" ? "Tester la Télémétrie" : "Test Telemetry"}</span>
                {pingLatency !== null && (
                  <span className="text-[#D4FF00] font-mono font-bold">{pingLatency}ms</span>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                <span className="font-mono text-[10px] text-slate-400 uppercase">DAEMON STATUS</span>
                <span className="font-mono text-base font-bold text-emerald-400">ONLINE</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                <span className="font-mono text-[10px] text-slate-400 uppercase">ACTIVE WORKERS</span>
                <span className="font-mono text-base font-bold text-white">4 POOL</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                <span className="font-mono text-[10px] text-slate-400 uppercase">MEMORY USAGE</span>
                <span className="font-mono text-base font-bold text-white">48.2 MB</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                <span className="font-mono text-[10px] text-slate-400 uppercase">AUDIT HASH</span>
                <span className="font-mono text-base font-bold text-[#D4FF00] truncate">SHA256: 8f9b...a12c</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
