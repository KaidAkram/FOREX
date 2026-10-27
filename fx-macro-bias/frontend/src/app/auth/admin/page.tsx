"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShiftFXMark, ShiftFXWordmark } from "@/components/brand/ShiftFXLogo";
import { HalftoneMotionCanvas } from "@/components/brand/HalftoneMotionCanvas";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  ShieldCheckIcon,
  LockIcon,
  KeyIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  SyncIcon,
  ArrowLeftIcon,
  GlobeIcon
} from "@primer/octicons-react";
import { playClickSound, playSuccessSound } from "@/lib/soundEffects";

export default function AdminAuthVaultPage() {
  const router = useRouter();
  const { loginAdmin, admin2FAEnabled } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123");
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [totpDigits, setTotpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const totpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    playClickSound();

    try {
      const res = await loginAdmin(username, password);
      if (res.require2FA) {
        setStep("2fa");
        setTimeout(() => totpRefs.current[0]?.focus(), 150);
      } else if (res.success) {
        playSuccessSound();
        window.location.href = "/admin/dashboard";
      } else {
        setErrorMessage(res.error || (lang === "fr" ? "Échec de l'authentification." : "Authentication failed."));
      }
    } catch {
      setErrorMessage("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle TOTP Digits
  const handleTotpChange = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...totpDigits];
    next[index] = val;
    setTotpDigits(next);
    setErrorMessage("");

    if (val && index < 5) {
      totpRefs.current[index + 1]?.focus();
    }
  };

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !totpDigits[index] && index > 0) {
      totpRefs.current[index - 1]?.focus();
    }
  };

  const handleTotpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^[0-9]{6}$/.test(paste)) {
      setTotpDigits(paste.split(""));
      totpRefs.current[5]?.focus();
    }
  };

  // Step 2: Submit 2FA Code
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = totpDigits.join("");
    if (code.length !== 6) {
      setErrorMessage(lang === "fr" ? "Veuillez entrer les 6 chiffres du code TOTP." : "Please enter all 6 digits of your TOTP code.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    playClickSound();

    try {
      const res = await loginAdmin(username, password, code);
      if (res.success) {
        playSuccessSound();
        window.location.href = "/admin/dashboard";
      } else {
        setErrorMessage(res.error || (lang === "fr" ? "Code 2FA invalide." : "Invalid 2FA code."));
      }
    } catch {
      setErrorMessage("Échec de la validation 2FA.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white grid grid-cols-1 lg:grid-cols-12 overflow-hidden selection:bg-[#D4FF00] selection:text-[#06070A]">
      {/* Left 7 Columns: Cryptographic Halftone Vault Canvas */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-12 overflow-hidden border-r border-white/[0.08]">
        <div className="absolute inset-0 z-0">
          <HalftoneMotionCanvas />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <ShiftFXWordmark badge="ADMIN VAULT v4.2" markSize={26} />
          {/* Language Switcher */}
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {t("auth.admin_badge")}
          </div>

          <h1 className="font-display text-4xl xl:text-5xl font-extrabold tracking-[-0.03em] leading-[1.08] text-white">
            {lang === "fr"
              ? "Console d'Administration & Gestion Macro"
              : "Administrative Console & Sovereign Macro Management"}
          </h1>

          <p className="font-sans text-base text-slate-300/90 mt-4 leading-relaxed">
            {lang === "fr"
              ? "Accès sécurisé pour la calibration des pipelines d'ingestion, règles de scoring quantitatif, cadences crontab et gouvernance de la plateforme."
              : "Secure access point for configuring data ingestion pipelines, quantitative scoring rules, crontab cadences, and platform governance."}
          </p>

          <div className="mt-8 pt-6 border-t border-white/[0.08] grid grid-cols-2 gap-4 text-xs font-mono text-slate-400">
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
              <span className="text-slate-500">ISOLATION</span>
              <span className="text-white font-bold">ACCÈS DIRECT TRADER BLOQUÉ</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
              <span className="text-slate-500">DOUBLE AUTHENTIFICATION</span>
              <span className="text-[#D4FF00] font-bold">
                {admin2FAEnabled ? "2FA TOTP EXIGÉE" : "2FA DÉSACTIVÉE"}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-400 bg-black/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/[0.07] tabular-nums">
          <span>CHIFFREMENT HARDWARE-ISOLATED • FIPS 140-3</span>
          <span className="text-emerald-400 font-semibold">STATUS : AUDITÉ & CONFORME</span>
        </div>
      </div>

      {/* Right 5 Columns: High-Security Vault Authentication Pod */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-14 py-12 relative z-10 bg-[#07090D]/95 backdrop-blur-2xl">
        <div className="max-w-[420px] w-full mx-auto space-y-6">

          <AnimatePresence mode="wait">
            {/* STEP 1: CREDENTIALS */}
            {step === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    {lang === "fr" ? "Point d'Entrée Privé" : "Private Entry Point"}
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                    {t("auth.admin_title")}
                  </h2>
                  <p className="font-sans text-sm text-slate-400 mt-1">
                    {t("auth.admin_subtitle")}
                  </p>
                </div>

                {/* Demo Quick Fill */}
                <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <KeyIcon size={14} className="text-[#D4FF00]" />
                    <span className="font-sans font-medium">{lang === "fr" ? "Identifiants Admin :" : "Admin Credentials:"}</span>
                    <span className="font-mono text-white font-bold tabular-nums">admin / 123</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername("admin");
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

                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      {t("auth.admin_username")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <ShieldCheckIcon size={16} />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="admin@shiftfx.io"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0B0D12] border border-white/[0.1] focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] text-sm text-white placeholder-slate-400 font-sans outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      {t("auth.password")}
                    </label>
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0B0D12] border border-white/[0.1] focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] text-sm text-white placeholder-slate-400 font-mono outline-none transition-all"
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
                        <span>{lang === "fr" ? "Vérification des accès..." : "Verifying clearance..."}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheckIcon size={16} />
                        <span>{t("auth.admin_login_btn")}</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-4 border-t border-white/[0.06] text-center text-xs font-sans text-slate-400">
                  <span>{lang === "fr" ? "Accès réservé au personnel quantitatif agréé." : "Authorized quantitative personnel only."}</span>
                </div>
              </motion.div>
            )}

            {/* STEP 2: 2FA TOTP PROMPT */}
            {step === "2fa" && (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep("credentials");
                    setErrorMessage("");
                  }}
                  className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeftIcon size={14} />
                  <span>{lang === "fr" ? "Retour aux identifiants" : "Back to credentials"}</span>
                </button>

                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/30 text-[10px] font-mono font-bold text-[#D4FF00] uppercase tracking-wider mb-2">
                    {lang === "fr" ? "Vérification 2FA Admin" : "Admin 2FA Verification"}
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                    {t("auth.admin_2fa_prompt")}
                  </h2>
                  <p className="font-sans text-sm text-slate-400 mt-1">
                    {t("auth.admin_2fa_subtitle")}
                  </p>
                </div>

                {/* 2FA Demo Hint */}
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-[#D4FF00]/30 shadow-[0_0_20px_rgba(212,255,0,0.06)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <KeyIcon size={14} className="text-[#D4FF00]" />
                    <span className="font-mono text-white font-bold">{lang === "fr" ? "Code Démo : 123456" : "Demo Code: 123456"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTotpDigits(["1", "2", "3", "4", "5", "6"]);
                      playClickSound();
                    }}
                    className="font-sans text-[11px] font-bold text-[#D4FF00] hover:underline cursor-pointer"
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

                <form onSubmit={handle2FASubmit} className="space-y-5">
                  <div onPaste={handleTotpPaste}>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5 text-center">
                      CODE TOTP (6 CHIFFRES)
                    </label>
                    <div className="flex items-center justify-between gap-2">
                      {totpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { totpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleTotpChange(i, e.target.value)}
                          onKeyDown={(e) => handleTotpKeyDown(i, e)}
                          className="w-12 h-14 rounded-2xl bg-[#0B0D12] border border-white/[0.12] focus:border-[#D4FF00] focus:ring-2 focus:ring-[#D4FF00]/30 text-center font-mono text-2xl font-bold text-white outline-none transition-all tabular-nums"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || totpDigits.join("").length !== 6}
                    className="w-full py-3 rounded-full bg-[#D4FF00] hover:bg-[#dfeb34] active:scale-[0.98] text-[#07080C] font-sans font-bold text-sm shadow-[0_0_24px_rgba(212,255,0,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <SyncIcon size={16} className="animate-spin" />
                        <span>{lang === "fr" ? "Vérification 2FA..." : "Verifying 2FA..."}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon size={16} />
                        <span>{t("auth.admin_2fa_btn")}</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
