"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  StarIcon,
  StarFillIcon,
  ZapIcon,
  ArrowRightIcon,
  SparklesFillIcon,
} from "@primer/octicons-react";
import {
  AnimatedMetricValue,
  MorphingSplineChart,
} from "@/components/motion/AnimatedNumberAndMorphChart";
import { soundFX } from "@/lib/soundEngine";
import { getCountryFlagUrl } from "@/lib/macroFormatters";

export interface TraderPairData {
  pair: string;
  countriesFr: string;
  tier: "BASIC" | "PRO";
  regime: "ACHETEUR" | "VENDEUR" | "NEUTRE";
  score: number; // e.g. 30.0, -31.7, -18.3
  confidence: number; // e.g. 55
  thesis: string;
  carryText: string; // e.g. "+2.40% Portage (EUR)"
  sparkline: number[];
  forecast3M: { month: string; val: number }[]; // [{month: 'Oct', val: -18.3}, ...]
  isFavorite?: boolean;
  isLocked?: boolean;
  rawSignal?: any;
}

export function TraderPairCard({
  item,
  onToggleFavorite,
  onOpenDetails,
  onUnlockPro,
}: {
  item: TraderPairData;
  onToggleFavorite?: (pair: string) => void;
  onOpenDetails?: (item: TraderPairData) => void;
  onUnlockPro?: () => void;
}) {
  const [fav, setFav] = useState(Boolean(item.isFavorite));
  const [base, quote] = item.pair.split("/");

  useEffect(() => {
    setFav(Boolean(item.isFavorite));
  }, [item.isFavorite]);

  // STRICT 3-REGIME SEMANTIC COLOR LAW
  // ACHETEUR >= +20% -> Emerald
  // VENDEUR <= -20% -> Rose
  // NEUTRE (-19.9% to +19.9%) -> Pearl White (text-slate-100) & Silver-Slate (#94A3B8)
  const isBull = item.regime === "ACHETEUR";
  const isBear = item.regime === "VENDEUR";

  const scoreColor = isBull
    ? "text-emerald-400 drop-shadow-[0_0_16px_rgba(16,185,129,0.22)]"
    : isBear
    ? "text-rose-400 drop-shadow-[0_0_16px_rgba(244,63,94,0.22)]"
    : "text-slate-100";

  const chartAccent = isBull ? "#10B981" : isBear ? "#F43F5E" : "#94A3B8";

  const washStyle = isBull
    ? "bg-[radial-gradient(120%_100%_at_0%_0%,rgba(16,185,129,0.08)_0%,transparent_75%)] hover:border-emerald-500/30"
    : isBear
    ? "bg-[radial-gradient(120%_100%_at_0%_0%,rgba(244,63,94,0.08)_0%,transparent_75%)] hover:border-rose-500/30"
    : "bg-[radial-gradient(120%_100%_at_0%_0%,rgba(148,163,184,0.06)_0%,transparent_75%)] hover:border-white/20";

  const regimeBadge = isBull
    ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-400"
    : isBear
    ? "bg-rose-500/12 border-rose-500/30 text-rose-400"
    : "bg-white/[0.05] border-white/[0.1] text-slate-300";

  // Closed 2-Layer Radial Confidence Ring Math
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (item.confidence / 100) * circumference;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 460, damping: 34, mass: 0.4 }}
      onClick={() => {
        if (item.isLocked) {
          onUnlockPro?.();
        } else {
          soundFX.playPop();
          onOpenDetails?.(item);
        }
      }}
      className={`group relative rounded-[24px] bg-[#0F1218] ${washStyle} border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_40px_-15px_rgba(0,0,0,0.7)] p-5 flex flex-col justify-between cursor-pointer transition-colors duration-200 overflow-hidden`}
    >
      {/* ROW 1: Flags + Ticker + Tier Pill + Favorite Star + Regime Pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center shrink-0">
            <img
              src={getCountryFlagUrl(base)}
              alt={base}
              className="w-8 h-8 rounded-full ring-2 ring-[#0F1218] z-10 shrink-0"
              loading="lazy"
            />
            <img
              src={getCountryFlagUrl(quote)}
              alt={quote}
              className="w-8 h-8 -ml-2.5 rounded-full ring-2 ring-[#0F1218] z-0 shrink-0"
              loading="lazy"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[18px] font-extrabold tracking-tight text-white leading-none">
                {item.pair}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${
                  item.tier === "PRO"
                    ? "bg-purple-500/15 border-purple-400/30 text-purple-300"
                    : "bg-sky-500/15 border-sky-400/30 text-sky-300"
                }`}
              >
                {item.tier}
              </span>
            </div>
            <p className="font-sans text-xs text-slate-400 mt-1 truncate">
              {item.countriesFr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Interactive Favorite Button with Hit Slop & Spring Pop */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              const next = !fav;
              setFav(next);
              if (next) soundFX.playChime();
              else soundFX.playPop();
              onToggleFavorite?.(item.pair);
            }}
            className="relative w-7 h-7 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {fav ? (
              <StarFillIcon className="text-[#D4FF00]" size={14} />
            ) : (
              <StarIcon size={14} />
            )}
          </motion.button>

          <span
            className={`px-2.5 py-1 rounded-full border text-[10px] font-sans font-bold tracking-wider uppercase flex items-center gap-1.5 ${regimeBadge}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: chartAccent }}
            />
            {item.regime}
          </span>
        </div>
      </div>

      {/* ROW 2: Tabular Score + Interactive Scrubbing Sparkline + Closed Radial Confidence Ring */}
      <div className="flex items-center justify-between gap-3 my-4 py-2 border-y border-white/[0.05]">
        <div className="shrink-0">
          <AnimatedMetricValue
            value={item.score}
            decimals={1}
            prefix={item.score > 0 ? "+" : ""}
            suffix="%"
            className={`text-[28px] sm:text-[30px] leading-none font-mono font-extrabold tracking-tight tabular-nums ${scoreColor}`}
          />
        </div>

        <div className="w-28 shrink-0" onClick={(e) => e.stopPropagation()}>
          <MorphingSplineChart
            data={item.sparkline}
            accentColor={chartAccent}
            height={38}
          />
        </div>

        {/* Closed 2-Layer Radial Confidence Ring + Label */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          title={`Confiance du modèle : ${item.confidence}%`}
        >
          <svg className="w-4 h-4 -rotate-90 shrink-0" viewBox="0 0 18 18">
            <circle
              cx="9"
              cy="9"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="2"
            />
            <circle
              cx="9"
              cy="9"
              r={radius}
              fill="none"
              stroke={chartAccent}
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <span className="font-mono text-xs text-slate-300 tabular-nums">
            {item.confidence}%
          </span>
        </div>
      </div>

      {/* ROW 3: Macro Thesis Paragraph in Warm Satoshi */}
      <p className="font-sans text-[13px] text-slate-300/90 leading-relaxed line-clamp-2 min-h-[40px] [text-wrap:pretty]">
        {item.thesis}
      </p>

      {/* ROW 4: Clean 3-Month Forward Trajectory Pills */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/[0.05]">
        <span className="font-sans text-[11px] font-medium text-slate-400">
          Horizon 3M
        </span>
        <div className="flex items-center gap-1.5">
          {item.forecast3M.map((f) => {
            const fColor =
              f.val >= 20
                ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/10"
                : f.val <= -20
                ? "text-rose-400 border-rose-500/25 bg-rose-500/10"
                : "text-slate-300 border-white/[0.07] bg-white/[0.03]";
            return (
              <span
                key={f.month}
                className={`px-2 py-0.5 rounded-md border font-mono text-[10px] tabular-nums ${fColor}`}
              >
                {f.month} {f.val > 0 ? `+${f.val.toFixed(1)}%` : `${f.val.toFixed(1)}%`}
              </span>
            );
          })}
        </div>
      </div>

      {/* ROW 5: Carry Pill + Magnetic Details Link */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/[0.04]">
        <span className="inline-flex items-center gap-1.5 font-sans text-xs text-slate-300">
          <ZapIcon className="text-[#D4FF00]" size={13} />
          <span>{item.carryText}</span>
        </span>

        <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-slate-400 group-hover:text-[#D4FF00] transition-colors">
          <span>Détails</span>
          <ArrowRightIcon
            className="transition-transform duration-200 group-hover:translate-x-1"
            size={13}
          />
        </span>
      </div>

      {/* Frosted Holographic Vault Overlay for Pro pairs in Basic tier mode */}
      {item.isLocked && (
        <div className="absolute inset-0 bg-[#06070A]/85 backdrop-blur-md z-20 flex flex-col items-center justify-center p-5 text-center rounded-[24px] overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, rgba(168, 85, 247, 0.28) 0%, rgba(59, 130, 246, 0.08) 45%, transparent 75%)",
            }}
          />
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/25 via-indigo-500/15 to-transparent border border-purple-400/35 shadow-[0_0_24px_rgba(168,85,247,0.35)] flex items-center justify-center mb-2.5">
            <SparklesFillIcon size={18} className="text-purple-300" />
          </div>
          <span className="relative z-10 font-display text-sm font-bold text-white mb-1 tracking-tight">
            Plan Pro Institutionnel
          </span>
          <p className="relative z-10 font-sans text-[11px] text-slate-300 mb-3 max-w-[210px] leading-relaxed">
            Analyse quantitative institutionnelle &amp; prévisions 3 mois exclusives.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={(e) => {
              e.stopPropagation();
              onUnlockPro?.();
            }}
            className="relative z-10 px-4 py-2 rounded-full text-xs font-sans font-bold bg-[#D4FF00] text-black shadow-[0_0_20px_rgba(212,255,0,0.35)] flex items-center gap-1.5 cursor-pointer"
          >
            <span>Débloquer les 28 Paires Pro →</span>
          </motion.button>
        </div>
      )}
    </motion.article>
  );
}
