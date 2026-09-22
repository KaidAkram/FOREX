"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  Sparkles,
  TrendingUp,
  AlertCircle,
  Briefcase
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SignUpPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [strategy, setStrategy] = useState("Macro Differentials");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await signup({
        name,
        email,
        password,
        role: "user",
        strategy
      });

      if (res.success) {
        window.location.href = "/portal";
      } else {
        setErrorMessage(res.error || "Failed to create account.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
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

      {/* --- Main Registration Card --- */}
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[480px] bg-[#14161E]/90 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 md:p-10 shadow-[0_32px_80px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] z-10"
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
            Create Trader Account
          </h1>
          <p className="font-sans text-sm text-[#A0A5B1] mt-1.5">
            Gain access to institutional macro bias signals & pair scoring
          </p>
        </div>

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
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#A0A5B1] ml-1">Full Name</label>
            <div className="flex items-center gap-3 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#D2F646]/60 focus-within:ring-2 focus-within:ring-[#D2F646]/20 transition-all">
              <UserIcon size={18} className="text-[#A0A5B1]" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alexander Vance"
                className="w-full bg-transparent border-none outline-none font-sans text-sm text-white placeholder:text-[#A0A5B1]/50"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#A0A5B1] ml-1">Email Address</label>
            <div className="flex items-center gap-3 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#D2F646]/60 focus-within:ring-2 focus-within:ring-[#D2F646]/20 transition-all">
              <Mail size={18} className="text-[#A0A5B1]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alexander@hedgefund.com"
                className="w-full bg-transparent border-none outline-none font-sans text-sm text-white placeholder:text-[#A0A5B1]/50"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#A0A5B1] ml-1">Password</label>
            <div className="flex items-center gap-3 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#D2F646]/60 focus-within:ring-2 focus-within:ring-[#D2F646]/20 transition-all">
              <Lock size={18} className="text-[#A0A5B1]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create strong password"
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

          {/* Strategy / Focus */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#A0A5B1] ml-1">Trading Strategy Focus</label>
            <div className="flex items-center gap-3 bg-[#1A1C25]/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#D2F646]/60 transition-all">
              <Briefcase size={18} className="text-[#A0A5B1]" />
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-transparent border-none outline-none font-sans text-sm text-white cursor-pointer"
              >
                <option value="Macro Differentials" className="bg-[#1A1C25] text-white">Macro Differentials (Interest Rates & CPI)</option>
                <option value="Carry Trade" className="bg-[#1A1C25] text-white">Carry Trade & Central Bank Divergence</option>
                <option value="Quantitative Bias" className="bg-[#1A1C25] text-white">Quantitative Bias & Matrix Scoring</option>
                <option value="Discretionary G10" className="bg-[#1A1C25] text-white">Discretionary G10 FX Swings</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01, filter: "brightness(1.08)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="mt-3 w-full py-3.5 rounded-2xl bg-[#D2F646] text-[#121418] font-sans font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(210,246,70,0.35)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <UserPlus size={18} />
                <span>Create Account & Launch Terminal</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-3 text-center">
          <span className="font-sans text-xs text-[#A0A5B1]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#D2F646] font-semibold hover:underline ml-1">
              Sign in
            </Link>
          </span>
          <span className="text-[11px] text-[#A0A5B1]/60">
            For institutional admin credentials, contact support or use demo (admin / 123).
          </span>
        </div>
      </motion.div>
    </div>
  );
}
