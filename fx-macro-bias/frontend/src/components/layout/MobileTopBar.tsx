"use client";

import React from "react";
import Link from "next/link";
import {
  ThreeBarsIcon,
  SearchIcon,
} from "@primer/octicons-react";
import { ShiftFXMark } from "@/components/brand/ShiftFXLogo";
import { PeriodSelectorPopover } from "@/components/shell/PeriodSelectorPopover";

export function MobileTopBar({
  onOpenMobileMenu,
  onOpenSearch,
  selectedPeriod = "2026-10",
  onSelectPeriod,
}: {
  onOpenMobileMenu?: () => void;
  onOpenSearch?: () => void;
  selectedPeriod?: string;
  onSelectPeriod?: (p: string) => void;
}) {
  return (
    <header className="lg:hidden h-14 px-3 sm:px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#07080C]/90 backdrop-blur-xl sticky top-0 z-30 flex-shrink-0 pt-[env(safe-area-inset-top)]">
      {/* Left: Drawer Trigger + Brand Orb + ShiftFX + LIVE dot */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="relative w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 after:absolute after:-inset-2 after:content-['']"
          aria-label="Ouvrir le menu de navigation"
        >
          <ThreeBarsIcon size={16} />
        </button>

        <Link href="/admin/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-emerald-400/25 to-emerald-950/60 border border-emerald-300/30 flex items-center justify-center shadow-sm shrink-0">
            <ShiftFXMark size={18} />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-display font-extrabold text-sm tracking-tight text-white whitespace-nowrap">
              Shift<span className="text-[#D4FF00]">FX</span>
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-mono text-[8px] font-bold text-emerald-400 uppercase tracking-wider tabular-nums">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Search Button + Compact Period Selector + HQ Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Compact ⌘K Search Button with Hit-Slop */}
        <button
          onClick={onOpenSearch}
          className="relative w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 after:absolute after:-inset-2 after:content-['']"
          title="Rechercher (⌘K)"
          aria-label="Rechercher"
        >
          <SearchIcon size={14} className="text-[#D4FF00]" />
        </button>

        {/* Compact Period Popover */}
        <PeriodSelectorPopover
          compact={true}
          align="right"
          selected={selectedPeriod}
          onSelect={onSelectPeriod}
        />

        {/* Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-300 p-[1.5px] shrink-0">
          <div className="w-full h-full rounded-full bg-[#0A0D12] flex items-center justify-center font-mono text-[10px] font-bold text-emerald-300">
            HQ
          </div>
        </div>
      </div>
    </header>
  );
}
