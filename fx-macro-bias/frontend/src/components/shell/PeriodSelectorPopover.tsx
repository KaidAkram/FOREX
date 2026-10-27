"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  SyncIcon,
} from "@primer/octicons-react";
import { SPRING_WEIGHTLESS } from "@/lib/uxEngineeringStandards";

export interface PeriodOption {
  id: string;
  label: string;
  status: "LIVE" | "PUBLIÉ" | "ARCHIVE" | "PRÉVISION";
  pairs: string;
}

export const MACRO_PERIODS: PeriodOption[] = [
  { id: "2026-10", label: "Octobre 2026", status: "LIVE", pairs: "28/28" },
  { id: "2026-09", label: "Septembre 2026", status: "PUBLIÉ", pairs: "28/28" },
  { id: "2026-08", label: "Août 2026", status: "PUBLIÉ", pairs: "28/28" },
  { id: "2026-07", label: "Juillet 2026", status: "ARCHIVE", pairs: "28/28" },
];

export function PeriodSelectorPopover({
  selected = "2026-10",
  onSelect,
  onSyncMacro,
  compact = false,
  align = "right",
}: {
  selected?: string;
  onSelect?: (id: string) => void;
  onSyncMacro?: () => void;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [activeYear, setActiveYear] = useState("2026");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentPeriod = MACRO_PERIODS.find((p) => p.id === selected) || {
    id: selected,
    label: selected,
    status: "LIVE" as const,
    pairs: "28/28",
  };

  return (
    <div ref={ref} className="relative z-40">
      {/* Trigger Button with Hit-Slop Expansion */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative h-10 rounded-full bg-[#10131A] hover:bg-[#151922] border border-white/[0.08] hover:border-white/[0.16] flex items-center gap-2.5 text-xs text-slate-200 transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] after:absolute after:-inset-1.5 after:content-[''] ${
          compact ? "px-2.5" : "px-3.5"
        }`}
      >
        <CalendarIcon size={15} className="text-[#D4FF00] shrink-0" />
        <span className="font-sans font-semibold">
          {compact ? "Oct 26" : currentPeriod.label}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded font-sans text-[9px] font-bold uppercase tracking-wider ${
            currentPeriod.status === "LIVE"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-white/[0.06] text-slate-300"
          }`}
        >
          {currentPeriod.status}
        </span>
        <ChevronDownIcon
          size={14}
          className={`text-slate-400 transition-transform duration-150 shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Bespoke Institutional Popover Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={SPRING_WEIGHTLESS}
            className={`absolute ${align === "left" ? "left-0" : "right-0"} mt-2 w-[310px] max-w-[calc(100vw-32px)] rounded-[22px] bg-[#0D1017]/95 backdrop-blur-2xl border border-white/[0.12] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.14)] z-50 text-white`}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-white/[0.06]">
              <span className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-400 [text-wrap:balance]">
                Millésime Macro G10
              </span>
              <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-full border border-white/[0.06] font-mono text-[10px] tabular-nums">
                <button
                  onClick={() => setActiveYear("2025")}
                  className={`px-2 py-0.5 rounded-full transition-colors ${
                    activeYear === "2025"
                      ? "bg-white/[0.1] text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  2025
                </button>
                <button
                  onClick={() => setActiveYear("2026")}
                  className={`px-2 py-0.5 rounded-full transition-colors ${
                    activeYear === "2026"
                      ? "bg-[#D4FF00]/15 text-[#D4FF00] font-bold border border-[#D4FF00]/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  2026
                </button>
              </div>
            </div>

            {/* Periods List */}
            <div className="space-y-1">
              {MACRO_PERIODS.map((p) => {
                const isSelected = p.id === selected;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect?.(p.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? "bg-white/[0.08] text-white font-semibold border border-white/[0.1]"
                        : "text-slate-300 hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircleIcon
                        size={15}
                        className={`shrink-0 ${
                          isSelected ? "text-[#D4FF00]" : "text-slate-600"
                        }`}
                      />
                      <div className="leading-tight truncate">
                        <p className="font-mono text-xs font-semibold tabular-nums text-white">{p.id}</p>
                        <p className="font-sans text-[11px] text-slate-400 truncate">{p.label}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                        {p.pairs}
                      </span>
                      <span
                        className={`font-sans text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          p.status === "LIVE"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : p.status === "PUBLIÉ"
                            ? "bg-white/[0.06] text-slate-300"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Popover Footer Quick Action */}
            <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  if (onSyncMacro) onSyncMacro();
                  setOpen(false);
                }}
                className="relative w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] font-sans text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer after:absolute after:-inset-1.5 after:content-['']"
              >
                <SyncIcon size={14} className="text-[#D4FF00]" />
                <span>Synchroniser le dernier flux BCE/Fed</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
