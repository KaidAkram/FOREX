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
const matteCard = "bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

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

// API Fetcher
const fetchRules = async (indicator: string) => {
  await new Promise(r => setTimeout(r, 400));
  return [
    { id: 1, min: "-∞", max: "-2.0", rating: -10, regime: "Strong Bearish Bias" },
    { id: 2, min: "-2.0", max: "-1.0", rating: -5, regime: "Moderate Bearish Bias" },
    { id: 3, min: "-1.0", max: "1.0", rating: 0, regime: "Neutral / Balanced Regime" },
    { id: 4, min: "1.0", max: "2.0", rating: 5, regime: "Moderate Bullish Bias" },
    { id: 5, min: "2.0", max: "+∞", rating: 10, regime: "Strong Bullish Advantage" },
  ];
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
      {/* Header - Spacious Top Spacing */}
      <header className="w-full flex items-center justify-between px-12 pt-9 pb-5 opacity-0 animate-fadeIn flex-shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="font-sans font-medium text-xs text-[#A0A5B1]">Engine Logic Configuration</span>
          <h1 className="font-sans font-bold text-3xl text-white tracking-tight">
            Rating Rules
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <GlobalSearch placeholder="Search rating rules, thresholds..." />
          <div className="flex items-center gap-2 bg-[#161822]/85 backdrop-blur-xl border border-white/5 rounded-2xl px-3.5 py-1.5 shadow-lg">
             <ShieldCheck size={16} className="text-[#D2F646]" />
             <span className="font-sans font-medium text-xs text-[#A0A5B1]">Engine: <span className="text-white font-bold">Live</span></span>
          </div>
          <AuthHeaderWidget />
        </div>
      </header>

      {/* Main Container - Centered vertically in middle of screen */}
      <main className="flex-1 flex flex-col px-12 gap-5 pb-8 max-w-[1600px] w-full mx-auto justify-center">
        
        {/* Controls Toolbar */}
        <div className="flex items-center justify-between opacity-0 animate-slideUp">
          <div className="flex items-center bg-[#1D202B]/85 p-1 rounded-2xl border border-white/5 shadow-lg">
            {INDICATORS.map((ind) => (
              <button
                key={ind}
                onClick={() => setActiveIndicator(ind)}
                className={clsx(
                  "relative px-4 py-1.5 rounded-xl font-sans text-xs font-bold transition-all duration-200 z-10 cursor-pointer",
                  activeIndicator === ind
                    ? "text-[#121418]"
                    : "text-[#A0A5B1] hover:text-white"
                )}
              >
                {ind}
                {activeIndicator === ind && (
                  <motion.div
                    layoutId="activeRatingIndicator"
                    className="absolute inset-0 bg-[#D2F646] rounded-xl z-[-1] shadow-[0_0_14px_rgba(210,246,70,0.35)]"
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D2F646] text-[#121418] font-sans font-bold text-xs transition-all hover:shadow-[0_0_16px_rgba(210,246,70,0.35)] cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add New Rule</span>
          </motion.button>
        </div>

        {/* Rules Table Card - Centered in middle of screen */}
        <div className="flex-1 flex flex-col justify-center my-auto w-full py-2">
          <div className={clsx("p-6 flex flex-col gap-3.5 w-full opacity-0 animate-slideUp shadow-2xl", matteCard)} style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="font-sans font-bold text-lg text-[#FFFFFF] tracking-tight">
                  {activeIndicator} Differential Transformation Table
                </h2>
                <p className="text-xs text-[#A0A5B1] mt-0.5">Threshold boundaries applied to pairwise economic differentials (Base − Quote)</p>
              </div>
              <span className="font-sans font-bold text-sm font-mono text-[#D2F646] bg-[#D2F646]/10 border border-[#D2F646]/20 px-3.5 py-1.5 rounded-full">
                Score Scale: −10 (Bearish) to +10 (Bullish)
              </span>
            </div>

            {/* Centralized Table Layout with Design Connector */}
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs font-mono font-bold uppercase tracking-wider text-[#A0A5B1]">
                    <th className="py-3 px-4 text-left w-[120px]">Tier Level</th>
                    <th className="py-3 px-4 text-center w-[230px]">Differential Range (Base − Quote)</th>
                    <th className="py-3 px-4 text-center w-[290px]">Engine Sentiment & Macro Regime</th>
                    <th className="py-3 px-4 text-center w-[150px]">Rating Impact</th>
                    <th className="py-3 px-4 text-right w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 px-4"><div className="w-[70px] h-[20px] bg-white/5 rounded-md animate-pulse" /></td>
                      <td className="py-3 px-4"><div className="w-[160px] h-[22px] bg-white/5 rounded-md animate-pulse mx-auto" /></td>
                      <td className="py-3 px-4"><div className="w-[180px] h-[22px] bg-white/5 rounded-md animate-pulse mx-auto" /></td>
                      <td className="py-3 px-4"><div className="w-[50px] h-[22px] bg-white/5 rounded-md animate-pulse mx-auto" /></td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  ))
                ) : (
                  rules?.map((rule: any, i: number) => {
                    const isPositive = rule.rating > 0;
                    const isNegative = rule.rating < 0;

                    return (
                      <tr key={rule.id} className="group hover:bg-white/[0.03] transition-colors">
                        
                        {/* 1. Tier Level: Single line, number NEVER under text */}
                        <td className="py-3.5 px-4 text-left">
                          <span className="font-mono text-sm font-bold text-[#D2F646] bg-[#D2F646]/10 border border-[#D2F646]/20 px-3 py-1.5 rounded-lg whitespace-nowrap">
                            Tier {i + 1}
                          </span>
                        </td>

                        {/* 2. Differential Range: Centered with nice pill brackets */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2 font-mono text-sm font-bold text-white bg-white/[0.03] border border-white/5 px-3.5 py-1.5 rounded-xl shadow-inner">
                            <span className="text-[#D2F646]">{rule.min}</span>
                            <span className="text-[#A0A5B1] font-sans text-xs font-normal">to</span>
                            <span className="text-[#D2F646]">{rule.max}</span>
                          </div>
                        </td>

                        {/* 3. Engine Macro Regime & Sentiment */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            {isPositive && (
                              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D2F646]/10 border border-[#D2F646]/25 text-[#D2F646] text-sm font-semibold">
                                <TrendingUp size={14} />
                                <span>{rule.regime || (rule.rating >= 8 ? "Strong Bullish Bias" : "Moderate Bullish Bias")}</span>
                              </div>
                            )}
                            {isNegative && (
                              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF4444]/10 border border-[#FF4444]/25 text-[#FF5B5B] text-sm font-semibold">
                                <TrendingDown size={14} />
                                <span>{rule.regime || (rule.rating <= -8 ? "Strong Bearish Bias" : "Moderate Bearish Bias")}</span>
                              </div>
                            )}
                            {!isPositive && !isNegative && (
                              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#A0A5B1] text-sm font-semibold">
                                <Minus size={14} />
                                <span>Neutral / Balanced Regime</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. Rating Impact Score: Centered */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={clsx(
                            "inline-block min-w-[56px] px-3.5 py-1.5 rounded-xl font-mono font-black text-sm shadow-sm",
                            isPositive ? "bg-[#D2F646]/15 text-[#D2F646] border border-[#D2F646]/30" :
                            isNegative ? "bg-[#FF4444]/15 text-[#FF4444] border border-[#FF4444]/30" :
                            "bg-white/5 text-[#A0A5B1] border border-white/10"
                          )}>
                            {isPositive ? `+${rule.rating}` : rule.rating}
                          </span>
                        </td>

                        {/* 5. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => openEditModal(rule)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A0A5B1] hover:text-white transition-colors cursor-pointer"
                              title="Modify Rule"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-[#FF4444]/10 text-[#A0A5B1] hover:text-[#FF4444] transition-colors cursor-pointer"
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
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-[#121418]/60 text-sm mt-1">
            <span className="font-sans text-[#A0A5B1]">
              Continuous Coverage: <strong className="text-white">5 Active Differential Tiers</strong> (−∞ to +∞) for {activeIndicator}.
            </span>
            <span className="font-mono text-[#D2F646] text-xs font-bold">
              Rating Engine: Live & Synced
            </span>
          </div>
        </div>
        </div>
      </main>

      {/* --- Add / Modify Rule Modal with Verification & Infinity Helpers --- */}
      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalMode(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-[480px] bg-[#161822]/95 backdrop-blur-3xl border border-white/10 rounded-[28px] p-7 shadow-2xl z-10 flex flex-col gap-5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#D2F646]/10 border border-[#D2F646]/20 text-[#D2F646]">
                    <SlidersHorizontal size={18} />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-lg text-white">
                      {modalMode === "add" ? "Add Differential Rule" : "Modify Rule"}
                    </h3>
                    <p className="text-xs text-[#A0A5B1]">{activeIndicator} Transformation</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="p-2 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form with Input Verification & Infinity Controls */}
              <form onSubmit={handleSaveModal} className="flex flex-col gap-4">
                
                {/* Min & Max Inputs with 1-Click Infinity Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Min Value Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#A0A5B1]">Min Boundary</label>
                      <button
                        type="button"
                        onClick={() => setFormMin("-∞")}
                        className="text-[10px] font-mono text-[#D2F646] hover:underline bg-[#D2F646]/10 px-1.5 py-0.5 rounded cursor-pointer"
                        title="Set to Negative Infinity"
                      >
                        -∞ (Neg Inf)
                      </button>
                    </div>

                    <div className={clsx(
                      "flex items-center bg-[#12141A] border rounded-xl px-3 py-2 transition-all",
                      !parsedMin.isValid && formMin.trim() ? "border-[#FF4444]" : "border-white/10 focus-within:border-[#D2F646]"
                    )}>
                      <input
                        type="text"
                        required
                        value={formMin}
                        onChange={(e) => handleMinChange(e.target.value)}
                        placeholder="-2.0 or -∞"
                        className="w-full bg-transparent border-none outline-none font-mono text-sm text-white placeholder:text-[#A0A5B1]/40"
                      />
                      <button
                        type="button"
                        onClick={() => setFormMin("-∞")}
                        className="p-1 rounded text-[#A0A5B1] hover:text-[#D2F646] font-mono text-xs cursor-pointer ml-1"
                        title="Insert -∞"
                      >
                        -∞
                      </button>
                    </div>
                  </div>

                  {/* Max Value Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#A0A5B1]">Max Boundary</label>
                      <button
                        type="button"
                        onClick={() => setFormMax("+∞")}
                        className="text-[10px] font-mono text-[#00E5FF] hover:underline bg-[#00E5FF]/10 px-1.5 py-0.5 rounded cursor-pointer"
                        title="Set to Positive Infinity"
                      >
                        +∞ (Pos Inf)
                      </button>
                    </div>

                    <div className={clsx(
                      "flex items-center bg-[#12141A] border rounded-xl px-3 py-2 transition-all",
                      !parsedMax.isValid && formMax.trim() ? "border-[#FF4444]" : "border-white/10 focus-within:border-[#D2F646]"
                    )}>
                      <input
                        type="text"
                        required
                        value={formMax}
                        onChange={(e) => handleMaxChange(e.target.value)}
                        placeholder="2.0 or +∞"
                        className="w-full bg-transparent border-none outline-none font-mono text-sm text-white placeholder:text-[#A0A5B1]/40"
                      />
                      <button
                        type="button"
                        onClick={() => setFormMax("+∞")}
                        className="p-1 rounded text-[#A0A5B1] hover:text-[#00E5FF] font-mono text-xs cursor-pointer ml-1"
                        title="Insert +∞"
                      >
                        +∞
                      </button>
                    </div>
                  </div>

                </div>

                {/* Quick Presets Clickable Chips */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-[#A0A5B1]">Quick Interval Values (Click to insert):</span>
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
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-mono text-white transition-colors cursor-pointer"
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
                      className="p-2.5 rounded-xl bg-[#FF4444]/10 border border-[#FF4444]/30 flex items-center gap-2 text-[#FF6B6B] text-xs"
                    >
                      <AlertCircle size={15} className="flex-shrink-0" />
                      <span>{validationError}</span>
                    </motion.div>
                  )}
                  {isFormValid && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2 rounded-xl bg-[#6FF542]/10 border border-[#6FF542]/20 flex items-center justify-between text-[#6FF542] text-[11px] font-mono"
                    >
                      <span>Valid interval: [{parsedMin.display} to {parsedMax.display}]</span>
                      <Check size={14} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Rating Impact Slider */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[#A0A5B1]">Rating Impact (-10 to +10)</label>
                    <span className={clsx(
                      "font-mono font-bold text-sm px-2 py-0.5 rounded-lg",
                      formRating > 0 ? "bg-[#D2F646]/10 text-[#D2F646] border border-[#D2F646]/30" : 
                      formRating < 0 ? "bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/30" : 
                      "bg-white/5 text-white"
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
                    className="w-full accent-[#D2F646] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#A0A5B1]">
                    <span>-10 (Bearish)</span>
                    <span>0 (Neutral)</span>
                    <span>+10 (Bullish)</span>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="flex-1 py-2.5 rounded-xl bg-[#D2F646] text-[#121418] font-sans text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(210,246,70,0.3)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
