"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon,
  ArrowRightIcon,
  DatabaseIcon,
  SlidersIcon,
  PulseIcon,
  GlobeIcon,
  SyncIcon,
  GraphIcon,
  GearIcon,
  StackIcon,
  XIcon,
} from "@primer/octicons-react";
import { SPRING_WEIGHTLESS } from "@/lib/uxEngineeringStandards";

interface SovereignPair {
  type: "pair";
  pair: string;
  name: string;
  score: string;
  regime: "ACHETEUR" | "VENDEUR" | "NEUTRE";
  positive: boolean;
  href: string;
}

interface MacroIndicator {
  type: "indicator";
  name: string;
  category: string;
  source: string;
  href: string;
}

interface SystemCommand {
  type: "command";
  label: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
}

type PaletteItem = SovereignPair | MacroIndicator | SystemCommand;

const QUICK_PAIRS: SovereignPair[] = [
  { type: "pair", pair: "GBP/CHF", name: "Royaume-Uni / Suisse", score: "+6.9%", regime: "ACHETEUR", positive: true, href: "/admin/final-score" },
  { type: "pair", pair: "EUR/CHF", name: "Zone Euro / Suisse", score: "+6.7%", regime: "ACHETEUR", positive: true, href: "/admin/final-score" },
  { type: "pair", pair: "EUR/JPY", name: "Zone Euro / Japon", score: "-5.3%", regime: "VENDEUR", positive: false, href: "/admin/final-score" },
  { type: "pair", pair: "CAD/JPY", name: "Canada / Japon", score: "-5.0%", regime: "VENDEUR", positive: false, href: "/admin/final-score" },
  { type: "pair", pair: "EUR/USD", name: "Zone Euro / États-Unis", score: "-1.9%", regime: "VENDEUR", positive: false, href: "/admin/final-score" },
  { type: "pair", pair: "GBP/USD", name: "Royaume-Uni / États-Unis", score: "+0.9%", regime: "NEUTRE", positive: true, href: "/admin/final-score" },
  { type: "pair", pair: "USD/JPY", name: "États-Unis / Japon", score: "-1.4%", regime: "VENDEUR", positive: false, href: "/admin/final-score" },
  { type: "pair", pair: "AUD/USD", name: "Australie / États-Unis", score: "-0.8%", regime: "NEUTRE", positive: false, href: "/admin/final-score" },
];

const MACRO_INDICATORS: MacroIndicator[] = [
  { type: "indicator", name: "IPC (Inflation Harmonisée)", category: "Prix & Pouvoir d'Achat", source: "BLS / Eurostat / ONS", href: "/admin/macro-data" },
  { type: "indicator", name: "Taux Directeurs Souverains", category: "Politique Monétaire", source: "Fed / BCE / BoE / BoJ", href: "/admin/macro-data" },
  { type: "indicator", name: "Croissance PIB (Trimestriel)", category: "Activité Économique", source: "BEA / Eurostat / Cabinet Office", href: "/admin/macro-data" },
  { type: "indicator", name: "Réserves FX & Balance Courante", category: "Vulnérabilité Extérieure", source: "FMI SDMX 3.0", href: "/admin/macro-data" },
];

