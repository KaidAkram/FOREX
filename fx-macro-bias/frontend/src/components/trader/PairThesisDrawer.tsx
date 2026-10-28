"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XIcon,
  StarIcon,
  StarFillIcon,
  CopyIcon,
  CheckIcon,
  ZapIcon,
  CalendarIcon,
  GraphIcon,
  ShareIcon,
} from "@primer/octicons-react";
import {
  AnimatedMetricValue,
  MorphingSplineChart,
} from "@/components/motion/AnimatedNumberAndMorphChart";
import { soundFX } from "@/lib/soundEngine";
import { getCountryFlagUrl, formatPairCountriesFr } from "@/lib/macroFormatters";
import { TraderPairData } from "./TraderPairCard";

export interface PillarDetail {
  indicator: string;
  differential: number; // e.g. -4 to +4
  weight?: number;
  insight?: string;
}

const indicatorFrMap: Record<string, string> = {
  "GDP": "PIB (Croissance Réelle)",
  "Current Account": "Balance Courante",
  "CPI": "Inflation IPC",
  "Interest Rate": "Taux Directeurs",
  "FX Reserve": "Réserves FX de Change",
  "Equity": "Dynamique Actions",
};

function getDefaultPillars(
  base: string,
  quote: string,
  isBull: boolean,
  isBear: boolean,
  carryText: string
): PillarDetail[] {
  return [
    {
      indicator: "PIB (Croissance Réelle)",
      differential: isBull ? 3 : isBear ? -3 : 0,
      weight: 16.67,
      insight: isBull
        ? `Expansion économique supérieure dans la zone ${base}.`
        : isBear
        ? `Ralentissement économique relatif dans la zone ${base} face à ${quote}.`
        : "Croissance économique synchronisée entre les deux zones.",
    },
    {
      indicator: "Balance Courante",
      differential: isBull ? 2 : isBear ? -2 : 0,
      weight: 16.67,
      insight: isBull
        ? `Excédent commercial et flux structurels de capitaux favorables à ${base}.`
        : isBear
        ? `Déficit extérieur pesant sur les termes de l'échange de ${base}.`
        : "Équilibre extérieur sans pression asymétrique majeure.",
    },
    {
      indicator: "Inflation IPC",
      differential: isBull ? 1 : isBear ? -3 : -1,
      weight: 16.67,
      insight: "Différentiel de dynamique des prix orientant les anticipations de politique monétaire.",
    },
    {
      indicator: "Taux Directeurs",
      differential: isBull ? 4 : isBear ? -4 : 1,
      weight: 16.67,
      insight: carryText,
    },
    {
      indicator: "Réserves FX de Change",
      differential: isBull ? 2 : isBear ? -1 : 0,
      weight: 16.67,
      insight: "Capacité d'intervention souveraine et solidité bilantielle de la banque centrale.",
    },
    {
      indicator: "Dynamique Actions",
      differential: isBull ? 1 : isBear ? -2 : 0,
      weight: 16.67,
      insight: "Performance relative des indices actions et appétit institutionnel pour le risque.",
    },
  ];
}

