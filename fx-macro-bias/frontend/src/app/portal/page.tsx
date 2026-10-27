"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TrendingDown, Minus, ShieldCheck, LogOut, Search, Clock, Sparkles,
  ArrowUpRight, Activity, Layers, Globe2, Lock, Unlock, Star, Flame, LayoutGrid,
  List, SlidersHorizontal, ChevronRight, Info, Calendar, Zap, BarChart3,
  CheckCircle2, Share2, ExternalLink, Crown, Copy, Check
} from "lucide-react";
import { clsx } from "clsx";
import confetti from "canvas-confetti";
import { useAuth } from "@/context/AuthContext";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";
import { playClickSound, playTabSound, playSuccessSound } from "@/lib/soundEffects";
import { 
  getTraderSignals, TraderSignal, getUserWatchlist, toggleUserWatchlist,
  getCurrencyStrengthMeter, CurrencyStrength, getCatalogConfig, CatalogConfig
} from "@/data/userCatalogService";
import {
  SpotlightBentoCard, DopaminePillTabs, FXPairFlags, CurrencyFlag,
  GlowSparkline, StaggerContainer, StaggerItem, MiniBarChart, SPRING_SNAPPY
} from "@/components/ui/DopaminePrimitives";
import { QuantumWaitingScreen } from "@/components/ui/QuantumWaitingScreen";

// Generate pseudo-random sparkline data seeded by pair name
function genSparkline(pair: string, sentiment: "bullish" | "bearish" | "neutral"): number[] {
  let seed = 0;
  for (let i = 0; i < pair.length; i++) seed += pair.charCodeAt(i);
  const pts: number[] = [];
  let val = 50;
  for (let i = 0; i < 12; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const drift = sentiment === "bullish" ? 1.2 : sentiment === "bearish" ? -1.2 : 0;
    val += (r - 0.45) * 8 + drift;
    pts.push(val);
  }
  return pts;
}

