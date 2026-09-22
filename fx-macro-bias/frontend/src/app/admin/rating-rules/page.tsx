"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, ArrowUpDown, Loader2, ShieldCheck, X, Check, SlidersHorizontal } from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AuthHeaderWidget } from "@/components/layout/AuthHeaderWidget";

const INDICATORS = ["GDP", "Current Account", "CPI", "Interest Rate", "FX Reserves", "Equity"];
const matteCard = "bg-[#161822]/85 backdrop-blur-2xl border border-white/5 rounded-[28px] shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

// API Fetcher
const fetchRules = async (indicator: string) => {
  await new Promise(r => setTimeout(r, 600));
  return [
    { id: 1, min: "-∞", max: "-2.0", rating: -10 },
    { id: 2, min: "-2.0", max: "-1.0", rating: -5 },
    { id: 3, min: "-1.0", max: "1.0", rating: 0 },
    { id: 4, min: "1.0", max: "2.0", rating: 5 },
    { id: 5, min: "2.0", max: "+∞", rating: 10 },
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

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === "add") {
      addRuleMutation.mutate({
        min: formMin,
        max: formMax,
        rating: Number(formRating)
      });
    } else if (modalMode === "edit" && selectedRule) {
      editRuleMutation.mutate({
        ...selectedRule,
        min: formMin,
        max: formMax,
        rating: Number(formRating)
      });
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-transparent relative overflow-y-auto no-scrollbar">
      <header className="w-full flex items-center justify-between p-[40px_48px] pb-[32px] opacity-0 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">Engine Logic Configuration</span>
          <h1 className="font-sans font-bold text-[40px] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Rating Rules
          </h1>
        </div>
        <div className="flex items-center gap-[16px]">
          <GlobalSearch />
          <div className="flex items-center gap-[12px] bg-[#161822]/85 backdrop-blur-xl border border-white/5 rounded-[16px] px-[20px] py-[12px] shadow-lg">
             <ShieldCheck size={20} className="text-[#D2F646]" />
             <span className="font-sans font-medium text-[15px] text-[#A0A5B1]">Engine: <span className="text-white font-bold">Live</span></span>
          </div>
          <AuthHeaderWidget />
        </div>
      </header>

      <main className="flex flex-col px-[48px] gap-[32px] pb-[64px] max-w-[1300px]">
        
        {/* Controls */}
        <div className="flex items-center justify-between opacity-0 animate-slideUp" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center bg-[#1D202B]/85 p-1.5 rounded-2xl border border-white/5 shadow-lg">
            {INDICATORS.map((ind) => (
              <button
                key={ind}
                onClick={() => setActiveIndicator(ind)}
                className={clsx(
                  "relative px-[20px] py-[10px] rounded-xl font-sans text-[14px] font-bold transition-all duration-200 z-10",
                  activeIndicator === ind
                    ? "text-[#121418]"
                    : "text-[#A0A5B1] hover:text-white"
                )}
              >
                {ind}
                {activeIndicator === ind && (
                  <motion.div
                    layoutId="activeRatingIndicator"
                    className="absolute inset-0 bg-[#D2F646] rounded-xl z-[-1] shadow-[0_0_16px_rgba(210,246,70,0.35)]"
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
            className="flex items-center gap-[8px] px-[28px] py-[13px] rounded-xl bg-[#D2F646] text-[#121418] font-sans font-bold text-[14px] transition-all hover:shadow-[0_0_20px_rgba(210,246,70,0.4)] cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add New Rule</span>
          </motion.button>
        </div>

        {/* Rules Table */}
        <div className={clsx("p-[32px] flex flex-col gap-[24px] opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sans font-bold text-[20px] text-[#FFFFFF] tracking-tight">
                {activeIndicator} Differential Rules
              </h2>
              <p className="text-xs text-[#A0A5B1] mt-0.5">Threshold boundaries applied to (Base Country - Quote Country) differentials</p>
            </div>
            <span className="font-sans font-medium text-[13px] font-mono text-[#A0A5B1]">
              Scale: -10 (Extremely Bearish) to +10 (Extremely Bullish)
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-[24px] py-[18px] pb-[16px] font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5 w-[140px]">Rule Order</th>
                  <th className="px-[24px] py-[18px] pb-[16px] font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5">Differential Range (Base - Quote)</th>
                  <th className="px-[24px] py-[18px] pb-[16px] font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5 w-[180px] text-right">Rating Impact</th>
                  <th className="px-[24px] py-[18px] pb-[16px] font-sans font-semibold text-[13px] text-[#A0A5B1] border-b border-white/5 w-[100px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-[24px] py-[16px]"><div className="w-[80px] h-[20px] bg-white/5 rounded-md animate-pulse" /></td>
                      <td className="px-[24px] py-[16px]"><div className="w-[180px] h-[24px] bg-white/5 rounded-md animate-pulse" /></td>
                      <td className="px-[24px] py-[16px] text-right"><div className="w-[60px] h-[24px] bg-white/5 rounded-md animate-pulse ml-auto" /></td>
                      <td className="px-[24px] py-[16px]"></td>
                    </tr>
                  ))
                ) : (
                  rules?.map((rule: any, i: number) => (
                    <tr key={rule.id} className="group border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                      <td className="px-[24px] py-[16px]">
                        <div className="flex items-center gap-[12px]">
                          <span className="font-mono text-xs text-[#A0A5B1]">#{i + 1}</span>
                          <span className="font-sans font-bold text-[15px] text-white">Rule Tier {i + 1}</span>
                        </div>
                      </td>
                      <td className="px-[24px] py-[16px]">
                        <div className="flex items-center gap-[12px]">
                          <span className="font-mono text-[15px] text-white bg-white/5 border border-white/10 px-[12px] py-[5px] rounded-[8px]">{rule.min}</span>
                          <span className="text-[#A0A5B1] font-sans text-[13px]">to</span>
                          <span className="font-mono text-[15px] text-white bg-white/5 border border-white/10 px-[12px] py-[5px] rounded-[8px]">{rule.max}</span>
                        </div>
                      </td>
                      <td className="px-[24px] py-[16px]">
                        <div className="flex justify-end">
                          <span className={clsx(
                            "px-[16px] py-[6px] rounded-[10px] font-mono font-bold text-[14px] shadow-sm",
                            rule.rating > 0 ? "bg-[#D2F646]/10 text-[#D2F646] border border-[#D2F646]/30" :
                            rule.rating < 0 ? "bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/30" :
                            "bg-[#A0A5B1]/10 text-[#A0A5B1] border border-white/10"
                          )}>
                            {rule.rating > 0 ? `+${rule.rating}` : rule.rating}
                          </span>
                        </div>
                      </td>
                      <td className="px-[24px] py-[16px]">
                        <div className="flex justify-end gap-[8px]">
                          <button 
                            onClick={() => openEditModal(rule)}
                            className="p-[8px] rounded-[10px] bg-white/5 hover:bg-white/10 text-[#A0A5B1] hover:text-white transition-colors"
                            title="Modify Rule"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                            className="p-[8px] rounded-[10px] bg-white/5 hover:bg-[#FF4444]/10 text-[#A0A5B1] hover:text-[#FF4444] transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Modify Rule Modal */}
      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalMode(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-[460px] bg-[#161822]/95 backdrop-blur-3xl border border-white/10 rounded-[28px] p-8 shadow-2xl z-10 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#D2F646]/10 border border-[#D2F646]/20 text-[#D2F646]">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-xl text-white">
                      {modalMode === "add" ? "Add Differential Rule" : "Modify Rule"}
                    </h3>
                    <p className="text-xs text-[#A0A5B1]">{activeIndicator} Transformation</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="p-2 rounded-xl text-[#A0A5B1] hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#A0A5B1]">Min Value</label>
                    <input
                      type="text"
                      required
                      value={formMin}
                      onChange={(e) => setFormMin(e.target.value)}
                      placeholder="-1.0 or -∞"
                      className="bg-[#12141A] border border-white/10 rounded-xl px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-[#D2F646]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#A0A5B1]">Max Value</label>
                    <input
                      type="text"
                      required
                      value={formMax}
                      onChange={(e) => setFormMax(e.target.value)}
                      placeholder="1.0 or +∞"
                      className="bg-[#12141A] border border-white/10 rounded-xl px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-[#D2F646]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[#A0A5B1]">Rating Impact (-10 to +10)</label>
                    <span className={clsx(
                      "font-mono font-bold text-sm",
                      formRating > 0 ? "text-[#D2F646]" : formRating < 0 ? "text-[#FF4444]" : "text-white"
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

                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-[#D2F646] text-[#121418] font-sans text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(210,246,70,0.3)]"
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
