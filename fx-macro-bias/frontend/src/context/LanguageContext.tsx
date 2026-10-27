"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "fr" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = "shiftfx_language";

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  fr: {
    // Shell & Navigation
    "nav.dashboard": "Tableau de Bord",
    "nav.analytics": "Analytique",
    "nav.rules": "Règles de Notation",
    "nav.macro": "Données Macro",
    "nav.score": "Score Final",
    "nav.catalog": "Catalogue Utilisateur",
    "nav.settings": "Paramètres",
    "nav.logout": "Déconnexion",
    "nav.admin": "Admin Principal",
    "nav.search_placeholder": "Rechercher une paire, indicateur (⌘K)...",
    "nav.period": "Millésime :",

    // Common Regimes & Badges
    "regime.bullish": "ACHETEUR",
    "regime.bearish": "VENDEUR",
    "regime.neutral": "NEUTRE",
    "status.published": "Publié (PUB)",
    "status.forecast": "Estimation (EST)",
    "status.manual": "Manuel (MAN)",
    "status.live": "EN DIRECT",
    "badge.ingestion_complete": "DONNÉES COMPLÈTES",
    "badge.coverage": "Couverture d'ingestion 100%",

    // Settings Page
    "settings.title": "Paramètres & Architecture d'Ingestion",
    "settings.subtitle": "Configuration du moteur de collecte macro, cadence crontab, sécurité et bilinguisme",
    "settings.cron_active_badge": "CRON ENGINE : ACTIF",
    "settings.cron_paused_badge": "CRON ENGINE : EN PAUSE",
    "settings.run_scraper": "Exécuter le Scraper",
    "settings.running_scraper": "Collecte en cours...",
    "settings.save": "Enregistrer la Configuration",
    "settings.saving": "Enregistrement...",
    "settings.saved_notice": "Configuration enregistrée avec succès !",
    "settings.search_placeholder": "Rechercher un paramètre, une source...",

    // Settings Tabs
    "settings.tab.cron": "Planification Cron",
    "settings.tab.language": "Langue & Région",
    "settings.tab.security": "Sécurité & 2FA Admin",
    "settings.tab.ingestion": "Ingestion & Flux",
    "settings.tab.audit": "Journaux & Télémétrie",

    // Cron Tab
    "settings.cron.presets_title": "Préréglages de Cadence Cron",
    "settings.cron.presets_subtitle": "Fréquence de collecte automatique des flux macroéconomiques G10",
    "settings.cron.hourly": "Toutes les heures",
    "settings.cron.hourly_desc": "Polling haute fréquence macroéconomique",
    "settings.cron.4hours": "Toutes les 4 heures",
    "settings.cron.4hours_desc": "Équilibre optimal pour les banques centrales",
    "settings.cron.12hours": "Toutes les 12 heures",
    "settings.cron.12hours_desc": "Deux fois par jour (sessions Londres & NY)",
    "settings.cron.daily": "Quotidien à 00:00 UTC",
    "settings.cron.daily_desc": "Clôture macroéconomique quotidienne",
    "settings.cron.weekly": "Hebdomadaire (Lundi)",
    "settings.cron.weekly_desc": "Réinitialisation hebdomadaire des biais",
    "settings.cron.custom": "Expression Personnalisée",
    "settings.cron.custom_desc": "Définir une expression crontab explicite",
    "settings.cron.crontab_title": "Expression Crontab & Fuseau Horaire",
    "settings.cron.crontab_subtitle": "Évaluation crontab directe et calendrier d'exécution",
    "settings.cron.input_label": "EXPRESSION CRONTAB",
    "settings.cron.timezone_label": "Fuseau Horaire d'Exécution",
    "settings.cron.status_active": "Cron Actif",
    "settings.cron.status_paused": "En Pause",

    // Language Tab
    "settings.lang.title": "Langue de la Plateforme & Régionalisation",
    "settings.lang.subtitle": "Basculez l'intégralité du système entre le Français et l'Anglais en temps réel",
    "settings.lang.select_fr": "Français (Institutionnel)",
    "settings.lang.select_fr_desc": "Interface, terminologie financière et rapports quantitatifs en Français",
    "settings.lang.select_en": "English (Institutional)",
    "settings.lang.select_en_desc": "Interface, financial terminology and quantitative reports in English",
    "settings.lang.active_badge": "Langue Active",
    "settings.lang.instant_notice": "Le changement de langue s'applique instantanément sur toutes les pages sans rechargement.",

    // Security & 2FA Tab
    "settings.sec.title": "Sécurité Renforcée & Double Authentification (2FA)",
    "settings.sec.subtitle": "Protection biométrique & cryptographique réservée au compte Administrateur",
    "settings.sec.2fa_card_title": "Authentification à Deux Facteurs (2FA Admin)",
    "settings.sec.2fa_card_desc": "Exige un code TOTP à 6 chiffres via Google Authenticator ou 1Password lors de la connexion Admin",
    "settings.sec.2fa_trader_exemption": "Règle de sécurité : La 2FA est optionnelle pour l'Admin et TOTALEMENT DÉSACTIVÉE pour les comptes Traders (connexion directe sans friction).",
    "settings.sec.2fa_enabled_badge": "2FA ACTIVÉE",
    "settings.sec.2fa_disabled_badge": "2FA DÉSACTIVÉE",
    "settings.sec.2fa_enable_btn": "Activer la 2FA Admin",
    "settings.sec.2fa_disable_btn": "Désactiver la 2FA Admin",
    "settings.sec.2fa_modal_title": "Configuration de la Double Authentification 2FA",
    "settings.sec.2fa_scan_qr": "1. Scannez ce QR Code avec votre application d'authentification",
    "settings.sec.2fa_secret_key": "Clé secrète de secours :",
    "settings.sec.2fa_enter_code": "2. Entrez le code à 6 chiffres généré par l'application :",
    "settings.sec.2fa_verify_btn": "Vérifier & Activer",
    "settings.sec.2fa_close": "Fermer",

    // Auth & Portals
    "auth.trader_login_title": "Terminal Quantitatif Trader",
    "auth.trader_login_subtitle": "Authentifiez-vous avec votre adresse e-mail professionnelle",
    "auth.email": "Adresse e-mail professionnelle",
    "auth.password": "Mot de passe",
    "auth.signin": "Se connecter au Terminal",
    "auth.signup_prompt": "Vous n'avez pas de compte Trader ?",
    "auth.signup_link": "Créer un compte",
    "auth.signin_prompt": "Vous avez déjà un compte ?",
    "auth.signin_link": "Se connecter",
    "auth.signup_title": "Inscription Portail Trader",
    "auth.signup_subtitle": "Rejoignez le moteur d'arbitrage macroéconomique ShiftFX",
    "auth.name": "Nom complet / Identifiant Trader",
    "auth.confirm_password": "Confirmer le mot de passe",
    "auth.strategy": "Stratégie Principale",
    "auth.signup_btn": "Continuer vers la vérification e-mail",
    "auth.otp_title": "Vérification de votre E-mail",
    "auth.otp_subtitle": "Un code de vérification à 6 chiffres a été envoyé à",
    "auth.otp_input_label": "CODE DE VALIDATION OTP (6 CHIFFRES)",
    "auth.otp_verify_btn": "Valider mon Inscription & Accéder",
    "auth.otp_resend": "Renvoyer le code",
    "auth.otp_demo_hint": "Code de vérification test :",

    // Admin Secure Portal
    "auth.admin_title": "ShiftFX Sovereign Access Vault",
    "auth.admin_subtitle": "Accès d'authentification restreint au Super-Administrateur",
    "auth.admin_badge": "PORTAIL PRIVÉ • ACCÈS HAUTE SÉCURITÉ",
    "auth.admin_username": "Identifiant Administrateur (Email ou Username)",
    "auth.admin_login_btn": "S'authentifier sur le Vault",
    "auth.admin_2fa_prompt": "Code d'Authentification 2FA Requis",
    "auth.admin_2fa_subtitle": "Entrez le code à 6 chiffres de votre application TOTP",
    "auth.admin_2fa_btn": "Vérifier le Code 2FA & Ouvrir la Session",
  },
  en: {
    // Shell & Navigation
    "nav.dashboard": "Executive Dashboard",
    "nav.analytics": "Analytics",
    "nav.rules": "Scoring Rules",
    "nav.macro": "Macro Data",
    "nav.score": "Final Score",
    "nav.catalog": "User Catalog",
    "nav.settings": "Settings",
    "nav.logout": "Sign Out",
    "nav.admin": "Lead Quant Admin",
    "nav.search_placeholder": "Search currency pair, indicator (⌘K)...",
    "nav.period": "Vintage:",

    // Common Regimes & Badges
    "regime.bullish": "BULLISH",
    "regime.bearish": "BEARISH",
    "regime.neutral": "NEUTRAL",
    "status.published": "Published (PUB)",
    "status.forecast": "Forecast (EST)",
    "status.manual": "Manual (MAN)",
    "status.live": "LIVE",
    "badge.ingestion_complete": "COMPLETE DATA",
    "badge.coverage": "100% Ingestion Coverage",

    // Settings Page
    "settings.title": "Settings & Ingestion Architecture",
    "settings.subtitle": "Configuration of macro data pipeline, crontab cadence, security and dual-language localization",
    "settings.cron_active_badge": "CRON ENGINE: ACTIVE",
    "settings.cron_paused_badge": "CRON ENGINE: PAUSED",
    "settings.run_scraper": "Run Macro Scraper",
    "settings.running_scraper": "Ingestion running...",
    "settings.save": "Save Configuration",
    "settings.saving": "Saving...",
    "settings.saved_notice": "Configuration saved successfully!",
    "settings.search_placeholder": "Search setting, data source...",

    // Settings Tabs
    "settings.tab.cron": "Cron Schedule",
    "settings.tab.language": "Language & Region",
    "settings.tab.security": "Security & Admin 2FA",
    "settings.tab.ingestion": "Ingestion & Feeds",
    "settings.tab.audit": "Audit & Telemetry",

    // Cron Tab
    "settings.cron.presets_title": "Cron Cadence Presets",
    "settings.cron.presets_subtitle": "Automatic ingestion frequency for sovereign G10 macroeconomic feeds",
    "settings.cron.hourly": "Hourly",
    "settings.cron.hourly_desc": "High frequency macroeconomic polling",
    "settings.cron.4hours": "Every 4 Hours",
    "settings.cron.4hours_desc": "Optimal balance for central bank updates",
    "settings.cron.12hours": "Every 12 Hours",
    "settings.cron.12hours_desc": "Twice daily (London & NY market overlap)",
    "settings.cron.daily": "Daily at 00:00 UTC",
    "settings.cron.daily_desc": "Daily sovereign macroeconomic close",
    "settings.cron.weekly": "Weekly (Monday)",
    "settings.cron.weekly_desc": "Weekly macroeconomic bias rebalancing",
    "settings.cron.custom": "Custom Expression",
    "settings.cron.custom_desc": "Set an explicit crontab expression",
    "settings.cron.crontab_title": "Crontab Expression & Timezone",
    "settings.cron.crontab_subtitle": "Direct crontab evaluation and execution schedule",
    "settings.cron.input_label": "CRONTAB EXPRESSION",
    "settings.cron.timezone_label": "Execution Timezone",
    "settings.cron.status_active": "Cron Active",
    "settings.cron.status_paused": "Paused",

    // Language Tab
    "settings.lang.title": "Platform Language & Localization",
    "settings.lang.subtitle": "Switch the entire platform between French and English in real-time",
    "settings.lang.select_fr": "Français (Institutionnel)",
    "settings.lang.select_fr_desc": "Interface, financial terminology and quantitative reports in French",
    "settings.lang.select_en": "English (Institutional)",
    "settings.lang.select_en_desc": "Interface, financial terminology and quantitative reports in English",
    "settings.lang.active_badge": "Active Language",
    "settings.lang.instant_notice": "Language change applies instantly across all screens with zero reload required.",

    // Security & 2FA Tab
    "settings.sec.title": "Hardened Security & Two-Factor Authentication (2FA)",
    "settings.sec.subtitle": "Biometric & cryptographic protection reserved for the Administrator account",
    "settings.sec.2fa_card_title": "Two-Factor Authentication (Admin 2FA)",
    "settings.sec.2fa_card_desc": "Requires a 6-digit TOTP code via Google Authenticator or 1Password during Admin login",
    "settings.sec.2fa_trader_exemption": "Security Policy: 2FA is optional for Admin and STRICTLY DISABLED for Trader accounts (frictionless direct sign-in).",
    "settings.sec.2fa_enabled_badge": "2FA ENABLED",
    "settings.sec.2fa_disabled_badge": "2FA DISABLED",
    "settings.sec.2fa_enable_btn": "Enable Admin 2FA",
    "settings.sec.2fa_disable_btn": "Disable Admin 2FA",
    "settings.sec.2fa_modal_title": "Configure Two-Factor Authentication (2FA)",
    "settings.sec.2fa_scan_qr": "1. Scan this QR Code with your authenticator app",
    "settings.sec.2fa_secret_key": "Emergency Secret Key:",
    "settings.sec.2fa_enter_code": "2. Enter the 6-digit code generated by your app:",
    "settings.sec.2fa_verify_btn": "Verify & Activate",
    "settings.sec.2fa_close": "Close",

    // Auth & Portals
    "auth.trader_login_title": "Quantitative Trader Terminal",
    "auth.trader_login_subtitle": "Authenticate with your professional email address",
    "auth.email": "Professional Email Address",
    "auth.password": "Password",
    "auth.signin": "Sign In to Terminal",
    "auth.signup_prompt": "Don't have a Trader account?",
    "auth.signup_link": "Create Account",
    "auth.signin_prompt": "Already have an account?",
    "auth.signin_link": "Sign In",
    "auth.signup_title": "Trader Portal Registration",
    "auth.signup_subtitle": "Join the ShiftFX macroeconomic arbitrage engine",
    "auth.name": "Full Name / Trader ID",
    "auth.confirm_password": "Confirm Password",
    "auth.strategy": "Primary Strategy",
    "auth.signup_btn": "Continue to Email Verification",
    "auth.otp_title": "Verify Your Email Address",
    "auth.otp_subtitle": "A 6-digit verification code has been sent to",
    "auth.otp_input_label": "OTP VERIFICATION CODE (6 DIGITS)",
    "auth.otp_verify_btn": "Verify & Access Platform",
    "auth.otp_resend": "Resend code",
    "auth.otp_demo_hint": "Demo test code:",

    // Admin Secure Portal
    "auth.admin_title": "ShiftFX Sovereign Access Vault",
    "auth.admin_subtitle": "Restricted authentication portal for Super-Administrator",
    "auth.admin_badge": "PRIVATE PORTAL • HIGH SECURITY ACCESS",
    "auth.admin_username": "Admin Identifier (Email or Username)",
    "auth.admin_login_btn": "Authenticate to Vault",
    "auth.admin_2fa_prompt": "2FA Authentication Code Required",
    "auth.admin_2fa_subtitle": "Enter the 6-digit code from your TOTP authenticator app",
    "auth.admin_2fa_btn": "Verify 2FA Code & Open Session",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === "fr" || stored === "en") {
        setLangState(stored);
      }
    } catch {}
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      window.dispatchEvent(new CustomEvent("shiftfx-language-changed", { detail: newLang }));
    } catch {}
  };

  const t = (key: string): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.fr[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