export function PairThesisDrawer({
  isOpen,
  pairData,
  onClose,
  onToggleFavorite,
}: {
  isOpen: boolean;
  pairData: TraderPairData | null;
  onClose: () => void;
  onToggleFavorite?: (pair: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"thesis" | "pillars" | "forecast">("thesis");

  if (!isOpen || !pairData) return null;

  const [base, quote] = pairData.pair.split("/");
  const isBull = pairData.regime === "ACHETEUR";
  const isBear = pairData.regime === "VENDEUR";

  // STRICT 3-REGIME COLOR LAW
  const scoreColor = isBull
    ? "text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]"
    : isBear
    ? "text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]"
    : "text-slate-100";

  const chartAccent = isBull ? "#10B981" : isBear ? "#F43F5E" : "#94A3B8";

  const regimeBadge = isBull
    ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-400"
    : isBear
    ? "bg-rose-500/12 border-rose-500/30 text-rose-400"
    : "bg-white/[0.05] border-white/[0.1] text-slate-300";

  // Radial confidence ring
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pairData.confidence / 100) * circumference;

  const rawPillars = pairData.rawSignal?.pillars || [];
  const pillars: PillarDetail[] =
    rawPillars.length === 6
      ? rawPillars.map((p: any) => ({
          indicator: indicatorFrMap[p.indicator] || p.indicator,
          differential: p.differential,
          weight: p.weight || 16.67,
          insight: p.insight,
        }))
      : getDefaultPillars(base, quote, isBull, isBear, pairData.carryText);



  const handleCopy = () => {
    const text = `ShiftFX Thèse Macro [${pairData.pair}] : Biais ${pairData.regime} (${pairData.score > 0 ? `+${pairData.score}` : pairData.score}%). Confiance: ${pairData.confidence}%. ${pairData.thesis} Portage: ${pairData.carryText}.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    soundFX.playChime();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            soundFX.playPop();
            onClose();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        />

        {/* Luxury Glass Slide-Over Drawer */}
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.6 }}
          className="relative z-10 w-full max-w-[560px] h-full bg-[#0A0D14]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-[-25px_0_60px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/[0.06] bg-[#07090E]/60">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center shrink-0">
                  <img
                    src={getCountryFlagUrl(base)}
                    alt={base}
                    className="w-10 h-10 rounded-full ring-2 ring-[#0A0D14] z-10 shrink-0"
                  />
                  <img
                    src={getCountryFlagUrl(quote)}
                    alt={quote}
                    className="w-10 h-10 -ml-3.5 rounded-full ring-2 ring-[#0A0D14] z-0 shrink-0"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-2xl font-black text-white tracking-tight leading-none">
                      {pairData.pair}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        pairData.tier === "PRO"
                          ? "bg-purple-500/15 border-purple-400/30 text-purple-300"
                          : "bg-sky-500/15 border-sky-400/30 text-sky-300"
                      }`}
                    >
                      {pairData.tier}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-slate-400 mt-1">
                    {pairData.countriesFr}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    onClose();
                  }}
                  className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Score & Regime & Confidence Hero Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0F131C] border border-white/[0.07] shadow-inner">
              <div>
                <span className="block font-sans text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Score Macro Net
                </span>
                <AnimatedMetricValue
                  value={pairData.score}
                  decimals={1}
                  prefix={pairData.score > 0 ? "+" : ""}
                  suffix="%"
                  className={`text-3xl font-mono font-extrabold tracking-tight tabular-nums ${scoreColor}`}
                />
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`px-3 py-1 rounded-full border text-xs font-sans font-bold tracking-wider uppercase flex items-center gap-1.5 ${regimeBadge}`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: chartAccent }}
                  />
                  {pairData.regime}
                </span>

                <div className="flex items-center gap-1.5" title="Confiance du modèle">
                  <svg className="w-4 h-4 -rotate-90" viewBox="0 0 22 22">
                    <circle
                      cx="11"
                      cy="11"
                      r={radius}
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="11"
                      cy="11"
                      r={radius}
                      fill="none"
                      stroke={chartAccent}
                      strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="font-mono text-xs text-slate-300 tabular-nums">
                    {pairData.confidence}% Confiance
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs inside Drawer */}
            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-white/[0.05]">
              {[
                { id: "thesis" as const, label: "Thèse & Stratégie" },
                { id: "pillars" as const, label: "Preuve Mathématique (6 Piliers)" },
                { id: "forecast" as const, label: "Horizon 3M" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setActiveTab(tab.id);
                  }}
                  className={`relative px-3 py-1.5 rounded-full font-sans text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="drawer-active-tab"
                      className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.1] -z-0"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "thesis" && (
              <motion.div
                key="tab-thesis"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* Historical + Forecast Scrubbing Spline Chart */}
                <div className="rounded-[20px] bg-[#0E1119] border border-white/[0.06] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-sans text-xs font-bold text-white flex items-center gap-1.5">
                      <GraphIcon size={14} className="text-[#D4FF00]" />
                      Dynamique Macro (6 Derniers Mois)
                    </span>
                    <span className="font-sans text-[11px] text-slate-400">
                      Survolez pour explorer
                    </span>
                  </div>
                  <div className="w-full pt-2">
                    <MorphingSplineChart
                      data={pairData.sparkline}
                      accentColor={chartAccent}
                      height={90}
                    />
                  </div>
                </div>

                {/* Primary Macro Thesis Well */}
                <div className="rounded-[20px] bg-[#0A0C12] border border-white/[0.06] p-4.5 relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: chartAccent }}
                  />
                  <div className="pl-2">
                    <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#D4FF00] block mb-1">
                      Thèse Quantitative ShiftFX
                    </span>
                    <p className="font-sans text-[13px] leading-relaxed text-slate-200 [text-wrap:pretty]">
                      {pairData.thesis}
                    </p>
                  </div>
                </div>

                {/* Carry & Central Bank Card */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] bg-[#0E1119] border border-white/[0.06] p-4">
                    <span className="font-sans text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
                      <ZapIcon className="text-[#D4FF00]" size={13} />
                      Rendement de Portage
                    </span>
                    <span className="font-mono text-base font-bold text-white tabular-nums">
                      {pairData.carryText}
                    </span>
                  </div>

                  <div className="rounded-[18px] bg-[#0E1119] border border-white/[0.06] p-4">
                    <span className="font-sans text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
                      <CalendarIcon size={13} />
                      Prochaine Décision
                    </span>
                    <span className="font-sans text-sm font-semibold text-white">
                      14 jours <span className="font-sans text-xs text-slate-400 font-normal">(Statut Neutre)</span>
                    </span>
                  </div>
                </div>

                {/* Strategic Execution Protocol */}
                <div className="rounded-[18px] bg-[#0E1119] border border-white/[0.06] p-4">
                  <span className="font-sans text-xs font-bold text-white block mb-1.5">
                    Protocole d&apos;Exécution Conseillé
                  </span>
                  <p className="font-sans text-xs text-slate-300 leading-relaxed">
                    {pairData.rawSignal?.executionStrategy ||
                      (isBull
                        ? `Accumulation acheteuse sur replis vers les supports institutionnels H4 avec overlay de portage positif.`
                        : isBear
                        ? `Vente sur rebonds tactiques vers les résistances majeures avec cible sur les creux trimestriels.`
                        : `Stratégie de retour à la moyenne entre les bornes de volatilité standard. Éviter le suivi de tendance.`)}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "pillars" && (
              <motion.div
                key="tab-pillars"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="font-sans text-xs font-semibold text-slate-400">
                    Décomposition Macro (Pondération Égale 16.67%)
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    Axe Différentiel (-10 à +10)
                  </span>
                </div>

                {pillars.map((pil, idx) => {
                  const isPPos = pil.differential > 0;
                  const isPNeg = pil.differential < 0;
                  const fillPct = Math.min(50, (Math.abs(pil.differential) / 5) * 50);

                  const barColor = isPPos ? "#10B981" : isPNeg ? "#F43F5E" : "#94A3B8";

                  return (
                    <div
                      key={pil.indicator + idx}
                      className="rounded-[18px] bg-[#0E1119] border border-white/[0.06] p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-display text-sm font-bold text-white">
                          {pil.indicator}
                        </span>
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded tabular-nums ${
                            isPPos
                              ? "bg-emerald-500/15 text-emerald-400"
                              : isPNeg
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-white/[0.04] text-slate-300"
                          }`}
                        >
                          {pil.differential > 0 ? `+${pil.differential}` : pil.differential}
                        </span>
                      </div>

                      {/* Center-Zero Diverging Bar */}
                      <div className="relative h-2 w-full rounded-full bg-white/[0.06] overflow-hidden my-2.5">
                        <span className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30 z-10" />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${fillPct}%` }}
                          transition={{ type: "spring", stiffness: 300, damping: 25, delay: idx * 0.04 }}
                          style={{
                            backgroundColor: barColor,
                            left: isPPos ? "50%" : `${50 - fillPct}%`,
                          }}
                          className="absolute top-0 bottom-0 rounded-full"
                        />
                      </div>

                      {pil.insight && (
                        <p className="font-sans text-[12px] text-slate-400 leading-relaxed mt-1">
                          {pil.insight}
                        </p>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === "forecast" && (
              <motion.div
                key="tab-forecast"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-3 gap-3">
                  {pairData.forecast3M.map((fc) => {
                    const isFPos = fc.val >= 20;
                    const isFNeg = fc.val <= -20;
                    return (
                      <div
                        key={fc.month}
                        className="rounded-[18px] bg-[#0E1119] border border-white/[0.06] p-4 text-center flex flex-col items-center justify-between min-h-[110px]"
                      >
                        <span className="font-sans text-xs text-slate-400 font-medium">
                          {fc.month}
                        </span>
                        <span
                          className={`font-mono text-xl font-black tabular-nums my-1.5 ${
                            isFPos ? "text-emerald-400" : isFNeg ? "text-rose-400" : "text-slate-100"
                          }`}
                        >
                          {fc.val > 0 ? `+${fc.val.toFixed(1)}%` : `${fc.val.toFixed(1)}%`}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-sans font-bold uppercase tracking-wider ${
                            isFPos
                              ? "bg-emerald-500/15 text-emerald-400"
                              : isFNeg
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-white/[0.04] text-slate-400"
                          }`}
                        >
                          {isFPos ? "ACHETEUR" : isFNeg ? "VENDEUR" : "NEUTRE"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[18px] bg-[#0E1119] border border-white/[0.06] p-4">
                  <span className="font-sans text-xs font-bold text-white block mb-2">
                    Trajectoire Estimée à 90 Jours
                  </span>
                  <div className="w-full pt-1">
                    <MorphingSplineChart
                      data={pairData.forecast3M.map((f) => f.val)}
                      labels={pairData.forecast3M.map((f) => f.month)}
                      accentColor={chartAccent}
                      height={90}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-5 border-t border-white/[0.06] bg-[#07090E]/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-sans font-semibold text-slate-200 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckIcon size={14} className="text-[#D4FF00]" />
                  <span>Thèse Copiée !</span>
                </>
              ) : (
                <>
                  <CopyIcon size={14} />
                  <span>Copier la Thèse</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (pairData.isFavorite) soundFX.playPop();
                else soundFX.playChime();
                onToggleFavorite?.(pairData.pair);
              }}
              className={`h-10 px-5 rounded-full border text-xs font-sans font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                pairData.isFavorite
                  ? "bg-[#D4FF00] text-black border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.3)]"
                  : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-200"
              }`}
            >
              {pairData.isFavorite ? (
                <>
                  <StarFillIcon size={14} />
                  <span>Favori</span>
                </>
              ) : (
                <>
                  <StarIcon size={14} />
                  <span>Ajouter aux Favoris</span>
                </>
              )}
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
