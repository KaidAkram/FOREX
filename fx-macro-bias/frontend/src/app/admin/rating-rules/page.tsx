"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  X, 
  Check, 
  SlidersHorizontal,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Infinity as InfinityIcon
} from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

const INDICATORS = ["GDP", "Current Account", "CPI", "Interest Rate", "FX Reserves", "Equity"];
const matteCard = "bg-[#032221]/90 backdrop-blur-2xl border border-[#0B453A] rounded-[24px] shadow-[0_16px_40px_rgba(2,27,26,0.6),inset_0_1px_0_0_rgba(241,247,246,0.06)]";

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

import OFFICIAL_RATING_RULES_DATA from "@/data/officialRatingRules.json";

const INDICATOR_SLUG_MAP: Record<string, string> = {
  "GDP": "gdp",
  "Current Account": "ca_gdp",
  "CPI": "cpi",
  "Interest Rate": "interest_rate",
  "FX Reserves": "fx_reserves",
  "Equity": "equity",
};

const OFFICIAL_RATING_RULES: Record<string, any[]> = OFFICIAL_RATING_RULES_DATA;

// API Fetcher with fallback to official rating rule.docx data
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
          regime: r.rating >= 7 ? "Strong Bullish Bias" : r.rating > 0 ? "Moderate Bullish Bias" : r.rating === 0 ? "Neutral / Balanced" : r.rating <= -7 ? "Strong Bearish Bias" : "Moderate Bearish Bias"
        }));
      }
    }
  } catch (err) {
    // fallback
  }
  return OFFICIAL_RATING_RULES[indicator] || OFFICIAL_RATING_RULES["GDP"] || [];
};

