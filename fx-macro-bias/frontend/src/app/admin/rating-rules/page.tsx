"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, ArrowUpDown, Loader2, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

const INDICATORS = ["GDP", "Current Account", "CPI", "Interest Rate", "FX Reserves", "Equity"];
const matteCard = "bg-[#1E2028]/80 backdrop-blur-2xl border border-white/5 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]";

// API Fetcher
const fetchRules = async (indicator: string) => {
  // In a real app, you'd fetch from your Django API
  // const res = await axios.get(`/api/macro/rating-rules/?indicator=${indicator}`);
  // return res.data;
  
  // Simulated delay for skeleton demo
  await new Promise(r => setTimeout(r, 800));
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

  // Data Fetching
  const { data: rules, isLoading } = useQuery({
    queryKey: ["rating-rules", activeIndicator],
    queryFn: () => fetchRules(activeIndicator),
  });

  // Mutations Scaffold
  const addRuleMutation = useMutation({
    mutationFn: async (newRule: any) => {
      // return axios.post('/api/macro/rating-rules/', newRule);
      await new Promise(r => setTimeout(r, 400));
      return { ...newRule, id: Date.now() }; // Mock new ID
    },
    onSuccess: (addedRule) => {
      queryClient.setQueryData(["rating-rules", activeIndicator], (old: any) => {
        return [...(old || []), addedRule];
      });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      // return axios.delete(`/api/macro/rating-rules/${id}/`);
      await new Promise(r => setTimeout(r, 400));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(["rating-rules", activeIndicator], (old: any) => {
        return old?.filter((r: any) => r.id !== deletedId);
      });
    }
  });

  const editRuleMutation = useMutation({
    mutationFn: async (rule: any) => {
      // return axios.patch(`/api/macro/rating-rules/${rule.id}/`, rule);
      await new Promise(r => setTimeout(r, 400));
      return { ...rule, rating: rule.rating + 1 }; // Mock modify: increment rating
    },
    onSuccess: (updatedRule) => {
      queryClient.setQueryData(["rating-rules", activeIndicator], (old: any) => {
        return old?.map((r: any) => r.id === updatedRule.id ? updatedRule : r);
      });
    }
  });

  return (
    <div className="flex flex-col w-full h-full bg-transparent relative">
      <header className="w-full flex items-center justify-between p-[40px_48px] pb-[32px] opacity-0 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans font-medium text-[16px] text-[#A0A5B1]">Engine Logic Configuration</span>
          <h1 className="font-sans font-bold text-[40px] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">
            Rating Rules
          </h1>
        </div>
        <div className="flex items-center gap-[16px]">
          <GlobalSearch />
          <div className="flex items-center gap-[12px] bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 rounded-[16px] px-[20px] py-[12px] shadow-lg">
             <ShieldCheck size={20} className="text-[#D2F646]" />
             <span className="font-sans font-medium text-[15px] text-[#A0A5B1]">Engine: <span className="text-white font-bold">Live</span></span>
          </div>
        </div>
      </header>

      <main className="flex flex-col px-[48px] gap-[32px] pb-[64px] max-w-[1200px]">
        
        {/* Controls */}
        <div className="flex items-center justify-between opacity-0 animate-slideUp" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center bg-[#1E2028]/80 backdrop-blur-xl border border-white/5 p-[8px] rounded-[20px] shadow-lg">
            {INDICATORS.map((ind) => (
              <button
                key={ind}
                onClick={() => setActiveIndicator(ind)}
                className={clsx(
                  "px-[20px] py-[10px] rounded-[14px] font-sans text-[14px] font-bold transition-all duration-300 relative",
                  activeIndicator === ind
                    ? "bg-white/5 text-[#D2F646] shadow-sm"
                    : "text-[#A0A5B1] hover:text-[#FFFFFF] hover:bg-white/5"
                )}
              >
                {ind}
              </button>
            ))}
          </div>

          <button 
            onClick={() => addRuleMutation.mutate({ min: "0", max: "0", rating: 0 })}
            disabled={addRuleMutation.isPending}
            className="relative overflow-hidden flex items-center gap-[8px] px-[32px] py-[14px] rounded-[12px] bg-[#D2F646] text-[#121418] font-sans font-bold text-[15px] transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(210,246,70,0.4)] group"
          >
            {addRuleMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.5} className="transition-transform group-hover:rotate-90" />}
            Add Rule
            <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-shimmer" />
          </button>
        </div>

        {/* Rules Table */}
        <div className={clsx("p-[32px] flex flex-col gap-[24px] opacity-0 animate-slideUp", matteCard)} style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-bold text-[20px] text-[#FFFFFF] tracking-tight">
              {activeIndicator} Differential Rules
            </h2>
            <span className="font-sans font-medium text-[14px] text-[#A0A5B1]">
              Last Updated: Today, 10:45 AM
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-[24px] py-[20px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 w-[120px]">Order</th>
                  <th className="px-[24px] py-[20px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5">Differential Range (Base - Quote)</th>
                  <th className="px-[24px] py-[20px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 w-[160px] text-right">Rating Output</th>
                  <th className="px-[24px] py-[20px] pb-[16px] font-sans font-medium text-[14px] text-[#A0A5B1] border-b border-white/5 w-[80px]"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  // Skeleton Loader
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-[24px] py-[16px]">
                        <div className="w-[80px] h-[20px] bg-white/5 rounded-md animate-pulse" />
                      </td>
                      <td className="px-[24px] py-[16px]">
                        <div className="flex items-center gap-[12px]">
                          <div className="w-[60px] h-[32px] bg-white/5 rounded-[8px] animate-pulse" />
                          <div className="w-[20px] h-[20px] bg-white/5 rounded-md animate-pulse" />
                          <div className="w-[60px] h-[32px] bg-white/5 rounded-[8px] animate-pulse" />
                        </div>
                      </td>
                      <td className="px-[24px] py-[16px]">
                        <div className="flex justify-end">
                          <div className="w-[60px] h-[32px] bg-white/5 rounded-[10px] animate-pulse" />
                        </div>
                      </td>
                      <td className="px-[24px] py-[16px]"></td>
                    </tr>
                  ))
                ) : (
                  // Data Rows
                  rules?.map((rule: any, i: number) => (
                    <tr key={rule.id} className="group border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors">
                      <td className="px-[24px] py-[16px]">
                        <div className="flex items-center gap-[16px]">
                          <div className="w-[40px] flex-shrink-0">
                            <button className="text-[#A0A5B1] hover:text-[#FFFFFF] cursor-grab transition-colors active:cursor-grabbing">
                              <ArrowUpDown size={18} />
                            </button>
                          </div>
                          <span className="font-sans font-bold text-[16px] text-[#A0A5B1] group-hover:text-white transition-colors">Rule {i + 1}</span>
                        </div>
                      </td>
                      <td className="px-[24px] py-[16px]">
                        <div className="flex items-center gap-[12px]">
                          <span className="font-mono text-[16px] text-white bg-white/5 px-[12px] py-[6px] rounded-[8px]">{rule.min}</span>
                          <span className="text-[#A0A5B1] font-sans text-[14px]">to</span>
                          <span className="font-mono text-[16px] text-white bg-white/5 px-[12px] py-[6px] rounded-[8px]">{rule.max}</span>
                        </div>
                      </td>
                      <td className="px-[24px] py-[16px]">
                        <div className="flex justify-end">
                          <span className={clsx(
                            "px-[16px] py-[8px] rounded-[10px] font-sans font-bold text-[16px] shadow-inner transition-transform group-hover:scale-[1.05]",
                            rule.rating > 0 ? "bg-[#D2F646]/10 text-[#D2F646] border border-[#D2F646]/20" :
                            rule.rating < 0 ? "bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/20" :
                            "bg-[#A0A5B1]/10 text-[#A0A5B1] border border-white/10"
                          )}>
                            {rule.rating > 0 ? `+${rule.rating}` : rule.rating}
                          </span>
                        </div>
                      </td>
                      <td className="px-[24px] py-[16px]">
                        <div className="flex justify-end gap-[8px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button 
                            onClick={() => editRuleMutation.mutate(rule)}
                            disabled={editRuleMutation.isPending}
                            className="p-[10px] rounded-[10px] bg-[#121418] border border-white/5 hover:bg-white/10 text-[#A0A5B1] hover:text-white transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                            className="p-[10px] rounded-[10px] bg-[#121418] border border-white/5 hover:bg-[#FF4444]/10 text-[#A0A5B1] hover:text-[#FF4444] transition-colors"
                          >
                            {deleteRuleMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
    </div>
  );
}
