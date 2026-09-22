"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Settings2, 
  Database, 
  LineChart, 
  LogOut,
  ShieldCheck,
  User as UserIcon,
  LogIn,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: LineChart },
  { href: "/admin/rating-rules", label: "Rating Rules", icon: Settings2 },
  { href: "/admin/macro-data", label: "Macro Data", icon: Database },
  { href: "/admin/final-score", label: "Final Score", icon: LineChart },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-[280px] h-full flex flex-col bg-[#121418]/80 backdrop-blur-3xl relative pt-[40px] pb-[28px] z-50 border-r border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
      
      {/* Logo */}
      <div className="flex items-center gap-[16px] px-[32px] mb-[48px]">
        <div className="w-[48px] h-[48px] flex items-center justify-center p-1 rounded-2xl bg-white/[0.03] border border-white/10 shadow-[0_0_20px_rgba(210,246,70,0.15)]">
          <img src="/logo.svg" alt="ShiftFX" className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(210,246,70,0.25)]" />
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-black text-[26px] leading-none tracking-tighter">
            <span className="text-[#FFFFFF]">Shift</span>
            <span className="text-[#D2F646]">FX</span>
          </span>
          <div className="flex items-center gap-1.5 mt-[4px]">
            <span className="font-sans font-bold text-[10px] text-[#A0A5B1] tracking-[0.25em] uppercase">Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#6FF542] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col w-full px-[16px] gap-[4px] flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center group outline-none"
            >
              <div className={clsx(
                "relative flex items-center gap-[16px] w-full px-[16px] py-[12px] transition-all duration-300 rounded-[14px]",
                isActive 
                  ? "bg-white/[0.06] text-[#FFFFFF] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]" 
                  : "text-[#A0A5B1] hover:text-[#FFFFFF] hover:bg-white/[0.02]"
              )}>
                {/* Active Indicator Spring Background */}
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarIndicator"
                    className="absolute inset-0 bg-[#D2F646]/10 border border-[#D2F646]/25 rounded-[14px]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Breathing Dot Indicator */}
                <div className={clsx(
                  "w-[5px] h-[5px] rounded-full transition-all duration-300 flex-shrink-0",
                  isActive ? "bg-[#D2F646] shadow-[0_0_10px_rgba(210,246,70,0.9)] opacity-100 scale-125" : "opacity-0 scale-75"
                )} />

                <item.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={clsx(
                    "transition-all duration-300",
                    isActive ? "text-[#D2F646]" : "text-[#A0A5B1] group-hover:text-white"
                  )}
                />
                <span className={clsx(
                  "font-sans text-[15px] transition-all duration-300 tracking-wide",
                  isActive ? "font-bold text-[#FFFFFF]" : "font-medium"
                )}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Session Profile & Log Out */}
      <div className="px-[16px] flex flex-col gap-3 pt-4 border-t border-white/5">
        {/* User Pill Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D2F646]/15 border border-[#D2F646]/30 flex items-center justify-center text-[#D2F646] font-sans font-bold text-sm shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-xs text-white leading-tight truncate max-w-[120px]">
                {user?.name || "Administrator"}
              </span>
              <span className="text-[10px] font-mono text-[#D2F646] uppercase tracking-wider font-semibold">
                {user?.role === "admin" ? "ADMIN" : "TRADER"}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#6FF542] bg-[#6FF542]/10 border border-[#6FF542]/20 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>

        {/* Quick Account Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] font-semibold text-[#A0A5B1] hover:text-white transition-all text-center"
            title="Switch Account or Login"
          >
            <LogIn size={13} className="text-[#D2F646]" />
            <span>Switch</span>
          </Link>

          <Link
            href="/signup"
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/[0.03] hover:bg-[#D2F646]/10 border border-white/5 hover:border-[#D2F646]/30 text-[11px] font-semibold text-[#A0A5B1] hover:text-[#D2F646] transition-all text-center"
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
          onClick={logout}
          className="flex items-center gap-[14px] w-full px-[16px] py-[10px] rounded-[14px] text-[#A0A5B1] hover:text-[#FF5B5B] transition-all duration-300 group hover:bg-[#FF5B5B]/10 cursor-pointer"
        >
          <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
          <span className="font-sans font-medium text-[13px] tracking-wide">Log Out</span>
        </motion.button>
      </div>

    </aside>
  );
}
