"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface User {
  username: string;
  role: "admin" | "user";
  name: string;
  email: string;
  strategy?: string;
  tier?: "basic" | "pro";
}

interface AuthContextType {
  user: User | null;
  role: "admin" | "user" | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  admin2FAEnabled: boolean;
  setAdmin2FAEnabled: (enabled: boolean) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  loginTrader: (emailOrUser: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  loginAdmin: (username: string, password: string, totpCode?: string) => Promise<{ success: boolean; require2FA?: boolean; user?: User; error?: string }>;
  sendTraderEmailOTP: (email: string) => Promise<{ success: boolean; devOtp: string }>;
  completeTraderSignupWithOTP: (data: { name: string; email: string; password: string; strategy?: string }, otp: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  signup: (data: { name: string; email: string; password: string; role?: "admin" | "user"; strategy?: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  setSimulatedTier: (tier: "basic" | "pro") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "shiftfx_auth_user";
const REGISTERED_USERS_KEY = "shiftfx_registered_users";
const ADMIN_2FA_KEY = "shiftfx_admin_2fa_enabled";
const PENDING_OTP_KEY = "shiftfx_pending_trader_otp";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [admin2FAEnabled, setAdmin2FAState] = useState<boolean>(false);
  const router = useRouter();

  // Load user session and 2FA status on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        setUser(null);
      }

      const stored2FA = localStorage.getItem(ADMIN_2FA_KEY);
      if (stored2FA !== null) {
        setAdmin2FAState(stored2FA === "true");
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAdmin2FAEnabled = (enabled: boolean) => {
    setAdmin2FAState(enabled);
    try {
      localStorage.setItem(ADMIN_2FA_KEY, String(enabled));
    } catch {}
  };

  // Exclusively for Traders (Public /login): NO 2FA
  const loginTrader = async (emailOrUser: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    await new Promise((r) => setTimeout(r, 250));
    const cleanUser = emailOrUser.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Demo Trader (trader / 123 or user / 123)
    if ((cleanUser === "trader" || cleanUser === "user" || cleanUser === "trader@shiftfx.io") && cleanPass === "123") {
      const traderUser: User = {
        username: "trader",
        role: "user",
        name: "Macro FX Trader",
        email: "trader@shiftfx.io",
        strategy: "Carry Trade & Differentials",
        tier: "pro"
      };
      setUser(traderUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(traderUser));
      return { success: true, user: traderUser };
    }

    // 2. Check registered accounts in storage
    try {
      const registered = localStorage.getItem(REGISTERED_USERS_KEY);
      if (registered) {
        const users = JSON.parse(registered);
        const match = users.find(
          (u: any) =>
            (u.email.toLowerCase() === cleanUser || u.username.toLowerCase() === cleanUser) &&
            u.password === cleanPass
        );
        if (match) {
          const authenticatedUser: User = {
            username: match.username,
            role: "user",
            name: match.name,
            email: match.email,
            strategy: match.strategy || "Discretionary Macro"
          };
          setUser(authenticatedUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
          return { success: true, user: authenticatedUser };
        }
      }
    } catch {}

    return {
      success: false,
      error: "Identifiants Trader invalides. Pour la démo, utilisez : trader@shiftfx.io / 123"
    };
  };

  // Dedicated Secret Admin Portal (/auth/admin): Supports 2FA if enabled
  const loginAdmin = async (
    username: string,
    password: string,
    totpCode?: string
  ): Promise<{ success: boolean; require2FA?: boolean; user?: User; error?: string }> => {
    await new Promise((r) => setTimeout(r, 250));
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Verify Admin Credentials (admin / 123 or admin@shiftfx.io / 123)
    const isAdmin = (cleanUser === "admin" || cleanUser === "admin@shiftfx.io" || cleanUser === "headquant@shiftfx.com") && cleanPass === "123";

    if (!isAdmin) {
      return {
        success: false,
        error: "Accès refusé. Identifiants administrateur incorrects."
      };
    }

    // If Admin enabled 2FA, require 6-digit TOTP validation
    if (admin2FAEnabled) {
      if (!totpCode || totpCode.trim().length !== 6) {
        return {
          success: false,
          require2FA: true,
          error: totpCode ? "Code 2FA invalide (6 chiffres requis)." : undefined
        };
      }
      // Demo accepts 123456 or any 6-digit code or generated test OTP
    }

    const adminUser: User = {
      username: "admin",
      role: "admin",
      name: "Head Quant Admin",
      email: "admin@shiftfx.io",
    };
    setUser(adminUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
    return { success: true, user: adminUser };
  };

  // Generate and prepare email OTP verification for Trader Signup
  const sendTraderEmailOTP = async (email: string): Promise<{ success: boolean; devOtp: string }> => {
    await new Promise((r) => setTimeout(r, 300));
    // Generate deterministic yet authentic 6-digit OTP
    const cleanEmail = email.trim().toLowerCase();
    const hash = cleanEmail.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const devOtp = String((hash * 7919) % 900000 + 100000);

    try {
      localStorage.setItem(PENDING_OTP_KEY, JSON.stringify({ email: cleanEmail, otp: devOtp, timestamp: Date.now() }));
    } catch {}

    // Ready for SMTP injection: when SMTP credentials are provided, send live email here
    console.info(`[ShiftFX Security] OTP for ${cleanEmail} generated: ${devOtp}`);
    return { success: true, devOtp };
  };

  // Complete Trader Signup after OTP validation
  const completeTraderSignupWithOTP = async (
    data: { name: string; email: string; password: string; strategy?: string },
    otp: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    await new Promise((r) => setTimeout(r, 350));
    const cleanEmail = data.email.trim().toLowerCase();

    // Verify OTP against pending
    try {
      const storedPending = localStorage.getItem(PENDING_OTP_KEY);
      if (storedPending) {
        const parsed = JSON.parse(storedPending);
        if (parsed.email === cleanEmail && parsed.otp !== otp.trim() && otp.trim() !== "123456") {
          return { success: false, error: "Code de vérification OTP invalide. Veuillez réessayer." };
        }
      }
    } catch {}

    const username = cleanEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
    const newTrader: User = {
      username,
      name: data.name.trim(),
      email: cleanEmail,
      role: "user",
      strategy: data.strategy || "Discretionary Macro & Carry"
    };

    try {
      const existing = localStorage.getItem(REGISTERED_USERS_KEY);
      const list = existing ? JSON.parse(existing) : [];
      list.push({ ...newTrader, password: data.password.trim() });
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(list));
      localStorage.removeItem(PENDING_OTP_KEY);
    } catch {}

    setUser(newTrader);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTrader));
    return { success: true, user: newTrader };
  };

  // Legacy fallback login
  const login = async (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const clean = username.trim().toLowerCase();
    if (clean === "admin" || clean === "admin@shiftfx.io") {
      return loginAdmin(username, password);
    }
    return loginTrader(username, password);
  };

  // Legacy signup
  const signup = async (data: { name: string; email: string; password: string; role?: "admin" | "user"; strategy?: string }) => {
    return completeTraderSignupWithOTP(data, "123456");
  };

  const setSimulatedTier = (tier: "basic" | "pro") => {
    if (!user) return;
    const updated = { ...user, tier };
    setUser(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        isLoading,
        admin2FAEnabled,
        setAdmin2FAEnabled,
        login,
        loginTrader,
        loginAdmin,
        sendTraderEmailOTP,
        completeTraderSignupWithOTP,
        signup,
        logout,
        setSimulatedTier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
