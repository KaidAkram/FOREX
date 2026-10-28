"use client";

import React from "react";
import { motion } from "framer-motion";
import { AnimatedMetricValue } from "@/components/motion/AnimatedNumberAndMorphChart";
import { getCountryFlagUrl } from "@/lib/macroFormatters";
import { soundFX } from "@/lib/soundEngine";
import { GraphIcon } from "@primer/octicons-react";

export interface G10CurrencyItem {
  code: string;
  score: number;
  status: "FORT" | "FAIBLE" | "NEUTRE";
}

const DEFAULT_G10_DATA: G10CurrencyItem[] = [
  { code: "USD", score: 13, status: "FORT" },
  { code: "CAD", score: 11, status: "NEUTRE" },
  { code: "GBP", score: 10, status: "NEUTRE" },
  { code: "NZD", score: 6, status: "NEUTRE" },
  { code: "AUD", score: 3, status: "NEUTRE" },
  { code: "EUR", score: -5, status: "NEUTRE" },
  { code: "JPY", score: -6, status: "NEUTRE" },
  { code: "CHF", score: -33, status: "FAIBLE" },
];

export function G10RelativeStrengthBarometer({
  selectedCurrency,
  onSelectCurrency,
  currencyData = DEFAULT_G10_DATA,
}: {
  selectedCurrency?: string;
  onSelectCurrency?: (code: string) => void;
  currencyData?: G10CurrencyItem[];
}) {
  const data = currencyData.length > 0 ? currencyData : DEFAULT_G10_DATA;

  // Find strongest and weakest
  const sorted = [...data].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  return (
    <section className="rounded-[26px] bg-[#0F1218] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_40px_-15px_rgba(0,0,0,0.7)] p-6 mb-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#D4FF00] shrink-0">
            <GraphIcon size={16} />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-white tracking-tight">
              Baromètre Macro de Force Relative (G10)
            </h2>
            <p className="font-sans text-xs text-slate-400">
              Cliquez sur une devise souveraine pour filtrer instantanément le terminal
            </p>
          </div>
        </div>

        {/* Summary Pill in Clean Satoshi + Tabular Numbers */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07] font-sans text-xs text-slate-300">
          <span>Plus Fort :</span>
          <strong className="font-mono text-emerald-400 tabular-nums">
            {strongest?.code} ({strongest?.score > 0 ? `+${strongest?.score}` : strongest?.score}%)
          </strong>
          <span className="text-slate-600">•</span>
          <span>Plus Faible :</span>
          <strong className="font-mono text-rose-400 tabular-nums">
            {weakest?.code} ({weakest?.score > 0 ? `+${weakest?.score}` : weakest?.score}%)
          </strong>
        </div>
      </div>

      {/* 8-Column Interactive Currency Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {data.map((item, idx) => {
          const isSelected = selectedCurrency === item.code;
          const isPos = item.score >= 0;
          // Normalize bar fill (max 35% scale -> 50% half-track width)
          const fillPercent = Math.min(50, (Math.abs(item.score) / 35) * 50);

          const barColor =
            item.score >= 12
              ? "#10B981"
              : item.score <= -15
              ? "#F43F5E"
              : isPos
              ? "#34D399"
              : "#FB7185";

          return (
            <motion.button
              key={item.code}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                soundFX.playPop();
                onSelectCurrency?.(isSelected ? "Tous" : item.code);
              }}
              className={`rounded-[18px] p-3.5 text-left transition-all border cursor-pointer ${
                isSelected
                  ? "bg-white/[0.08] border-[#D4FF00]/50 shadow-[0_0_20px_rgba(212,255,0,0.12)]"
                  : "bg-[#0A0C11] hover:bg-white/[0.04] border-white/[0.06]"
              }`}
            >
              {/* Top Row: Flag + Code + Score */}
              <div className="flex items-center justify-between gap-1 mb-3">
                <div className="flex items-center gap-2">
                  <img
                    src={getCountryFlagUrl(item.code)}
                    alt={item.code}
                    className="w-5 h-5 rounded-full shrink-0"
                    loading="lazy"
                  />
                  <span className="font-display text-sm font-bold text-white">
                    {item.code}
                  </span>
                </div>
                <AnimatedMetricValue
                  value={item.score}
                  decimals={0}
                  prefix={item.score > 0 ? "+" : ""}
                  suffix="%"
                  className={`font-mono text-xs font-bold tabular-nums ${
                    item.score >= 10
                      ? "text-emerald-400"
                      : item.score <= -15
                      ? "text-rose-400"
                      : "text-slate-200"
                  }`}
                />
              </div>

              {/* Center-Zero Diverging Bar */}
              <div className="relative h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden mb-2.5">
                {/* Zero Center Axis Tick */}
                <span className="absolute left-1/2 top-0 bottom-0 w-px bg-white/25 z-10" />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fillPercent}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 28,
                    delay: idx * 0.035,
                  }}
                  style={{
                    backgroundColor: barColor,
                    left: isPos ? "50%" : `${50 - fillPercent}%`,
                  }}
                  className="absolute top-0 bottom-0 rounded-full"
                />
              </div>

              {/* Bottom French Status Pill */}
              <div className="text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[9px] font-sans font-bold tracking-wider uppercase ${
                    item.status === "FORT"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : item.status === "FAIBLE"
                      ? "bg-rose-500/15 text-rose-400"
                      : "bg-white/[0.04] text-slate-400"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