export default function TraderPortalPage() {
  const { user, isLoading, setSimulatedTier } = useAuth();
  const router = useRouter();

  const [signals, setSignals] = useState<TraderSignal[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedPairModal, setSelectedPairModal] = useState<TraderSignal | null>(null);
  const [modalTab, setModalTab] = useState<"thesis" | "pillars" | "forecast">("thesis");
  const [catalogConfig, setCatalogConfig] = useState<CatalogConfig | null>(null);
  const [simulatedTier, setLocalSimulatedTier] = useState<"basic" | "pro">("pro");
  const [biasFilter, setBiasFilter] = useState<string>("ALL");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [copiedThesis, setCopiedThesis] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(() => {
    const loadData = () => {
      setSignals(getTraderSignals());
      setWatchlist(getUserWatchlist());
      setCatalogConfig(getCatalogConfig());
    };
    loadData();
    window.addEventListener("shiftfx_catalog_updated", loadData);
    window.addEventListener("shiftfx_watchlist_updated", loadData);
    return () => {
      window.removeEventListener("shiftfx_catalog_updated", loadData);
      window.removeEventListener("shiftfx_watchlist_updated", loadData);
    };
  }, []);

  useEffect(() => { if (user?.tier) setLocalSimulatedTier(user.tier); }, [user]);

  const handleToggleTierSimulation = (tier: "basic" | "pro") => {
    playTabSound();
    setLocalSimulatedTier(tier);
    if (setSimulatedTier) setSimulatedTier(tier);
    if (tier === "pro") {
      playSuccessSound();
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });
    }
  };

  const handleToggleWatchlist = (pair: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    setWatchlist(toggleUserWatchlist(pair));
  };

  const topMovers = useMemo(() => {
    const published = signals.filter(s => s.isPublished);
    const adminSelected = published.filter(s => s.isTopMover);
    if (adminSelected.length > 0) return adminSelected.slice(0, 2);
    return [...published].sort((a, b) => Math.abs(b.scoreNum) - Math.abs(a.scoreNum)).slice(0, 2);
  }, [signals]);

  const currencyStrengths = useMemo(() => getCurrencyStrengthMeter(signals), [signals]);

  const filteredSignals = useMemo(() => {
    return signals.filter(s => {
      if (!s.isPublished) return false;
      if (biasFilter === "BULLISH" && s.bias !== "BULLISH") return false;
      if (biasFilter === "BEARISH" && s.bias !== "BEARISH") return false;
      if (biasFilter === "NEUTRAL" && s.bias !== "NEUTRAL") return false;
      if (biasFilter === "TOP_MOVERS" && !s.isTopMover) return false;
      if (biasFilter === "WATCHLIST" && !watchlist.includes(s.pair)) return false;
      if (groupFilter !== "ALL" && s.group !== groupFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!s.pair.toLowerCase().includes(q) && !s.baseCountry.toLowerCase().includes(q) && !s.quoteCountry.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [signals, biasFilter, groupFilter, searchQuery, watchlist]);

  const handleCopyThesis = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedThesis(true);
    playSuccessSound();
    setTimeout(() => setCopiedThesis(false), 2000);
  };

  const publishedCount = signals.filter(s => s.isPublished).length;

  const biasFilterTabs = [
    { id: "ALL" as const, label: "Toutes", count: publishedCount },
    { id: "TOP_MOVERS" as const, label: "Top Movers", count: topMovers.length, dotColor: "#D4FF00" },
    { id: "BULLISH" as const, label: "Acheteur", dotColor: "#10B981" },
    { id: "BEARISH" as const, label: "Vendeur", dotColor: "#F43F5E" },
    { id: "NEUTRAL" as const, label: "Neutre", dotColor: "#94A3B8" },
    { id: "WATCHLIST" as const, label: "Favoris", count: watchlist.length, dotColor: "#D4FF00" },
  ];

  return (
    <div className="min-h-screen bg-[#06070A] text-slate-100 flex flex-col font-sans selection:bg-[#D4FF00] selection:text-[#06070A]">
      <QuantumWaitingScreen isLoading={initialLoading} />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TOP FLOATING GLASS NAVIGATION BAR                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <header className="h-16 w-full flex items-center justify-between px-6 border-b border-white/[0.05] bg-[#08090D]/85 backdrop-blur-2xl sticky top-0 z-50">
        {/* Left: Brand Lockup */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center p-1 rounded-xl bg-gradient-to-br from-[#D4FF00]/15 to-emerald-500/5 border border-[#D4FF00]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex-shrink-0">
              <img src="/logo.svg" alt="ShiftFX" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-lg leading-none tracking-tight text-white">
                Shift<span className="text-[#D4FF00]">FX</span>
              </span>
              <span className="text-[9px] font-mono tracking-widest text-slate-400 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full uppercase">
                TERMINAL
              </span>
            </div>
          </Link>

          {/* Inline Engine Pulse */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>Engine: Synchronized</span>
          </div>
        </div>

        {/* Right: Floating Glass Pill Bar */}
        <div className="flex items-center gap-2">
          {/* View Switcher: Basic / Pro */}
          <div className="hidden sm:flex items-center rounded-full bg-[#0D0F15]/90 p-1 border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            {(["basic", "pro"] as const).map((t) => (
              <motion.button
                key={t}
                onClick={() => handleToggleTierSimulation(t)}
                whileTap={{ scale: 0.94 }}
                className={clsx(
                  "relative px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5",
                  simulatedTier === t ? "text-[#07080B]" : "text-slate-400 hover:text-white"
                )}
              >
                {simulatedTier === t && (
                  <motion.div
                    layoutId="tier-pill"
                    transition={SPRING_SNAPPY}
                    className="btn-dopamine-lime absolute inset-0 rounded-full z-0"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {t === "basic" ? <Unlock size={12} /> : <Crown size={12} />}
                  {t === "basic" ? "Basic (8)" : "Pro (28)"}
                </span>
              </motion.button>
            ))}
          </div>

          {user?.role === "admin" && (
            <Link
              href="/admin/dashboard"
              className="hidden lg:flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs font-mono text-[#D4FF00] transition-colors whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <ShieldCheck size={13} />
              <span>Admin</span>
            </Link>
          )}

          <GlobalSearch placeholder="Rechercher une paire..." />
          <AuthHeaderWidget />
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-[1550px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <StaggerContainer className="flex flex-col gap-6">

          {/* ──────────────────────────────────────────────────────────── */}
          {/* SECTION 1: TOP MOVERS — HERO BENTO CARDS                   */}
          {/* ──────────────────────────────────────────────────────────── */}
          <StaggerItem>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="icon-orb">
                    <Flame size={16} className="text-[#D4FF00]" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-400 font-medium">
                      Opportunités Clés du Jour
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                  Sélectionnées par l&apos;équipe Quantitative ShiftFX
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topMovers.map((tm, idx) => {
                  const isBull = tm.bias === "BULLISH";
                  const isBear = tm.bias === "BEARISH";
                  const sentiment = isBull ? "bullish" : isBear ? "bearish" : "neutral";
                  const sparkData = genSparkline(tm.pair, sentiment);

                  return (
                    <SpotlightBentoCard
                      key={tm.pair}
                      mood={sentiment}
                      onClick={() => { playClickSound(); setSelectedPairModal(tm); }}
                      rounded="rounded-[28px]"
                      className="group"
                    >
                      <div className="p-6 relative">
                        {/* Topographic grid overlay */}
                        <div className="topo-grid-overlay" />

                        {/* Top Row: Badge + Deep Dive */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full font-bold bg-[#D4FF00] text-black shadow-[0_0_20px_rgba(212,255,0,0.35)]">
                              TOP MOVER #{idx + 1}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-full">
                              {tm.tier === "basic" ? "Plan Basic" : "Plan Pro"}
                            </span>
                          </div>
                          <motion.span
                            whileHover={{ x: 2, y: -2 }}
                            className="text-xs font-mono text-slate-400 group-hover:text-[#D4FF00] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            Thèse Complète <ArrowUpRight size={13} />
                          </motion.span>
                        </div>

                        {/* Middle Row: Flags + Ticker + Sparkline + Score */}
                        <div className="flex items-center justify-between gap-4 mb-5">
                          <div className="flex items-center gap-3.5">
                            <FXPairFlags pair={tm.pair} size="lg" />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2.5">
                                <span className="font-sans font-bold text-2xl md:text-3xl tracking-tight text-white">
                                  {tm.pair}
                                </span>
                                <span className={clsx(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border",
                                  isBull ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                                  isBear ? "bg-rose-500/10 text-rose-400 border-rose-500/25" :
                                  "bg-slate-400/10 text-slate-400 border-slate-400/20"
                                )}>
                                  ● {tm.biasFrench}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 font-medium mt-0.5">
                                {tm.baseCountry} vs {tm.quoteCountry}
                              </span>
                            </div>
                          </div>

                          {/* Sparkline Bridge */}
                          <div className="hidden sm:block">
                            <GlowSparkline
                              data={sparkData}
                              sentiment={sentiment}
                              id={`top-${tm.pair}`}
                              className="w-28 h-10"
                            />
                          </div>

                          {/* Large Score */}
                          <div className="flex flex-col items-end">
                            <span className={clsx(
                              "font-mono font-extrabold text-3xl md:text-4xl tracking-tight tabular-nums",
                              tm.scoreNum > 0 ? "text-emerald-400 drop-shadow-[0_0_18px_rgba(16,185,129,0.25)]" :
                              tm.scoreNum < 0 ? "text-rose-400 drop-shadow-[0_0_18px_rgba(244,63,94,0.25)]" :
                              "text-slate-300"
                            )}>
                              {tm.scorePct}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                                {tm.confidence}% Confiance
                              </span>
                              {/* Mini circular progress */}
                              <svg className="w-4 h-4" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                                <circle
                                  cx="10" cy="10" r="8" fill="none"
                                  stroke={isBull ? "#10B981" : isBear ? "#F43F5E" : "#94A3B8"}
                                  strokeWidth="2.5" strokeLinecap="round"
                                  strokeDasharray={`${(tm.confidence / 100) * 50.3} 50.3`}
                                  transform="rotate(-90 10 10)"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Thesis Well */}
                        <div className="rounded-2xl bg-black/25 border border-white/[0.05] p-4 mb-4 flex gap-3">
                          <div className="w-1 rounded-full bg-emerald-400 flex-shrink-0" style={{ backgroundColor: isBull ? "#10B981" : isBear ? "#F43F5E" : "#94A3B8" }} />
                          <p className="text-xs font-sans text-slate-300 leading-relaxed">
                            <strong className="text-white">Moteur Macro :</strong> {tm.primaryDriver}
                          </p>
                        </div>

                        {/* Footer Strip */}
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] tabular-nums">
                            <Zap size={11} className="text-[#D4FF00]" />
                            {tm.carryAdvantage}
                          </span>
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                            <Calendar size={11} />
                            Prochaine Décision: 14j
                          </span>
                        </div>
                      </div>
                    </SpotlightBentoCard>
                  );
                })}
              </div>
            </div>
          </StaggerItem>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* SECTION 2: G10 RELATIVE STRENGTH BAROMETER                 */}
          {/* ──────────────────────────────────────────────────────────── */}
          <StaggerItem>
            <SpotlightBentoCard mood="neutral" rounded="rounded-[28px]" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="icon-orb">
                    <BarChart3 size={16} className="text-slate-300" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.12em] text-slate-400 font-medium">
                    Baromètre Macro de Force Relative (G10)
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 hidden md:inline">
                  Plus Fort : <strong className="text-emerald-400 tabular-nums">{currencyStrengths[0]?.currency} ({currencyStrengths[0]?.netScore}%)</strong>
                  {" "}• Plus Faible : <strong className="text-rose-400 tabular-nums">{currencyStrengths[currencyStrengths.length - 1]?.currency} ({currencyStrengths[currencyStrengths.length - 1]?.netScore}%)</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {currencyStrengths.map((cs) => {
                  const isPos = cs.netScore > 0;
                  const isNeg = cs.netScore < 0;
                  const absScore = Math.abs(cs.netScore);
                  const barPct = Math.min(50, (absScore / 40) * 50);

                  return (
                    <motion.div
                      key={cs.currency}
                      whileHover={{ scale: 1.03, y: -2 }}
                      transition={SPRING_SNAPPY}
                      className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3 flex flex-col gap-2 cursor-pointer hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CurrencyFlag currency={cs.currency} size="sm" />
                          <span className="font-mono font-bold text-xs text-white">{cs.currency}</span>
                        </div>
                        <span className={clsx(
                          "font-mono text-xs font-bold tabular-nums",
                          isPos ? "text-emerald-400" : isNeg ? "text-rose-400" : "text-slate-400"
                        )}>
                          {isPos ? `+${cs.netScore}%` : `${cs.netScore}%`}
                        </span>
                      </div>

                      {/* Vertical diverging capsule meter */}
                      <div className="w-full h-2 bg-white/[0.04] rounded-full relative overflow-hidden">
                        <div className="w-[1px] h-full bg-white/15 absolute left-1/2 -translate-x-1/2 z-10" />
                        {isPos && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r-full absolute left-1/2 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          />
                        )}
                        {isNeg && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-gradient-to-l from-rose-500 to-rose-400 rounded-l-full absolute right-1/2 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                          />
                        )}
                      </div>

                      <span className={clsx(
                        "text-[9px] font-mono uppercase font-semibold text-center",
                        cs.bias === "STRONG" ? "text-emerald-400" : cs.bias === "WEAK" ? "text-rose-400" : "text-slate-500"
                      )}>
                        {cs.bias}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </SpotlightBentoCard>
          </StaggerItem>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* SECTION 3: FILTER TOOLBAR — DOPAMINE PILL TABS              */}
          {/* ──────────────────────────────────────────────────────────── */}
          <StaggerItem>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Left: Sliding Pill Track */}
              <DopaminePillTabs
                tabs={biasFilterTabs}
                activeTab={biasFilter}
                onChange={(id) => { setBiasFilter(id); playTabSound(); }}
                layoutGroupId="portal-filter-pill"
              />

              {/* Right: Controls */}
              <div className="flex items-center gap-2">
                {/* Currency Quick-Chips */}
                <div className="hidden md:flex items-center gap-1 rounded-full bg-[#0D0F15]/90 p-1 border border-white/[0.07] backdrop-blur-xl">
                  {["ALL", "EUR", "GBP", "USD", "JPY", "CROSS"].map((grp) => (
                    <button
                      key={grp}
                      onClick={() => { setGroupFilter(grp); playTabSound(); }}
                      className={clsx(
                        "px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-colors cursor-pointer whitespace-nowrap",
                        groupFilter === grp
                          ? "bg-white/[0.1] text-white font-semibold"
                          : "text-slate-500 hover:text-white"
                      )}
                    >
                      {grp === "ALL" ? "Tous" : grp}
                    </button>
                  ))}
                </div>

                {/* View Switcher */}
                <div className="flex items-center rounded-full bg-[#0D0F15]/90 p-1 border border-white/[0.07] backdrop-blur-xl">
                  {([
                    { key: "cards" as const, icon: LayoutGrid, label: "Cartes" },
                    { key: "table" as const, icon: List, label: "Tableau" },
                  ]).map((v) => (
                    <motion.button
                      key={v.key}
                      onClick={() => { setViewMode(v.key); playTabSound(); }}
                      whileTap={{ scale: 0.94 }}
                      className={clsx(
                        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer",
                        viewMode === v.key ? "text-[#07080B]" : "text-slate-400 hover:text-white"
                      )}
                    >
                      {viewMode === v.key && (
                        <motion.div
                          layoutId="view-pill"
                          transition={SPRING_SNAPPY}
                          className="btn-dopamine-lime absolute inset-0 rounded-full z-0"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <v.icon size={13} />
                        {v.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* SECTION 4: PAIR CARDS VIEW                                  */}
          {/* ──────────────────────────────────────────────────────────── */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredSignals.map((item, i) => {
                  const isBull = item.bias === "BULLISH";
                  const isBear = item.bias === "BEARISH";
                  const sentiment = isBull ? "bullish" : isBear ? "bearish" : "neutral";
                  const scoreVal = item.scoreNum;
                  const isFavorite = watchlist.includes(item.pair);
                  const isLocked = simulatedTier === "basic" && item.tier === "pro";
                  const sparkData = genSparkline(item.pair, sentiment);

                  return (
                    <motion.div
                      key={item.pair}
                      layout
                      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                    >
                      <SpotlightBentoCard
                        mood={isLocked ? "pro" : sentiment}
                        onClick={() => {
                          if (isLocked) handleToggleTierSimulation("pro");
                          else { playClickSound(); setSelectedPairModal(item); }
                        }}
                        rounded="rounded-[22px]"
                        className="group h-full"
                      >
                        <div className="p-5 flex flex-col justify-between h-full relative">
                          {/* Header: Flags + Pair + Star + Badge */}
                          <div>
                            <div className="flex items-center justify-between mb-3.5">
                              <div className="flex items-center gap-2.5">
                                <FXPairFlags pair={item.pair} size="md" />
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-sans font-bold text-sm text-white">{item.pair}</span>
                                    <span className={clsx(
                                      "text-[9px] font-mono px-2 py-0.5 rounded-full uppercase border",
                                      item.tier === "basic"
                                        ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                        : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                    )}>
                                      {item.tier === "basic" ? "Basic" : "Pro"}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                    {item.baseCountry} / {item.quoteCountry}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={(e) => handleToggleWatchlist(item.pair, e)}
                                  className={clsx(
                                    "p-1.5 rounded-full transition-colors cursor-pointer",
                                    isFavorite ? "text-[#D4FF00] bg-[#D4FF00]/10" : "text-slate-500 hover:text-white hover:bg-white/[0.04]"
                                  )}
                                >
                                  <Star size={14} fill={isFavorite ? "#D4FF00" : "none"} />
                                </motion.button>

                                <span className={clsx(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border",
                                  isBull ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                                  isBear ? "bg-rose-500/10 text-rose-400 border-rose-500/25" :
                                  "bg-slate-400/10 text-slate-400 border-slate-400/20"
                                )}>
                                  {item.biasFrench}
                                </span>
                              </div>
                            </div>

                            {/* Score + Sparkline Row */}
                            <div className="flex items-center justify-between mb-3">
                              <span className={clsx(
                                "font-mono font-bold text-2xl tracking-tight tabular-nums",
                                scoreVal > 0 ? "text-emerald-400" : scoreVal < 0 ? "text-rose-400" : "text-slate-300"
                              )}>
                                {item.scorePct}
                              </span>
                              <GlowSparkline
                                data={sparkData}
                                sentiment={sentiment}
                                id={`card-${item.pair}`}
                                className="w-20 h-8"
                              />
                              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                                {item.confidence}%
                              </span>
                            </div>

                            {/* Confidence bar */}
                            <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden mb-3">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.confidence}%` }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                className={clsx(
                                  "h-full rounded-full",
                                  isBull ? "bg-emerald-500" : isBear ? "bg-rose-500" : "bg-slate-400"
                                )}
                              />
                            </div>

                            {/* Driver */}
                            <div className="border-t border-white/[0.05] pt-2.5 mb-2.5">
                              <p className="text-xs font-sans text-slate-300 leading-relaxed line-clamp-2">
                                {item.primaryDriver}
                              </p>
                            </div>

                            {/* 3M Forecast */}
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                              <span className="text-slate-500">3M :</span>
                              <div className="flex items-center gap-1">
                                {item.forecast3MTrend.map((f) => (
                                  <span
                                    key={f.month}
                                    className={clsx(
                                      "px-1.5 py-0.5 rounded-full text-[10px] tabular-nums",
                                      f.bias === "BULLISH" ? "text-emerald-400 bg-emerald-500/10" :
                                      f.bias === "BEARISH" ? "text-rose-400 bg-rose-500/10" :
                                      "text-slate-400 bg-white/[0.04]"
                                    )}
                                  >
                                    {f.month.slice(5)}: {f.scorePct}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between border-t border-white/[0.05] pt-3 mt-3 text-xs font-mono text-slate-400">
                            <span className="text-slate-300 truncate max-w-[190px] tabular-nums text-[11px]">
                              {item.carryAdvantage}
                            </span>
                            <span className="text-slate-500 group-hover:text-[#D4FF00] transition-colors flex items-center gap-1">
                              Détails <ChevronRight size={12} />
                            </span>
                          </div>

                          {/* Frosted Holographic Vault Card (Aura Bank Art Direction) */}
                          {isLocked && (
                            <div className="absolute inset-0 bg-[#06070A]/80 backdrop-blur-md z-20 flex flex-col items-center justify-center p-5 text-center rounded-[22px] overflow-hidden">
                              {/* Diagonal Holographic Shimmer Beam */}
                              <div className="animate-shimmer absolute inset-0 pointer-events-none opacity-40" />

                              {/* Radial Subsurface Mood Bloom */}
                              <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background: "radial-gradient(circle at 50% 30%, rgba(168, 85, 247, 0.28) 0%, rgba(59, 130, 246, 0.08) 45%, transparent 75%)",
                                }}
                              />

                              {/* Floating 3D-style Lock Orb */}
                              <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/25 via-indigo-500/15 to-transparent border border-purple-400/35 shadow-[0_0_30px_rgba(168,85,247,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center mb-3">
                                <motion.div
                                  animate={{ y: [-1, 2, -1] }}
                                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                >
                                  <Lock size={22} className="text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                </motion.div>
                              </div>

                              <span className="relative z-10 font-sans text-sm font-bold text-white mb-1 tracking-tight">
                                Plan Pro Institutionnel
                              </span>
                              <p className="relative z-10 text-[11px] text-slate-300 mb-4 max-w-[210px] leading-relaxed">
                                Analyse quantitative institutionnelle &amp; prévisions 3 mois exclusives.
                              </p>

                              <motion.button
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.94 }}
                                transition={SPRING_SNAPPY}
                                onClick={(e) => { e.stopPropagation(); handleToggleTierSimulation("pro"); }}
                                className="relative z-10 btn-dopamine-lime px-5 py-2.5 rounded-full text-xs font-bold cursor-pointer shadow-[0_0_25px_rgba(212,255,0,0.35)] flex items-center gap-1.5"
                              >
                                <Sparkles size={13} />
                                <span>Débloquer les 28 Paires Pro →</span>
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </SpotlightBentoCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* SECTION 5: TABLE VIEW                                       */}
          {/* ──────────────────────────────────────────────────────────── */}
          {viewMode === "table" && (
            <SpotlightBentoCard mood="neutral" rounded="rounded-[28px]" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 min-w-[900px]">
                  <thead>
                    <tr className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      <th className="text-left px-5 py-3 border-b border-white/[0.06]">Paire FX</th>
                      <th className="text-center px-4 py-3 border-b border-white/[0.06]">Biais</th>
                      <th className="text-right px-4 py-3 border-b border-white/[0.06]">Score</th>
                      <th className="text-center px-4 py-3 border-b border-white/[0.06]">Confiance</th>
                      <th className="text-left px-4 py-3 border-b border-white/[0.06]">Moteur Économique</th>
                      <th className="text-center px-4 py-3 border-b border-white/[0.06]">3M</th>
                      <th className="text-center px-4 py-3 border-b border-white/[0.06]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSignals.map((item) => {
                      const isBull = item.bias === "BULLISH";
                      const isBear = item.bias === "BEARISH";
                      const scoreVal = item.scoreNum;

                      return (
                        <motion.tr
                          key={item.pair}
                          whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                          onClick={() => { playClickSound(); setSelectedPairModal(item); }}
                          className="cursor-pointer transition-colors border-b border-white/[0.03]"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <FXPairFlags pair={item.pair} size="sm" />
                              <span className="font-mono font-bold text-xs text-white">{item.pair}</span>
                              <span className={clsx(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded-full uppercase",
                                item.tier === "basic" ? "bg-sky-500/10 text-sky-400" : "bg-purple-500/10 text-purple-400"
                              )}>
                                {item.tier}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={clsx(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border",
                              isBull ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                              isBear ? "bg-rose-500/10 text-rose-400 border-rose-500/25" :
                              "bg-slate-400/10 text-slate-400 border-slate-400/20"
                            )}>
                              {item.biasFrench}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={clsx(
                              "font-mono font-bold text-xs tabular-nums",
                              scoreVal > 0 ? "text-emerald-400" : scoreVal < 0 ? "text-rose-400" : "text-slate-300"
                            )}>
                              {item.scorePct}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-xs text-slate-400 tabular-nums">
                            {item.confidence}%
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-300 max-w-[250px]">
                            <span className="line-clamp-1">{item.primaryDriver}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {item.forecast3MTrend.map(f => (
                                <span key={f.month} className={clsx(
                                  "w-2 h-2 rounded-full",
                                  f.bias === "BULLISH" ? "bg-emerald-400" :
                                  f.bias === "BEARISH" ? "bg-rose-400" : "bg-slate-400"
                                )} title={`${f.month}: ${f.scorePct}`} />
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-mono text-slate-400 hover:text-[#D4FF00] transition-colors">
                              Détails →
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SpotlightBentoCard>
          )}

        </StaggerContainer>
      </main>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DEEP DIVE TRADE SETUP MODAL                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedPairModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setSelectedPairModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={SPRING_SNAPPY}
              onClick={(e) => e.stopPropagation()}
              className="glass-bento bleed-neutral rounded-[22px] max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <FXPairFlags pair={selectedPairModal.pair} size="lg" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-lg text-white">{selectedPairModal.pair}</span>
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border",
                        selectedPairModal.bias === "BULLISH" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                        selectedPairModal.bias === "BEARISH" ? "bg-rose-500/10 text-rose-400 border-rose-500/25" :
                        "bg-slate-400/10 text-slate-400 border-slate-400/20"
                      )}>
                        {selectedPairModal.biasFrench} ({selectedPairModal.scorePct})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {selectedPairModal.baseCountry} vs {selectedPairModal.quoteCountry} • Plan {selectedPairModal.tier === "basic" ? "Basic" : "Pro"}
                    </span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setSelectedPairModal(null)}
                  className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </motion.button>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center px-5 pt-2 border-b border-white/[0.06]">
                {[
                  { key: "thesis", label: "Stratégie & Moteurs" },
                  { key: "pillars", label: "Preuve Mathématique (6 Piliers)" },
                  { key: "forecast", label: "Horizon 3 Mois" }
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setModalTab(t.key as typeof modalTab); playTabSound(); }}
                    className={clsx(
                      "relative px-4 py-2.5 text-xs font-mono font-medium transition-colors cursor-pointer",
                      modalTab === t.key ? "text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {modalTab === t.key && (
                      <motion.div
                        layoutId="modal-tab-indicator"
                        transition={SPRING_SNAPPY}
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4FF00] rounded-full"
                      />
                    )}
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto flex flex-col gap-4 flex-1">
                <AnimatePresence mode="wait">
                  {modalTab === "thesis" && (
                    <motion.div
                      key="thesis"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-3"
                    >
                      <div className="rounded-2xl bg-black/25 border border-white/[0.05] p-4 flex gap-3">
                        <div className="w-1 rounded-full flex-shrink-0" style={{
                          backgroundColor: selectedPairModal.bias === "BULLISH" ? "#10B981" :
                            selectedPairModal.bias === "BEARISH" ? "#F43F5E" : "#94A3B8"
                        }} />
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4FF00] font-semibold block mb-1">
                            Recommandation Stratégique
                          </span>
                          <p className="font-sans text-xs text-white leading-relaxed">{selectedPairModal.executionStrategy}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[16px] bg-white/[0.02] border border-white/[0.06] p-3.5 flex flex-col justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                          <span className="text-[11px] font-sans text-slate-400">Rendement de Carry</span>
                          <span className="font-mono text-sm font-bold text-emerald-400 mt-1.5 tabular-nums">{selectedPairModal.carryAdvantage}</span>
                        </div>
                        <div className="rounded-[16px] bg-white/[0.02] border border-white/[0.06] p-3.5 flex flex-col justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                          <span className="text-[11px] font-sans text-slate-400">Confiance Modèle</span>
                          <span className="font-mono text-sm font-bold text-white mt-1.5 tabular-nums">{selectedPairModal.confidence}%</span>
                        </div>
                      </div>

                      <div className="rounded-[16px] bg-white/[0.02] border border-white/[0.06] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <span className="text-xs font-sans font-semibold text-white flex items-center gap-1.5 mb-1.5">
                          <Calendar size={13} className="text-[#D4FF00]" />
                          Catalyseurs Économiques à Surveiller
                        </span>
                        <p className="text-xs font-sans text-slate-300">{selectedPairModal.keyCatalyst}</p>
                        <span className="text-[11px] font-mono text-slate-400 mt-1 block">{selectedPairModal.centralBankNext}</span>
                      </div>
                    </motion.div>
                  )}

                  {modalTab === "pillars" && (
                    <motion.div
                      key="pillars"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-2"
                    >
                      {selectedPairModal.pillars.map((pil) => {
                        const isPPos = pil.differential > 0;
                        const isPNeg = pil.differential < 0;
                        return (
                          <div key={pil.indicator} className="rounded-[16px] bg-white/[0.02] border border-white/[0.06] p-3 flex items-center justify-between gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <div className="flex flex-col min-w-[100px]">
                              <span className="font-mono font-bold text-xs text-white">{pil.indicator}</span>
                              <span className="text-[10px] text-slate-500 font-mono">Poids: 16.67%</span>
                            </div>
                            <div className="flex-1 text-xs text-slate-400 line-clamp-1">{pil.insight}</div>
                            <span className={clsx(
                              "font-mono font-bold text-xs px-2.5 py-0.5 rounded-[12px] border tabular-nums",
                              isPPos ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              isPNeg ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                              "bg-slate-400/10 text-slate-400 border-slate-400/20"
                            )}>
                              {isPPos ? `+${pil.differential}` : `${pil.differential}`}
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {modalTab === "forecast" && (
                    <motion.div
                      key="forecast"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-3"
                    >
                      <div className="grid grid-cols-3 gap-3">
                        {selectedPairModal.forecast3MTrend.map((fc) => (
                          <div key={fc.month} className="rounded-[16px] bg-white/[0.02] border border-white/[0.06] p-4 flex flex-col items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <span className="text-xs font-mono text-slate-400">{fc.month}</span>
                            <span className="font-mono text-xl font-bold text-white tabular-nums">{fc.scorePct}</span>
                            <span className={clsx(
                              "text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase",
                              fc.bias === "BULLISH" ? "bg-emerald-500/10 text-emerald-400" :
                              fc.bias === "BEARISH" ? "bg-rose-500/10 text-rose-400" :
                              "bg-slate-400/10 text-slate-400"
                            )}>
                              {fc.bias}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Sparkline for forecast */}
                      <div className="rounded-[16px] bg-white/[0.02] border border-white/[0.06] p-4 flex items-center justify-center">
                        <GlowSparkline
                          data={selectedPairModal.forecast3MTrend.map(f => parseFloat(f.scorePct))}
                          sentiment={selectedPairModal.bias === "BULLISH" ? "bullish" : selectedPairModal.bias === "BEARISH" ? "bearish" : "neutral"}
                          id={`forecast-${selectedPairModal.pair}`}
                          width={280}
                          height={60}
                          className="w-full h-16"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-4 border-t border-white/[0.06]">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCopyThesis(`${selectedPairModal.pair} (${selectedPairModal.biasFrench} ${selectedPairModal.scorePct}): ${selectedPairModal.primaryDriver}`)}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  {copiedThesis ? <Check size={12} /> : <Copy size={12} />}
                  {copiedThesis ? "Copié !" : "Copier la Thèse"}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleToggleWatchlist(selectedPairModal.pair)}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Star size={12} fill={watchlist.includes(selectedPairModal.pair) ? "#07080B" : "none"} />
                  {watchlist.includes(selectedPairModal.pair) ? "Dans mes Favoris" : "Ajouter aux Favoris"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
