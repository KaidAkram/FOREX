"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShiftFXMark } from "@/components/brand/ShiftFXLogo";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  AppsIcon,
  GraphIcon,
  SlidersIcon,
  DatabaseIcon,
  PulseIcon,
  GlobeIcon,
  GearIcon,
  LinkExternalIcon,
  SignOutIcon,
} from "@primer/octicons-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { SPRING_WEIGHTLESS } from "@/lib/uxEngineeringStandards";
import { playTabSound } from "@/lib/soundEffects";

export interface NavItemDef {
  id: string;
  href: string;
  label: string;
  icon: React.ElementType;
}

export const ADMIN_NAV_ITEMS: NavItemDef[] = [
  { id: "dashboard", href: "/admin/dashboard", label: "Tableau de Bord", icon: AppsIcon },
  { id: "analytics", href: "/admin/analytics", label: "Analytique", icon: GraphIcon },
  { id: "rules", href: "/admin/rating-rules", label: "Règles de Notation", icon: SlidersIcon },
  { id: "macro", href: "/admin/macro-data", label: "Données Macro", icon: DatabaseIcon },
  { id: "score", href: "/admin/final-score", label: "Score Final", icon: PulseIcon },
  { id: "catalog", href: "/admin/catalog", label: "Catalogue Utilisateur", icon: GlobeIcon },
  { id: "settings", href: "/admin/settings", label: "Paramètres", icon: GearIcon },
];

