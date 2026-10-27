"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Globe2, CheckCircle2, Search, Flame, Save, ExternalLink, Layers, 
  Lock, Unlock, Eye, EyeOff, Zap, SlidersHorizontal, ShieldCheck, Sparkles, Star
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { playClickSound, playTabSound, playSuccessSound } from "@/lib/soundEffects";
import { 
  getCatalogConfig, saveCatalogConfig, CatalogConfig, getTraderSignals, 
  TraderSignal, CANONICAL_28_PAIRS
} from "@/data/userCatalogService";
import { FXPairFlags, SPRING_SNAPPY } from "@/components/ui/DopaminePrimitives";
import { 
  AdminPageHeader, CatalogueKPICard, SculptedFilterPod, SculptedTableContainer 
} from "@/components/admin/AdminPrimitives";

// Helper to format carry advantage concisely (prevents any text clipping or double parenthesis)
function formatConciseCarry(carry: string): string {
  if (!carry) return "0.0% Carry";
  return carry
    .replace(/\(\(UK\)\)/g, "(UK)")
    .replace(/\(Favors United Kingdom\)/g, "(UK)")
    .replace(/Favors United Kingdom/g, "UK")
    .replace(/\(Favors United States\)/g, "(USA)")
    .replace(/Favors United States/g, "USA")
    .replace(/\(Favors Euro Area\)/g, "(EUR)")
    .replace(/Favors Euro Area/g, "EUR")
    .replace(/\(Favors Japan\)/g, "(JPY)")
    .replace(/Favors Japan/g, "JPY")
    .replace(/\(Favors Australia\)/g, "(AUD)")
    .replace(/Favors Australia/g, "AUD")
    .replace(/\(Favors Canada\)/g, "(CAD)")
    .replace(/Favors Canada/g, "CAD")
    .replace(/\(Favors Switzerland\)/g, "(CHF)")
    .replace(/Favors Switzerland/g, "CHF")
    .replace(/\(Favors New Zealand\)/g, "(NZD)")
    .replace(/Favors New Zealand/g, "NZD")
    .replace(/\(Euro Area\)/g, "(EUR)")
    .replace(/\(United States\)/g, "(USA)")
    .replace(/\(United Kingdom\)/g, "(UK)")
    .replace(/\(Switzerland\)/g, "(CHF)")
    .replace(/\(Japan\)/g, "(JPY)")
    .replace(/\(Australia\)/g, "(AUD)")
    .replace(/\(Canada\)/g, "(CAD)")
    .replace(/\(New Zealand\)/g, "(NZD)")
    .replace(/Carry Advantage/g, "Carry")
    .replace(/Carry Deficit/g, "Carry")
    .replace(/Carry Adv\./g, "Carry")
    .replace(/\(\(/g, "(")
    .replace(/\)\)/g, ")");
}

