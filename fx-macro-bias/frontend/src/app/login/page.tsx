"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  Sparkles,
  TrendingUp,
  AlertCircle,
  KeyRound
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { clsx } from "clsx";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<"admin" | "user">("admin");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleTabChange = (tab: "admin" | "user") => {
    setActiveTab(tab);
    setErrorMessage("");
    if (tab === "admin") {
      setUsername("admin");
      setPassword("123");
    } else {
      setUsername("trader");
      setPassword("123");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await login(username, password);
      if (res.success) {
        if (res.user?.role === "admin" || activeTab === "admin" || username.toLowerCase() === "admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/portal";
        }
      } else {
        setErrorMessage(res.error || "Authentication failed.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (role: "admin" | "user") => {
    handleTabChange(role);
    if (role === "admin") {
      setUsername("admin");
      setPassword("123");
    } else {
      setUsername("trader");
      setPassword("123");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0D12] text-white flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* --- Ambient Background Glow Orbs --- */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.55, 0.35],
          x: [0, 30, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] rounded-full bg-[#D2F646]/10 blur-[140px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, -40, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#00E5FF]/10 blur-[150px] pointer-events-none"
      />

      {/* --- Floating FX Ticker Badges (Background Aesthetics) --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.7, y: [0, -10, 0] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 1 } }}
        className="hidden lg:flex items-center gap-3 absolute top-[18%] left-[10%] bg-[#1A1C24]/60 backdrop-blur-xl border border-white/5 rounded-2xl px-4 py-2.5 shadow-xl pointer-events-none"
      >
        <span className="font-sans font-bold text-sm text-white">EUR/USD</span>
        <span className="text-xs font-mono font-bold text-[#6FF542] bg-[#6FF542]/10 px-2 py-0.5 rounded-full border border-[#6FF542]/20">+1.24% BULLISH</span>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.7, y: [0, 12, 0] }}
        transition={{ y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }, opacity: { duration: 1 } }}
        className="hidden lg:flex items-center gap-3 absolute bottom-[20%] left-[12%] bg-[#1A1C24]/60 backdrop-blur-xl border border-white/5 rounded-2xl px-4 py-2.5 shadow-xl pointer-events-none"
      >
        <span className="font-sans font-bold text-sm text-white">USD/JPY</span>
        <span className="text-xs font-mono font-bold text-[#FF4444] bg-[#FF4444]/10 px-2 py-0.5 rounded-full border border-[#FF4444]/20">-0.68% BEARISH</span>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 0.7, y: [0, -14, 0] }}
        transition={{ y: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }, opacity: { duration: 1 } }}
        className="hidden lg:flex items-center gap-3 absolute top-[25%] right-[10%] bg-[#1A1C24]/60 backdrop-blur-xl border border-white/5 rounded-2xl px-4 py-2.5 shadow-xl pointer-events-none"
      >
        <span className="font-sans font-bold text-sm text-white">GBP/USD</span>
        <span className="text-xs font-mono font-bold text-[#D2F646] bg-[#D2F646]/10 px-2 py-0.5 rounded-full border border-[#D2F646]/20">RATE BIAS +2</span>
      </motion.div>

      {/* --- Main Login Card --- */}
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[460px] bg-[#14161E]/90 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 md:p-10 shadow-[0_32px_80px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex items-center gap-3 mb-4 group outline-none">
            <div className="w-12 h-12 flex items-center justify-center p-1 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:border-[#D2F646]/40 transition-colors shadow-lg">
              <img src="/logo.svg" alt="ShiftFX" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(210,246,70,0.3)]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-sans font-black text-2xl tracking-tight leading-none">
                <span className="text-white">Shift</span>
                <span className="text-[#D2F646]">FX</span>
              </span>
              <span className="text-[10px] font-mono tracking-[0.25em] text-[#A0A5B1] uppercase mt-1">Terminal</span>
            </div>
          </Link>

          <h1 className="font-sans font-bold text-2xl text-white tracking-tight">
            Welcome to ShiftFX
          </h1>
          <p className="font-sans text-sm text-[#A0A5B1] mt-1.5">
            Sign in to access macro signals & quantitative bias models
          </p>
        </div>

        {/* Role Segmented Controller */}
        <div className="relative flex items-center bg-[#1D202B]/80 p-1.5 rounded-2xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => handleTabChange("admin")}
            className={clsx(
              "flex-1 relative flex items-center justify-center gap-2 py-2.5 rounded-xl font-sans text-xs font-bold transition-all duration-300 z-10",
              activeTab === "admin" ? "text-[#121418]" : "text-[#A0A5B1] hover:text-white"
            )}
          >
            <ShieldCheck size={16} />
            <span>Admin Portal</span>
            {activeTab === "admin" && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-[#D2F646] rounded-xl z-[-1] shadow-[0_0_16px_rgba(210,246,70,0.35)]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("user")}
            className={clsx(
              "flex-1 relative flex items-center justify-center gap-2 py-2.5 rounded-xl font-sans text-xs font-bold transition-all duration-300 z-10",
              activeTab === "user" ? "text-white" : "text-[#A0A5B1] hover:text-white"
            )}
          >
            <TrendingUp size={16} />
            <span>Trader / User</span>
            {activeTab === "user" && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-white/10 rounded-xl z-[-1] border border-white/10 shadow-inner"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Quick Demo Credential Pill */}
        <motion.div 
          initial={false}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2 mb-6 text-xs"
        >
          <div className="flex items-center gap-2 text-[#A0A5B1]">
            <KeyRound size={14} className="text-[#D2F646]" />
            <span>{activeTab === "admin" ? "Admin Access:" : "Trader Demo:"}</span>
            <span className="font-mono text-white font-bold">{activeTab === "admin" ? "admin / 123" : "trader / 123"}</span>
          </div>
          <button
            type="button"
            onClick={() => handleQuickDemo(activeTab)}
            className="text-[11px] font-bold text-[#D2F646] hover:underline transition-all"
          >
            Auto-Fill
          </button>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FF4444]/10 border border-[#FF4444]/25 text-[#FF6B6B] text-xs font-medium mb-5"
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username / Email */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#A0A5B1] ml-1">
              {activeTab === "admin" ? "Admin Username" : "Trader Email or Username"}
            </label>
            <div className="flex items-center gap-3 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#D2F646]/60 focus-within:ring-2 focus-within:ring-[#D2F646]/20 transition-all">
              <UserIcon size={18} className="text-[#A0A5B1]" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={activeTab === "admin" ? "Enter admin" : "trader@terminal.io"}
                className="w-full bg-transparent border-none outline-none font-sans text-sm text-white placeholder:text-[#A0A5B1]/50"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="font-sans text-xs font-semibold text-[#A0A5B1]">Password</label>
            </div>
            <div className="flex items-center gap-3 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#D2F646]/60 focus-within:ring-2 focus-within:ring-[#D2F646]/20 transition-all">
              <Lock size={18} className="text-[#A0A5B1]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-transparent border-none outline-none font-sans text-sm text-white placeholder:text-[#A0A5B1]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#A0A5B1] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01, filter: "brightness(1.08)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-3.5 rounded-2xl bg-[#D2F646] text-[#121418] font-sans font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(210,246,70,0.35)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span>Sign In to {activeTab === "admin" ? "Admin Engine" : "Trader Portal"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-3 text-center">
          <span className="font-sans text-xs text-[#A0A5B1]">
            New to ShiftFX?{" "}
            <Link href="/signup" className="text-[#D2F646] font-semibold hover:underline ml-1">
              Create an account
            </Link>
          </span>

          <Link 
            href="/portal" 
            className="text-xs text-[#A0A5B1]/80 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>Explore public market terminal</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
