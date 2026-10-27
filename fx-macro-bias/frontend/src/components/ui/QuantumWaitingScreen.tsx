"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { ShiftFXMark } from "@/components/brand/ShiftFXLogo";

const TELEMETRY_STEPS = [
  "Synchronisation des différentiels de taux directeurs G10...",
  "Calcul des vecteurs de Carry Trade & volatilité implicite...",
  "Agrégation des 28 paires institutionnelles & régimes macro...",
  "Calibration des scores de conviction & biais directionnels...",
  "✓ Calibration du moteur quantitatif ShiftFX terminée.",
];

export function QuantumWaitingScreen({ isLoading }: { isLoading: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) { setStepIndex(0); return; }
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % TELEMETRY_STEPS.length);
    }, 650);
    return () => clearInterval(timer);
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(12px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#06070A]/90 backdrop-blur-xl"
        >
          {/* Concentric Quantum Pulse Orb */}
          <div className="relative flex items-center justify-center w-36 h-36 mb-8">
            {/* Outer breathing ring */}
            <motion.div
              animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full border border-[#D4FF00]/40"
            />
            {/* Middle breathing ring */}
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0, 0.25] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              className="absolute inset-4 rounded-full border border-emerald-400/30"
            />
            {/* Spinning radar ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 rounded-full border-2 border-transparent border-t-[#D4FF00] border-r-emerald-400/60 shadow-[0_0_40px_rgba(212,255,0,0.25)]"
            />
            {/* Center glass orb with ShiftFX Geometric Mark */}
            <div className="absolute w-14 h-14 rounded-2xl glass-bento bleed-lime-hero flex items-center justify-center select-none shadow-[0_0_20px_rgba(212,255,0,0.2)]">
              <ShiftFXMark size={28} animated />
            </div>
          </div>

          {/* Rolling Telemetry Text */}
          <div className="h-7 overflow-hidden text-center max-w-md">
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                initial={{ y: 16, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -16, opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.25 }}
                className="text-sm font-medium text-slate-200 tracking-wide"
              >
                {TELEMETRY_STEPS[stepIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="mt-4 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#D4FF00] to-emerald-400"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3.5, ease: "easeInOut", repeat: Infinity }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Shimmer Skeleton Bento Cards (for lazy-loaded sections) ──────────────────
export function ShimmerBentoSkeleton({ count = 6, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-bento bleed-neutral rounded-[22px] p-6 animate-shimmer min-h-[180px]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
            <div className="flex flex-col gap-1.5">
              <div className="w-24 h-3 bg-white/[0.06] rounded-full" />
              <div className="w-16 h-2 bg-white/[0.04] rounded-full" />
            </div>
          </div>
          <div className="w-20 h-7 bg-white/[0.06] rounded-lg mb-3" />
          <div className="w-full h-1 bg-white/[0.04] rounded-full mb-3" />
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-white/[0.04] rounded-full" />
            <div className="w-3/4 h-2.5 bg-white/[0.04] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
