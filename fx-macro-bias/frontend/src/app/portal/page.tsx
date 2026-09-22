"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ShieldCheck, 
  LogOut, 
  Search, 
  Clock, 
  Sparkles,
  ArrowUpRight,
  Activity,
  Layers,
  Globe2,
  Lock
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { clsx } from "clsx";

const PAIR_SIGNALS = [
  { pair: "EUR/USD", base: "eu", quote: "us", score: "+45.0%", bias: "BULLISH", confidence: 88, driver: "ECB Rate Hold vs Fed Easing", lastUpdated: "14:30 UTC" },
  { pair: "GBP/USD", base: "gb", quote: "us", score: "+35.5%", bias: "BULLISH", confidence: 82, driver: "UK Services CPI Outperformance", lastUpdated: "12:00 UTC" },
  { pair: "USD/JPY", base: "us", quote: "jp", score: "-52.0%", bias: "BEARISH", confidence: 91, driver: "BOJ Normalization & Yield Spread Compression", lastUpdated: "14:15 UTC" },
  { pair: "AUD/USD", base: "au", quote: "us", score: "+22.4%", bias: "BULLISH", confidence: 76, driver: "RBA Hawkish Pause & Commodity Inflows", lastUpdated: "09:30 UTC" },
  { pair: "USD/CAD", base: "us", quote: "ca", score: "-18.5%", bias: "NEUTRAL", confidence: 64, driver: "Oil Price Stabilization & BOC In-line Cuts", lastUpdated: "11:45 UTC" },
  { pair: "USD/CHF", base: "us", quote: "ch", score: "-42.0%", bias: "BEARISH", confidence: 85, driver: "Safe Haven Flow & Swiss Current Account Surplus", lastUpdated: "13:20 UTC" },
  { pair: "NZD/USD", base: "nz", quote: "us", score: "-12.0%", bias: "NEUTRAL", confidence: 58, driver: "RBNZ Growth Headwinds & Trade Rebalancing", lastUpdated: "10:10 UTC" },
];

