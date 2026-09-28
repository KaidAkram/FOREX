import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

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
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="bg-[#021B1A] text-[#F1F7F6] font-sans antialiased selection:bg-[#00DF81] selection:text-[#021B1A] min-h-screen relative overflow-x-hidden">
        {/* Subtle Atmospheric Ambient Radial Glows */}
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 223, 129, 0.12), transparent 70%), radial-gradient(ellipse 60% 50% at 90% 100%, rgba(3, 98, 76, 0.15), transparent 70%)"
          }} 
        />
        
        <div className="relative z-10 w-full h-full min-h-screen">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
