"use client";

import React from "react";
import { Menu } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { AuthHeaderWidget } from "./AuthHeaderWidget";

export function MobileTopBar() {
  const { toggleMobile } = useSidebar();

  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-[#032221]/95 backdrop-blur-2xl border-b border-[#0B453A] sticky top-0 z-30 flex-shrink-0 shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobile}
          className="p-2 rounded-xl bg-[#06302B] hover:bg-[#095544] border border-[#0B453A] text-[#AACBC4] hover:text-[#F1F7F6] transition-colors active:scale-95"
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#06302B] border border-[#0B453A] p-1 flex items-center justify-center shadow-sm">
            <img src="/logo.svg" alt="ShiftFX" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-black text-lg text-[#F1F7F6] tracking-tight leading-none">
              Shift<span className="text-[#00DF81]">FX</span>
            </span>
            <span className="text-[8px] font-mono tracking-widest text-[#00DF81] uppercase font-bold mt-0.5">
              Engine
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AuthHeaderWidget />
      </div>
    </header>
  );
}
