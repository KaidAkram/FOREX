"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundFX } from "@/lib/soundEngine";
import { PaintbrushIcon, CheckIcon } from "@primer/octicons-react";

export const QUANT_THEMES = [
  {
    id: "volt",
    name: "Volt Quant",
    subtitle: "Acid Lime / Obsidienne",
    color: "#D4FF00",
    rgb: "212, 255, 0",
    canvas: "#06080A",
    surface: "#0F1117",
    secondary: "#161922",
    borderActive: "rgba(212, 255, 0, 0.35)",
    wash: "rgba(212, 255, 0, 0.08)",
    muted: "rgba(212, 255, 0, 0.16)",
    glow: "0 0 24px rgba(212, 255, 0, 0.25)",
  },
  {
    id: "forest",
    name: "Émeraude Souverain",
    subtitle: "Menthe / Forêt Profonde",
    color: "#00E599",
    rgb: "0, 229, 153",
    canvas: "#040907",
    surface: "#08140F",
    secondary: "#0D1E17",
    borderActive: "rgba(0, 229, 153, 0.35)",
    wash: "rgba(0, 229, 153, 0.08)",
    muted: "rgba(0, 229, 153, 0.16)",
    glow: "0 0 24px rgba(0, 229, 153, 0.25)",
  },
  {
    id: "ocean",
    name: "Cobalt Institutionnel",
    subtitle: "Saphir / Bleu Quant",
    color: "#38BDF8",
    rgb: "56, 189, 248",
    canvas: "#040812",
    surface: "#08101E",
    secondary: "#0E182A",
    borderActive: "rgba(56, 189, 248, 0.35)",
    wash: "rgba(56, 189, 248, 0.08)",
    muted: "rgba(56, 189, 248, 0.16)",
    glow: "0 0 24px rgba(56, 189, 248, 0.25)",
  },
  {
    id: "ember",
    name: "Ambre Impérial",
    subtitle: "Or Chaud / Cuivre",
    color: "#F59E0B",
    rgb: "245, 158, 11",
    canvas: "#0A0704",
    surface: "#150F08",
    secondary: "#1E160E",
    borderActive: "rgba(245, 158, 11, 0.35)",
    wash: "rgba(245, 158, 11, 0.08)",
    muted: "rgba(245, 158, 11, 0.16)",
    glow: "0 0 24px rgba(245, 158, 11, 0.25)",
  },
] as const;

export type QuantThemeDef = (typeof QUANT_THEMES)[number];

export function applyWorkspaceTheme(theme: QuantThemeDef, announce = true) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--fx-accent", theme.color);
  root.style.setProperty("--fx-accent-rgb", theme.rgb);
  root.style.setProperty("--fx-accent-muted", theme.muted);
  root.style.setProperty("--fx-hero-wash", theme.wash);
  root.style.setProperty("--fx-accent-glow", theme.glow);
  root.style.setProperty("--color-canvas", theme.canvas);
  root.style.setProperty("--color-surface", theme.surface);
  root.style.setProperty("--color-secondary", theme.secondary);
  root.style.setProperty("--color-border-active", theme.borderActive);

  // Whole theme swapping across entire body and container viewport
  document.body.style.backgroundColor = theme.canvas;
  document.documentElement.style.backgroundColor = theme.canvas;
  const viewport = document.getElementById("admin-main-viewport");
  if (viewport) {
    viewport.style.backgroundColor = theme.canvas;
  }

  localStorage.setItem("shiftfx-accent-theme", theme.id);

  if (announce) {
    soundFX.playChime();
    window.dispatchEvent(
      new CustomEvent("shiftfx-theme-changed", {
        detail: { id: theme.id, name: theme.name, color: theme.color },
      })
    );
  }
}

// Global Toast Listener Container to display the floating pill toast on any page
export function GlobalThemeToast() {
  const [toastMsg, setToastMsg] = useState<{ name: string; color: string } | null>(null);

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail) {
        setToastMsg({ name: e.detail.name, color: e.detail.color });
        const timer = setTimeout(() => setToastMsg(null), 2600);
        return () => clearTimeout(timer);
      }
    };
    window.addEventListener("shiftfx-theme-changed", handleThemeChange);
    return () => window.removeEventListener("shiftfx-theme-changed", handleThemeChange);
  }, []);

  return (
    <AnimatePresence>
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 480, damping: 32 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-full bg-[#0C0F16]/95 backdrop-blur-xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_24px_rgba(var(--fx-accent-rgb),0.25)] flex items-center gap-2.5 text-xs font-sans font-semibold text-white pointer-events-none"
        >
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: toastMsg.color, boxShadow: `0 0 10px ${toastMsg.color}` }}
          />
          <span>Signature chromatique : {toastMsg.name}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 1. INLINE FULL WORKSPACE THEME SWITCHER (For Settings & Appearance Modals - Fernly 00:08)
export function WorkspaceThemeSwitcher() {
  const [activeTheme, setActiveTheme] = useState<string>("volt");

  useEffect(() => {
    const saved = localStorage.getItem("shiftfx-accent-theme");
    const found = QUANT_THEMES.find((t) => t.id === saved);
    if (found) {
      setActiveTheme(found.id);
      applyWorkspaceTheme(found, false);
    }
  }, []);

  const handleSelect = (theme: QuantThemeDef) => {
    setActiveTheme(theme.id);
    applyWorkspaceTheme(theme, true);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {QUANT_THEMES.map((theme) => {
        const isSelected = activeTheme === theme.id;
        return (
          <motion.button
            key={theme.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(theme)}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer ${
              isSelected
                ? "bg-white/[0.08] border-white/30 shadow-[0_12px_28px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-white/20"
                : "bg-[#0B0D13]/90 border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className="w-5 h-5 rounded-full shadow-inner flex items-center justify-center text-[#07090D]"
                style={{
                  backgroundColor: theme.color,
                  boxShadow: isSelected ? `0 0 14px ${theme.color}` : "none",
                }}
              >
                {isSelected && <CheckIcon size={12} />}
              </span>
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                {theme.id.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-sans font-bold text-sm text-white">{theme.name}</p>
              <p className="font-sans text-[11px] text-slate-400 mt-0.5">{theme.subtitle}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// 2. QUICK PALETTE COMPACT ICON SELECTOR (For Header & Navigation Topbars)
export function QuickThemePaletteButton() {
  const [open, setOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string>("volt");

  useEffect(() => {
    const saved = localStorage.getItem("shiftfx-accent-theme");
    const found = QUANT_THEMES.find((t) => t.id === saved);
    if (found) setActiveTheme(found.id);
  }, []);

  const handleSelect = (theme: QuantThemeDef) => {
    setActiveTheme(theme.id);
    applyWorkspaceTheme(theme, true);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          soundFX.playPop(1.1);
          setOpen(!open);
        }}
        title="Changer de signature chromatique"
        aria-label="Palette de thème"
        className="relative w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
      >
        <PaintbrushIcon size={15} className="text-[var(--fx-accent,#D4FF00)]" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 z-50 w-56 rounded-2xl bg-[#0D1017]/95 border border-white/15 p-2 shadow-2xl backdrop-blur-2xl flex flex-col gap-1 text-xs"
            >
              <div className="px-2.5 py-1.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/[0.06] mb-1">
                Signature Chromatique
              </div>
              {QUANT_THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => handleSelect(th)}
                  className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                    activeTheme === th.id
                      ? "bg-white/[0.1] text-white font-semibold"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: th.color }}
                    />
                    <span>{th.name}</span>
                  </div>
                  {activeTheme === th.id && <CheckIcon size={12} className="text-[#D4FF00]" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
