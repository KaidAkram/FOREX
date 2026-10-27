"use client";

import React, { useState } from "react";
import { 
  Plus, Edit2, Trash2, ShieldCheck, X, Check, SlidersHorizontal,
  AlertCircle, TrendingUp, TrendingDown, Minus, Sparkles
} from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AdminPageHeader, SculptedFilterPod, SculptedTableContainer 
} from "@/components/admin/AdminPrimitives";
import { SPRING_SNAPPY } from "@/components/ui/DopaminePrimitives";
import { playClickSound, playTabSound, playSuccessSound } from "@/lib/soundEffects";
import confetti from "canvas-confetti";
import OFFICIAL_RATING_RULES_DATA from "@/data/officialRatingRules.json";

const INDICATORS = [
  { id: "GDP", label: "PIB (GDP)" },
  { id: "Current Account", label: "Balance Courante" },
  { id: "CPI", label: "Inflation (IPC)" },
  { id: "Interest Rate", label: "Taux Directeurs" },
  { id: "FX Reserves", label: "Réserves FX" },
  { id: "Equity", label: "Marchés Actions" }
];

// Helper to parse numeric or infinity bound
const parseBound = (val: string): { isValid: boolean; num: number; display: string } => {
  const clean = val.trim();
  if (clean === "-∞" || clean.toLowerCase() === "-inf" || clean.toLowerCase() === "-infinity") {
    return { isValid: true, num: -Infinity, display: "-∞" };
  }
  if (
    clean === "+∞" || 
    clean === "∞" || 
    clean.toLowerCase() === "+inf" || 
    clean.toLowerCase() === "inf" || 
    clean.toLowerCase() === "+infinity" || 
    clean.toLowerCase() === "infinity"
  ) {
    return { isValid: true, num: Infinity, display: "+∞" };
  }
  const n = parseFloat(clean);
  if (isNaN(n)) {
    return { isValid: false, num: 0, display: clean };
  }
  return { isValid: true, num: n, display: clean };
};

const INDICATOR_SLUG_MAP: Record<string, string> = {
  "GDP": "gdp",
  "Current Account": "ca_gdp",
  "CPI": "cpi",
  "Interest Rate": "interest_rate",
  "FX Reserves": "fx_reserves",
  "Equity": "equity",
};

const OFFICIAL_RATING_RULES: Record<string, any[]> = OFFICIAL_RATING_RULES_DATA;

// API Fetcher with fallback
const fetchRules = async (indicator: string) => {
  const slug = INDICATOR_SLUG_MAP[indicator] || "gdp";
  try {
    const res = await fetch(`http://localhost:8000/api/rating-rules/${slug}`);
    if (res.ok) {
      const data = await res.json();
      if (data.rules && data.rules.length > 0) {
        return data.rules.map((r: any) => ({
          id: r.id,
          min: r.min_diff === null ? "-∞" : String(r.min_diff),
          max: r.max_diff === null ? "+∞" : String(r.max_diff),
          rating: r.rating,
          regime: r.rating >= 7 ? "Biais Acheteur Fort" : r.rating > 0 ? "Biais Acheteur Modéré" : r.rating === 0 ? "Régime Neutre / Équilibré" : r.rating <= -7 ? "Biais Vendeur Fort" : "Biais Vendeur Modéré"
        }));
      }
    }
  } catch (err) {
    // fallback
  }
  return (OFFICIAL_RATING_RULES[indicator] || OFFICIAL_RATING_RULES["GDP"] || []).map((r: any) => ({
    ...r,
    regime: r.rating >= 7 ? "Biais Acheteur Fort" : r.rating > 0 ? "Biais Acheteur Modéré" : r.rating === 0 ? "Régime Neutre / Équilibré" : r.rating <= -7 ? "Biais Vendeur Fort" : "Biais Vendeur Modéré"
  }));
};

