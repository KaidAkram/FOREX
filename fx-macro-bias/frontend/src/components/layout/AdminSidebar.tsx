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
  UserPlus,
  SlidersHorizontal,
  Activity
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: LineChart },
  { href: "/admin/rating-rules", label: "Rating Rules", icon: SlidersHorizontal },
  { href: "/admin/macro-data", label: "Macro Data", icon: Database },
  { href: "/admin/final-score", label: "Final Score", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-[280px] h-full flex flex-col bg-[#032221]/90 backdrop-blur-3xl relative pt-[40px] pb-[28px] z-50 border-r border-[#0B453A] shadow-[4px_0_24px_rgba(2,27,26,0.6)]">
      
      {/* Brand Logo & Platform Title */}
      <div className="flex items-center gap-[16px] px-[32px] mb-[44px]">
        <div className="w-[48px] h-[48px] flex items-center justify-center p-1 rounded-2xl bg-[#06302B] border border-[#0B453A] shadow-[0_0_20px_rgba(0,223,129,0.15)]">
          <img src="/logo.svg" alt="ShiftFX" className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,223,129,0.3)]" />
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-black text-[26px] leading-none tracking-tight">
            <span className="text-[#F1F7F6]">Shift</span>
            <span className="text-[#00DF81]">FX</span>
          </span>
          <div className="flex items-center gap-1.5 mt-[6px]">
            <span className="font-sans font-bold text-[10px] text-[#AACBC4] tracking-[0.25em] uppercase">Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00DF81] animate-pulse shadow-[0_0_8px_rgba(0,223,129,0.8)]" />
          </div>
        </div>
      </div>

      {/* Navigation List */}
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
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={clsx(
                    "transition-all duration-300 z-10",
                    isActive ? "text-[#00DF81]" : "text-[#AACBC4] group-hover:text-[#F1F7F6]"
                  )}
                />
                <span className={clsx(
                  "font-sans text-[15px] transition-all duration-300 tracking-wide z-10",
                  isActive ? "font-bold text-[#F1F7F6]" : "font-medium"
                )}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Session Profile & Log Out */}
      <div className="px-[16px] flex flex-col gap-3 pt-4 border-t border-[#0B453A]">
        {/* User Pill Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#06302B]/60 border border-[#0B453A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00DF81]/15 border border-[#00DF81]/30 flex items-center justify-center text-[#00DF81] font-sans font-bold text-sm shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-xs text-[#F1F7F6] leading-tight truncate max-w-[120px]">
                {user?.name || "Administrator"}
              </span>
              <span className="text-[10px] font-mono text-[#00DF81] uppercase tracking-wider font-semibold">
                {user?.role === "admin" ? "ADMIN" : "TRADER"}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#00DF81] bg-[#00DF81]/10 border border-[#00DF81]/25 px-2 py-0.5 rounded-full font-bold">
            Active
          </span>
        </div>

        {/* Quick Account Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#06302B]/40 hover:bg-[#06302B] border border-[#0B453A] text-[11px] font-semibold text-[#AACBC4] hover:text-[#F1F7F6] transition-all text-center"
            title="Switch Account or Login"
          >
            <LogIn size={13} className="text-[#00DF81]" />
            <span>Switch</span>
          </Link>

          <Link
            href="/signup"
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#06302B]/40 hover:bg-[#00DF81]/10 border border-[#0B453A] hover:border-[#00DF81]/30 text-[11px] font-semibold text-[#AACBC4] hover:text-[#00DF81] transition-all text-center"
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
          className="flex items-center gap-[14px] w-full px-[16px] py-[10px] rounded-[14px] text-[#AACBC4] hover:text-[#FF5555] transition-all duration-300 group hover:bg-[#FF5555]/10 cursor-pointer"
        >
          <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
          <span className="font-sans font-medium text-[13px] tracking-wide">Log Out</span>
        </motion.button>
      </div>

    </aside>
  );
}
