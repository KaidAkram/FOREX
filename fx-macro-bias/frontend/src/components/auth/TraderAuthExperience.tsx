"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShiftFXMark, ShiftFXWordmark } from "@/components/brand/ShiftFXLogo";
import { HalftoneMotionCanvas } from "@/components/brand/HalftoneMotionCanvas";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  LockIcon,
  MailIcon,
  KeyIcon,
  PersonIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  SyncIcon,
  ArrowLeftIcon,
  GlobeIcon
} from "@primer/octicons-react";
import { playClickSound, playSuccessSound } from "@/lib/soundEffects";

export function TraderAuthExperience({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const router = useRouter();
  const { loginTrader, sendTraderEmailOTP, completeTraderSignupWithOTP } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const [mode, setMode] = useState<"signin" | "signup" | "otp">(initialMode);
  const [email, setEmail] = useState("trader@shiftfx.io");
  const [password, setPassword] = useState("123");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [strategy, setStrategy] = useState("Discretionary Macro & Carry");

  // OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [devOtpCode, setDevOtpCode] = useState<string>("");
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (mode === "otp" && resendCooldown > 0) {
      const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [mode, resendCooldown]);

  // Handle Trader Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    playClickSound();

    try {
      const res = await loginTrader(email, password);
      if (res.success) {
        playSuccessSound();
        window.location.href = "/portal";
      } else {
        setErrorMessage(res.error || "Échec de l'authentification.");
      }
    } catch {
      setErrorMessage("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up Step 1 -> Trigger OTP
  const handleSignUpInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    playClickSound();

    if (!name.trim()) {
      setErrorMessage(lang === "fr" ? "Veuillez entrer votre nom complet." : "Please enter your full name.");
      setIsLoading(false);
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage(lang === "fr" ? "Veuillez entrer une adresse e-mail valide." : "Please enter a valid email address.");
      setIsLoading(false);
      return;
    }
    if (password.length < 3) {
      setErrorMessage(lang === "fr" ? "Le mot de passe doit comporter au moins 3 caractères." : "Password must be at least 3 characters.");
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await sendTraderEmailOTP(email);
      if (res.success) {
        setDevOtpCode(res.devOtp);
        setMode("otp");
        setResendCooldown(60);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
      }
    } catch {
      setErrorMessage("Impossible d'envoyer le code de vérification.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Digit Input & Auto-advance
  const handleOtpChange = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);
    setOtpError("");

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^[0-9]{6}$/.test(paste)) {
      const split = paste.split("");
      setOtpDigits(split);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Handle OTP Verification and Account Creation
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setOtpError(lang === "fr" ? "Veuillez entrer les 6 chiffres du code." : "Please enter all 6 digits of the code.");
      return;
    }

    setIsLoading(true);
    setOtpError("");
    playClickSound();

    try {
      const res = await completeTraderSignupWithOTP(
        { name, email, password, strategy },
        fullOtp
      );
      if (res.success) {
        playSuccessSound();
        window.location.href = "/portal";
      } else {
        setOtpError(res.error || "Code OTP invalide.");
      }
    } catch {
      setOtpError("Erreur de validation. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      const res = await sendTraderEmailOTP(email);
      setDevOtpCode(res.devOtp);
      setResendCooldown(60);
      setOtpError("");
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06070A] text-white grid grid-cols-1 lg:grid-cols-12 overflow-hidden selection:bg-[#D4FF00] selection:text-[#06070A]">
      {/* Left 7 Columns: Optical Halftone Canvas + Brand Narrative */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-12 overflow-hidden border-r border-white/[0.06]">
        <div className="absolute inset-0 z-0">
          <HalftoneMotionCanvas />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <ShiftFXWordmark badge="PORTAIL TRADER v4.2" markSize={26} />
          {/* Language Switcher Pill */}
          <button
            type="button"
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-mono font-bold text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <GlobeIcon size={14} className="text-[#D4FF00]" />
            <span>{lang === "fr" ? "FR • Français" : "EN • English"}</span>
          </button>
        </div>

        <div className="relative z-10 my-auto max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-sans text-slate-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-pulse" />
            {lang === "fr" ? "Matrice G10 Souveraine • 28 Paires en Direct" : "Sovereign G10 Matrix • 28 Live Pairs"}
          </div>

          <h1 className="font-display text-4xl xl:text-5xl font-extrabold tracking-[-0.03em] leading-[1.08] text-white [text-wrap:balance]">
            {lang === "fr"
              ? "Le moteur quantitatif de biais macroéconomique."
              : "The quantitative macroeconomic bias engine."}
          </h1>

          <p className="font-sans text-base text-slate-300/90 mt-4 leading-relaxed [text-wrap:pretty]">
            {lang === "fr"
              ? "Surveillez les différentiels de taux directeurs, flux de balances courantes, momentum d'inflation et réserves souveraines à travers les 28 paires G10."
              : "Monitor central bank policy rate differentials, current account flows, inflation momentum, and sovereign reserves across all 28 G10 currency pairs."}
          </p>

          <blockquote className="mt-8 pt-6 border-t border-white/[0.08] font-sans italic text-sm text-slate-400">
            {lang === "fr"
              ? "« L'arbitrage macroéconomique institutionnel, calibré sans bruit. »"
              : "« Institutional macroeconomic arbitrage, calibrated without noise. »"}
          </blockquote>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-400 bg-black/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/[0.07] tabular-nums">
          <span>{lang === "fr" ? "ACCÈS TRADER SÉCURISÉ • SANS 2FA" : "SECURE TRADER ACCESS • ZERO-2FA"}</span>
          <span className="text-[#D4FF00] font-semibold">{lang === "fr" ? "LATENCE FLUX : 8ms" : "FEED LATENCY: 8ms"}</span>
        </div>
      </div>

      {/* Right 5 Columns: Interactive Smoked Glass Authentication Pod */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-14 py-12 relative z-10 bg-[#07080C]/90 backdrop-blur-xl">
        <div className="max-w-[420px] w-full mx-auto space-y-6">
          
          {/* Mobile Top Brand & Language Bar */}
          <div className="flex items-center justify-between lg:hidden pb-2">
            <div className="flex items-center gap-2.5">
              <ShiftFXMark animated size={30} />
              <span className="font-display text-lg font-bold text-white">
                Shift<span className="text-[#D4FF00]">FX</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[11px] font-mono font-bold text-slate-300"
            >
              <GlobeIcon size={12} className="text-[#D4FF00]" />
              <span>{lang.toUpperCase()}</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* ─────────────────────────────────────────────────────────── */}
            {/* VIEW 1: TRADER SIGN IN                                      */}
            {/* ─────────────────────────────────────────────────────────── */}
            {mode === "signin" && (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[10px] font-mono font-bold text-[#D4FF00] uppercase tracking-wider mb-2">
                    {lang === "fr" ? "Portail Trader" : "Trader Portal"}
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                    {t("auth.trader_login_title")}
                  </h2>
                  <p className="font-sans text-sm text-slate-400 mt-1">
                    {t("auth.trader_login_subtitle")}
                  </p>
                </div>

                {/* Quick Auto-fill Demo Box */}
                <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <KeyIcon size={14} className="text-[#D4FF00]" />
                    <span className="font-sans font-medium">{lang === "fr" ? "Compte Démo :" : "Demo Account:"}</span>
                    <span className="font-mono text-white font-bold tabular-nums">trader@shiftfx.io / 123</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("trader@shiftfx.io");
                      setPassword("123");
                      playClickSound();
                    }}
                    className="font-sans text-xs font-bold text-[#D4FF00] hover:underline cursor-pointer"
                  >
                    {lang === "fr" ? "Remplir" : "Fill"}
                  </button>
                </div>

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-sans font-medium"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      {t("auth.email")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MailIcon size={15} />
                      </div>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@shiftfx.io"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0D1016] border border-white/[0.08] focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] text-sm text-white placeholder-slate-400 font-sans transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">
                        {t("auth.password")}
                      </label>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <LockIcon size={15} />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0D1016] border border-white/[0.08] focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] text-sm text-white placeholder-slate-400 font-mono transition-all outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-full bg-[#D4FF00] hover:bg-[#dfeb34] active:scale-[0.98] text-[#07080C] font-sans font-bold text-sm shadow-[0_0_24px_rgba(212,255,0,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <SyncIcon size={16} className="animate-spin" />
                        <span>{lang === "fr" ? "Authentification..." : "Signing in..."}</span>
                      </>
                    ) : (
                      <>
                        <span>{t("auth.signin")}</span>
                        <ArrowRightIcon size={16} />
                      </>
                    )}
                  </button>
                </form>

                {/* Transition to Sign Up */}
                <div className="pt-4 border-t border-white/[0.06] text-center text-xs font-sans text-slate-400">
                  <span>{t("auth.signup_prompt")} </span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setMode("signup");
                      playClickSound();
                    }}
                    className="font-bold text-[#D4FF00] hover:underline cursor-pointer ml-1"
                  >
                    {t("auth.signup_link")}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* VIEW 2: TRADER SIGN UP (STEP 1)                             */}
            {/* ─────────────────────────────────────────────────────────── */}
            {mode === "signup" && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[10px] font-mono font-bold text-[#D4FF00] uppercase tracking-wider mb-2">
                    {lang === "fr" ? "Création Compte Trader" : "Trader Account Creation"}
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                    {t("auth.signup_title")}
                  </h2>
                  <p className="font-sans text-sm text-slate-400 mt-1">
                    {t("auth.signup_subtitle")}
                  </p>
                </div>

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-sans font-medium"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                <form onSubmit={handleSignUpInit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                      {t("auth.name")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <PersonIcon size={15} />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alexandre Mercier"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0D1016] border border-white/[0.08] focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] text-sm text-white placeholder-slate-400 font-sans transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                      {t("auth.email")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MailIcon size={15} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alexandre@hedgefund.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0D1016] border border-white/[0.08] focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] text-sm text-white placeholder-slate-400 font-sans transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                        {t("auth.password")}
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0D1016] border border-white/[0.08] focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] text-sm text-white placeholder-slate-400 font-mono transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                        {t("auth.confirm_password")}
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0D1016] border border-white/[0.08] focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] text-sm text-white placeholder-slate-400 font-mono transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                      {t("auth.strategy")}
                    </label>
                    <select
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0D1016] border border-white/[0.08] text-sm text-white font-sans outline-none focus:border-[#D4FF00]"
                    >
                      <option value="Carry Trade & Differentials">Carry Trade & Differentials</option>
                      <option value="Discretionary Macro">Discretionary Global Macro</option>
                      <option value="Central Bank Divergence">Central Bank Monetary Divergence</option>
                      <option value="Systematic Quantitative CTA">Systematic Quantitative CTA</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 rounded-full bg-[#D4FF00] hover:bg-[#dfeb34] active:scale-[0.98] text-[#07080C] font-sans font-bold text-sm shadow-[0_0_24px_rgba(212,255,0,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <SyncIcon size={16} className="animate-spin" />
                        <span>{lang === "fr" ? "Génération du code OTP..." : "Generating OTP code..."}</span>
                      </>
                    ) : (
                      <>
                        <span>{t("auth.signup_btn")}</span>
                        <ArrowRightIcon size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-4 border-t border-white/[0.06] text-center text-xs font-sans text-slate-400">
                  <span>{t("auth.signin_prompt")} </span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setMode("signin");
                      playClickSound();
                    }}
                    className="font-bold text-[#D4FF00] hover:underline cursor-pointer ml-1"
                  >
                    {t("auth.signin_link")}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* VIEW 3: EMAIL OTP VERIFICATION                              */}
            {/* ─────────────────────────────────────────────────────────── */}
            {mode === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setOtpError("");
                  }}
                  className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeftIcon size={14} />
                  <span>{lang === "fr" ? "Modifier les informations" : "Edit registration details"}</span>
                </button>

                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[10px] font-mono font-bold text-[#D4FF00] uppercase tracking-wider mb-2">
                    {lang === "fr" ? "Vérification E-mail" : "Email Verification"}
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                    {t("auth.otp_title")}
                  </h2>
                  <p className="font-sans text-sm text-slate-300 mt-1">
                    {t("auth.otp_subtitle")} <strong className="text-white">{email}</strong>
                  </p>
                </div>

                {/* Ready-to-Plug SMTP notice & dev demo OTP pill */}
                <div className="p-3.5 rounded-2xl bg-[#0D1016] border border-[#D4FF00]/30 shadow-[0_0_20px_rgba(212,255,0,0.06)] flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#D4FF00] font-bold uppercase tracking-wider">
                      {t("auth.otp_demo_hint")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (devOtpCode) {
                          setOtpDigits(devOtpCode.split(""));
                          playClickSound();
                        }
                      }}
                      className="font-sans text-[11px] font-bold text-[#D4FF00] hover:underline cursor-pointer"
                    >
                      {lang === "fr" ? "Insérer automatiquement" : "Auto-fill OTP"}
                    </button>
                  </div>
                  <span className="font-mono text-xl font-bold text-white tracking-[0.25em] tabular-nums">
                    {devOtpCode || "742918"}
                  </span>
                  <p className="text-[10px] text-slate-400 font-sans">
                    {lang === "fr"
                      ? "Prêt pour raccordement direct SMTP dès transmission de vos identifiants d'envoi."
                      : "Ready for direct SMTP hookup once credentials are provided."}
                  </p>
                </div>

                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-sans font-medium"
                  >
                    {otpError}
                  </motion.div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5 text-center">
                      {t("auth.otp_input_label")}
                    </label>

                    {/* 6 Individual Digit Boxes */}
                    <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpInputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-12 h-14 rounded-2xl bg-[#0D1016] border border-white/[0.12] focus:border-[#D4FF00] focus:ring-2 focus:ring-[#D4FF00]/30 text-center font-mono text-2xl font-bold text-white outline-none transition-all tabular-nums"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join("").length !== 6}
                    className="w-full py-3 rounded-full bg-[#D4FF00] hover:bg-[#dfeb34] active:scale-[0.98] text-[#07080C] font-sans font-bold text-sm shadow-[0_0_24px_rgba(212,255,0,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <SyncIcon size={16} className="animate-spin" />
                        <span>{lang === "fr" ? "Vérification..." : "Verifying..."}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon size={16} />
                        <span>{t("auth.otp_verify_btn")}</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-between text-xs font-sans text-slate-400 pt-2">
                  <span>{lang === "fr" ? "Vous n'avez pas reçu le code ?" : "Didn't receive code?"}</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleResendOtp}
                    className={`font-mono text-xs font-bold ${
                      resendCooldown > 0
                        ? "text-slate-400 cursor-not-allowed"
                        : "text-[#D4FF00] hover:underline cursor-pointer"
                    }`}
                  >
                    {resendCooldown > 0 ? `${t("auth.otp_resend")} (${resendCooldown}s)` : t("auth.otp_resend")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
