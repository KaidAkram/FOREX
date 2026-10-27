"use client";
import React from "react";
import { SearchIcon } from "@primer/octicons-react";

export type WashVariant = "lime" | "emerald" | "slate" | "sky" | "purple" | "rose";

// Institutional 7% Subsurface Radial Opacity with 80% Wide Optical Falloff
export const WASH_STYLES: Record<
  WashVariant,
  { bg: string; text: string; bar: string; borderTop: string; rawBorder: string }
> = {
  lime: {
    bg: "bg-[radial-gradient(130%_100%_at_0%_0%,rgba(212,255,0,0.07)_0%,transparent_80%)]",
    text: "text-[#D4FF00]",
    bar: "bg-[#D4FF00]",
    borderTop: "border-t-[#D4FF00]/25",
    rawBorder: "border-[#D4FF00]/20",
  },
  emerald: {
    bg: "bg-[radial-gradient(130%_100%_at_0%_0%,rgba(16,185,129,0.07)_0%,transparent_80%)]",
    text: "text-emerald-400",
    bar: "bg-emerald-400",
    borderTop: "border-t-emerald-500/25",
    rawBorder: "border-emerald-500/20",
  },
  slate: {
    bg: "bg-[radial-gradient(130%_100%_at_0%_0%,rgba(148,163,184,0.07)_0%,transparent_80%)]",
    text: "text-slate-300",
    bar: "bg-slate-400",
    borderTop: "border-t-slate-400/20",
    rawBorder: "border-slate-400/18",
  },
  sky: {
    bg: "bg-[radial-gradient(130%_100%_at_0%_0%,rgba(56,189,248,0.07)_0%,transparent_80%)]",
    text: "text-sky-400",
    bar: "bg-sky-400",
    borderTop: "border-t-sky-400/25",
    rawBorder: "border-sky-400/20",
  },
  purple: {
    bg: "bg-[radial-gradient(130%_100%_at_0%_0%,rgba(168,85,247,0.07)_0%,transparent_80%)]",
    text: "text-purple-400",
    bar: "bg-purple-400",
    borderTop: "border-t-purple-500/25",
    rawBorder: "border-purple-500/20",
  },
  rose: {
    bg: "bg-[radial-gradient(130%_100%_at_0%_0%,rgba(244,63,94,0.07)_0%,transparent_80%)]",
    text: "text-rose-400",
    bar: "bg-rose-400",
    borderTop: "border-t-rose-500/25",
    rawBorder: "border-rose-500/20",
  },
};

// 1. UNIFIED ADMIN PAGE HEADER
export function AdminPageHeader({
  eyebrow,
  badgeText,
  title,
  searchPlaceholder = "Rechercher paire ou indicateur...",
  searchValue,
  onSearchChange,
  onSearchClick,
  rightActions,
  hideSearch = false,
}: {
  eyebrow: string;
  badgeText: string;
  title: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearchClick?: () => void;
  rightActions?: React.ReactNode;
  hideSearch?: boolean;
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 pb-1">
      {/* Left Title Lockup */}
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 whitespace-nowrap">
            {eyebrow}
          </span>
          <span className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-[#D4FF00]/12 text-[#D4FF00] border border-[#D4FF00]/30 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
            {badgeText}
          </span>
        </div>
        <h1 className="font-display text-[clamp(1.35rem,1.8vw,1.75rem)] leading-[1.15] font-bold tracking-[-0.025em] text-white [text-wrap:balance]">
          {title}
        </h1>
      </div>

      {/* Right Single-Row Utility Bar */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {rightActions}
        {!hideSearch && (
          <div
            onClick={onSearchClick}
            className="w-full sm:w-[290px] h-10 rounded-full bg-[#101218] border border-white/[0.07] hover:border-white/[0.16] px-3.5 flex items-center justify-between gap-2.5 focus-within:border-[#D4FF00]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
          >
            <SearchIcon size={15} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchValue || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="bg-transparent font-sans text-xs text-white placeholder:text-slate-400 focus:outline-none w-full cursor-pointer"
            />
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.06] font-mono text-[10px] text-slate-400 shrink-0 select-none">
              ⌘K
            </kbd>
          </div>
        )}
      </div>
    </header>
  );
}

// 2. GOLDEN KPI CARD
// Hero number ALWAYS in Crisp Pearl White (#F8FAFC)
// Micro-Precision Hover: No jumping or bouncing, smooth luminance transition over 200ms
export function CatalogueKPICard({
  title,
  value,
  unit,
  subtitle,
  icon,
  variant = "lime",
  bars = [40, 65, 50, 95],
  customRightFooter,
  customHero,
  customSubtitle,
  className = "",
  onClick,
}: {
  title: string;
  value?: string | number;
  unit?: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: WashVariant;
  bars?: number[];
  customRightFooter?: React.ReactNode;
  customHero?: React.ReactNode;
  customSubtitle?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const style = WASH_STYLES[variant];

  return (
    <div
      onClick={onClick}
      className={`rounded-[22px] p-4 sm:p-5 bg-[#0E1015] hover:bg-[#12151C] ${style.bg} border border-white/[0.06] hover:border-white/[0.12] ${style.borderTop} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_20px_40px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden flex flex-col justify-between transition-all duration-200 ease-out ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Row 1: Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300 whitespace-nowrap">
          {title}
        </span>
        {icon && <span className={`${style.text} shrink-0`}>{icon}</span>}
      </div>

      {/* Row 2: Hero Metric (Pearl White #F8FAFC + Tabular-Nums) */}
      {customHero ? (
        customHero
      ) : (
        <div className="flex items-baseline gap-2 my-1">
          <span className="font-mono text-[clamp(1.5rem,2vw,1.95rem)] leading-none font-extrabold tracking-tight tabular-nums text-[#F8FAFC]">
            {value}
          </span>
          {unit && (
            <span className="font-sans text-xs text-slate-400 font-medium whitespace-nowrap">{unit}</span>
          )}
        </div>
      )}

      {/* Row 3: Subtitle + 4-Bar Micro Sparkline */}
      <div className="flex items-end justify-between gap-1.5 pt-1">
        {customSubtitle ? (
          customSubtitle
        ) : (
          <span className="font-sans text-xs text-slate-400 font-medium leading-tight whitespace-nowrap">
            {subtitle}
          </span>
        )}
        {customRightFooter ? (
          customRightFooter
        ) : (
          <div className="flex items-end gap-[3.5px] h-4 shrink-0">
            {bars.map((h, idx) => (
              <span
                key={idx}
                style={{ height: `${h}%` }}
                className={`w-[3.5px] rounded-full ${style.bar}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 3. SCULPTED FILTER POD
export function SculptedFilterPod({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[22px] bg-[#101218] border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_16px_32px_-12px_rgba(0,0,0,0.6)] p-4 mb-5 ${className}`}
    >
      {children}
    </section>
  );
}

// 4. SCULPTED TABLE CONTAINER
export function SculptedTableContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] bg-[#101218] border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_20px_40px_-15px_rgba(0,0,0,0.7)] overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
