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
  Briefcase,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { clsx } from "clsx";

export default function SignUpPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
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
        role,
        strategy
      });

      if (res.success) {
        if (role === "admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/portal";
        }
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
    <div className="min-h-screen w-full bg-[#021B1A] text-[#F1F7F6] flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* --- Ambient Background Glow Orbs --- */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.55, 0.35],
          x: [0, 30, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] rounded-full bg-[#00DF81]/10 blur-[140px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, -40, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#03624C]/15 blur-[150px] pointer-events-none"
      />

      {/* --- Main Registration Card --- */}
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[480px] bg-[#032221]/95 backdrop-blur-3xl border border-[#0B453A] rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 md:p-10 shadow-[0_32px_80px_rgba(2,27,26,0.9),inset_0_1px_0_0_rgba(241,247,246,0.08)] z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex items-center gap-3 mb-4 group outline-none">
            <div className="w-12 h-12 flex items-center justify-center p-1 rounded-2xl bg-[#06302B] border border-[#0B453A] group-hover:border-[#00DF81]/40 transition-colors shadow-lg">
              <img src="/logo.svg" alt="ShiftFX" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(0,223,129,0.3)]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-sans font-black text-2xl tracking-tight leading-none">
                <span className="text-[#F1F7F6]">Shift</span>
                <span className="text-[#00DF81]">FX</span>
              </span>
              <span className="text-[10px] font-mono tracking-[0.25em] text-[#AACBC4] uppercase mt-1">Terminal</span>
            </div>
          </Link>

          <h1 className="font-sans font-bold text-2xl text-[#F1F7F6] tracking-tight">
            Create Trader Account
          </h1>
          <p className="font-sans text-sm text-[#AACBC4] mt-1.5">
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
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FF5555]/10 border border-[#FF5555]/25 text-[#FF5555] text-xs font-medium mb-5"
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Account Role Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#AACBC4] ml-1">Account Type & Access Level</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#06302B] border border-[#0B453A] rounded-2xl">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={clsx(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  role === "user"
                    ? "bg-[#00DF81] text-[#021B1A] shadow-md shadow-[#00DF81]/20"
                    : "text-[#AACBC4] hover:text-[#F1F7F6]"
                )}
              >
                <TrendingUp size={14} />
                <span>Trader Client</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={clsx(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  role === "admin"
                    ? "bg-[#00DF81] text-[#021B1A] shadow-md shadow-[#00DF81]/20"
                    : "text-[#AACBC4] hover:text-[#F1F7F6]"
                )}
              >
                <ShieldCheck size={14} />
                <span>Admin Suite</span>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#AACBC4] ml-1">Full Name</label>
            <div className="flex items-center gap-3 bg-[#021B1A] border border-[#0B453A] rounded-2xl px-4 py-3 focus-within:border-[#00DF81]/60 focus-within:ring-2 focus-within:ring-[#00DF81]/20 transition-all">
              <UserIcon size={18} className="text-[#AACBC4]" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alexander Vance"
                className="w-full bg-transparent border-none outline-none font-sans text-sm text-[#F1F7F6] placeholder:text-[#AACBC4]/50"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#AACBC4] ml-1">Email Address</label>
            <div className="flex items-center gap-3 bg-[#021B1A] border border-[#0B453A] rounded-2xl px-4 py-3 focus-within:border-[#00DF81]/60 focus-within:ring-2 focus-within:ring-[#00DF81]/20 transition-all">
              <Mail size={18} className="text-[#AACBC4]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alexander@hedgefund.com"
                className="w-full bg-transparent border-none outline-none font-sans text-sm text-[#F1F7F6] placeholder:text-[#AACBC4]/50"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#AACBC4] ml-1">Password</label>
            <div className="flex items-center gap-3 bg-[#021B1A] border border-[#0B453A] rounded-2xl px-4 py-3 focus-within:border-[#00DF81]/60 focus-within:ring-2 focus-within:ring-[#00DF81]/20 transition-all">
              <Lock size={18} className="text-[#AACBC4]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create strong password"
                className="w-full bg-transparent border-none outline-none font-sans text-sm text-[#F1F7F6] placeholder:text-[#AACBC4]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#AACBC4] hover:text-[#F1F7F6] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Strategy / Focus */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-[#AACBC4] ml-1">Trading Strategy Focus</label>
            <div className="flex items-center gap-3 bg-[#021B1A] border border-[#0B453A] rounded-2xl px-4 py-3 focus-within:border-[#00DF81]/60 transition-all">
              <Briefcase size={18} className="text-[#AACBC4]" />
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-transparent border-none outline-none font-sans text-sm text-[#F1F7F6] cursor-pointer"
              >
                <option value="Macro Differentials" className="bg-[#032221] text-[#F1F7F6]">Macro Differentials (Interest Rates & CPI)</option>
                <option value="Carry Trade" className="bg-[#032221] text-[#F1F7F6]">Carry Trade & Central Bank Divergence</option>
                <option value="Quantitative Bias" className="bg-[#032221] text-[#F1F7F6]">Quantitative Bias & Matrix Scoring</option>
                <option value="Discretionary G10" className="bg-[#032221] text-[#F1F7F6]">Discretionary G10 FX Swings</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01, filter: "brightness(1.08)" }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="mt-3 w-full py-3.5 rounded-2xl bg-[#00DF81] text-[#021B1A] font-sans font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(0,223,129,0.35)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <UserPlus size={18} />
                <span>{role === "admin" ? "Create Admin Account & Launch Suite" : "Create Account & Launch Terminal"}</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#0B453A] flex flex-col items-center gap-3 text-center">
          <span className="font-sans text-xs text-[#AACBC4]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#00DF81] font-semibold hover:underline ml-1">
              Sign in
            </Link>
          </span>
          <span className="text-[11px] text-[#AACBC4]/60">
            For institutional admin credentials, contact support or use demo (admin / 123).
          </span>
        </div>
      </motion.div>
    </div>
  );
}
