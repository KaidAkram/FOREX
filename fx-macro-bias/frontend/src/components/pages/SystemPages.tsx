"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShiftFXMark, ShiftFXWordmark } from "@/components/brand/ShiftFXLogo";
import { HalftoneMotionCanvas } from "@/components/brand/HalftoneMotionCanvas";
import {
  ShieldCheckIcon,
  ArrowRightIcon,
  SearchIcon,
  CheckCircleIcon,
  BookIcon,
  PulseIcon,
  SyncIcon,
  ChevronDownIcon,
  GlobeIcon,
  LockIcon,
  KeyIcon,
} from "@primer/octicons-react";
import { useAuth } from "@/context/AuthContext";

// ══════════════════════════════════════════════════════════════════════════════
// 1. INSTITUTIONAL LOGIN PAGE WITH HALFTONE SHADER & 2FA AUTOFILL
// ══════════════════════════════════════════════════════════════════════════════
export function InstitutionalLoginPage({ onLogin }: { onLogin?: () => void }) {
  const router = useRouter();
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<"admin" | "trader">("admin");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleTabChange = (tab: "admin" | "trader") => {
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
        if (onLogin) onLogin();
        if (res.user?.role === "admin" || activeTab === "admin" || username.toLowerCase() === "admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/portal";
        }
      } else {
        setErrorMessage(res.error || "Échec de l'authentification.");
      }
    } catch {
      setErrorMessage("Une erreur inattendue est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06070A] text-white grid grid-cols-1 lg:grid-cols-12 overflow-hidden selection:bg-[#D4FF00] selection:text-[#06070A]">
      {/* Left 7 Columns: Optical Halftone Shader + Centered Brand Lockup */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-12 overflow-hidden border-r border-white/[0.06]">
        <div className="absolute inset-0 z-0">
          <HalftoneMotionCanvas />
        </div>
        <div className="relative z-10">
          <ShiftFXWordmark badge="QUANT ENGINE v4.2" markSize={26} />
        </div>
        <div className="relative z-10 my-auto max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-sans text-slate-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-pulse" />
            Matrice G10 Souveraine • 28 Paires Calibrées en Temps Réel
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-extrabold tracking-[-0.03em] leading-[1.08] text-white [text-wrap:balance]">
            La précision macroéconomique, sans le bruit.
          </h1>
          <p className="font-sans text-base text-slate-300/90 mt-4 leading-relaxed [text-wrap:pretty]">
            Agrégation fondamentale multi-piliers, différentiels de taux directeurs et signaux de portage institutionnels calibrés pour les décideurs FX.
          </p>
          <blockquote className="mt-8 pt-6 border-t border-white/[0.08] font-sans italic text-sm text-slate-400">
            « L'arbitrage macroéconomique souverain, calibré à la milliseconde. »
          </blockquote>
        </div>
        <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-400 bg-black/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/[0.07] tabular-nums">
          <span>CHIFFREMENT TLS 1.3 • AES-256-GCM</span>
          <span className="text-[#D4FF00] font-semibold">LATENCE MOTEUR : 12ms</span>
        </div>
      </div>

      {/* Right 5 Columns: Smoked Glass Authentication Pod */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-14 py-12 relative z-10 bg-[#07080C]/90 backdrop-blur-xl">
        <div className="max-w-[420px] w-full mx-auto space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-5 lg:hidden">
              <ShiftFXMark animated size={34} />
              <span className="font-display text-xl font-bold text-white">
                Shift<span className="text-[#D4FF00]">FX</span>
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white [text-wrap:balance]">
              Accès Terminal & Administration
            </h2>
            <p className="font-sans text-sm text-slate-400 mt-1">
              Authentifiez-vous avec vos identifiants quantitatifs ShiftFX.
            </p>
          </div>

          {/* Role Segmented Controller */}
          <div className="flex items-center bg-[#0E1016] p-1.5 rounded-2xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => handleTabChange("admin")}
              className={`flex-1 py-2 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "bg-[#D4FF00] text-[#07080C] shadow-[0_0_16px_rgba(212,255,0,0.25)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Admin Principal
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("trader")}
              className={`flex-1 py-2 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer ${
                activeTab === "trader"
                  ? "bg-[#D4FF00] text-[#07080C] shadow-[0_0_16px_rgba(212,255,0,0.25)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Portail Trader
            </button>
          </div>

          {/* Quick Demo Credential Pill */}
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <KeyIcon size={14} className="text-[#D4FF00]" />
              <span className="font-sans">Démo :</span>
              <span className="font-mono text-white font-bold tabular-nums">
                {activeTab === "admin" ? "admin / 123" : "trader / 123"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange(activeTab)}
              className="font-sans text-[11px] font-bold text-[#D4FF00] hover:underline cursor-pointer"
            >
              Auto-remplir
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 font-sans text-xs">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-xs font-medium text-slate-300 mb-1.5">
                Identifiant Institutionnel
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full h-11 rounded-xl bg-[#0E1016] border border-white/[0.08] px-4 font-sans text-sm text-white focus:outline-none focus:border-[#D4FF00]/60 transition-colors"
              />
            </div>

            <div>
              <label className="block font-sans text-xs font-medium text-slate-300 mb-1.5">
                Mot de Passe Sécurisé
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 rounded-xl bg-[#0E1016] border border-white/[0.08] px-4 font-sans text-sm text-white focus:outline-none focus:border-[#D4FF00]/60 transition-colors"
              />
            </div>

            {/* CHECKLIST #15: 1-Time Code / 2FA Input with Autofill */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-sans text-xs font-medium text-slate-300">
                  Code d'Authentification 2FA (Optionnel)
                </label>
                <span className="font-mono text-[10px] text-slate-500">6 chiffres</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="• • • • • •"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#0E1016] border border-white/[0.08] px-4 font-mono text-sm tracking-[0.4em] text-white placeholder:text-slate-600 focus:outline-none focus:border-[#D4FF00]/60 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-full bg-[#D4FF00] hover:bg-[#e2ff33] text-[#07080C] font-sans font-bold text-sm flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <SyncIcon size={16} className="animate-spin text-[#07080C]" />
              ) : (
                <>
                  <span>Ouvrir la Session Quantitative</span>
                  <ArrowRightIcon size={16} />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/[0.06] text-center font-sans text-xs text-slate-400">
            <span>Besoin d'assistance ou d'un token d'accès API ? </span>
            <Link href="/support" className="text-[#D4FF00] hover:underline font-semibold ml-1">
              Centre de Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. 404 NOT FOUND PAGE ("SIGNAL LOST / HORS-MATRICE")
// ══════════════════════════════════════════════════════════════════════════════
export function NotFound404Page({ onBack }: { onBack?: () => void }) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push("/admin/dashboard");
    }
  };

  const triggerPalette = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    }
  };

  return (
    <div className="relative min-h-[85vh] rounded-[28px] overflow-hidden border border-white/[0.08] flex flex-col items-center justify-center text-center p-6 sm:p-12">
      <div className="absolute inset-0 opacity-60">
        <HalftoneMotionCanvas />
      </div>
      <div className="relative z-10 max-w-lg space-y-6 bg-[#0A0C12]/90 backdrop-blur-2xl p-8 sm:p-10 rounded-[28px] border border-white/[0.1] shadow-2xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shadow-lg">
          <ShiftFXMark animated size={32} />
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 font-mono text-[11px] font-bold text-rose-300 uppercase tracking-wider">
          SIGNAL PERDU • VECTEUR HORS-MATRICE 404
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white [text-wrap:balance] tracking-tight">
          Vecteur Macroéconomique Introuvable
        </h1>
        <p className="font-sans text-sm text-slate-300 leading-relaxed [text-wrap:pretty]">
          La route ou la paire souveraine demandée n'existe pas dans la matrice G10 actuelle. Vérifiez l'URL ou utilisez la palette de commande.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleBack}
            className="w-full sm:w-auto h-10 px-5 rounded-full bg-[#D4FF00] hover:bg-[#e2ff33] text-[#07080C] font-sans font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
          >
            <span>Retour au Tableau de Bord</span>
            <ArrowRightIcon size={14} />
          </button>
          <button
            onClick={triggerPalette}
            className="w-full sm:w-auto h-10 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] font-sans font-semibold text-xs text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <SearchIcon size={14} className="text-[#D4FF00]" />
            <span>Rechercher une Paire ⌘K</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. INSTITUTIONAL SUPPORT & METHODOLOGY DOCUMENTATION PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function SupportDocumentationPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const FAQS = [
    {
      q: "Comment est calculé le score composite à 6 piliers ?",
      a: "Chaque devise du G10 est évaluée à travers 6 piliers fondamentaux : Inflation IPC, Taux Directeurs des Banques Centrales, Croissance PIB, Balance Courante, Réserves de Change et Momentum Actions. Chaque pilier génère un score normé de -10 à +10, agrégé selon les coefficients de pondération dynamiques.",
    },
    {
      q: "Quelle est la fréquence de synchronisation des banques centrales ?",
      a: "Le scraper automatique s'exécute à la minute 0 de chaque heure (24 cycles quotidiens). Lors de réunions monétaires majeures (FOMC, BCE, BoE, BoJ), le flux temps réel est déclenché avec une latence inférieure à 500ms.",
    },
    {
      q: "Comment fonctionne l'exportation des signaux via API & Webhooks ?",
      a: "Toute mise à jour du biais souverain supérieur à un différentiel de ±20% émet un payload webhook JSON chiffré vers vos serveurs d'exécution avec signature cryptographique HMAC-SHA256.",
    },
    {
      q: "Quelles sont les paires du G10 surveillées dans le catalogue ?",
      a: "Les 28 paires canoniques issues des 8 devises souveraines majeures (USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD) complétées par les devises nordiques (SEK, NOK) pour les analyses de réserves et de balance.",
    },
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8 flex flex-col text-white space-y-8">
      {/* Hero Header with Halftone Accents */}
      <div className="relative rounded-[28px] overflow-hidden bg-[#0A0C12] border border-white/[0.08] p-8 sm:p-12 shadow-2xl">
        <div className="absolute inset-0 opacity-40">
          <HalftoneMotionCanvas />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] font-mono text-[11px] text-[#D4FF00]">
            <ShieldCheckIcon size={14} />
            DOCUMENTATION QUANTITATIVE & SUPPORT 24/5
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white [text-wrap:balance]">
            Architecture Méthodologique & Support Dédié
          </h1>
          <p className="font-sans text-sm text-slate-300 leading-relaxed [text-wrap:pretty]">
            Accédez aux formules mathématiques de normalisation, à la télémétrie des flux d'ingestion et contactez les ingénieurs quantitatifs ShiftFX.
          </p>
        </div>
      </div>

      {/* Top Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0E1016] border border-white/[0.07] flex items-center justify-between">
          <div>
            <p className="font-sans text-xs text-slate-400">Moteur Quantitatif</p>
            <p className="font-mono text-base font-bold text-white tabular-nums">100% Opérationnel</p>
          </div>
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="p-4 rounded-2xl bg-[#0E1016] border border-white/[0.07] flex items-center justify-between">
          <div>
            <p className="font-sans text-xs text-slate-400">Latence API Ingestion</p>
            <p className="font-mono text-base font-bold text-[#D4FF00] tabular-nums">14 ms</p>
          </div>
          <PulseIcon size={18} className="text-[#D4FF00]" />
        </div>
        <div className="p-4 rounded-2xl bg-[#0E1016] border border-white/[0.07] flex items-center justify-between">
          <div>
            <p className="font-sans text-xs text-slate-400">Flux Banques Centrales</p>
            <p className="font-mono text-base font-bold text-white tabular-nums">10 / 10 Synchronisés</p>
          </div>
          <CheckCircleIcon size={18} className="text-emerald-400" />
        </div>
      </div>

      {/* 3 Core Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-[22px] bg-[#0E1016] border border-white/[0.07] flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#D4FF00]">
              <BookIcon size={20} />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Méthodologie des 6 Piliers
            </h3>
            <p className="font-sans text-xs text-slate-400 leading-relaxed">
              Détails des équations de standardisation Z-score, bornage min-max [-10, +10] et gestion des pondérations cycliques.
            </p>
          </div>
          <Link
            href="/admin/rating-rules"
            className="font-sans text-xs font-semibold text-[#D4FF00] hover:underline inline-flex items-center gap-1.5"
          >
            Consulter les Règles de Notation <ArrowRightIcon size={13} />
          </Link>
        </div>

        <div className="p-6 rounded-[22px] bg-[#0E1016] border border-white/[0.07] flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#D4FF00]">
              <GlobeIcon size={20} />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Documentation API & Webhooks
            </h3>
            <p className="font-sans text-xs text-slate-400 leading-relaxed">
              Spécifications OpenAPI 3.0, schémas de réponse JSON, authentification par tokens Bearer et endpoints de télémétrie.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="font-sans text-xs font-semibold text-[#D4FF00] hover:underline inline-flex items-center gap-1.5"
          >
            Gérer les Clés API & Webhooks <ArrowRightIcon size={13} />
          </Link>
        </div>

        <div className="p-6 rounded-[22px] bg-[#0E1016] border border-white/[0.07] flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#D4FF00]">
              <ShieldCheckIcon size={20} />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Support Quant Dédié 24/5
            </h3>
            <p className="font-sans text-xs text-slate-400 leading-relaxed">
              Assistance directe par canal privé pour les desks de trading institutionnels et les gérants de fonds partenaires.
            </p>
          </div>
          <a
            href="mailto:quant.support@shiftfx.io"
            className="font-sans text-xs font-semibold text-[#D4FF00] hover:underline inline-flex items-center gap-1.5"
          >
            Contacter l'Équipe Quant <ArrowRightIcon size={13} />
          </a>
        </div>
      </div>

      {/* Searchable FAQ Accordion */}
      <div className="rounded-[24px] bg-[#0E1016] border border-white/[0.07] p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-white tracking-tight">
          Questions Fréquentes & Télémétrie Moteur
        </h2>
        <div className="divide-y divide-white/[0.05]">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-sans text-sm font-semibold text-white hover:text-[#D4FF00] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDownIcon
                    size={16}
                    className={`transition-transform duration-200 text-slate-400 ${
                      isOpen ? "rotate-180 text-[#D4FF00]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="font-sans text-xs text-slate-300/90 mt-2.5 leading-relaxed [text-wrap:pretty]">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. BRAND LOADER COMPONENT (ShiftFXBrandLoader)
// ══════════════════════════════════════════════════════════════════════════════
export function ShiftFXBrandLoader({
  isLoading = true,
  statusText = "Synchronisation de la matrice souveraine G10...",
}: {
  isLoading?: boolean;
  statusText?: string;
}) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#06070A]/95 backdrop-blur-2xl text-white select-none">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <HalftoneMotionCanvas />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-5 text-center p-8 max-w-sm">
        <div className="relative">
          <ShiftFXMark animated size={54} />
          <div className="absolute inset-0 rounded-full blur-xl bg-[#D4FF00]/20 animate-pulse pointer-events-none" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-display text-xl font-bold tracking-tight text-white">
            Shift<span className="text-[#D4FF00]">FX</span> Quant Engine
          </h3>
          <p className="font-sans text-xs text-slate-400 [text-wrap:balance]">
            {statusText}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
