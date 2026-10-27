"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Settings2, 
  Database, 
  LineChart, 
  LogOut, 
  SlidersHorizontal,
  Activity,
  Globe2,
  ExternalLink,
  X,
  Zap
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { SPRING_SNAPPY } from "@/components/ui/DopaminePrimitives";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Tableau de Bord", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytique", icon: LineChart },
  { href: "/admin/rating-rules", label: "Règles de Notation", icon: SlidersHorizontal },
  { href: "/admin/macro-data", label: "Données Macro", icon: Database },
  { href: "/admin/final-score", label: "Score Final", icon: Activity },
  { href: "/admin/catalog", label: "Catalogue Utilisateur", icon: Globe2 },
  { href: "/admin/settings", label: "Paramètres", icon: Settings2 },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="flex flex-col h-full justify-between bg-[#0A0C12] p-4">
      <div>
        {/* ── 1. Top Brand Lockup ──────────────────────────────────────── */}
        <div className="px-2 pt-1 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)] flex-shrink-0">
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-white leading-none">
                Shift<span className="text-[#D4FF00]">FX</span>
              </span>
              <span className="rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/40 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#D4FF00] uppercase tracking-wider">
                ADMIN
              </span>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Fermer la navigation"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── 2. Navigation Items ────────────────────────────────────────── */}
        <nav className="space-y-1.5 w-full">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "relative flex items-center gap-3 px-4 h-11 rounded-full text-xs transition-all duration-200 outline-none",
                  isActive
                    ? "bg-gradient-to-r from-[#D4FF00]/15 via-[#D4FF00]/5 to-transparent border border-[#D4FF00]/35 text-white font-semibold shadow-[0_0_20px_rgba(212,255,0,0.08)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] font-medium"
                )}
              >
                <item.icon 
                  size={16} 
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={clsx(
                    "flex-shrink-0 transition-colors relative z-10",
                    isActive ? "text-[#D4FF00]" : "text-slate-400"
                  )}
                />
                <span className="tracking-wide whitespace-nowrap relative z-10">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── 3. Sidebar Footer Profile Pod (THE ONLY PLACE Head Quant Admin APPEARS) ── */}
      <div>
        <div className="rounded-[20px] bg-[#101218] border border-white/[0.08] p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-300 ring-2 ring-white/10 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate max-w-[115px]">
                Head Quant Admin
              </span>
              <span className="text-[10px] font-mono font-semibold text-[#D4FF00]">
                ADMIN
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/portal"
              className="w-7 h-7 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-[#D4FF00] flex items-center justify-center transition-colors"
              title="Accéder au Portail Trader"
            >
              <ExternalLink size={13} />
            </Link>
            <button
              onClick={() => {
                if (onClose) onClose();
                logout();
              }}
              className="w-7 h-7 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
              title="Déconnexion"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const { isMobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* 1. Desktop Static Sidebar */}
      <aside className="hidden lg:flex w-[248px] shrink-0 h-full flex-col bg-[#0A0C12] border-r border-white/[0.06] relative z-30">
        <SidebarContent />
      </aside>

      {/* 2. Mobile / Tablet Off-canvas Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeMobile}
              className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              aria-hidden="true"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] h-full bg-[#0A0C12] border-r border-white/[0.06] flex flex-col"
              role="dialog"
              aria-modal="true"
            >
              <SidebarContent onClose={closeMobile} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
