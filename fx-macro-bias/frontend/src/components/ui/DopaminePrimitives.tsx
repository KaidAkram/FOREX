"use client";
import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ══════════════════════════════════════════════════════════════════════════════
// 1. SPRING PRESETS FOR DOPAMINE TACTILITY
// ══════════════════════════════════════════════════════════════════════════════
export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 520, damping: 30, mass: 0.6 };
export const SPRING_SILKY  = { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.8 };

// ══════════════════════════════════════════════════════════════════════════════
// 2. SPOTLIGHT GLASS BENTO CARD (Cursor-tracking radial spotlight + rim)
// ══════════════════════════════════════════════════════════════════════════════
export function SpotlightBentoCard({
  children,
  mood = "neutral",
  className = "",
  onClick,
  rounded = "rounded-[26px]",
}: {
  children: React.ReactNode;
  mood?: "bullish" | "bearish" | "neutral" | "lime-hero" | "pro";
  className?: string;
  onClick?: () => void;
  rounded?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const moodClass: Record<string, string> = {
    bullish: "bleed-bullish",
    bearish: "bleed-bearish",
    neutral: "bleed-neutral",
    "lime-hero": "bleed-lime-hero",
    pro: "bleed-pro",
  };

  const spotlightColor: Record<string, string> = {
    bullish: "rgba(16, 185, 129, 0.13)",
    bearish: "rgba(244, 63, 94, 0.13)",
    neutral: "rgba(255, 255, 255, 0.07)",
    "lime-hero": "rgba(212, 255, 0, 0.15)",
    pro: "rgba(168, 85, 247, 0.12)",
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.004 }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      transition={SPRING_SNAPPY}
      className={`glass-bento ${moodClass[mood] || ""} relative ${rounded} overflow-hidden transition-colors duration-300 ${className}`}
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      {/* Dynamic Cursor-Following Subsurface Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(480px circle at ${coords.x}px ${coords.y}px, ${spotlightColor[mood] || spotlightColor.neutral}, transparent 45%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. SLIDING PILL TRACK FILTER (Layout ID animated pills)
// ══════════════════════════════════════════════════════════════════════════════
export function DopaminePillTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  layoutGroupId,
}: {
  tabs: { id: T; label: string; count?: number; dotColor?: string }[];
  activeTab: T;
  onChange: (id: T) => void;
  layoutGroupId: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-[#0D0F15]/90 p-1.5 border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            whileTap={{ scale: 0.94 }}
            className={`relative px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
              isActive ? "text-[#07080B]" : "text-slate-400 hover:text-white"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutGroupId}
                transition={SPRING_SNAPPY}
                className="btn-dopamine-lime absolute inset-0 rounded-full z-0"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.dotColor && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isActive ? "#07080B" : tab.dotColor }}
                />
              )}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`font-mono text-[11px] ${isActive ? "text-black/75" : "text-slate-500"}`}>
                  ({tab.count})
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

import { getCountryFlagUrl, SOVEREIGN_TO_ISO } from "@/lib/macroFormatters";

// ══════════════════════════════════════════════════════════════════════════════
// 4. HIGH-RES VECTOR DUAL FLAG LOCKUP (HatScripts Circle-Flags CDN)
// ══════════════════════════════════════════════════════════════════════════════
export function FXPairFlags({ pair, size = "md" }: { pair: string; size?: "sm" | "md" | "lg" }) {
  const [base, quote] = pair.split("/");
  const baseIso = SOVEREIGN_TO_ISO[base] || SOVEREIGN_TO_ISO[base?.toUpperCase()] || "un";
  const quoteIso = SOVEREIGN_TO_ISO[quote] || SOVEREIGN_TO_ISO[quote?.toUpperCase()] || "un";
  const dim = size === "lg" ? "w-9 h-9" : size === "md" ? "w-7 h-7" : "w-5 h-5";

  return (
    <div className="flex items-center shrink-0">
      <img
        src={`https://hatscripts.github.io/circle-flags/flags/${baseIso}.svg`}
        alt={base}
        className={`${dim} rounded-full ring-2 ring-[#0E1017] shadow-md z-10 object-cover`}
      />
      {quote && (
        <img
          src={`https://hatscripts.github.io/circle-flags/flags/${quoteIso}.svg`}
          alt={quote}
          className={`${dim} -ml-2.5 rounded-full ring-2 ring-[#0E1017] shadow-md z-0 object-cover`}
        />
      )}
    </div>
  );
}

// Single currency / sovereign flag
export function CurrencyFlag({ currency, size = "md" }: { currency: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-4 h-4";
  return (
    <img
      src={getCountryFlagUrl(currency)}
      alt={currency}
      className={`${dim} rounded-full ring-1 ring-white/10 shadow-sm object-cover shrink-0`}
    />
  );
}

export function CountryFlag({ country, size = "md", className = "" }: { country: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-4 h-4";
  return (
    <img
      src={getCountryFlagUrl(country)}
      alt={country}
      className={`${dim} rounded-full ring-1 ring-white/10 shadow-sm object-cover shrink-0 ${className}`}
    />
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. CUBIC-BEZIER SVG SPARKLINE WITH GRADIENT GLOW
// ══════════════════════════════════════════════════════════════════════════════
export function GlowSparkline({
  data,
  sentiment = "bullish",
  id,
  width: w = 120,
  height: h = 38,
  className = "",
}: {
  data: number[];
  sentiment?: "bullish" | "bearish" | "neutral";
  id: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const stroke = sentiment === "bullish" ? "#10B981" : sentiment === "bearish" ? "#F43F5E" : "#94A3B8";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * w;
    const y = h - ((val - min) / range) * (h - 10) - 5;
    return [x, y] as const;
  });

  const pathD = points.reduce((acc, [x, y], i, arr) => {
    if (i === 0) return `M ${x},${y}`;
    const [prevX, prevY] = arr[i - 1];
    const cpX1 = prevX + (x - prevX) / 2;
    return `${acc} C ${cpX1},${prevY} ${cpX1},${y} ${x},${y}`;
  }, "");

  const lastPt = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`overflow-visible ${className}`}>
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${w},${h} L 0,${h} Z`} fill={`url(#grad-${id})`} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3.5" fill={stroke} className="animate-pulse" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. AMBIENT BACKGROUND MESH (Fixed behind the app viewport)
// ══════════════════════════════════════════════════════════════════════════════
export function AmbientBackgroundMesh() {
  return (
    <>
      {/* Radial ambient blooms */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: [
            "radial-gradient(circle at 15% 10%, rgba(212, 255, 0, 0.055) 0%, transparent 45%)",
            "radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 95%, rgba(99, 102, 241, 0.04) 0%, transparent 55%)",
          ].join(", "),
        }}
      />
      {/* SVG noise overlay */}
      <div className="noise-overlay" />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. STAGGERED CONTAINER for page entries
// ══════════════════════════════════════════════════════════════════════════════
export function StaggerContainer({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.055, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
        visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. MINI SPARKLINE BAR (Tiny 4-bar charts for KPI cards)
// ══════════════════════════════════════════════════════════════════════════════
export function MiniBarChart({ values, color = "#D4FF00" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px] h-6">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-[4px] rounded-full transition-all duration-300"
          style={{ height: `${Math.max(15, (v / max) * 100)}%`, backgroundColor: color, opacity: 0.6 + (i / values.length) * 0.4 }}
        />
      ))}
    </div>
  );
}
