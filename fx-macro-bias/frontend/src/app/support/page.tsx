"use client";

import React from "react";
import Link from "next/link";
import { SupportDocumentationPage } from "@/components/pages/SystemPages";
import { ShiftFXWordmark } from "@/components/brand/ShiftFXLogo";
import { ArrowLeftIcon } from "@primer/octicons-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#06070A] text-white">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-white/[0.06] bg-[#07080C]/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
        <ShiftFXWordmark badge="SUPPORT" markSize={24} />
        <Link
          href="/admin/dashboard"
          className="font-sans text-xs font-semibold text-[#D4FF00] hover:underline flex items-center gap-1.5"
        >
          <ArrowLeftIcon size={14} />
          <span>Tableau de Bord Exécutif</span>
        </Link>
      </header>

      <main className="py-6 sm:py-10">
        <SupportDocumentationPage />
      </main>
    </div>
  );
}
