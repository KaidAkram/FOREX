"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { 
  LayoutDashboard, 
  Settings2, 
  Database,
  LineChart,
  LogOut 
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: LineChart },
  { href: "/admin/rating-rules", label: "Rating Rules", icon: Settings2 },
  { href: "/admin/macro-data", label: "Macro Data", icon: Database },
  { href: "/admin/final-score", label: "Final Score", icon: LineChart },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] h-full flex flex-col bg-[#121418]/60 backdrop-blur-3xl relative pt-[48px] pb-[32px] z-50 border-r border-white/5">
      
      {/* Logo */}
      <div className="flex items-center gap-[16px] px-[32px] mb-[64px]">
        <div className="w-[48px] h-[48px] flex items-center justify-center">
          <img src="/logo.svg" alt="ShiftFX" className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(210,246,70,0.15)]" />
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-black text-[26px] leading-none tracking-tighter">
            <span className="text-[#FFFFFF]">Shift</span>
            <span className="text-[#D2F646]">FX</span>
          </span>
          <span className="font-sans font-bold text-[11px] text-[#A0A5B1] tracking-[0.25em] uppercase mt-[4px] ml-[2px]">Admin</span>
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
                "flex items-center gap-[16px] w-full px-[16px] py-[12px] transition-all duration-300 rounded-[12px]",
                isActive 
                  ? "bg-white/[0.03] text-[#FFFFFF]" 
                  : "text-[#A0A5B1] hover:text-[#FFFFFF] hover:bg-white/[0.01]"
              )}>
                {/* Breathing Dot Indicator */}
                <div className={clsx(
                  "absolute left-[12px] w-[4px] h-[4px] rounded-full transition-all duration-500",
                  isActive ? "bg-[#D2F646] shadow-[0_0_8px_rgba(210,246,70,0.8)] opacity-100" : "opacity-0"
                )} />

                <item.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={clsx(
                    "transition-all duration-300 ml-[12px]",
                    isActive ? "text-[#D2F646]" : "text-[#A0A5B1] group-hover:text-white"
                  )}
                />
                <span className={clsx(
                  "font-sans text-[16px] transition-all duration-300 tracking-wide",
                  isActive ? "font-bold text-[#FFFFFF]" : "font-medium"
                )}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>


      {/* Log Out */}
      <div className="px-[16px]">
        <button className="flex items-center gap-[16px] w-full px-[28px] py-[12px] rounded-[12px] text-[#A0A5B1] hover:text-[#FF5B5B] transition-all duration-300 group hover:bg-[#FF5B5B]/5">
          <LogOut size={20} className="transition-transform group-hover:-translate-x-1" />
          <span className="font-sans font-medium text-[16px] tracking-wide">Log Out</span>
        </button>
      </div>

    </aside>
  );
}
