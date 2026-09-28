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
  ShieldCheck,
  LogIn,
  UserPlus,
  SlidersHorizontal,
  Activity,
  X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: LineChart },
  { href: "/admin/rating-rules", label: "Rating Rules", icon: SlidersHorizontal },
  { href: "/admin/macro-data", label: "Macro Data", icon: Database },
  { href: "/admin/final-score", label: "Final Score", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Logo & Platform Title */}
        <div className="flex items-center justify-between px-6 mb-8 pt-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 flex items-center justify-center p-1 rounded-2xl bg-[#06302B] border border-[#0B453A] shadow-[0_0_20px_rgba(0,223,129,0.15)] flex-shrink-0">
              <img src="/logo.svg" alt="ShiftFX" className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,223,129,0.3)]" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-black text-2xl leading-none tracking-tight">
                <span className="text-[#F1F7F6]">Shift</span>
                <span className="text-[#00DF81]">FX</span>
              </span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="font-sans font-bold text-[9px] text-[#AACBC4] tracking-[0.25em] uppercase">Engine</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00DF81] animate-pulse shadow-[0_0_8px_rgba(0,223,129,0.8)]" />
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl bg-[#06302B] hover:bg-[#095544] border border-[#0B453A] text-[#AACBC4] hover:text-[#F1F7F6] transition-colors"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col w-full px-3.5 gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="relative flex items-center group outline-none"
              >
                <div className={clsx(
                  "relative flex items-center gap-3.5 w-full px-4 py-3 transition-all duration-200 rounded-[14px]",
                  isActive 
                    ? "text-[#F1F7F6]" 
                    : "text-[#AACBC4] hover:text-[#F1F7F6] hover:bg-[#06302B]/40"
                )}>
                  {/* Active Indicator Spring Background */}
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarIndicator"
                      className="absolute inset-0 bg-[#06302B] border border-[#00DF81]/30 rounded-[14px] shadow-[inset_0_1px_0_0_rgba(241,247,246,0.08)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Glowing Caribbean Green Dot Indicator */}
                  <div className={clsx(
                    "w-[5px] h-[5px] rounded-full transition-all duration-300 flex-shrink-0 z-10",
                    isActive ? "bg-[#00DF81] shadow-[0_0_10px_rgba(0,223,129,0.9)] opacity-100 scale-125" : "opacity-0 scale-75"
                  )} />

                  <item.icon 
                    size={19} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className={clsx(
                      "transition-all duration-300 z-10 flex-shrink-0",
                      isActive ? "text-[#00DF81]" : "text-[#AACBC4] group-hover:text-[#F1F7F6]"
                    )}
                  />
                  <span className={clsx(
                    "font-sans text-sm transition-all duration-300 tracking-wide z-10",
                    isActive ? "font-bold text-[#F1F7F6]" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session Profile & Log Out */}
      <div className="px-3.5 flex flex-col gap-2.5 pt-4 border-t border-[#0B453A]">
        {/* User Pill Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#06302B]/60 border border-[#0B453A]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#00DF81]/15 border border-[#00DF81]/30 flex items-center justify-center text-[#00DF81] font-sans font-bold text-xs shadow-sm flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-sans font-bold text-xs text-[#F1F7F6] leading-tight truncate">
                {user?.name || "Administrator"}
              </span>
              <span className="text-[9px] font-mono text-[#00DF81] uppercase tracking-wider font-semibold">
                {user?.role === "admin" ? "ADMIN" : "TRADER"}
              </span>
            </div>
          </div>

          <span className="text-[9px] font-mono text-[#00DF81] bg-[#00DF81]/10 border border-[#00DF81]/25 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
            Active
          </span>
        </div>

        {/* Quick Account Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/login"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-[#06302B]/40 hover:bg-[#06302B] border border-[#0B453A] text-[11px] font-semibold text-[#AACBC4] hover:text-[#F1F7F6] transition-all text-center"
            title="Switch Account or Login"
          >
            <LogIn size={13} className="text-[#00DF81]" />
            <span>Switch</span>
          </Link>

          <Link
            href="/signup"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-[#06302B]/40 hover:bg-[#00DF81]/10 border border-[#0B453A] hover:border-[#00DF81]/30 text-[11px] font-semibold text-[#AACBC4] hover:text-[#00DF81] transition-all text-center"
            title="Register New Account"
          >
            <UserPlus size={13} />
            <span>Sign Up</span>
          </Link>
        </div>

        {/* Log Out */}
        <motion.button 
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (onClose) onClose();
            logout();
          }}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-[14px] text-[#AACBC4] hover:text-[#FF5555] transition-all duration-200 group hover:bg-[#FF5555]/10 cursor-pointer"
        >
          <LogOut size={15} className="transition-transform group-hover:-translate-x-1 flex-shrink-0" />
          <span className="font-sans font-medium text-xs tracking-wide">Log Out</span>
        </motion.button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const { isMobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* 1. Desktop Static Sidebar (Visible on lg and above: ≥1024px) */}
      <aside className="hidden lg:flex w-[260px] xl:w-[280px] h-full flex-col bg-[#032221]/95 backdrop-blur-3xl relative pt-8 pb-6 z-30 border-r border-[#0B453A] shadow-[4px_0_24px_rgba(2,27,26,0.6)] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* 2. Mobile / Tablet Off-canvas Drawer (Screen < 1024px) */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobile}
              className="lg:hidden fixed inset-0 bg-[#021B1A]/85 backdrop-blur-md z-50"
              aria-hidden="true"
            />

            {/* Slide-in Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[290px] sm:w-[320px] max-w-[85vw] h-full bg-[#032221] border-r border-[#0B453A] pt-6 pb-6 shadow-[10px_0_40px_rgba(2,27,26,0.95)] flex flex-col"
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