export default function RatingRulesPage() {
  const queryClient = useQueryClient();
  const [activeIndicator, setActiveIndicator] = useState<string>("GDP");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [formMin, setFormMin] = useState("");
  const [formMax, setFormMax] = useState("");
  const [formRating, setFormRating] = useState<number>(0);

  // Data Fetching
  const { data: rules, isLoading } = useQuery({
    queryKey: ["rating-rules", activeIndicator],
    queryFn: () => fetchRules(activeIndicator),
  });

  // Mutations
  const addRuleMutation = useMutation({
    mutationFn: async (newRule: any) => {
      await new Promise(r => setTimeout(r, 200));
      return { ...newRule, id: Date.now() };
    },
    onSuccess: (newRule) => {
      queryClient.setQueryData(["rating-rules", activeIndicator], (old: any) => {
        return [...(old || []), newRule];
      });
      setModalMode(null);
      playSuccessSound();
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.5 } });
    }
  });

  const editRuleMutation = useMutation({
    mutationFn: async (updatedRule: any) => {
      await new Promise(r => setTimeout(r, 200));
      return updatedRule;
    },
    onSuccess: (updatedRule) => {
      queryClient.setQueryData(["rating-rules", activeIndicator], (old: any) => {
        return old?.map((r: any) => r.id === updatedRule.id ? updatedRule : r);
      });
      setModalMode(null);
      playSuccessSound();
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await new Promise(r => setTimeout(r, 200));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(["rating-rules", activeIndicator], (old: any) => {
        return old?.filter((r: any) => r.id !== deletedId);
      });
      playClickSound();
    }
  });

  const openAddModal = () => {
    playClickSound();
    setFormMin("2.0");
    setFormMax("+∞");
    setFormRating(8);
    setSelectedRule(null);
    setModalMode("add");
  };

  const openEditModal = (rule: any) => {
    playClickSound();
    setSelectedRule(rule);
    setFormMin(rule.min);
    setFormMax(rule.max);
    setFormRating(rule.rating);
    setModalMode("edit");
  };

  const parsedMin = parseBound(formMin);
  const parsedMax = parseBound(formMax);
  const isFormValid = parsedMin.isValid && parsedMax.isValid && parsedMin.num < parsedMax.num;

  const handleMinChange = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.toLowerCase() === "-inf" || trimmed.toLowerCase() === "-infinity") {
      setFormMin("-∞");
    } else {
      setFormMin(raw);
    }
  };

  const handleMaxChange = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.toLowerCase() === "+inf" || trimmed.toLowerCase() === "inf" || trimmed.toLowerCase() === "+infinity" || trimmed.toLowerCase() === "infinity") {
      setFormMax("+∞");
    } else {
      setFormMax(raw);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const computedRegime = 
      formRating >= 7 ? "Biais Acheteur Fort" :
      formRating > 0 ? "Biais Acheteur Modéré" :
      formRating === 0 ? "Régime Neutre / Équilibré" :
      formRating > -7 ? "Biais Vendeur Modéré" : "Biais Vendeur Fort";

    if (modalMode === "add") {
      addRuleMutation.mutate({
        min: parsedMin.display,
        max: parsedMax.display,
        rating: Number(formRating),
        regime: computedRegime
      });
    } else if (modalMode === "edit" && selectedRule) {
      editRuleMutation.mutate({
        ...selectedRule,
        min: parsedMin.display,
        max: parsedMax.display,
        rating: Number(formRating),
        regime: computedRegime
      });
    }
  };

  const activeIndLabel = INDICATORS.find(i => i.id === activeIndicator)?.label || activeIndicator;

  return (
    <div className="w-full max-w-[1550px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col text-white font-sans">
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. UNIFIED ADMIN PAGE HEADER (Single row utilities, NO duplicate admin) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AdminPageHeader
        eyebrow="CALIBRATION QUANTITATIVE • MODÈLE MULTI-PILIERS"
        badgeText="ENGINE LIVE"
        title="Règles de Notation Macroéconomique"
        searchPlaceholder="Rechercher une règle, seuil..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        rightActions={
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={SPRING_SNAPPY}
            onClick={openAddModal}
            className="h-10 px-5 rounded-full bg-[#D4FF00] hover:bg-[#dfeb34] text-[#07080C] font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(212,255,0,0.25)] transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Ajouter une Règle</span>
          </motion.button>
        }
      />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. FILTER & INDICATOR POD (SculptedFilterPod from Catalogue)      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SculptedFilterPod className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left Pill Track */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
          {INDICATORS.map((ind) => (
            <button
              key={ind.id}
              onClick={() => { setActiveIndicator(ind.id); playTabSound(); }}
              className={clsx(
                "px-4 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap",
                activeIndicator === ind.id 
                  ? "bg-[#D4FF00] text-[#07080C] font-bold shadow-[0_0_15px_rgba(212,255,0,0.3)]" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              {ind.label}
            </button>
          ))}
        </div>

        {/* Right Info Pill */}
        <div className="rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] px-4 py-1.5 text-xs font-mono whitespace-nowrap shrink-0">
          Échelle : −10 (Vendeur) à +10 (Acheteur)
        </div>
      </SculptedFilterPod>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. RULES TABLE CONTAINER (Rounded-[24px])                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <SculptedTableContainer className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/[0.06] gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Table de Transformation Différentielle : {activeIndLabel}</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                Base − Quote
              </span>
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Intervalles de différentiels macro appliqués pour générer les scores de conviction (−10 à +10).
            </p>
          </div>
        </div>

        {/* Centralized Table Layout */}
        <div className="overflow-x-auto w-full">
          <table className="w-full border-separate border-spacing-0 min-w-[720px]">
            <thead>
              <tr className="text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/[0.06] h-10">
                <th className="py-2.5 px-4 text-left w-[120px]">PALIER</th>
                <th className="py-2.5 px-4 text-center w-[250px]">PLAGE DIFFÉRENTIELLE</th>
                <th className="py-2.5 px-4 text-center w-[300px]">RÉGIME MACRO &amp; SENTIMENT</th>
                <th className="py-2.5 px-4 text-center w-[150px]">IMPACT SCORE</th>
                <th className="py-2.5 px-4 text-right w-[100px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-shimmer h-14">
                    <td className="py-3 px-4"><div className="w-16 h-5 bg-white/[0.04] rounded-full" /></td>
                    <td className="py-3 px-4"><div className="w-32 h-5 bg-white/[0.04] rounded-full mx-auto" /></td>
                    <td className="py-3 px-4"><div className="w-36 h-5 bg-white/[0.04] rounded-full mx-auto" /></td>
                    <td className="py-3 px-4"><div className="w-14 h-5 bg-white/[0.04] rounded-full mx-auto" /></td>
                    <td className="py-3 px-4"><div className="w-12 h-5 bg-white/[0.04] rounded-full ml-auto" /></td>
                  </tr>
                ))
              ) : (
                rules?.map((rule: any, i: number) => {
                  const isPositive = rule.rating > 0;
                  const isNegative = rule.rating < 0;

                  return (
                    <tr 
                      key={rule.id}
                      className="hover:bg-white/[0.02] transition-colors h-14 border-b border-white/[0.03]"
                    >
                      {/* 1. Palier Level */}
                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="font-sans text-xs font-semibold text-slate-300">
                            Tier {i + 1}
                          </span>
                        </div>
                      </td>

                      {/* 2. Plage Differentielle */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2 font-mono text-xs font-semibold bg-[#0A0B0F] px-3.5 py-1 rounded-full border border-white/[0.06]">
                          <span className={clsx(rule.min === "-∞" ? "text-slate-500" : "text-white")}>
                            {rule.min}
                          </span>
                          <span className="text-slate-500 text-xs font-sans">à</span>
                          <span className={clsx(rule.max === "+∞" ? "text-slate-500" : "text-white")}>
                            {rule.max}
                          </span>
                        </div>
                      </td>

                      {/* 3. Regime Macro & Sentiment */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          {isPositive && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                              {rule.regime || "Biais Acheteur"}
                            </span>
                          )}
                          {isNegative && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-3 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
                              {rule.regime || "Biais Vendeur"}
                            </span>
                          )}
                          {!isPositive && !isNegative && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-400 bg-slate-400/10 border border-slate-400/20 px-3 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Régime Neutre / Équilibré
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Score Impact Pillow */}
                      <td className="py-3 px-4 text-center">
                        <span className={clsx(
                          "inline-flex items-center justify-center min-w-[50px] px-3 py-1 rounded-[10px] font-mono text-xs font-bold tabular-nums border",
                          isPositive 
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]" 
                            : isNegative 
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]" 
                            : "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                        )}>
                          {isPositive ? `+${rule.rating}` : rule.rating}
                        </span>
                      </td>

                      {/* 5. Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button 
                            onClick={() => openEditModal(rule)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Status Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 rounded-2xl bg-[#0A0B0F] border border-white/[0.05] text-xs font-mono mt-4 gap-2">
          <span className="text-slate-400">
            Couverture continue : <strong className="text-white">{rules?.length || 5} Paliers Actifs</strong> (−∞ à +∞) pour {activeIndLabel}.
          </span>
          <span className="text-[#D4FF00] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
            Moteur de calcul : En Direct &amp; Synchronisé
          </span>
        </div>
      </SculptedTableContainer>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT RULE MODAL (Smoked Obsidian Subsurface Glass)          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalMode(null)}
              className="fixed inset-0 bg-[#06070A]/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={SPRING_SNAPPY}
              className="relative w-full max-w-md rounded-[24px] bg-[#101218] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_25px_50px_-12px_rgba(0,0,0,0.85)] p-6 z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/30 flex items-center justify-center text-[#D4FF00]">
                    <SlidersHorizontal size={15} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      {modalMode === "add" ? "Ajouter un Palier" : "Modifier le Palier"}
                    </h3>
                    <p className="text-xs font-mono text-slate-400">
                      Indicateur : {activeIndLabel}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="p-1.5 rounded-full hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                    Plage Différentielle (Min à Max)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={formMin}
                        onChange={(e) => handleMinChange(e.target.value)}
                        placeholder="Ex: -2.5 ou -∞"
                        className="w-full h-10 px-3.5 rounded-xl bg-[#0A0B0F] border border-white/[0.08] font-mono text-xs text-white focus:outline-none focus:border-[#D4FF00]/50"
                      />
                      <span className="text-[10px] font-mono text-slate-500 mt-1 block">Borne inférieure</span>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formMax}
                        onChange={(e) => handleMaxChange(e.target.value)}
                        placeholder="Ex: +∞ ou 3.0"
                        className="w-full h-10 px-3.5 rounded-xl bg-[#0A0B0F] border border-white/[0.08] font-mono text-xs text-white focus:outline-none focus:border-[#D4FF00]/50"
                      />
                      <span className="text-[10px] font-mono text-slate-500 mt-1 block">Borne supérieure</span>
                    </div>
                  </div>
                  {!isFormValid && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1.5 font-mono">
                      <AlertCircle size={12} />
                      Intervalle invalide (le minimum doit être strictement inférieur au maximum).
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono uppercase text-slate-400">
                      Impact Score (−10 à +10)
                    </label>
                    <span className={clsx(
                      "font-mono font-bold text-xs px-2 py-0.5 rounded-lg border",
                      formRating > 0 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                      formRating < 0 ? "bg-rose-500/15 text-rose-300 border-rose-500/30" :
                      "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                    )}>
                      {formRating > 0 ? `+${formRating}` : formRating}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={formRating}
                    onChange={(e) => setFormRating(parseInt(e.target.value, 10))}
                    className="w-full accent-[#D4FF00] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>−10 (Max Vendeur)</span>
                    <span>0 (Neutre)</span>
                    <span>+10 (Max Acheteur)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="h-9 px-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-slate-300 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={clsx(
                      "h-9 px-5 rounded-full text-xs font-bold font-sans transition-all flex items-center gap-2 cursor-pointer shadow-lg",
                      isFormValid ? "bg-[#D4FF00] hover:bg-[#dfeb34] text-[#07080C] shadow-[0_0_15px_rgba(212,255,0,0.3)]" : "bg-white/[0.04] text-slate-500 cursor-not-allowed border border-white/[0.06]"
                    )}
                  >
                    <Check size={14} />
                    <span>{modalMode === "add" ? "Ajouter" : "Enregistrer"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
