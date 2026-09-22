"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface User {
  username: string;
  role: "admin" | "user";
  name: string;
  email: string;
  strategy?: string;
}

interface AuthContextType {
  user: User | null;
  role: "admin" | "user" | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { name: string; email: string; password: string; role?: "admin" | "user"; strategy?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "shiftfx_auth_user";
const REGISTERED_USERS_KEY = "shiftfx_registered_users";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        // Default to demo admin on fresh session if preferred, or leave unauthenticated for login
        const defaultAdmin: User = {
          username: "admin",
          role: "admin",
          name: "Quant Administrator",
          email: "admin@shiftfx.io"
        };
        setUser(defaultAdmin);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultAdmin));
      }
    } catch {
      // Fallback
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Artificial latency for smooth UI micro-interaction
    await new Promise((r) => setTimeout(r, 600));

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Admin verification (admin / 123)
    if (cleanUser === "admin" && cleanPass === "123") {
      const adminUser: User = {
        username: "admin",
        role: "admin",
        name: "Head Quant Admin",
        email: "admin@shiftfx.io",
      };
      setUser(adminUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
      return { success: true };
    }

    // 2. Demo Trader verification (trader / 123 or user / 123)
    if ((cleanUser === "trader" || cleanUser === "user") && cleanPass === "123") {
      const traderUser: User = {
        username: cleanUser,
        role: "user",
        name: "Macro FX Trader",
        email: `${cleanUser}@terminal.io`,
        strategy: "Carry Trade & Differentials"
      };
      setUser(traderUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(traderUser));
      return { success: true };
    }

    // 3. Check registered users in storage
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
            role: match.role || "user",
            name: match.name,
            email: match.email,
            strategy: match.strategy
          };
          setUser(authenticatedUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
          return { success: true };
        }
      }
    } catch {
      // Ignore parsing errors
    }

    return {
      success: false,
      error: "Invalid credentials. For Admin use: admin / 123. For Trader use: trader / 123."
    };
  };

  const signup = async (data: {
    name: string;
    email: string;
    password: string;
    role?: "admin" | "user";
    strategy?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    await new Promise((r) => setTimeout(r, 600));

    if (!data.name || !data.email || !data.password) {
      return { success: false, error: "Please fill in all required fields." };
    }

    const username = data.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const newUser: User = {
      username,
      name: data.name,
      email: data.email.toLowerCase(),
      role: data.role || "user",
      strategy: data.strategy || "Discretionary Macro"
    };

    try {
      const existing = localStorage.getItem(REGISTERED_USERS_KEY);
      const list = existing ? JSON.parse(existing) : [];
      list.push({ ...newUser, password: data.password });
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(list));
    } catch {
      // storage error fallback
    }

    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
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