export function CommandPaletteModal({
  open,
  setOpen,
  onSyncMacro,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSyncMacro?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keydown listener to intercept native Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!open);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [open, setOpen]);

  // Focus input & warm up route caches when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      router.prefetch("/admin/final-score");
      router.prefetch("/admin/macro-data");
      router.prefetch("/admin/dashboard");
      router.prefetch("/admin/analytics");
      router.prefetch("/admin/rating-rules");
      router.prefetch("/admin/catalog");
      router.prefetch("/admin/settings");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, router]);

  const SYSTEM_COMMANDS: SystemCommand[] = useMemo(
    () => [
      { type: "command", label: "Ouvrir Catalogue Utilisateur", icon: GlobeIcon, href: "/admin/catalog" },
      { type: "command", label: "Matrice Score Final (12M)", icon: PulseIcon, href: "/admin/final-score" },
      { type: "command", label: "Calibrer Règles de Notation", icon: SlidersIcon, href: "/admin/rating-rules" },
      { type: "command", label: "Tableau de Bord Exécutif", icon: GraphIcon, href: "/admin/dashboard" },
      { type: "command", label: "Paramètres & Architecture Moteur", icon: GearIcon, href: "/admin/settings" },
      {
        type: "command",
        label: "Forcer Synchronisation Macro (BCE/Fed)",
        icon: SyncIcon,
        action: () => {
          if (onSyncMacro) onSyncMacro();
        },
      },
    ],
    [onSyncMacro]
  );

  const filteredPairs = useMemo(() => {
    if (!query) return QUICK_PAIRS;
    const q = query.toLowerCase();
    return QUICK_PAIRS.filter(
      (p) => p.pair.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredIndicators = useMemo(() => {
    if (!query) return MACRO_INDICATORS;
    const q = query.toLowerCase();
    return MACRO_INDICATORS.filter(
      (ind) =>
        ind.name.toLowerCase().includes(q) ||
        ind.category.toLowerCase().includes(q) ||
        ind.source.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredCommands = useMemo(() => {
    if (!query) return SYSTEM_COMMANDS;
    const q = query.toLowerCase();
    return SYSTEM_COMMANDS.filter((cmd) => cmd.label.toLowerCase().includes(q));
  }, [query, SYSTEM_COMMANDS]);

  const flatItems: PaletteItem[] = useMemo(() => {
    return [...filteredPairs, ...filteredIndicators, ...filteredCommands];
  }, [filteredPairs, filteredIndicators, filteredCommands]);

  const handleSelectItem = (item: PaletteItem) => {
    setOpen(false);
    if ("href" in item && item.href) {
      if (item.href.startsWith("/admin")) {
        window.dispatchEvent(new CustomEvent("shiftfx-navigate", { detail: item.href }));
      } else {
        router.push(item.href);
      }
    } else if ("action" in item && item.action) {
      item.action();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[selectedIndex];
      if (item) handleSelectItem(item);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[13vh] px-3 sm:px-4">
          {/* Blurred Obsidian Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Raycast-Style Command Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={SPRING_WEIGHTLESS}
            className="relative z-10 w-full max-w-[640px] rounded-[24px] bg-[#0D1017]/95 border border-white/[0.10] shadow-[0_32px_80px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden backdrop-blur-2xl text-white"
          >
            {/* Top Search Bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
              <SearchIcon size={16} className="text-[#D4FF00] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Rechercher une paire G10, un indicateur macro ou une commande..."
                className="w-full bg-transparent font-sans text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                onClick={() => setOpen(false)}
                className="px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] font-mono text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Results Body */}
            <div className="max-h-[380px] overflow-y-auto p-3 space-y-4 no-scrollbar">
              {flatItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-sans text-xs">
                  Aucun résultat pour "{query}". Essayez un ticker (ex: GBP/CHF, EUR, IPC, ou Taux).
                </div>
              ) : (
                <>
                  {/* Group 1: Sovereign Pairs */}
                  {filteredPairs.length > 0 && (
                    <div>
                      <p className="px-3 pb-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 [text-wrap:balance]">
                        Paires Souveraines G10 — Haute Conviction
                      </p>
                      <div className="space-y-1">
                        {filteredPairs.map((item) => {
                          const itemIndex = flatItems.indexOf(item);
                          const isSelected = itemIndex === selectedIndex;

                          return (
                            <button
                              key={item.pair}
                              onClick={() => handleSelectItem(item)}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-colors group text-left cursor-pointer ${
                                isSelected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-display text-sm font-bold text-white tracking-tight whitespace-nowrap">
                                  {item.pair}
                                </span>
                                <span className="font-sans text-xs text-slate-400 truncate">
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span
                                  className={`font-mono text-xs font-bold tabular-nums ${
                                    item.positive ? "text-emerald-400" : "text-rose-400"
                                  }`}
                                >
                                  {item.score}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-sans text-[10px] font-bold ${
                                    item.positive
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : "bg-rose-500/15 text-rose-400"
                                  }`}
                                >
                                  {item.regime}
                                </span>
                                <ArrowRightIcon size={14} className="text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Group 2: Macro Indicators */}
                  {filteredIndicators.length > 0 && (
                    <div>
                      <p className="px-3 pb-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 [text-wrap:balance]">
                        Indicateurs Macroéconomiques Fondamentaux
                      </p>
                      <div className="space-y-1">
                        {filteredIndicators.map((ind) => {
                          const itemIndex = flatItems.indexOf(ind);
                          const isSelected = itemIndex === selectedIndex;

                          return (
                            <button
                              key={ind.name}
                              onClick={() => handleSelectItem(ind)}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-colors group text-left cursor-pointer ${
                                isSelected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <DatabaseIcon size={15} className="text-[#D4FF00] shrink-0" />
                                <div className="leading-tight truncate">
                                  <p className="font-sans text-xs font-semibold text-white truncate">{ind.name}</p>
                                  <p className="font-sans text-[11px] text-slate-400 truncate">{ind.category}</p>
                                </div>
                              </div>
                              <span className="font-sans text-[11px] text-slate-500 shrink-0">
                                {ind.source}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Group 3: Navigation & Engine Commands */}
                  {filteredCommands.length > 0 && (
                    <div>
                      <p className="px-3 pb-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 [text-wrap:balance]">
                        Navigation & Commandes Moteur
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {filteredCommands.map((cmd) => {
                          const itemIndex = flatItems.indexOf(cmd);
                          const isSelected = itemIndex === selectedIndex;
                          const CmdIcon = cmd.icon;

                          return (
                            <button
                              key={cmd.label}
                              onClick={() => handleSelectItem(cmd)}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer text-left ${
                                isSelected
                                  ? "bg-white/[0.08] border-white/[0.15] text-white"
                                  : "bg-white/[0.02] hover:bg-white/[0.07] border-white/[0.05] text-slate-300 hover:text-white"
                              }`}
                            >
                              <CmdIcon size={15} className="text-[#D4FF00] shrink-0" />
                              <span className="font-sans text-xs font-medium truncate">{cmd.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Keybinding Legend */}
            <div className="px-5 py-2.5 bg-black/40 border-t border-white/[0.06] flex items-center justify-between font-mono text-[11px] text-slate-500 tabular-nums">
              <span className="font-sans truncate">ShiftFX Quantitative Command Engine</span>
              <div className="flex items-center gap-3 shrink-0">
                <span>↑↓ Naviguer</span>
                <span>↵ Ouvrir</span>
                <span>ESC Fermer</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
