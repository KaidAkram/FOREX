"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlameIcon,
  StarIcon,
  StarFillIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
  CalendarIcon,
  ZapIcon,
  SearchIcon,
  AppsIcon,
  RowsIcon,
  SparklesFillIcon,
  LockIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  SignOutIcon,
  CheckIcon,
} from "@primer/octicons-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/context/AuthContext";
import { soundFX } from "@/lib/soundEngine";
import {
  getCountryFlagUrl,
  formatPairCountriesFr,
} from "@/lib/macroFormatters";
import { ShiftFXWordmark } from "@/components/brand/ShiftFXLogo";
import {
  AnimatedMetricValue,
  MorphingSplineChart,
} from "@/components/motion/AnimatedNumberAndMorphChart";
import { CommandPaletteModal } from "@/components/shell/CommandPaletteModal";
import {
  getTraderSignals,
  TraderSignal,
  getUserWatchlist,
  toggleUserWatchlist,
  getCurrencyStrengthMeter,
} from "@/data/userCatalogService";
import { TraderPairCard, TraderPairData } from "@/components/trader/TraderPairCard";
import {
  G10RelativeStrengthBarometer,
  G10CurrencyItem,
} from "@/components/trader/G10RelativeStrengthBarometer";
import { PairThesisDrawer } from "@/components/trader/PairThesisDrawer";

// Generate organic 6-point sparkline ending at score
function genSparkline(pair: string, score: number): number[] {
  let seed = 0;
  for (let i = 0; i < pair.length; i++) seed += pair.charCodeAt(i);
  const pts: number[] = [];
  const start = score * 0.4;
  for (let i = 0; i < 6; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const noise = (seed / 233280 - 0.5) * 5;
    const progress = i / 5;
    const val = start + (score - start) * progress + noise;
    pts.push(parseFloat(val.toFixed(1)));
  }
  return pts;
}

