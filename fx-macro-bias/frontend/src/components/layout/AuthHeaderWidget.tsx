"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  LogIn, 
  UserPlus, 
  LogOut, 
  ShieldCheck, 
  User as UserIcon, 
  ChevronDown, 
  KeyRound,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

export function AuthHeaderWidget() {
  const { user, logout, isLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 bg-[#161822]/80 border border-white/5 rounded-2xl px-3 py-2">
        <div className="w-4 h-4 rounded-full border-2 border-[#D2F646] border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-[#A0A5B1]">Session...</span>
      </div>
    );
  }

  // When Logged Out
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all duration-200 hover:border-white/20 active:scale-95"
        >
          <LogIn size={14} className="text-[#D2F646]" />
          <span>Log In</span>
        </Link>

        <Link
          href="/signup"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D2F646] hover:brightness-110 text-[#121418] text-xs font-bold transition-all duration-200 shadow-[0_0_16px_rgba(210,246,70,0.3)] active:scale-95"
        >
          <UserPlus size={14} />
          <span>Sign Up</span>
        </Link>
      </div>
    );
  }

  // When Logged In
  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      {/* Profile Trigger Pill */}
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2.5 bg-[#161822]/90 hover:bg-[#1C1F2B] border border-white/10 hover:border-white/20 rounded-2xl px-3 py-2 shadow-lg transition-all duration-200 cursor-pointer group text-left outline-none"
      >
        <div className="w-8 h-8 rounded-xl bg-[#D2F646]/15 border border-[#D2F646]/30 flex items-center justify-center text-[#D2F646] font-sans font-bold text-xs shadow-inner">
          {user.role === "admin" ? <ShieldCheck size={16} /> : user.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex flex-col pr-1">
          <span className="font-sans font-bold text-xs text-white leading-none max-w-[110px] truncate">
            {user.name}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={clsx(
              "text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
              user.role === "admin"
                ? "bg-[#D2F646]/15 text-[#D2F646] border-[#D2F646]/30"
                : "bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/30"
            )}>
              {user.role === "admin" ? "ADMIN" : "TRADER"}
            </span>
          </div>
        </div>

        <ChevronDown 
          size={14} 
          className={clsx("text-[#A0A5B1] transition-transform duration-200 ml-0.5", dropdownOpen && "rotate-180")} 
        />
      </button>

      {/* Direct Quick Log Out Button */}
      <button
        onClick={logout}
        className="p-2.5 rounded-xl bg-white/5 hover:bg-[#FF4444]/15 border border-white/5 hover:border-[#FF4444]/30 text-[#A0A5B1] hover:text-[#FF4444] transition-all cursor-pointer"
        title="Log Out Immediately"
      >
        <LogOut size={16} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[calc(100%+8px)] right-0 w-[240px] bg-[#161822]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1"
          >
            {/* Header info */}
            <div className="px-3 py-2 border-b border-white/5 flex flex-col gap-0.5">
              <span className="text-[11px] font-sans text-[#A0A5B1]">Signed in as</span>
              <span className="text-xs font-bold text-white truncate">{user.email || user.username}</span>
            </div>

            {/* Navigation links */}
            {user.role === "admin" ? (
              <Link
                href="/portal"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A0A5B1] hover:text-white hover:bg-white/5 transition-colors"
              >
                <Sparkles size={14} className="text-[#00E5FF]" />
                <span>View Trader Portal</span>
              </Link>
            ) : (
              <Link
                href="/admin/dashboard"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A0A5B1] hover:text-white hover:bg-white/5 transition-colors"
              >
                <ShieldCheck size={14} className="text-[#D2F646]" />
                <span>Switch to Admin Suite</span>
              </Link>
            )}

            {/* Switch Account (Login) */}
            <Link
              href="/login"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A0A5B1] hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogIn size={14} className="text-[#D2F646]" />
              <span>Switch / Log In (admin / 123)</span>
            </Link>

            {/* Sign Up New Account */}
            <Link
              href="/signup"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A0A5B1] hover:text-white hover:bg-white/5 transition-colors"
            >
              <UserPlus size={14} />
              <span>Create New Account</span>
            </Link>

            <div className="w-full h-[1px] bg-white/5 my-1" />

            {/* Log Out */}
            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#FF5B5B] hover:bg-[#FF5B5B]/10 transition-colors w-full text-left"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
