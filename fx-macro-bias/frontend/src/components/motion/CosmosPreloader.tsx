"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundFX } from "@/lib/soundEngine";

interface CosmosPreloaderProps {
  /** If true, forcibly displays the preloader */
  forceShow?: boolean;
  /** Callback fired when the exit animation completes */
  onComplete?: () => void;
}

const QUANT_STAGES = [
  { threshold: 0, text: "01 // INGESTING G10 CENTRAL BANK YIELD CURVES" },
  { threshold: 24, text: "02 // COMPUTING CROSS-CURRENCY VOLATILITY & CARRY SPREADS" },
  { threshold: 52, text: "03 // RECONCILING MULTI-PILLAR CONVICTION REGIMES" },
  { threshold: 78, text: "04 // CALIBRATING 28 ACTIVE PAIR INSTITUTIONAL BIASES" },
  { threshold: 100, text: "05 // SYSTEM SYNCHRONIZED • TERMINAL READY" },
];

export function CosmosPreloader({ forceShow, onComplete }: CosmosPreloaderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(QUANT_STAGES[0].text);
  const soundMilestones = useRef(new Set<number>());

  const runAnimation = () => {
    setIsVisible(true);
    setProgress(0);
    soundMilestones.current.clear();

    const startTime = performance.now();
    const duration = 1800; // 1.8 seconds total count up

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const rawPct = Math.min(100, Math.floor((elapsed / duration) * 100));

      // Ease out progress calculation
      const t = Math.min(1, elapsed / duration);
      // Quad ease out: 1 - (1 - t) * (1 - t)
      const easedPct = Math.min(100, Math.floor((1 - Math.pow(1 - t, 2.2)) * 100));

      setProgress(easedPct);

      // Sound ticks at every 20%
      const step20 = Math.floor(easedPct / 20) * 20;
      if (step20 > 0 && !soundMilestones.current.has(step20)) {
        soundMilestones.current.add(step20);
        soundFX.playPop(1 + step20 * 0.005);
      }

      // Update quantitative pipeline stage text
      for (let i = QUANT_STAGES.length - 1; i >= 0; i--) {
        if (easedPct >= QUANT_STAGES[i].threshold) {
          setCurrentStage(QUANT_STAGES[i].text);
          break;
        }
      }

      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        setProgress(100);
        setCurrentStage("05 // SYSTEM SYNCHRONIZED • TERMINAL READY");
        soundFX.playChime();
        // Hold at 100% for 240ms, then initiate upward shutter wipe
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 260);
      }
    };

    requestAnimationFrame(frame);
  };

  useEffect(() => {
    // Check if previously loaded in this session to avoid interrupting rapid navigation
    const hasLoaded = sessionStorage.getItem("shiftfx-preloader-executed");

    if (forceShow || !hasLoaded) {
      sessionStorage.setItem("shiftfx-preloader-executed", "true");
      runAnimation();
    }

    const handleReplay = () => {
      runAnimation();
    };

    window.addEventListener("shiftfx-play-preloader", handleReplay);
    return () => window.removeEventListener("shiftfx-play-preloader", handleReplay);
  }, [forceShow]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="cosmos-preloader"
          initial={{ y: 0 }}
          exit={{ 
            y: "-100%", 
            transition: { 
              duration: 0.85, 
              ease: [0.87, 0, 0.13, 1] // Cosmos signature upward curtain wipe
            } 
          }}
          className="fixed inset-0 z-[99999] bg-[#050608] text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden"
          style={{ willChange: "transform" }}
        >
          {/* Subtle Ambient Vignette & Grain Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(var(--fx-accent-rgb,212,255,0),0.06)_0%,transparent_75%)]" />

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TOP BAR & CORNER CROSSHAIRS                                        */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 flex items-start justify-between font-mono text-[11px] text-slate-400 uppercase tracking-widest">
            {/* Top Left Crosshair & Studio Identity */}
            <div className="flex items-center gap-3">
              <span className="text-[var(--fx-accent,#D4FF00)] font-bold text-sm">+</span>
              <div className="flex flex-col">
                <span className="text-white font-bold tracking-wider">SHIFTFX // COSMOS ENGINE</span>
                <span className="text-[9px] text-slate-500">BUILD 2026.10 • LATENCY 0.14ms</span>
              </div>
            </div>

            {/* Top Center Telemetry Tag */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--fx-accent,#D4FF00)] animate-ping" />
              <span className="text-[10px] text-slate-300">INIT CALIBRATION SEQUENCE</span>
            </div>

            {/* Top Right Crosshair */}
            <div className="flex items-center gap-3 text-right">
              <div className="flex flex-col">
                <span className="text-slate-300">UTC SYNCHRONIZED</span>
                <span className="text-[9px] text-slate-500">G10 QUANT TERMINAL</span>
              </div>
              <span className="text-[var(--fx-accent,#D4FF00)] font-bold text-sm">+</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* CENTER: MASSIVE COSMOS COUNTER + LASER HAIRLINE PROGRESS           */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            {/* Minimalist Grid Watermark */}
            <div className="absolute -top-16 font-mono text-[10px] text-slate-600 tracking-[0.3em] uppercase">
              INDEXING QUANTITATIVE BIAS
            </div>

            {/* Massive Monospace Percentage Display */}
            <div className="relative flex items-baseline">
              <span className="font-mono font-black text-7xl sm:text-9xl md:text-[12rem] tracking-tighter text-white tabular-nums drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]">
                {String(progress).padStart(2, "0")}
              </span>
              <span className="font-mono text-2xl sm:text-4xl md:text-5xl font-light text-[var(--fx-accent,#D4FF00)] ml-2">
                %
              </span>
            </div>

            {/* Laser Hairline Progress Bar */}
            <div className="w-full max-w-md sm:max-w-xl h-[1.5px] bg-white/[0.08] relative rounded-full overflow-hidden mt-6 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
              <motion.div
                className="h-full bg-gradient-to-r from-transparent via-[var(--fx-accent,#D4FF00)] to-white relative"
                style={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              >
                {/* Glowing Lead Spark */}
                <div 
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_12px_var(--fx-accent,#D4FF00)]" 
                />
              </motion.div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* BOTTOM BAR: PIPELINE STAGE TELEMETRY & BOTTOM CROSSHAIRS          */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 flex items-end justify-between font-mono text-[11px] text-slate-400">
            {/* Bottom Left Crosshair & Live Stage Readout */}
            <div className="flex items-center gap-3">
              <span className="text-[var(--fx-accent,#D4FF00)] font-bold text-sm">+</span>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">INGESTION PIPELINE</span>
                <span className="text-xs text-white font-mono font-semibold tracking-wide h-4">
                  {currentStage}
                </span>
              </div>
            </div>

            {/* Bottom Right Crosshair & Ready Indicator */}
            <div className="flex items-center gap-3 text-right">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">CORE STATUS</span>
                <span className="text-xs font-mono font-bold text-[var(--fx-accent,#D4FF00)]">
                  {progress === 100 ? "DEPLOYED // [OK]" : "RUNNING // [0.14s]"}
                </span>
              </div>
              <span className="text-[var(--fx-accent,#D4FF00)] font-bold text-sm">+</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
