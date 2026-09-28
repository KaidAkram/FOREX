"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        window.location.href = "/login";
      } else if (user.role !== "admin") {
        window.location.href = "/portal";
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#021B1A] text-[#F1F7F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#00DF81] border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-[#AACBC4] tracking-wider">Verifying Admin Session...</span>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#021B1A] text-[#F1F7F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#00DF81] border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-[#AACBC4] tracking-wider">Redirecting to Login...</span>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#021B1A] text-[#F1F7F6] overflow-hidden font-sans antialiased relative z-0">
        
        {/* --- Ambient Background Layer --- */}
        {/* 1. Subtle Dot Grid Pattern in Pistachio tint */}
        <div 
          className="absolute inset-0 z-[-2] opacity-40 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(170, 203, 196, 0.05) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px"
          }}
        />

        {/* 2. Top-Left Glowing Orb (Caribbean Green) */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#00DF81]/5 blur-[140px] pointer-events-none z-[-1] animate-breathe" />

        {/* 3. Bottom-Right Glowing Orb (Bangladesh Green) */}
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#03624C]/10 blur-[150px] pointer-events-none z-[-1] animate-breathe" style={{ animationDelay: "2s" }} />

        {/* --- Main Content Layout --- */}
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col h-full overflow-y-auto z-10 relative">
          <MobileTopBar />
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