export function CollapsibleGlassSidebar({
  activeId,
  onSelect,
  isMobileDrawer = false,
  onCloseMobile,
}: {
  activeId?: string;
  onSelect?: (id: string) => void;
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [optimisticActive, setOptimisticActive] = useState<string | null>(null);

  // Eagerly prefetch all 7 admin routes so page navigation is instantaneous (<16ms)
  useEffect(() => {
    ADMIN_NAV_ITEMS.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  useEffect(() => {
    setOptimisticActive(null);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("shiftfx-sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("shiftfx-sidebar-collapsed", String(next));
  };

  const isCurrentActive = (item: NavItemDef) => {
    if (optimisticActive) return item.href === optimisticActive;
    if (activeId) return item.id === activeId;
    return pathname === item.href;
  };

  const effectiveCollapsed = isMobileDrawer ? false : collapsed;
  const sidebarWidth = effectiveCollapsed ? 84 : 264;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobileDrawer ? "100%" : sidebarWidth }}
      transition={SPRING_WEIGHTLESS}
      className={`flex flex-col justify-between shrink-0 select-none z-30 relative overflow-hidden ${
        isMobileDrawer
          ? "w-full h-full rounded-[28px] p-3.5"
          : "hidden lg:flex my-3 ml-3 rounded-[28px] p-3 h-[calc(100vh-24px)] sticky top-3"
      }`}
      style={{
        background:
          "linear-gradient(180deg, rgba(16, 42, 34, 0.55) 0%, rgba(10, 14, 18, 0.94) 42%, rgba(7, 9, 13, 0.98) 100%)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 24px 48px -12px rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Top Ambient Radial Bloom */}
      <div
        className="pointer-events-none absolute top-0 inset-x-0 h-44 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 30% 0%, rgba(16, 185, 129, 0.22) 0%, transparent 70%)",
        }}
      />

      {/* TOP BRAND LOCKUP + COLLAPSE BUTTON */}
      <div className="relative z-10 flex items-center justify-between px-1 pt-1 pb-4">
        <Link
          href="/admin/dashboard"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onSelect) onSelect("dashboard");
            if (onCloseMobile) onCloseMobile();
          }}
          className="flex items-center gap-3 min-w-0 group cursor-pointer relative after:absolute after:-inset-2 after:content-['']"
        >
          {/* Tactile 3D Glass Brand Orb */}
          <div className="w-11 h-11 rounded-full bg-gradient-to-b from-emerald-400/25 to-emerald-950/60 border border-emerald-300/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),0_4px_16px_rgba(16,185,129,0.22)] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
            <ShiftFXMark size={24} animated />
          </div>

          <AnimatePresence initial={false}>
            {!effectiveCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
              >
                <span className="font-display text-[17px] font-extrabold tracking-tight text-white">
                  Shift<span className="text-[#D4FF00]">FX</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/35 font-mono text-[9px] font-bold text-[#D4FF00] uppercase tracking-wider tabular-nums">
                  Admin
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {!isMobileDrawer && (
          <>
            {!collapsed && (
              <button
                onClick={toggleSidebar}
                title="Réduire le menu"
                aria-label="Réduire le menu"
                className="relative w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.1] flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer after:absolute after:-inset-2.5 after:content-['']"
              >
                <ChevronLeftIcon size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Expand Trigger when Collapsed */}
      {!isMobileDrawer && collapsed && (
        <div className="relative z-10 flex justify-center -mt-2 mb-3">
          <button
            onClick={toggleSidebar}
            title="Déployer le menu"
            aria-label="Déployer le menu"
            className="relative w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.1] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer after:absolute after:-inset-2.5 after:content-['']"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      )}

      {/* NAVIGATION CAPSULES */}
      <nav className="relative z-10 flex-1 space-y-2 flex flex-col items-center overflow-y-auto no-scrollbar py-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isCurrentActive(item);

          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              onMouseEnter={() => router.prefetch(item.href)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                playTabSound();
                setOptimisticActive(item.href);
                if (onSelect) {
                  onSelect(item.id);
                }
                if (onCloseMobile) onCloseMobile();
              }}
              title={effectiveCollapsed ? item.label : undefined}
              className={`group relative flex items-center transition-colors duration-150 cursor-pointer ${
                effectiveCollapsed
                  ? "w-11 h-11 justify-center rounded-full"
                  : "w-full h-11 px-3 rounded-full justify-start gap-3"
              } ${
                isActive
                  ? "text-[#07090D] font-semibold"
                  : "text-slate-300/85 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04]"
              }`}
            >
              {/* Luminous Active Capsule Pill */}
              {isActive && (
                <motion.div
                  layoutId={isMobileDrawer ? "sidebar-mobile-active" : "sidebar-active-capsule"}
                  transition={SPRING_WEIGHTLESS}
                  className="absolute inset-0 rounded-full bg-[#F8FAFC] shadow-[0_6px_24px_rgba(255,255,255,0.22),inset_0_1px_0_rgba(255,255,255,1)] z-0"
                />
              )}

              <span
                className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                  isActive ? "text-[#07090D]" : "text-slate-300"
                }`}
              >
                <Icon size={18} />
              </span>

              <AnimatePresence initial={false}>
                {!effectiveCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.12 }}
                    className="relative z-10 font-sans text-[13px] font-medium tracking-tight whitespace-nowrap"
                  >
                    {t(`nav.${item.id}`) || item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* BOTTOM PROFILE POD & LANGUAGE TOGGLE */}
      <div className="relative z-10 pt-3 border-t border-white/[0.06] flex flex-col gap-2">
        {!effectiveCollapsed && (
          <div className="flex items-center justify-between px-1 text-[11px] font-mono">
            <span className="text-slate-400">LANGUE / LANG :</span>
            <div className="flex items-center bg-black/40 border border-white/10 rounded-full p-0.5">
              <button
                type="button"
                onClick={() => {
                  playTabSound();
                  setLang("fr");
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  lang === "fr" ? "bg-[#D4FF00] text-[#07080C] shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => {
                  playTabSound();
                  setLang("en");
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  lang === "en" ? "bg-[#D4FF00] text-[#07080C] shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        )}

        <div
          className={`rounded-[20px] bg-black/30 border border-white/[0.06] p-2.5 flex items-center ${
            effectiveCollapsed ? "justify-center" : "justify-between gap-2.5"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-300 p-[1.5px] shrink-0">
              <div className="w-full h-full rounded-full bg-[#0A0D12] flex items-center justify-center font-mono text-xs font-bold text-emerald-300">
                HQ
              </div>
            </div>
            {!effectiveCollapsed && (
              <div className="leading-tight min-w-0">
                <p className="font-sans text-xs font-bold text-white whitespace-nowrap">
                  Head Quant
                </p>
                <p className="font-sans text-[11px] font-medium text-emerald-400 whitespace-nowrap">
                  {t("nav.admin")}
                </p>
              </div>
            )}
          </div>

          {!effectiveCollapsed && (
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href="/portal"
                title="Portail Trader"
                className="relative w-7 h-7 rounded-full hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors after:absolute after:-inset-2 after:content-['']"
              >
                <LinkExternalIcon size={16} />
              </Link>
              <button
                onClick={() => logout()}
                title={t("nav.logout")}
                className="relative w-7 h-7 rounded-full hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer after:absolute after:-inset-2 after:content-['']"
              >
                <SignOutIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
