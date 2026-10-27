"use client";
import React from "react";
import { motion } from "framer-motion";

/**
 * SHIFTFX BESPOKE GEOMETRIC MARK ("The Quantum Velocity Mobius")
 * Concept: Two interlocking aerodynamic liquidity ribbons forming an abstract 'S'
 * and a forward velocity chevron ('»'), built on a strict 32x32 geometric grid.
 * Zero generic AI lightning bolts. Scales from 16px favicon to 256px hero display.
 */
export function ShiftFXMark({
  size = 32,
  animated = false,
  className = "",
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient
          id="shiftfx-top-ribbon"
          x1="4"
          y1="6"
          x2="36"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="65%" stopColor="#D4FF00" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient
          id="shiftfx-bottom-ribbon"
          x1="36"
          y1="34"
          x2="4"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#D4FF00" />
          <stop offset="55%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
      </defs>

      {/* Upper Forward Velocity Ribbon (Speed & Execution) */}
      <motion.path
        d="M8 14.5L18.5 6H33L22.5 14.5H8Z"
        fill="url(#shiftfx-top-ribbon)"
        initial={animated ? { x: -6, opacity: 0 } : false}
        animate={animated ? { x: 0, opacity: 1 } : false}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d="M16.5 14.5L25 21.5H35.5L27 14.5H16.5Z"
        fill="#F8FAFC"
        fillOpacity="0.92"
        initial={animated ? { scaleX: 0.7, opacity: 0 } : false}
        animate={animated ? { scaleX: 1, opacity: 1 } : false}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Lower Counter-Flow Ribbon (Capital & Macro Shift) */}
      <motion.path
        d="M32 25.5L21.5 34H7L17.5 25.5H32Z"
        fill="url(#shiftfx-bottom-ribbon)"
        initial={animated ? { x: 6, opacity: 0 } : false}
        animate={animated ? { x: 0, opacity: 1 } : false}
        transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d="M23.5 25.5L15 18.5H4.5L13 25.5H23.5Z"
        fill="#D4FF00"
        initial={animated ? { scaleX: 0.7, opacity: 0 } : false}
        animate={animated ? { scaleX: 1, opacity: 1 } : false}
        transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

export function ShiftFXWordmark({
  badge = "ADMIN",
  collapsed = false,
  markSize = 24,
}: {
  badge?: string;
  collapsed?: boolean;
  markSize?: number;
}) {
  return (
    <div className="inline-flex items-center gap-3 select-none">
      <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.1] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center shrink-0">
        <ShiftFXMark size={markSize} />
      </div>
      {!collapsed && (
        <div className="flex items-center gap-2">
          <span className="font-display text-[18px] font-extrabold tracking-[-0.03em] text-white">
            Shift<span className="text-[#D4FF00]">FX</span>
          </span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-[9px] font-mono font-semibold text-slate-300 uppercase tracking-wider tabular-nums">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
