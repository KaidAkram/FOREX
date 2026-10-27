"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { soundFX } from "@/lib/soundEngine";
import { SyncIcon } from "@primer/octicons-react";

// 1. SMOOTH INTERPOLATING NUMBER COUNTER (Fernly Benchmark Video 00:03 - 00:05)
// Smoothly interpolates from old value to new value over 420ms without abrupt snapping
export function AnimatedMetricValue({
  value,
  decimals = 1,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const spring = useSpring(value, { stiffness: 260, damping: 30, mass: 0.5 });
  const display = useTransform(spring, (current) => {
    const fixed = current.toFixed(decimals);
    return `${prefix}${fixed}${suffix}`;
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={`tabular-nums ${className}`}>{display}</motion.span>;
}

// 2. LIQUID SVG PATH & AREA MORPHING CHART WITH MAGNETIC SCRUBBER (Fernly Video 00:03 - 00:05)
export function MorphingSplineChart({
  data,
  labels,
  accentColor = "var(--fx-accent, #D4FF00)",
  height = 110,
  onHoverPoint,
}: {
  data: number[];
  labels?: string[];
  accentColor?: string;
  height?: number;
  onHoverPoint?: (val: number | null, idx: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 360;
  const padY = 14;

  const validData = data && data.length > 0 ? data : [0, 0, 0, 0];
  const max = Math.max(...validData);
  const min = Math.min(...validData);
  const range = max - min || 1;

  const pts = validData.map((val, i) => {
    const x = (i / (validData.length - 1)) * width;
    const y = height - padY - ((val - min) / range) * (height - padY * 2);
    return { x, y, val };
  });

  // Build smooth Cubic-Bezier SVG path
  const linePath = pts.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    const prev = arr[i - 1];
    const cpX = prev.x + (pt.x - prev.x) * 0.5;
    return `${acc} C ${cpX.toFixed(1)},${prev.y.toFixed(1)} ${cpX.toFixed(1)},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, "");

  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (validData.length - 1));
    if (idx !== hoverIdx) {
      setHoverIdx(idx);
      soundFX.playTick();
      if (onHoverPoint) onHoverPoint(validData[idx], idx);
    }
  };

  const handleMouseLeave = () => {
    setHoverIdx(null);
    if (onHoverPoint) onHoverPoint(null, null);
  };

  const activePoint = hoverIdx !== null ? pts[hoverIdx] : pts[pts.length - 1];

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-auto overflow-visible cursor-crosshair"
      >
        <defs>
          <linearGradient id="morph-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Morphing Area Fill */}
        <motion.path
          animate={{ d: areaPath }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          fill="url(#morph-area-grad)"
        />

        {/* Morphing Spline Curve */}
        <motion.path
          animate={{ d: linePath }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          fill="none"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Magnetic Vertical Crosshair Line on Hover */}
        {hoverIdx !== null && activePoint && (
          <line
            x1={activePoint.x}
            y1={0}
            x2={activePoint.x}
            y2={height}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* Glowing Active Data Node */}
        {activePoint && (
          <motion.circle
            animate={{ cx: activePoint.x, cy: activePoint.y }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            r={hoverIdx !== null ? 4.5 : 3.5}
            fill="#07080C"
            stroke={accentColor}
            strokeWidth="2.5"
          />
        )}
      </svg>

      {/* Floating Crosshair Readout Pill */}
      {hoverIdx !== null && activePoint && (
        <div
          style={{ left: `${(activePoint.x / width) * 100}%` }}
          className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full px-2.5 py-1 rounded-full bg-[#0A0C12]/95 border border-white/15 shadow-xl flex items-center gap-1.5 text-[11px] font-mono text-white whitespace-nowrap z-20"
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <span>{labels?.[hoverIdx] ?? `Point ${hoverIdx + 1}`}:</span>
          <span className="font-bold text-[#D4FF00]">{activePoint.val > 0 ? `+${activePoint.val.toFixed(1)}` : activePoint.val.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// 3. STAGGERED BASELINE BAR GROWTH (Fernly Video 00:10 & 00:12)
// Animates from scaleY: 0 to scaleY: 1 (transformOrigin: "bottom") with 35ms per-bar stagger
export function StaggeredBaselineBars({
  bars,
  accentColor = "var(--fx-accent, #D4FF00)",
  height = 54,
  className = "",
}: {
  bars: { label: string; value: number; formatted?: string }[];
  accentColor?: string;
  height?: number;
  className?: string;
}) {
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1);

  return (
    <div className={`flex items-end gap-2 h-[${height}px] ${className}`} style={{ height }}>
      {bars.map((bar, idx) => {
        const heightPct = Math.max(12, Math.min(100, (Math.abs(bar.value) / max) * 100));
        const isPositive = bar.value >= 0;

        return (
          <div
            key={bar.label + idx}
            onMouseEnter={() => soundFX.playTick()}
            className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
          >
            {/* Tooltip on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute -top-7 px-2 py-0.5 rounded-md bg-[#0D1016] border border-white/10 text-[10px] font-mono text-white whitespace-nowrap pointer-events-none z-10">
              {bar.label}: <span className="font-bold">{bar.formatted ?? `${bar.value.toFixed(1)}%`}</span>
            </div>

            {/* Staggered Vertical Scale */}
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{
                delay: idx * 0.035,
                type: "spring",
                stiffness: 380,
                damping: 28,
              }}
              style={{
                height: `${heightPct}%`,
                transformOrigin: "bottom",
                backgroundColor: isPositive ? accentColor : "#F43F5E",
              }}
              className="w-full rounded-t-[4px] transition-all group-hover:brightness-125"
            />
            <span className="font-mono text-[9px] text-slate-400 mt-1 truncate max-w-full">
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 4. TWO-STAGE CONTENT MORPH & GHOST-WIREFRAME DISSOLVE (Fernly Video 00:01 & 00:11)
// Stage 1 (0-110ms): Translucent Ghost-Wireframe Overlay (opacity-35 blur-[1px]) with 16px spinner
// Stage 2 (110ms-380ms): Cascading low-mass spring (stiffness: 460, damping: 34, mass: 0.4)
export function GhostWireframeDissolve({
  children,
  isRefreshing,
  className = "",
}: {
  children: React.ReactNode;
  isRefreshing: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Stage 1: Active Loading Spinner Badge */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.12 }}
            className="absolute top-2 left-2 z-30 px-2.5 py-1 rounded-full bg-[#07090E]/90 border border-[#D4FF00]/40 backdrop-blur-md flex items-center gap-1.5 shadow-lg"
          >
            <SyncIcon size={12} className="text-[#D4FF00] animate-spin" />
            <span className="font-mono text-[10px] text-white font-medium">Actualisation flux...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 2: Low-mass spring cascade container */}
      <motion.div
        animate={
          isRefreshing
            ? { opacity: 0.35, filter: "blur(1px)", scale: 0.995 }
            : { opacity: 1, filter: "blur(0px)", scale: 1 }
        }
        transition={{
          duration: 0.18,
          ease: "easeInOut",
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.038,
                delayChildren: 0.02,
              },
            },
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}

// Child item for GhostWireframeDissolve cascade
export function GhostCascadeItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { y: 10, opacity: 0, scale: 0.985 },
        visible: {
          y: 0,
          opacity: 1,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 460,
            damping: 34,
            mass: 0.4,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