export default function TraderPortalPage() {
  const { user, setSimulatedTier, logout } = useAuth();
  const router = useRouter();

  const [signals, setSignals] = useState<TraderSignal[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [simulatedTier, setLocalSimulatedTier] = useState<"basic" | "pro">("pro");
  const [regimeFilter, setRegimeFilter] = useState<string>("ALL");
  const [currencyUniverse, setCurrencyUniverse] = useState<string>("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Drawer state
  const [drawerPair, setDrawerPair] = useState<TraderPairData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Undo Toast state
  const [toastData, setToastData] = useState<{ pair: string; message: string } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadData = () => {
      setSignals(getTraderSignals());
      setWatchlist(getUserWatchlist());
    };
    loadData();
    window.addEventListener("shiftfx_catalog_updated", loadData);
    window.addEventListener("shiftfx_watchlist_updated", loadData);
    return () => {
      window.removeEventListener("shiftfx_catalog_updated", loadData);
      window.removeEventListener("shiftfx_watchlist_updated", loadData);
    };
  }, []);

  useEffect(() => {
    if (user?.tier) setLocalSimulatedTier(user.tier);
  }, [user]);

  // Click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleTierSimulation = (tier: "basic" | "pro") => {
    soundFX.playPop();
    setLocalSimulatedTier(tier);
    if (setSimulatedTier) setSimulatedTier(tier);
    if (tier === "pro") {
      soundFX.playChime();
      confetti({ particleCount: 50, spread: 65, origin: { y: 0.6 } });
    }
  };

  const showUndoToast = (pair: string, wasAdded: boolean) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (wasAdded) {
      setToastData({ pair, message: `${pair} ajouté aux Favoris` });
      toastTimeoutRef.current = setTimeout(() => {
        setToastData(null);
      }, 4500);
    } else {
      setToastData(null);
    }
  };

  const handleToggleFavorite = (pair: string) => {
    const isCurrentlyFav = watchlist.includes(pair);
    const updated = toggleUserWatchlist(pair);
    setWatchlist(updated);
    showUndoToast(pair, !isCurrentlyFav);
  };

  const handleUndoFavorite = (pair: string) => {
    const updated = toggleUserWatchlist(pair);
    setWatchlist(updated);
    setToastData(null);
    soundFX.playPop();
  };

  // Convert raw signals to TraderPairData format
  const traderPairItems: TraderPairData[] = useMemo(() => {
    return signals.map((s) => {
      const regime: "ACHETEUR" | "VENDEUR" | "NEUTRE" =
        s.scoreNum >= 20.0 ? "ACHETEUR" : s.scoreNum <= -20.0 ? "VENDEUR" : "NEUTRE";

      const sparkline = genSparkline(s.pair, s.scoreNum);

      const forecast3M = s.forecast3MTrend.map((f) => {
        const monthNum = f.month.split("-")[1] || "10";
        const monthMap: Record<string, string> = {
          "10": "Oct",
          "11": "Nov",
          "12": "Déc",
          "01": "Jan",
          "02": "Fév",
          "03": "Mar",
        };
        const val = parseFloat(f.scorePct.replace("%", "").replace("+", ""));
        return {
          month: monthMap[monthNum] || f.month,
          val: isNaN(val) ? 0 : val,
        };
      });

      const carryText = s.carryAdvantage.includes("Portage")
        ? s.carryAdvantage
        : s.carryAdvantage.replace("Carry", "Portage");

      const countriesFr = formatPairCountriesFr(s.pair, s.baseCountry, s.quoteCountry);

      const isLocked = simulatedTier === "basic" && s.tier === "pro";

      return {
        pair: s.pair,
        countriesFr,
        tier: s.tier.toUpperCase() as "BASIC" | "PRO",
        regime,
        score: s.scoreNum,
        confidence: s.confidence,
        thesis: s.primaryDriver,
        carryText,
        sparkline,
        forecast3M,
        isFavorite: watchlist.includes(s.pair),
        isLocked,
        rawSignal: s,
      };
    });
  }, [signals, watchlist, simulatedTier]);

  // Top Movers (highest conviction opportunities)
  const topMovers = useMemo(() => {
    const published = traderPairItems.filter((item) => item.rawSignal?.isPublished);
    const adminSelected = published.filter((item) => item.rawSignal?.isTopMover);
    if (adminSelected.length >= 2) return adminSelected.slice(0, 2);
    // Otherwise fallback to highest absolute scores
    return [...published]
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 2);
  }, [traderPairItems]);

  // G10 Barometer relative strength meter
  const g10BarometerData: G10CurrencyItem[] = useMemo(() => {
    const rawStrength = getCurrencyStrengthMeter(signals);
    if (rawStrength && rawStrength.length > 0) {
      return rawStrength.map((cs) => {
        const score = cs.netScore;
        const status: "FORT" | "FAIBLE" | "NEUTRE" =
          score >= 12 ? "FORT" : score <= -15 ? "FAIBLE" : "NEUTRE";
        return {
          code: cs.currency,
          score,
          status,
        };
      });
    }
    return [];
  }, [signals]);

  // Filtered pair items
  const filteredPairs = useMemo(() => {
    return traderPairItems.filter((item) => {
      if (!item.rawSignal?.isPublished) return false;

      // Regime tab filter
      if (regimeFilter === "TOP_MOVERS" && !item.rawSignal?.isTopMover) return false;
      if (regimeFilter === "ACHETEUR" && item.regime !== "ACHETEUR") return false;
      if (regimeFilter === "VENDEUR" && item.regime !== "VENDEUR") return false;
      if (regimeFilter === "NEUTRE" && item.regime !== "NEUTRE") return false;
      if (regimeFilter === "FAVORIS" && !watchlist.includes(item.pair)) return false;

      // Currency universe filter (Tous | EUR | GBP | USD | JPY | CROSS or specific G10 code)
      if (currencyUniverse !== "Tous") {
        if (["EUR", "GBP", "USD", "JPY"].includes(currencyUniverse)) {
          if (!item.pair.includes(currencyUniverse)) return false;
        } else if (currencyUniverse === "CROSS") {
          if (item.pair.startsWith("USD/") || item.pair.endsWith("/USD")) return false;
        } else {
          // Specific currency clicked from barometer (e.g. CAD, CHF, AUD, NZD)
          if (!item.pair.includes(currencyUniverse)) return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !item.pair.toLowerCase().includes(q) &&
          !item.countriesFr.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [traderPairItems, regimeFilter, currencyUniverse, searchQuery, watchlist]);

  const publishedCount = traderPairItems.filter((i) => i.rawSignal?.isPublished).length;

  const regimeTabs = [
    { id: "ALL", label: "Toutes", count: publishedCount },
    { id: "TOP_MOVERS", label: "Top Movers", count: topMovers.length, dotColor: "#D4FF00" },
    { id: "ACHETEUR", label: "Acheteur", dotColor: "#10B981" },
    { id: "VENDEUR", label: "Vendeur", dotColor: "#F43F5E" },
    { id: "NEUTRE", label: "Neutre", dotColor: "#94A3B8" },
    { id: "FAVORIS", label: "Favoris", count: watchlist.length, dotColor: "#D4FF00" },
  ];

  const handleOpenDetails = (item: TraderPairData) => {
    setDrawerPair(item);
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#07080C] text-slate-100 flex flex-col font-sans selection:bg-[#D4FF00] selection:text-[#07080C] relative">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3.1 TOP FLOATING GLASS NAVIGATION BAR                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <header className="h-16 px-6 sticky top-0 z-30 bg-[#07080C]/85 backdrop-blur-2xl border-b border-white/[0.06] flex items-center justify-between">
        {/* Left: Brand Lockup + Hairline Divider + Live Telemetry Pill */}
        <div className="flex items-center gap-4">
          <Link href="/portal" className="flex items-center">
            <ShiftFXWordmark badge="TERMINAL" />
          </Link>

          <span className="hidden sm:block h-5 w-px bg-white/[0.08]" />

          {/* Live Telemetry Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.07] font-sans text-xs text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>Moteur : Synchronisé</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">12ms</span>
          </div>
        </div>

        {/* Center-Right: Plan Switcher + Admin Portal + Search + Compact Profile */}
        <div className="flex items-center gap-3">
          {/* 1. Plan View Switcher (Basic | Pro) with Sliding Pill */}
          <div className="flex items-center rounded-full bg-white/[0.03] p-1 border border-white/[0.07] shadow-inner">
            {(["basic", "pro"] as const).map((t) => {
              const isActive = simulatedTier === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleToggleTierSimulation(t)}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isActive ? "text-[#07080C]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="trader-plan-pill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.3)] z-0"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {t === "basic" ? (
                      <>
                        <LockIcon size={12} />
                        <span>Basic (8)</span>
                      </>
                    ) : (
                      <>
                        <SparklesFillIcon size={13} />
                        <span>Pro (28)</span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2. Admin Portal Switch Pill */}
          {user?.role === "admin" && (
            <Link
              href="/admin/dashboard"
              className="h-9 px-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] font-sans text-xs font-medium text-slate-200 hover:text-[#D4FF00] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ShieldCheckIcon size={14} className="text-[#D4FF00]" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* 3. Command-K Search Pill */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden lg:flex w-56 xl:w-64 h-9 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] px-3.5 items-center justify-between text-xs text-slate-400 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <SearchIcon size={13} className="text-slate-400" />
              <span className="font-sans text-xs">Rechercher une paire...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] font-mono text-[10px] text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* 4. Compact Trader Profile Pill */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                setUserMenuOpen(!userMenuOpen);
              }}
              className="flex items-center gap-2 h-9 px-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#D4FF00] to-emerald-400 text-[#07090E] font-mono text-[10px] font-black flex items-center justify-center shrink-0">
                HQ
              </div>
              <span className="font-sans text-xs font-semibold text-slate-200 hidden sm:inline">
                Head Quant
              </span>
              <ChevronDownIcon size={12} className="text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#0D1017] border border-white/[0.1] shadow-2xl p-2 z-50 flex flex-col gap-1"
                >
                  <div className="px-3 py-2 border-b border-white/[0.06]">
                    <p className="font-sans text-xs font-bold text-white">
                      {user?.name || "Head Quant"}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400 truncate">
                      {user?.email || "trader@shiftfx.internal"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.toggle();
                      soundFX.playPop();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left font-sans text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Effets Sonores Tactiles</span>
                    <span className="font-mono text-[10px] text-[#D4FF00]">
                      {soundFX.enabled ? "Activé" : "Désactivé"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      router.push("/login");
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left font-sans text-xs text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <SignOutIcon size={13} />
                    <span>Déconnexion</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        open={commandPaletteOpen}
        setOpen={setCommandPaletteOpen}
      />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MAIN TRADER WORKSPACE                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-[1550px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* ──────────────────────────────────────────────────────────── */}
        {/* 3.2 SECTION 1: OPPORTUNITÉS CLÉS DU JOUR (TOP MOVERS HERO)  */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#D4FF00] shrink-0">
                <FlameIcon size={16} />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-white tracking-tight leading-none">
                  Opportunités Clés du Jour
                </h2>
              </div>
            </div>
            <span className="font-sans text-xs text-slate-400 hidden sm:inline">
              Sélectionnées par l&apos;équipe Quantitative ShiftFX
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topMovers.map((tm, idx) => {
              // STRICT 3-REGIME COLOR LAW
              const isBull = tm.regime === "ACHETEUR";
              const isBear = tm.regime === "VENDEUR";

              const scoreColor = isBull
                ? "text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : isBear
                ? "text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                : "text-slate-100";

              const chartAccent = isBull ? "#10B981" : isBear ? "#F43F5E" : "#94A3B8";

              const washStyle = isBull
                ? "bg-[radial-gradient(120%_100%_at_0%_0%,rgba(16,185,129,0.08)_0%,transparent_75%)] hover:border-emerald-500/30"
                : isBear
                ? "bg-[radial-gradient(120%_100%_at_0%_0%,rgba(244,63,94,0.08)_0%,transparent_75%)] hover:border-rose-500/30"
                : "bg-[radial-gradient(120%_100%_at_0%_0%,rgba(148,163,184,0.06)_0%,transparent_75%)] hover:border-white/20";

              const regimeBadge = isBull
                ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-400"
                : isBear
                ? "bg-rose-500/12 border-rose-500/30 text-rose-400"
                : "bg-white/[0.05] border-white/[0.1] text-slate-300";

              // 2-Layer SVG Radial Ring Math
              const ringRadius = 7;
              const ringCircumference = 2 * Math.PI * ringRadius;
              const ringOffset = ringCircumference - (tm.confidence / 100) * ringCircumference;

              const [base, quote] = tm.pair.split("/");

              return (
                <div
                  key={tm.pair}
                  onClick={() => handleOpenDetails(tm)}
                  className={`group relative rounded-[28px] bg-[#0F1218] ${washStyle} border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_40px_-15px_rgba(0,0,0,0.7)] p-6 flex flex-col justify-between cursor-pointer transition-colors duration-200 overflow-hidden`}
                >
                  {/* Top Row: Badge + Plan + Deep Dive */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase px-3 py-1 rounded-full font-bold bg-[#D4FF00] text-black shadow-[0_0_20px_rgba(212,255,0,0.35)]">
                        TOP MOVER #{idx + 1}
                      </span>
                      <span className="font-sans text-[11px] text-slate-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
                        {tm.tier === "BASIC" ? "Plan Basic" : "Plan Pro"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFX.playPop();
                        handleOpenDetails(tm);
                      }}
                      className="font-sans text-xs text-slate-400 group-hover:text-[#D4FF00] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Thèse Complète</span>
                      <ArrowUpRightIcon size={14} />
                    </button>
                  </div>

                  {/* Middle Row: Flags + Ticker + Interactive Sparkline + Tabular Score */}
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex items-center shrink-0">
                        <img
                          src={getCountryFlagUrl(base)}
                          alt={base}
                          className="w-10 h-10 rounded-full ring-2 ring-[#0F1218] z-10 shrink-0"
                          loading="lazy"
                        />
                        <img
                          src={getCountryFlagUrl(quote)}
                          alt={quote}
                          className="w-10 h-10 -ml-3.5 rounded-full ring-2 ring-[#0F1218] z-0 shrink-0"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-none">
                            {tm.pair}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full border text-[10px] font-sans font-bold tracking-wider uppercase flex items-center gap-1.5 ${regimeBadge}`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: chartAccent }}
                            />
                            {tm.regime}
                          </span>
                        </div>
                        <p className="font-sans text-xs text-slate-400 mt-1 truncate">
                          {tm.countriesFr}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Scrubbing Sparkline in Center */}
                    <div
                      className="hidden sm:block w-36 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MorphingSplineChart
                        data={tm.sparkline}
                        accentColor={chartAccent}
                        height={44}
                      />
                    </div>

                    {/* Large Score + Closed 2-Layer Radial Confidence Ring */}
                    <div className="flex flex-col items-end shrink-0">
                      <AnimatedMetricValue
                        value={tm.score}
                        decimals={1}
                        prefix={tm.score > 0 ? "+" : ""}
                        suffix="%"
                        className={`text-3xl md:text-4xl font-mono font-extrabold tracking-tight tabular-nums ${scoreColor}`}
                      />

                      {/* Closed 2-Layer Radial Progress Ring */}
                      <div
                        className="flex items-center gap-1.5 mt-1.5"
                        title={`Confiance du modèle : ${tm.confidence}%`}
                      >
                        <svg className="w-4 h-4 -rotate-90 shrink-0" viewBox="0 0 18 18">
                          <circle
                            cx="9"
                            cy="9"
                            r={ringRadius}
                            fill="none"
                            stroke="rgba(255,255,255,0.12)"
                            strokeWidth="2"
                          />
                          <circle
                            cx="9"
                            cy="9"
                            r={ringRadius}
                            fill="none"
                            stroke={chartAccent}
                            strokeWidth="2"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="font-sans text-xs text-slate-400 tabular-nums">
                          <strong className="font-mono text-slate-300">{tm.confidence}%</strong>{" "}
                          Confiance
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recessed Obsidian Glass Thesis Well */}
                  <div className="rounded-[16px] bg-[#090B10]/90 border border-white/[0.05] p-4 my-4 flex gap-3 relative overflow-hidden">
                    <div
                      className="w-1 rounded-full shrink-0"
                      style={{ backgroundColor: chartAccent }}
                    />
                    <p className="font-sans text-[13px] leading-relaxed text-slate-300">
                      <strong className="text-white font-semibold">Moteur Macro : </strong>
                      {tm.thesis}
                    </p>
                  </div>

                  {/* Footer Strip */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] font-sans text-xs text-slate-300">
                      <ZapIcon size={12} className="text-[#D4FF00]" />
                      <span>{tm.carryText}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] font-sans text-xs text-slate-400">
                      <CalendarIcon size={12} />
                      <span>Prochaine Décision :</span>
                      <strong className="font-mono text-white tabular-nums">14j</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 3.3 SECTION 2: BAROMÈTRE MACRO DE FORCE RELATIVE (G10)       */}
        {/* ──────────────────────────────────────────────────────────── */}
        <G10RelativeStrengthBarometer
          selectedCurrency={currencyUniverse}
          onSelectCurrency={(cur) => {
            setCurrencyUniverse(cur);
          }}
          currencyData={g10BarometerData}
        />

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 3.4 SECTION 3: UNIFIED FILTER BAR + SMOOTH VIEW SWITCHER     */}
        {/* ──────────────────────────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left Pill Track: Toutes | Top Movers | Acheteur | Vendeur | Neutre | Favoris */}
          <div className="flex items-center rounded-full bg-[#0D0F15] p-1 border border-white/[0.07] shadow-inner overflow-x-auto max-w-full">
            {regimeTabs.map((tab) => {
              const isActive = regimeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setRegimeFilter(tab.id);
                  }}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive ? "text-[#07080C]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="trader-regime-tab"
                      transition={{ type: "spring", stiffness: 440, damping: 34, mass: 0.4 }}
                      className="absolute inset-0 rounded-full bg-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.3)] z-0"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {tab.dotColor && !isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: tab.dotColor }}
                      />
                    )}
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? "bg-black/20 text-black font-bold"
                            : "bg-white/[0.06] text-slate-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Currency Universe + View Mode Switcher */}
          <div className="flex items-center gap-2">
            {/* Center Currency Universe Track */}
            <div className="hidden lg:flex items-center rounded-full bg-[#0D0F15] p-1 border border-white/[0.07]">
              {["Tous", "EUR", "GBP", "USD", "JPY", "CROSS"].map((grp) => {
                const isSelected = currencyUniverse === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setCurrencyUniverse(grp);
                    }}
                    className={`relative px-3 py-1 rounded-full text-xs font-sans font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? "text-white font-semibold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="trader-universe-tab"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute inset-0 rounded-full bg-white/[0.1] border border-white/[0.12] z-0"
                      />
                    )}
                    <span className="relative z-10">{grp}</span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle: Cartes vs Tableau */}
            <div className="flex items-center rounded-full bg-[#0D0F15] p-1 border border-white/[0.07]">
              {[
                { key: "cards" as const, icon: AppsIcon, label: "Cartes" },
                { key: "table" as const, icon: RowsIcon, label: "Tableau" },
              ].map((v) => {
                const isActive = viewMode === v.key;
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setViewMode(v.key);
                    }}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-colors cursor-pointer ${
                      isActive ? "text-[#07080C]" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="trader-view-tab"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.3)] z-0"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <v.icon size={13} />
                      <span>{v.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* 3.5 SECTION 4A: CARTES VIEW (3-COLUMN BENTO GRID)            */}
        {/* ──────────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {viewMode === "cards" ? (
            <motion.div
              key="view-cards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredPairs.map((item) => (
                <TraderPairCard
                  key={item.pair}
                  item={item}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenDetails={handleOpenDetails}
                  onUnlockPro={() => handleToggleTierSimulation("pro")}
                />
              ))}
            </motion.div>
          ) : (
            /* ──────────────────────────────────────────────────────────── */
            /* 3.6 SECTION 4B: TABLEAU VIEW                                 */
            /* ──────────────────────────────────────────────────────────── */
            <motion.div
              key="view-table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="rounded-[26px] bg-[#0F1218] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_40px_-15px_rgba(0,0,0,0.7)] overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 min-w-[960px]">
                  <thead>
                    <tr className="text-[11px] font-sans uppercase font-bold tracking-wider text-slate-400 bg-white/[0.02]">
                      <th className="text-left px-5 py-3.5 border-b border-white/[0.06]">Paire FX</th>
                      <th className="text-center px-4 py-3.5 border-b border-white/[0.06]">Biais</th>
                      <th className="text-right px-4 py-3.5 border-b border-white/[0.06]">Score Net</th>
                      <th className="text-center px-4 py-3.5 border-b border-white/[0.06]">Confiance</th>
                      <th className="text-left px-4 py-3.5 border-b border-white/[0.06]">Moteur Économique</th>
                      <th className="text-center px-4 py-3.5 border-b border-white/[0.06]">Horizon 3M</th>
                      <th className="text-center px-4 py-3.5 border-b border-white/[0.06]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPairs.map((item) => {
                      const isBull = item.regime === "ACHETEUR";
                      const isBear = item.regime === "VENDEUR";
                      const [base, quote] = item.pair.split("/");

                      // STRICT 3-REGIME COLOR LAW
                      const scoreColor = isBull
                        ? "text-emerald-400"
                        : isBear
                        ? "text-rose-400"
                        : "text-slate-100";

                      const chartAccent = isBull ? "#10B981" : isBear ? "#F43F5E" : "#94A3B8";

                      const regimeBadge = isBull
                        ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-400"
                        : isBear
                        ? "bg-rose-500/12 border-rose-500/30 text-rose-400"
                        : "bg-white/[0.05] border-white/[0.1] text-slate-300";

                      return (
                        <tr
                          key={item.pair}
                          onClick={() => handleOpenDetails(item)}
                          className="group cursor-pointer hover:bg-white/[0.025] transition-colors border-b border-white/[0.03]"
                        >
                          {/* Col 1: Flags + Pair + Tier */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center shrink-0">
                                <img
                                  src={getCountryFlagUrl(base)}
                                  alt={base}
                                  className="w-7 h-7 rounded-full ring-2 ring-[#0F1218] z-10 shrink-0"
                                  loading="lazy"
                                />
                                <img
                                  src={getCountryFlagUrl(quote)}
                                  alt={quote}
                                  className="w-7 h-7 -ml-2 rounded-full ring-2 ring-[#0F1218] z-0 shrink-0"
                                  loading="lazy"
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-display text-sm font-bold text-white">
                                    {item.pair}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                                      item.tier === "PRO"
                                        ? "bg-purple-500/15 text-purple-300"
                                        : "bg-sky-500/15 text-sky-300"
                                    }`}
                                  >
                                    {item.tier}
                                  </span>
                                </div>
                                <span className="font-sans text-[11px] text-slate-400 truncate max-w-[160px] block">
                                  {item.countriesFr}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Regime Badge */}
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-sans font-bold uppercase tracking-wider ${regimeBadge}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: chartAccent }}
                              />
                              {item.regime}
                            </span>
                          </td>

                          {/* Col 3: Score Net */}
                          <td className="px-4 py-3.5 text-right">
                            <AnimatedMetricValue
                              value={item.score}
                              decimals={1}
                              prefix={item.score > 0 ? "+" : ""}
                              suffix="%"
                              className={`font-mono text-sm font-extrabold tabular-nums ${scoreColor}`}
                            />
                          </td>

                          {/* Col 4: Confidence with Progress Bar */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-300 tabular-nums">
                                {item.confidence}%
                              </span>
                              <div className="w-12 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${item.confidence}%`,
                                    backgroundColor: chartAccent,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Col 5: Moteur Économique in clean Satoshi */}
                          <td className="px-4 py-3.5 max-w-[280px]">
                            <p className="font-sans text-xs text-slate-300 line-clamp-1 leading-relaxed">
                              {item.thesis}
                            </p>
                            <span className="inline-flex items-center gap-1 font-sans text-[11px] text-slate-400 mt-0.5">
                              <ZapIcon size={11} className="text-[#D4FF00]" />
                              <span>{item.carryText}</span>
                            </span>
                          </td>

                          {/* Col 6: 3M Mini Trajectory Sparkline with Tooltip */}
                          <td className="px-4 py-3.5 text-center">
                            <div
                              className="inline-flex items-end gap-1 h-5 justify-center group/3m relative"
                              title={item.forecast3M
                                .map((f) => `${f.month}: ${f.val > 0 ? `+${f.val}` : f.val}%`)
                                .join(" → ")}
                            >
                              {item.forecast3M.map((f) => {
                                const isFPos = f.val >= 20;
                                const isFNeg = f.val <= -20;
                                const barColor = isFPos
                                  ? "#10B981"
                                  : isFNeg
                                  ? "#F43F5E"
                                  : "#94A3B8";
                                const heightPx = Math.max(
                                  6,
                                  Math.min(20, Math.round((Math.abs(f.val) / 40) * 20))
                                );

                                return (
                                  <div
                                    key={f.month}
                                    className="flex flex-col items-center justify-end h-full"
                                  >
                                    <div
                                      style={{
                                        height: `${heightPx}px`,
                                        width: "6px",
                                        backgroundColor: barColor,
                                      }}
                                      className="rounded-t-[2px]"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Col 7: Action */}
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-slate-400 group-hover:text-[#D4FF00] transition-colors">
                              <span>Détails</span>
                              <ArrowRightIcon
                                size={12}
                                className="transition-transform duration-200 group-hover:translate-x-1"
                              />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. INTERACTIVE PAIR THESIS DRAWER                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <PairThesisDrawer
        isOpen={isDrawerOpen}
        pairData={drawerPair}
        onClose={() => setIsDrawerOpen(false)}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* UNDO FAVORITE FLOATING TOAST                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {toastData && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#0F1218]/95 border border-[#D4FF00]/40 backdrop-blur-xl shadow-2xl flex items-center gap-3"
          >
            <StarFillIcon size={14} className="text-[#D4FF00]" />
            <span className="font-sans text-xs font-medium text-white">
              {toastData.message}
            </span>
            <button
              type="button"
              onClick={() => handleUndoFavorite(toastData.pair)}
              className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[11px] font-sans font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
