"use client";

import React, { useState, useEffect } from "react";
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
  PencilIcon,
} from "@primer/octicons-react";
import {
  AnimatedMetricValue,
  MorphingSplineChart,
} from "@/components/motion/AnimatedNumberAndMorphChart";
import { soundFX } from "@/lib/soundEngine";
import { getCountryFlagUrl, formatPairCountriesFr } from "@/lib/macroFormatters";
import { useAuth } from "@/context/AuthContext";
import { updatePairCustomThesis, resetPairCustomThesis } from "@/data/userCatalogService";
import { TraderPairData } from "./TraderPairCard";

export interface PillarDetail {
  indicator: string;
  differential: number; // e.g. -4 to +4
  weight?: number;
  insight?: string;
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"thesis" | "forecast">("thesis");

  // Admin in-place thesis editing
  const [isEditingThesis, setIsEditingThesis] = useState(false);
  const [editedThesisText, setEditedThesisText] = useState("");

  useEffect(() => {
    if (pairData) {
      setEditedThesisText(pairData.thesis);
      setIsEditingThesis(false);
      setActiveTab("thesis");
    }
  }, [pairData?.pair, pairData?.thesis]);

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

  const handleCopy = () => {
    const text = `ShiftFX Thèse Macro [${pairData.pair}] : Biais ${pairData.regime} (${pairData.score > 0 ? `+${pairData.score}` : pairData.score}%). ${pairData.thesis} Portage: ${pairData.carryText}.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    soundFX.playChime();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveThesis = () => {
    if (!pairData || !editedThesisText.trim()) return;
    updatePairCustomThesis(pairData.pair, editedThesisText.trim());
    setIsEditingThesis(false);
    soundFX.playChime();
  };

  const handleResetThesis = () => {
    if (!pairData) return;
    resetPairCustomThesis(pairData.pair);
    setIsEditingThesis(false);
    soundFX.playPop();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Slide-out Sheet (600px desktop, full mobile) */}
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 350, damping: 35 }}
          className="relative w-full max-w-[600px] h-full bg-[#080A0F] border-l border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/[0.06] bg-[#0A0D14]/80 backdrop-blur">
            <div className="flex items-start justify-between">
              {/* Pair + Flags */}
              <div className="flex items-center gap-3">
                <div className="flex items-center shrink-0">
                  <img
                    src={getCountryFlagUrl(base)}
                    alt={base}
                    className="w-9 h-9 rounded-full ring-2 ring-[#080A0F] z-10 shrink-0"
                  />
                  <img
                    src={getCountryFlagUrl(quote)}
                    alt={quote}
                    className="w-9 h-9 -ml-3 rounded-full ring-2 ring-[#080A0F] z-0 shrink-0"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-2xl font-black text-white tracking-tight">
                      {pairData.pair}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        pairData.tier === "PRO"
                          ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                          : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                      }`}
                    >
                      {pairData.tier}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-slate-400 mt-0.5">
                    {formatPairCountriesFr(pairData.pair)}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Score + Regime Badge (Without Confiance column) */}
            <div className="flex items-baseline justify-between mt-5 pt-4 border-t border-white/[0.05]">
              <div>
                <span className="font-sans text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                  Score Macro Net
                </span>
                <AnimatedMetricValue
                  value={pairData.score}
                  decimals={1}
                  prefix={pairData.score > 0 ? "+" : ""}
                  suffix="%"
                  className={`text-3xl font-mono font-black tabular-nums tracking-tight ${scoreColor}`}
                />
              </div>

              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-sans font-bold uppercase tracking-wider ${regimeBadge}`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: chartAccent }}
                  />
                  {pairData.regime}
                </span>
              </div>
            </div>

            {/* Navigation Tabs inside Drawer (Item 2: Keep Thèse and Horizon) */}
            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-white/[0.05]">
              {[
                { id: "thesis" as const, label: "Thèse & Stratégie" },
                { id: "forecast" as const, label: "Horizon 3M" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setActiveTab(tab.id);
                  }}
                  className={`relative px-3.5 py-1.5 rounded-full font-sans text-xs font-medium transition-colors cursor-pointer ${
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

                {/* Primary Macro Thesis Well (Item 4: Dynamic & Admin-Editable) */}
                <div className="rounded-[20px] bg-[#0A0C12] border border-white/[0.06] p-4.5 relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: chartAccent }}
                  />
                  <div className="pl-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#D4FF00]">
                        Thèse Quantitative ShiftFX
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsEditingThesis(!isEditingThesis)}
                          className="px-2.5 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-[10px] font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <PencilIcon size={11} className="text-[#D4FF00]" />
                          <span>{isEditingThesis ? "Fermer Édition" : "Modifier Thèse (Admin)"}</span>
                        </button>
                      )}
                    </div>

                    {isEditingThesis ? (
                      <div className="mt-2.5 space-y-2.5">
                        <textarea
                          value={editedThesisText}
                          onChange={(e) => setEditedThesisText(e.target.value)}
                          rows={4}
                          className="w-full bg-[#121620] border border-white/[0.12] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#D4FF00]/60 resize-none font-sans leading-relaxed"
                          placeholder="Saisissez la thèse macroéconomique personnalisée pour cette paire..."
                        />
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={handleResetThesis}
                            className="text-[11px] font-sans text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            Réinitialiser au texte calculé par défaut
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingThesis(false);
                                setEditedThesisText(pairData.thesis);
                              }}
                              className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-sans cursor-pointer transition-colors"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveThesis}
                              className="px-3.5 py-1 rounded-full bg-[#D4FF00] hover:bg-[#e0ff33] text-black font-sans font-bold text-xs transition-colors cursor-pointer"
                            >
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="font-sans text-[13px] leading-relaxed text-slate-200 [text-wrap:pretty]">
                        {pairData.thesis}
                      </p>
                    )}
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
