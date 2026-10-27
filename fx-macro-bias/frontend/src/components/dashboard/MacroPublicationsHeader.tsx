"use client";
import React from "react";
import { motion } from "framer-motion";
import { runWithViewTransition, SPRING_WEIGHTLESS } from "@/lib/uxEngineeringStandards";

const MACRO_FILTERS = [
  { id: "all", label: "Tous" },
  { id: "cpi", label: "IPC" },
  { id: "rates", label: "Taux" },
  { id: "gdp", label: "PIB" },
  { id: "reserves", label: "Réserves" },
] as const;

export function MacroPublicationsHeader({
  activeFilter,
  onSelectFilter,
}: {
  activeFilter: string;
  onSelectFilter: (id: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.05]">
      <div className="min-w-0">
        <h2 className="font-display text-[17px] font-bold tracking-[-0.025em] text-white [text-wrap:balance]">
          Dernières Données Macroéconomiques Publiées
        </h2>
        <p className="font-sans text-xs text-slate-400 mt-0.5 [text-wrap:pretty]">
          Statistiques fondamentales vérifiées ingérées directement dans le moteur quantitatif
        </p>
      </div>

      {/* SINGLE-LINE NON-WRAPPING PILL TRACK (Fixes the 'Réserves' 2-line wrap bug!) */}
      <div className="inline-flex items-center gap-1 rounded-full bg-[#090B10] border border-white/[0.06] p-1 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
        {MACRO_FILTERS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => runWithViewTransition(() => onSelectFilter(tab.id))}
              className={`relative px-3.5 py-1.5 rounded-full font-sans text-xs font-semibold whitespace-nowrap transition-colors duration-150 after:absolute after:-inset-1.5 after:content-[''] cursor-pointer ${
                isActive ? "text-[#07080C]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="macro-pub-filter-pill"
                  transition={SPRING_WEIGHTLESS}
                  className="absolute inset-0 rounded-full bg-[#D4FF00] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] z-0"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
