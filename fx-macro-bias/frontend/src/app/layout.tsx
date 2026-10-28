import type { Metadata } from "next";
import "./globals.css";
import "@/styles/atmosphere.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "ShiftFX — Quantitative Macro Bias Engine",
    template: "%s | ShiftFX",
  },
  description:
    "Institutional macroeconomic analytics platform for G10 Forex pairs. Algorithmic bias engine for quantitative forex trading.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Fontshare: Cabinet Grotesk (Display) & Satoshi (Humanist UI Body) */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800&f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet" />
        {/* Google Fonts: Fragment Mono strictly for Tabular Numbers */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Fragment+Mono:ital@0;1&display=swap" rel="stylesheet" />
        {/* Preload HatScripts circle-flags for instant flag rendering */}
        <link rel="preconnect" href="https://hatscripts.github.io" />
      </head>
      <body className="bg-[#06070A] text-white font-sans antialiased selection:bg-[#D4FF00] selection:text-[#06070A] min-h-screen relative overflow-x-hidden">
        {/* ── Deep Space Ambient Background Mesh ── */}
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 15% 10%, rgba(212, 255, 0, 0.055) 0%, transparent 45%)",
              "radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 95%, rgba(99, 102, 241, 0.04) 0%, transparent 55%)",
            ].join(", "),
          }}
        />
        {/* SVG Noise Texture Overlay (eliminates dark gradient colour banding) */}
        <div className="noise-overlay" />

        <div className="relative z-10 w-full h-full min-h-screen">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
