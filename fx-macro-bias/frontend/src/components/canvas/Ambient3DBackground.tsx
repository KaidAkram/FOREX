"use client";
import React from "react";
import { motion } from "framer-motion";

export function Ambient3DBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Soft Ambient Atmospheric Light Pools */}
      <div
        className="absolute -top-32 left-1/4 w-[650px] h-[650px] rounded-full opacity-[0.045] blur-[130px]"
        style={{ background: "radial-gradient(circle, #D4FF00 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-24 w-[550px] h-[550px] rounded-full opacity-[0.04] blur-[120px]"
        style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)" }}
      />

      {/* 3D Object 1: Sculpted Isometric Glass Torus (Top-Right Background) */}
      <motion.div
        animate={{
          y: [0, -18, 0],
          rotateZ: [0, 8, 0],
          rotateX: [18, 26, 18],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[7%] right-[6%] w-72 h-72 opacity-[0.065] blur-[0.5px]"
        style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
      >
        <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="torusRim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D4FF00" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <ellipse
            cx="120"
            cy="120"
            rx="96"
            ry="52"
            transform="rotate(-24 120 120)"
            stroke="url(#torusRim)"
            strokeWidth="1.5"
          />
          <ellipse
            cx="120"
            cy="120"
            rx="76"
            ry="38"
            transform="rotate(-24 120 120)"
            stroke="url(#torusRim)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <ellipse
            cx="120"
            cy="120"
            rx="54"
            ry="25"
            transform="rotate(-24 120 120)"
            stroke="url(#torusRim)"
            strokeWidth="2"
          />
        </svg>
      </motion.div>

      {/* 3D Object 2: Precision Quantitative Octahedron Lattice (Mid-Left Background) */}
      <motion.div
        animate={{
          y: [0, 22, 0],
          rotateY: [0, 15, 0],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[46%] left-[12%] w-64 h-64 opacity-[0.05] blur-[1px]"
      >
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
          <polygon points="100,15 175,100 100,185 25,100" stroke="#94A3B8" strokeWidth="1.2" />
          <polygon points="100,15 145,100 100,185 55,100" stroke="#10B981" strokeWidth="1" />
          <line
            x1="25"
            y1="100"
            x2="175"
            y2="100"
            stroke="#D4FF00"
            strokeWidth="0.8"
            strokeDasharray="4 4"
          />
        </svg>
      </motion.div>

      {/* 3D Object 3: Gyroscope Ring (Bottom-Right Background) */}
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotateZ: [0, -12, 0],
          rotateX: [-15, -25, -15],
        }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[10%] right-[15%] w-56 h-56 opacity-[0.045] blur-[1px]"
        style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
      >
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
          <circle cx="100" cy="100" r="85" stroke="#D4FF00" strokeWidth="1" strokeOpacity="0.7" />
          <ellipse cx="100" cy="100" rx="85" ry="32" stroke="#10B981" strokeWidth="1.2" strokeDasharray="5 3" />
          <ellipse cx="100" cy="100" rx="32" ry="85" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.4" />
        </svg>
      </motion.div>
    </div>
  );
}