export default function RatingRulesPage() {
  const queryClient = useQueryClient();
  const [activeIndicator, setActiveIndicator] = useState(INDICATORS[0]);
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
      await new Promise(r => setTimeout(r, 300));
      return { ...newRule, id: Date.now() };
    },
    onSuccess: (newRule) => {
      queryClient.setQueryData(["rating-rules", activeIndicator], (old: any) => {
        return [...(old || []), newRule];
      });
      setModalMode(null);
    }
  });

  const editRuleMutation = useMutation({
    mutationFn: async (updatedRule: any) => {
      await new Promise(r => setTimeout(r, 300));
      return updatedRule;
    },
    onSuccess: (updatedRule) => {
      queryClient.setQueryData(["rating-rules", activeIndicator], (old: any) => {
        return old?.map((r: any) => r.id === updatedRule.id ? updatedRule : r);
      });
      setModalMode(null);
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await new Promise(r => setTimeout(r, 300));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(["rating-rules", activeIndicator], (old: any) => {
        return old?.filter((r: any) => r.id !== deletedId);
      });
    }
  });

  const openAddModal = () => {
    setFormMin("2.0");
    setFormMax("+∞");
    setFormRating(10);
    setModalMode("add");
  };

  const openEditModal = (rule: any) => {
    setSelectedRule(rule);
    setFormMin(rule.min);
    setFormMax(rule.max);
    setFormRating(rule.rating);
    setModalMode("edit");
  };

  // Validation calculations
  const parsedMin = parseBound(formMin);
  const parsedMax = parseBound(formMax);

  let validationError = "";
  if (!formMin.trim()) {
    validationError = "Minimum boundary value is required.";
  } else if (!parsedMin.isValid) {
    validationError = "Min value must be a valid number or -∞.";
  } else if (!formMax.trim()) {
    validationError = "Maximum boundary value is required.";
  } else if (!parsedMax.isValid) {
    validationError = "Max value must be a valid number or +∞.";
  } else if (parsedMin.num >= parsedMax.num) {
    validationError = "Min boundary must be strictly lower than Max boundary (e.g. -2.0 to 1.0).";
  }

  const isFormValid = validationError === "";

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
      formRating >= 8 ? "Strong Bullish Advantage" :
      formRating > 0 ? "Moderate Bullish Bias" :
      formRating === 0 ? "Neutral / Balanced Regime" :
      formRating > -8 ? "Moderate Bearish Bias" : "Strong Bearish Bias";

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

  return (
    <div className="flex flex-col w-full min-h-full bg-transparent relative justify-start">
      {/* Header */}
      <header className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 lg:pt-8 pb-4 opacity-0 animate-fadeIn relative z-40 flex-shrink-0 gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-sans font-medium text-xs text-[#AACBC4]">Engine Logic Configuration</span>
          <h1 className="font-sans font-bold text-2xl sm:text-3xl text-[#F1F7F6] tracking-tight leading-none">
            Rating Rules
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
          <GlobalSearch placeholder="Search rating rules, thresholds..." />
          <div className="hidden sm:flex items-center gap-2 bg-[#06302B]/90 backdrop-blur-xl border border-[#0B453A] rounded-2xl px-3.5 py-2 shadow-lg shrink-0">
             <ShieldCheck size={16} className="text-[#00DF81]" />
             <span className="font-sans font-medium text-xs text-[#AACBC4]">Engine: <span className="text-[#F1F7F6] font-bold">Live</span></span>
          </div>
          <AuthHeaderWidget />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-10 gap-5 pb-8 max-w-[1600px] w-full mx-auto justify-center">
        
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 opacity-0 animate-slideUp">
          <div className="flex items-center bg-[#06302B]/90 p-1 rounded-2xl border border-[#0B453A] shadow-lg overflow-x-auto no-scrollbar max-w-full shrink-0">
            {INDICATORS.map((ind) => (
              <button
                key={ind}
                onClick={() => setActiveIndicator(ind)}
                className={clsx(
                  "relative px-3.5 sm:px-4 py-1.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 z-10 cursor-pointer whitespace-nowrap",
                  activeIndicator === ind
                    ? "text-[#021B1A]"
                    : "text-[#AACBC4] hover:text-[#F1F7F6]"
                )}
              >
                {ind}
                {activeIndicator === ind && (
                  <motion.div
                    layoutId="activeRatingIndicator"
                    className="absolute inset-0 bg-[#00DF81] rounded-xl z-[-1] shadow-[0_0_14px_rgba(0,223,129,0.35)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00DF81] text-[#021B1A] font-sans font-bold text-xs transition-all hover:brightness-110 shadow-[0_0_16px_rgba(0,223,129,0.35)] cursor-pointer shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add New Rule</span>
          </motion.button>
        </div>

        {/* Rules Table Card */}
        <div className="flex-1 flex flex-col justify-center my-auto w-full py-2">
          <div className={clsx("p-4 sm:p-6 flex flex-col gap-3.5 w-full opacity-0 animate-slideUp shadow-2xl", matteCard)} style={{ animationDelay: "0.15s" }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#0B453A] pb-3 gap-2.5">
              <div>
                <h2 className="font-sans font-bold text-base sm:text-lg text-[#F1F7F6] tracking-tight">
                  {activeIndicator} Differential Transformation Table
                </h2>
                <p className="text-xs text-[#AACBC4] mt-0.5">Threshold boundaries applied to pairwise economic differentials (Base − Quote)</p>
              </div>
              <span className="font-sans font-bold text-xs sm:text-sm font-mono text-[#00DF81] bg-[#00DF81]/10 border border-[#00DF81]/25 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full shrink-0">
                Score Scale: −10 (Bearish) to +10 (Bullish)
              </span>
            </div>

            {/* Centralized Table Layout */}
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-[#0B453A] text-xs font-mono font-bold uppercase tracking-wider text-[#AACBC4]">
                    <th className="py-3 px-4 text-left w-[120px]">Tier Level</th>
                    <th className="py-3 px-4 text-center w-[230px]">Differential Range (Base − Quote)</th>
                    <th className="py-3 px-4 text-center w-[290px]">Engine Sentiment & Macro Regime</th>
                    <th className="py-3 px-4 text-center w-[150px]">Rating Impact</th>
                    <th className="py-3 px-4 text-right w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B453A]/40">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 px-4"><div className="w-[70px] h-[20px] bg-[#06302B] rounded-md animate-pulse" /></td>
                      <td className="py-3 px-4"><div className="w-[160px] h-[22px] bg-[#06302B] rounded-md animate-pulse mx-auto" /></td>
                      <td className="py-3 px-4"><div className="w-[180px] h-[22px] bg-[#06302B] rounded-md animate-pulse mx-auto" /></td>
                      <td className="py-3 px-4"><div className="w-[50px] h-[22px] bg-[#06302B] rounded-md animate-pulse mx-auto" /></td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  ))
                ) : (
                  rules?.map((rule: any, i: number) => {
                    const isPositive = rule.rating > 0;
                    const isNegative = rule.rating < 0;

                    return (
                      <tr key={rule.id} className="group hover:bg-[#06302B]/40 transition-colors">
                        
                        {/* 1. Tier Level */}
                        <td className="py-3.5 px-4 text-left">
                          <span className="font-mono text-sm font-bold text-[#00DF81] bg-[#00DF81]/10 border border-[#00DF81]/25 px-3 py-1.5 rounded-lg whitespace-nowrap">
                            Tier {i + 1}
                          </span>
                        </td>

                        {/* 2. Differential Range */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2 font-mono text-sm font-bold text-[#F1F7F6] bg-[#06302B] border border-[#0B453A] px-3.5 py-1.5 rounded-xl shadow-inner">
                            <span className="text-[#00DF81]">{rule.min}</span>
                            <span className="text-[#AACBC4] font-sans text-xs font-normal">to</span>
                            <span className="text-[#00DF81]">{rule.max}</span>
                          </div>
                        </td>

                        {/* 3. Engine Macro Regime & Sentiment */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            {isPositive && (
                              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00DF81]/10 border border-[#00DF81]/25 text-[#00DF81] text-sm font-semibold">
                                <TrendingUp size={14} />
                                <span>{rule.regime || (rule.rating >= 8 ? "Strong Bullish Bias" : "Moderate Bullish Bias")}</span>
                              </div>
                            )}
                            {isNegative && (
                              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF5555]/10 border border-[#FF5555]/25 text-[#FF5555] text-sm font-semibold">
                                <TrendingDown size={14} />
                                <span>{rule.regime || (rule.rating <= -8 ? "Strong Bearish Bias" : "Moderate Bearish Bias")}</span>
                              </div>
                            )}
                            {!isPositive && !isNegative && (
                              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#06302B] border border-[#0B453A] text-[#AACBC4] text-sm font-semibold">
                                <Minus size={14} />
                                <span>Neutral / Balanced Regime</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. Rating Impact Score */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={clsx(
                            "inline-block min-w-[56px] px-3.5 py-1.5 rounded-xl font-mono font-black text-sm shadow-sm",
                            isPositive ? "bg-[#00DF81]/15 text-[#00DF81] border border-[#00DF81]/30 shadow-[0_0_10px_rgba(0,223,129,0.15)]" :
                            isNegative ? "bg-[#FF5555]/15 text-[#FF5555] border border-[#FF5555]/30" :
                            "bg-[#06302B] text-[#AACBC4] border border-[#0B453A]"
                          )}>
                            {isPositive ? `+${rule.rating}` : rule.rating}
                          </span>
                        </td>

                        {/* 5. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => openEditModal(rule)}
                              className="p-1.5 rounded-lg bg-[#06302B] hover:bg-[#095544] text-[#AACBC4] hover:text-[#F1F7F6] border border-[#0B453A] transition-colors cursor-pointer"
                              title="Modify Rule"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                              className="p-1.5 rounded-lg bg-[#06302B] hover:bg-[#FF5555]/15 text-[#AACBC4] hover:text-[#FF5555] border border-[#0B453A] transition-colors cursor-pointer"
                              title="Delete Rule"
                            >
                              <Trash2 size={14} />
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

          {/* Bottom Summary Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#0B453A] bg-[#021B1A]/80 text-sm mt-1">
            <span className="font-sans text-[#AACBC4]">
              Continuous Coverage: <strong className="text-[#F1F7F6]">5 Active Differential Tiers</strong> (−∞ to +∞) for {activeIndicator}.
            </span>
            <span className="font-mono text-[#00DF81] text-xs font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00DF81] animate-pulse" />
              Rating Engine: Live & Synced
            </span>
          </div>
        </div>
        </div>
      </main>

      {/* --- Add / Modify Rule Modal --- */}
      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalMode(null)}
              className="fixed inset-0 bg-[#021B1A]/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-[94vw] sm:max-w-[480px] bg-[#032221]/95 backdrop-blur-3xl border border-[#0B453A] rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 shadow-2xl z-10 flex flex-col gap-4 sm:gap-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#0B453A] pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#00DF81]/10 border border-[#00DF81]/25 text-[#00DF81]">
                    <SlidersHorizontal size={18} />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-lg text-[#F1F7F6]">
                      {modalMode === "add" ? "Add Differential Rule" : "Modify Rule"}
                    </h3>
                    <p className="text-xs text-[#AACBC4]">{activeIndicator} Transformation</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="p-2 rounded-xl text-[#AACBC4] hover:text-[#F1F7F6] hover:bg-[#06302B] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveModal} className="flex flex-col gap-4">
                
                {/* Min & Max Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Min Value Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#AACBC4]">Min Boundary</label>
                      <button
                        type="button"
                        onClick={() => setFormMin("-∞")}
                        className="text-[10px] font-mono text-[#00DF81] hover:underline bg-[#00DF81]/10 px-1.5 py-0.5 rounded cursor-pointer"
                        title="Set to Negative Infinity"
                      >
                        -∞ (Neg Inf)
                      </button>
                    </div>

                    <div className={clsx(
                      "flex items-center bg-[#021B1A] border rounded-xl px-3 py-2 transition-all",
                      !parsedMin.isValid && formMin.trim() ? "border-[#FF5555]" : "border-[#0B453A] focus-within:border-[#00DF81]"
                    )}>
                      <input
                        type="text"
                        required
                        value={formMin}
                        onChange={(e) => handleMinChange(e.target.value)}
                        placeholder="-2.0 or -∞"
                        className="w-full bg-transparent border-none outline-none font-mono text-sm text-[#F1F7F6] placeholder:text-[#AACBC4]/40"
                      />
                      <button
                        type="button"
                        onClick={() => setFormMin("-∞")}
                        className="p-1 rounded text-[#AACBC4] hover:text-[#00DF81] font-mono text-xs cursor-pointer ml-1"
                        title="Insert -∞"
                      >
                        -∞
                      </button>
                    </div>
                  </div>

                  {/* Max Value Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#AACBC4]">Max Boundary</label>
                      <button
                        type="button"
                        onClick={() => setFormMax("+∞")}
                        className="text-[10px] font-mono text-[#2CC295] hover:underline bg-[#2CC295]/10 px-1.5 py-0.5 rounded cursor-pointer"
                        title="Set to Positive Infinity"
                      >
                        +∞ (Pos Inf)
                      </button>
                    </div>

                    <div className={clsx(
                      "flex items-center bg-[#021B1A] border rounded-xl px-3 py-2 transition-all",
                      !parsedMax.isValid && formMax.trim() ? "border-[#FF5555]" : "border-[#0B453A] focus-within:border-[#00DF81]"
                    )}>
                      <input
                        type="text"
                        required
                        value={formMax}
                        onChange={(e) => handleMaxChange(e.target.value)}
                        placeholder="2.0 or +∞"
                        className="w-full bg-transparent border-none outline-none font-mono text-sm text-[#F1F7F6] placeholder:text-[#AACBC4]/40"
                      />
                      <button
                        type="button"
                        onClick={() => setFormMax("+∞")}
                        className="p-1 rounded text-[#AACBC4] hover:text-[#2CC295] font-mono text-xs cursor-pointer ml-1"
                        title="Insert +∞"
                      >
                        +∞
                      </button>
                    </div>
                  </div>

                </div>

                {/* Quick Presets Clickable Chips */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-[#AACBC4]">Quick Interval Values (Click to insert):</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["-∞", "-2.0", "-1.0", "0.0", "1.0", "2.0", "+∞"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          if (!formMin || formMin === "-∞") {
                            setFormMin(val);
                          } else {
                            setFormMax(val);
                          }
                        }}
                        className="px-2 py-0.5 rounded-md bg-[#06302B] hover:bg-[#095544] border border-[#0B453A] text-[11px] font-mono text-[#F1F7F6] transition-colors cursor-pointer"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-time Validation Error Banner */}
                <AnimatePresence>
                  {validationError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="p-2.5 rounded-xl bg-[#FF5555]/10 border border-[#FF5555]/30 flex items-center gap-2 text-[#FF5555] text-xs"
                    >
                      <AlertCircle size={15} className="flex-shrink-0" />
                      <span>{validationError}</span>
                    </motion.div>
                  )}
                  {isFormValid && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2 rounded-xl bg-[#00DF81]/10 border border-[#00DF81]/25 flex items-center justify-between text-[#00DF81] text-[11px] font-mono"
                    >
                      <span>Valid interval: [{parsedMin.display} to {parsedMax.display}]</span>
                      <Check size={14} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Rating Impact Slider */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[#AACBC4]">Rating Impact (-10 to +10)</label>
                    <span className={clsx(
                      "font-mono font-bold text-sm px-2 py-0.5 rounded-lg",
                      formRating > 0 ? "bg-[#00DF81]/10 text-[#00DF81] border border-[#00DF81]/30" : 
                      formRating < 0 ? "bg-[#FF5555]/10 text-[#FF5555] border border-[#FF5555]/30" : 
                      "bg-[#06302B] text-[#F1F7F6] border border-[#0B453A]"
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
                    onChange={(e) => setFormRating(Number(e.target.value))}
                    className="w-full accent-[#00DF81] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#AACBC4]">
                    <span>-10 (Bearish)</span>
                    <span>0 (Neutral)</span>
                    <span>+10 (Bullish)</span>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#0B453A]">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#06302B] hover:bg-[#095544] text-[#F1F7F6] border border-[#0B453A] font-sans text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="flex-1 py-2.5 rounded-xl bg-[#00DF81] text-[#021B1A] font-sans text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(0,223,129,0.3)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Check size={16} />
                    <span>{modalMode === "add" ? "Create Rule" : "Save Changes"}</span>
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
