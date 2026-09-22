import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-hero",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// ── NOTE: Clash Display & SF Pro ──────────────────────────────
// Clash Display: Download from https://fonts.cdnfonts.com/css/clash-display
// and place ClashDisplay-Bold.woff2 + ClashDisplay-Semibold.woff2 in public/fonts/
// Then uncomment the localFont import below.
//
// SF Pro: system font (Apple only) — falls back to system-ui on other platforms.
// Both are declared as CSS custom property fallbacks in globals.css.

export const metadata: Metadata = {
  title: {
    default: "FX Macro Bias — Admin",
    template: "%s | FX Macro Bias",
  },
  description:
    "Institutional-grade macroeconomic analytics platform for G10 Forex pairs. Admin panel for managing the quantitative macro bias model.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} --font-sf`}>
      <head>
      </head>
      <body className="bg-[#000000] text-white font-sans antialiased selection:bg-[#1C51C5] selection:text-white">
        {/* Deep space flare background */}
        <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-80" style={{ backgroundImage: "url('/assets/blue_flare_bg.jpg')" }} />
        
        <div className="relative z-10 w-full h-screen">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