export default function TraderPortalPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [filterBias, setFilterBias] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = "/login";
    }
  }, [user, isLoading]);

  const filteredPairs = PAIR_SIGNALS.filter((p) => {
    const matchesBias = filterBias === "ALL" || p.bias === filterBias;
    const matchesSearch = p.pair.toLowerCase().includes(searchQuery.toLowerCase()) || p.driver.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBias && matchesSearch;
  });

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0B0D12] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#D2F646] border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-[#A0A5B1] tracking-wider">Verifying Trader Session...</span>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
  };

  return (
    <div className="min-h-screen bg-[#0E1015] text-white flex flex-col relative overflow-x-hidden">
      {/* --- Ambient Background Glow Orbs --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#D2F646]/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/5 blur-[150px] pointer-events-none" />

      {/* --- Top Navbar --- */}
      <header className="w-full flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#14161E]/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 flex items-center justify-center p-1 rounded-xl bg-white/[0.03] border border-white/10 group-hover:border-[#D2F646]/40 transition-colors">
              <img src="/logo.svg" alt="ShiftFX" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(210,246,70,0.3)]" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-black text-xl tracking-tight leading-none">
                <span className="text-white">Shift</span>
                <span className="text-[#D2F646]">FX</span>
              </span>
              <span className="text-[9px] font-mono tracking-[0.25em] text-[#A0A5B1] uppercase mt-0.5">Trader Terminal</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-[#6FF542] animate-pulse" />
            <span className="text-xs font-mono font-medium text-[#A0A5B1]">Live Engine Feed</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <GlobalSearch placeholder="Search pairs, macro indicators..." />

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#D2F646]/10 border border-[#D2F646]/20 flex items-center justify-center text-[#D2F646] font-sans font-bold text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : "T"}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold text-white leading-none">{user?.name || "Trader Client"}</span>
                <span className="text-[10px] font-mono text-[#D2F646] mt-0.5 uppercase tracking-wider">{user?.role === "admin" ? "Admin Privileges" : "Trader Account"}</span>
              </div>
            </div>

            {user?.role === "admin" ? (
              <Link 
                href="/admin/dashboard" 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D2F646] text-[#121418] text-xs font-bold hover:brightness-110 transition-all"
              >
                <ShieldCheck size={14} />
                <span>Admin Suite</span>
              </Link>
            ) : (
              <Link 
                href="/login" 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[#A0A5B1] hover:text-white transition-all"
              >
                <Lock size={12} />
                <span>Admin Switch</span>
              </Link>
            )}

            <button
              onClick={logout}
              className="p-2 rounded-xl text-[#A0A5B1] hover:text-[#FF5B5B] hover:bg-[#FF5B5B]/10 transition-colors"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto px-6 md:px-12 py-10 flex flex-col gap-8">
        
        {/* Banner Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 rounded-[28px] bg-gradient-to-r from-[#171A24] via-[#151720] to-[#171A24] border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="flex flex-col gap-2 z-10">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#D2F646]">Quantitative Macro Bias</span>
            <h1 className="font-sans font-black text-3xl md:text-4xl text-white tracking-tight">
              Institutional G10 FX Bias Radar
            </h1>
            <p className="font-sans text-sm text-[#A0A5B1] max-w-xl">
              Signals derived from algorithmic yield differentials, inflation persistence, quarterly economic output, and central bank reaction functions.
            </p>
          </div>

          <div className="flex items-center gap-4 z-10">
            <div className="flex flex-col p-4 rounded-2xl bg-white/[0.03] border border-white/5 min-w-[140px]">
              <span className="text-xs font-sans text-[#A0A5B1]">Total Pairs Tracked</span>
              <span className="text-2xl font-black font-sans text-white mt-1">28</span>
            </div>
            <div className="flex flex-col p-4 rounded-2xl bg-white/[0.03] border border-white/5 min-w-[140px]">
              <span className="text-xs font-sans text-[#A0A5B1]">Model Accuracy</span>
              <span className="text-2xl font-black font-sans text-[#6FF542] mt-1">79.4%</span>
            </div>
          </div>
        </motion.div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center bg-[#171922] p-1.5 rounded-2xl border border-white/5">
            {["ALL", "BULLISH", "BEARISH", "NEUTRAL"].map((bias) => (
              <button
                key={bias}
                onClick={() => setFilterBias(bias)}
                className={clsx(
                  "px-5 py-2 rounded-xl text-xs font-bold font-sans transition-all duration-200",
                  filterBias === bias
                    ? bias === "BULLISH"
                      ? "bg-[#6FF542] text-[#121418] shadow-[0_0_12px_rgba(111,245,66,0.3)]"
                      : bias === "BEARISH"
                      ? "bg-[#FF4444] text-white shadow-[0_0_12px_rgba(255,68,68,0.3)]"
                      : bias === "NEUTRAL"
                      ? "bg-[#00E5FF] text-[#121418] shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                      : "bg-white text-[#121418]"
                    : "text-[#A0A5B1] hover:text-white"
                )}
              >
                {bias}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#A0A5B1]">
            <Clock size={14} className="text-[#D2F646]" />
            <span>Next recalculation: Today at 16:00 UTC</span>
          </div>
        </div>

        {/* Pairs Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredPairs.map((item) => (
            <motion.div
              key={item.pair}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="flex flex-col justify-between p-6 rounded-[24px] bg-[#161822]/80 backdrop-blur-xl border border-white/5 hover:border-white/15 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.06)] group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center flex-shrink-0">
                      <img src={`/flags/${item.base}.svg`} className="w-6 h-6 rounded-full border border-[#1E2028] z-10 shadow-sm" alt={item.base} />
                      <img src={`/flags/${item.quote}.svg`} className="w-6 h-6 rounded-full border border-[#1E2028] -ml-2 z-0 shadow-sm" alt={item.quote} />
                    </div>
                    <span className="font-sans font-bold text-lg text-white group-hover:text-[#D2F646] transition-colors">{item.pair}</span>
                  </div>

                  <span className={clsx(
                    "px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider",
                    item.bias === "BULLISH" ? "bg-[#6FF542]/10 text-[#6FF542] border border-[#6FF542]/30" :
                    item.bias === "BEARISH" ? "bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/30" :
                    "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30"
                  )}>
                    {item.bias}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-sans font-black text-3xl text-white tracking-tight">{item.score}</span>
                  <span className="text-xs font-mono text-[#A0A5B1]">{item.confidence}% Model Confidence</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden mb-4">
                  <div 
                    className={clsx(
                      "h-full rounded-full transition-all duration-500",
                      item.bias === "BULLISH" ? "bg-gradient-to-r from-[#6FF542] to-[#D2F646]" :
                      item.bias === "BEARISH" ? "bg-gradient-to-r from-[#FF4444] to-[#FF8888]" :
                      "bg-gradient-to-r from-[#00E5FF] to-[#3B82F6]"
                    )}
                    style={{ width: `${item.confidence}%` }}
                  />
                </div>

                <p className="text-xs font-sans text-[#A0A5B1] leading-relaxed">
                  <strong className="text-white">Primary Driver:</strong> {item.driver}
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 text-[11px] font-mono text-[#A0A5B1]">
                <span>Updated: {item.lastUpdated}</span>
                <span className="text-[#D2F646] font-bold group-hover:underline flex items-center gap-1">
                  Drill Down Matrix <ArrowUpRight size={12} />
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