export default function AdminCatalogPage() {
  const [signals, setSignals] = useState<TraderSignal[]>([]);
  const [config, setConfig] = useState<CatalogConfig | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    const loadedConfig = getCatalogConfig();
    setConfig(loadedConfig);
    const loadedSignals = getTraderSignals();
    setSignals(loadedSignals);
  }, []);

  // Sync internal signals when config changes (Strictly Canonical 28 Pairs)
  const pairsList = useMemo(() => {
    if (!config || signals.length === 0) return [];
    return signals.map((s) => {
      const pConfig = config.pairs[s.pair] || {
        pair: s.pair,
        isPublished: true,
        tier: "pro",
        isTopMover: false
      };
      return {
        ...s,
        isPublished: pConfig.isPublished,
        tier: pConfig.tier,
        isTopMover: pConfig.isTopMover
      };
    });
  }, [signals, config]);

  const totalCanonicalCount = 28;

  // Published count bounded to 28
  const publishedCount = useMemo(() => {
    if (!config) return 28;
    const count = Object.entries(config.pairs).filter(([pair, p]) => 
      CANONICAL_28_PAIRS.includes(pair) && p.isPublished
    ).length;
    return Math.min(totalCanonicalCount, count);
  }, [config]);

  // Hidden count strictly never negative
  const hiddenCount = useMemo(() => {
    return Math.max(0, totalCanonicalCount - publishedCount);
  }, [publishedCount]);

  // Basic vs Pro count
  const basicCount = useMemo(() => {
    if (!config) return 6;
    return Object.entries(config.pairs).filter(([pair, p]) => 
      CANONICAL_28_PAIRS.includes(pair) && p.isPublished && p.tier === "basic"
    ).length;
  }, [config]);

  const proCount = useMemo(() => {
    if (!config) return 22;
    return Object.entries(config.pairs).filter(([pair, p]) => 
      CANONICAL_28_PAIRS.includes(pair) && p.isPublished && p.tier === "pro"
    ).length;
  }, [config]);

  // Top Movers selected count (max 2)
  const topMoversCount = useMemo(() => {
    if (!config) return 2;
    return Object.entries(config.pairs).filter(([pair, p]) => 
      CANONICAL_28_PAIRS.includes(pair) && p.isTopMover
    ).length;
  }, [config]);

  // Toggle Published State
  const handleTogglePublished = (pair: string) => {
    playClickSound();
    if (!config) return;
    const current = config.pairs[pair]?.isPublished ?? true;
    setConfig({
      ...config,
      pairs: {
        ...config.pairs,
        [pair]: {
          ...config.pairs[pair],
          isPublished: !current
        }
      }
    });
    setIsDirty(true);
  };

  // Set Tier for a pair
  const handleSetTier = (pair: string, tier: "basic" | "pro") => {
    playTabSound();
    if (!config) return;
    setConfig({
      ...config,
      pairs: {
        ...config.pairs,
        [pair]: {
          ...config.pairs[pair],
          tier
        }
      }
    });
    setIsDirty(true);
  };

  // Toggle Top Mover (Max 2)
  const handleToggleTopMover = (pair: string) => {
    playClickSound();
    if (!config) return;
    const isCurrent = config.pairs[pair]?.isTopMover ?? false;
    if (!isCurrent && topMoversCount >= 2) {
      alert("Attention: Le ruban supérieur accepte un maximum de 2 paires par jour.");
      return;
    }

    setConfig({
      ...config,
      pairs: {
        ...config.pairs,
        [pair]: {
          ...config.pairs[pair],
          isTopMover: !isCurrent
        }
      }
    });
    setIsDirty(true);
  };

  // Quick Action: Publish All 28 Pairs
  const handlePublishAll = () => {
    playClickSound();
    if (!config) return;
    const updatedPairs = { ...config.pairs };
    CANONICAL_28_PAIRS.forEach(k => {
      if (updatedPairs[k]) updatedPairs[k].isPublished = true;
    });
    setConfig({ ...config, pairs: updatedPairs });
    setIsDirty(true);
  };

  // Quick Action: Auto-Select Top 2 Movers by Absolute Conviction
  const handleAutoSelectTopMovers = () => {
    playSuccessSound();
    if (!config) return;
    const sorted = [...signals].sort((a, b) => Math.abs(b.scoreNum) - Math.abs(a.scoreNum));
    const top2 = [sorted[0]?.pair, sorted[1]?.pair].filter(Boolean);

    const updatedPairs = { ...config.pairs };
    CANONICAL_28_PAIRS.forEach(k => {
      if (updatedPairs[k]) {
        updatedPairs[k].isTopMover = top2.includes(k);
      }
    });
    setConfig({ ...config, pairs: updatedPairs });
    setIsDirty(true);
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
  };

  // Save Configuration to localStorage & emit reactive event
  const handleSave = () => {
    if (!config) return;
    saveCatalogConfig(config);
    setIsDirty(false);
    setSaveSuccess(true);
    playSuccessSound();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return pairsList.filter(row => {
      if (groupFilter !== "ALL" && row.group !== groupFilter) return false;
      if (tierFilter !== "ALL" && row.tier !== tierFilter) return false;
      if (statusFilter === "PUBLISHED" && !row.isPublished) return false;
      if (statusFilter === "HIDDEN" && row.isPublished) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPair = row.pair.toLowerCase().includes(q);
        const matchCountry = row.baseCountry.toLowerCase().includes(q) || row.quoteCountry.toLowerCase().includes(q);
        const matchDriver = row.primaryDriver.toLowerCase().includes(q);
        if (!matchPair && !matchCountry && !matchDriver) return false;
      }
      return true;
    });
  }, [pairsList, groupFilter, tierFilter, statusFilter, searchQuery]);

  return (
    <div className="w-full max-w-[1550px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col text-white">
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. UNIFIED ADMIN PAGE HEADER (Single row utilities, NO duplicate admin) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AdminPageHeader
        eyebrow="PARAMÉTRAGE INSTITUTIONNEL • SHIFTFX ENGINE"
        badgeText="ADMIN"
        title="Catalogue Utilisateur & Plans d'Abonnement"
        searchPlaceholder="Rechercher une paire ou pays..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        rightActions={
          <>
            <Link
              href="/portal"
              className="h-10 px-4 rounded-full bg-[#101218] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] cursor-pointer whitespace-nowrap"
            >
              <Eye size={13} className="text-[#D4FF00]" />
              <span>Portail Trader</span>
              <ExternalLink size={11} className="text-slate-400" />
            </Link>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={!isDirty}
              className={clsx(
                "h-10 px-5 rounded-full text-xs font-bold font-sans transition-all flex items-center gap-2 shadow-lg cursor-pointer whitespace-nowrap",
                isDirty 
                  ? "bg-[#D4FF00] hover:bg-[#dfeb34] text-[#07080C] shadow-[0_0_20px_rgba(212,255,0,0.25)]" 
                  : "bg-[#101218] text-slate-400 cursor-not-allowed border border-white/[0.08]"
              )}
            >
              <Save size={13} />
              <span>{isDirty ? "Sauvegarder" : "Synchronisé"}</span>
            </motion.button>
          </>
        }
      />

      {/* Save Success Banner */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={SPRING_SNAPPY}
            className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono shadow-2xl mb-5"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <span>Catalogue utilisateur sauvegardé avec succès. Les modifications sont instantanément en direct sur le portail trader.</span>
            </div>
            <span className="text-[11px] font-mono opacity-80">{new Date().toLocaleTimeString()}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. KPI ROW (6 Cards with CatalogueKPICard standard)               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-3.5 mb-5">
        {/* Card 1: Catalogue G10 */}
        <CatalogueKPICard
          title="CATALOGUE G10"
          value={28}
          unit="Paires"
          subtitle="Paires canoniques"
          variant="lime"
          icon={<Layers size={14} />}
          bars={[40, 65, 55, 95]}
        />

        {/* Card 2: Publiées */}
        <CatalogueKPICard
          title="PUBLIÉES"
          value={publishedCount}
          unit="Actives"
          subtitle="Visibles au portail"
          variant="emerald"
          icon={<CheckCircle2 size={14} />}
          bars={[50, 75, 80, 100]}
        />

        {/* Card 3: Masquées */}
        <CatalogueKPICard
          title="MASQUÉES"
          value={hiddenCount}
          unit="Filtrées"
          subtitle="Non affichées"
          variant="slate"
          icon={<EyeOff size={14} />}
          bars={[20, 15, 10, Math.max(5, hiddenCount * 10)]}
        />

        {/* Card 4: Plan Basic */}
        <CatalogueKPICard
          title="PLAN BASIC"
          value={basicCount}
          unit="Standard"
          subtitle="Accès gratuit"
          variant="sky"
          icon={<Unlock size={14} />}
          bars={[35, 50, 60, 85]}
        />

        {/* Card 5: Plan Pro */}
        <CatalogueKPICard
          title="PLAN PRO"
          value={proCount}
          unit="Institutionnel"
          subtitle="Réservé abonnés"
          variant="purple"
          icon={<Lock size={14} />}
          bars={[60, 75, 85, 100]}
        />

        {/* Card 6: Top Movers */}
        <CatalogueKPICard
          title="TOP MOVERS"
          value={`${topMoversCount} / 2`}
          unit="Max"
          subtitle="Ruban vedette"
          variant="lime"
          icon={<Flame size={14} />}
          customRightFooter={
            <div className="flex items-center gap-1.5 h-4 shrink-0">
              <span className={clsx("w-2 h-2 rounded-full transition-all", topMoversCount >= 1 ? "bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.8)]" : "bg-white/10")} />
              <span className={clsx("w-2 h-2 rounded-full transition-all", topMoversCount >= 2 ? "bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.8)]" : "bg-white/10")} />
            </div>
          }
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. SCULPTED FILTER POD                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SculptedFilterPod>
        <div className="flex flex-col gap-3.5">
          {/* Row 1: Search + Quick Action Buttons */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 border-b border-white/[0.05]">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer par paire, pays ou moteur macro..."
                className="w-full h-9 pl-9 pr-8 rounded-full bg-[#0A0B0F] border border-white/[0.06] text-xs font-sans text-white placeholder-slate-500 focus:outline-none focus:border-[#D4FF00]/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePublishAll}
                className="rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-1.5 text-xs font-mono text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors whitespace-nowrap cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                Tout Publier (28)
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAutoSelectTopMovers}
                className="rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/40 text-[#D4FF00] hover:bg-[#D4FF00]/25 px-4 py-1.5 text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-[0_0_15px_rgba(212,255,0,0.15)]"
              >
                <Zap size={12} />
                Auto Top Movers
              </motion.button>
            </div>
          </div>

          {/* Row 2: Secondary Category Pills & Segmented Tracks */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Univers Quick-Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
              <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-slate-400 mr-2 shrink-0">
                UNIVERS:
              </span>
              {["ALL", "EUR", "GBP", "USD", "JPY", "CROSS"].map((grp) => (
                <button
                  key={grp}
                  onClick={() => { setGroupFilter(grp); playTabSound(); }}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap",
                    groupFilter === grp
                      ? "bg-[#D4FF00] text-[#07080C] font-bold shadow-[0_0_15px_rgba(212,255,0,0.3)]"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {grp === "ALL" ? "Tous" : grp}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Plan Filter Track */}
              <div className="rounded-full bg-[#0A0B0F] border border-white/[0.06] px-2 py-1 inline-flex items-center gap-1 text-xs font-mono">
                <span className="text-slate-500 px-1 text-[11px]">Plan:</span>
                {["ALL", "basic", "pro"].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTierFilter(t); playTabSound(); }}
                    className={clsx(
                      "px-2.5 py-0.5 rounded-full capitalize transition-colors cursor-pointer",
                      tierFilter === t ? "bg-white/[0.12] text-white font-semibold" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {t === "ALL" ? "Tous" : t}
                  </button>
                ))}
              </div>

              {/* Status Filter Track */}
              <div className="rounded-full bg-[#0A0B0F] border border-white/[0.06] px-2 py-1 inline-flex items-center gap-1 text-xs font-mono">
                <span className="text-slate-500 px-1 text-[11px]">Statut:</span>
                {[
                  { key: "ALL", label: "Tous" },
                  { key: "PUBLISHED", label: "Publiées" },
                  { key: "HIDDEN", label: "Masquées" }
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => { setStatusFilter(s.key); playTabSound(); }}
                    className={clsx(
                      "px-2.5 py-0.5 rounded-full transition-colors cursor-pointer",
                      statusFilter === s.key ? "bg-white/[0.12] text-white font-semibold" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SculptedFilterPod>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. MAIN DATA TABLE (Explicit column widths, zero clipping)         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SculptedTableContainer className="pb-3">
        <div className="overflow-x-auto w-full">
          <table className="w-full table-fixed border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] h-11 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                <th className="w-[20%] text-left pl-6 pr-3">PAIRE FX</th>
                <th className="w-[13%] text-center px-3">SCORE MACRO</th>
                <th className="w-[14%] text-center px-3">PUBLICATION</th>
                <th className="w-[16%] text-center px-3">ATTRIBUTION TIER</th>
                <th className="w-[14%] text-center px-3">RUBAN TOP MOVER</th>
                <th className="w-[23%] text-left pr-6 pl-3">JUSTIFICATION MACRO</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.03]">
              {filteredRows.map((row) => {
                const isBull = row.bias === "BULLISH";
                const isBear = row.bias === "BEARISH";

                return (
                  <tr 
                    key={row.pair}
                    className={clsx(
                      "h-16 transition-colors",
                      row.isPublished ? "hover:bg-white/[0.02]" : "bg-black/25 opacity-55 hover:opacity-80"
                    )}
                  >
                    {/* Col 1 (20%): FX Pair + HatScripts Vector Flags */}
                    <td className="pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <FXPairFlags pair={row.pair} size="md" />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-bold text-sm text-white">{row.pair}</span>
                            <span className="text-[9px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.2 rounded-full uppercase">
                              {row.group}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {row.baseCountry} / {row.quoteCountry}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Col 2 (13%): Macro Score (Centered, tabular-nums) */}
                    <td className="px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className={clsx(
                          "font-mono font-bold text-sm tabular-nums",
                          isBull ? "text-emerald-400" : isBear ? "text-rose-400" : "text-slate-300"
                        )}>
                          {row.scorePct}
                        </span>
                        <span className={clsx(
                          "rounded-full px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider mt-0.5 border",
                          isBull ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          isBear ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          "bg-slate-400/10 text-slate-400 border-slate-400/20"
                        )}>
                          {row.biasFrench}
                        </span>
                      </div>
                    </td>

                    {/* Col 3 (14%): Publication Toggle (Centered emerald pill) */}
                    <td className="px-3 text-center">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleTogglePublished(row.pair)}
                        className={clsx(
                          "inline-flex items-center gap-1.5 h-7 px-3.5 rounded-full text-xs font-mono transition-all cursor-pointer border whitespace-nowrap shadow-sm",
                          row.isPublished
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            : "bg-white/[0.03] text-slate-500 border-white/[0.08] hover:text-white"
                        )}
                      >
                        <span className={clsx("w-1.5 h-1.5 rounded-full", row.isPublished ? "bg-emerald-400 animate-pulse" : "bg-slate-600")} />
                        <span>{row.isPublished ? "Publié" : "Masqué"}</span>
                      </motion.button>
                    </td>

                    {/* Col 4 (16%): Attribution Tier (Centered sliding pill switcher) */}
                    <td className="px-3 text-center">
                      <div className="rounded-full bg-[#0A0B0F] border border-white/[0.07] p-0.5 inline-flex items-center text-xs font-mono">
                        <button
                          onClick={() => handleSetTier(row.pair, "basic")}
                          className={clsx(
                            "px-3 py-0.5 rounded-full transition-all cursor-pointer",
                            row.tier === "basic"
                              ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30 shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                              : "text-slate-400 hover:text-white"
                          )}
                        >
                          Basic
                        </button>
                        <button
                          onClick={() => handleSetTier(row.pair, "pro")}
                          className={clsx(
                            "px-3 py-0.5 rounded-full transition-all cursor-pointer",
                            row.tier === "pro"
                              ? "bg-purple-500/25 text-purple-300 font-bold border border-purple-400/30 shadow-[0_0_14px_rgba(168,85,247,0.25)]"
                              : "text-slate-400 hover:text-white"
                          )}
                        >
                          Pro
                        </button>
                      </div>
                    </td>

                    {/* Col 5 (14%): Top Mover Checkbox (Centered button) */}
                    <td className="px-3 text-center">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleToggleTopMover(row.pair)}
                        className={clsx(
                          "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-mono transition-all cursor-pointer border whitespace-nowrap",
                          row.isTopMover
                            ? "bg-[#D4FF00]/15 text-[#D4FF00] border-[#D4FF00]/40 font-bold shadow-[0_0_15px_rgba(212,255,0,0.2)]"
                            : "bg-white/[0.04] text-slate-400 border-white/[0.07] hover:text-white"
                        )}
                      >
                        <Flame size={12} className={row.isTopMover ? "text-[#D4FF00] fill-[#D4FF00]" : "text-slate-500"} />
                        <span>{row.isTopMover ? "En Avant ★" : "Standard"}</span>
                      </motion.button>
                    </td>

                    {/* Col 6 (23%): Justification Macro (2 Clean Lines, Side-by-Side Pills, Zero Clipping) */}
                    <td className="pr-6 pl-3">
                      <div className="flex flex-col min-w-0">
                        {/* Line 1: Macro summary */}
                        <span className="text-xs text-slate-300 truncate max-w-[260px] leading-snug">
                          {row.primaryDriver}
                        </span>
                        {/* Line 2: Both pills side-by-side on the same line */}
                        <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/25 text-[#D4FF00] px-2.5 py-0.5 text-[10px] font-mono tabular-nums whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] shrink-0" />
                            {formatConciseCarry(row.carryAdvantage)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 px-2 py-0.5 text-[10px] font-mono tabular-nums whitespace-nowrap">
                            {row.confidence}% Confiance
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SculptedTableContainer>

    </div>
  );
}
