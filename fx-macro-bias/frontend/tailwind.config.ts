import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Brand Primary Palette (Official Brand Spec) ---
        "rich-black": "#021B1A", // RGB 2, 27, 26 - Deep base canvas
        "dark-green": "#032221", // RGB 3, 34, 33 - Primary elevated surfaces & cards
        "bangladesh": "#03624C", // RGB 3, 98, 76 - Structural borders & accents
        "meadow": "#2CC295",     // RGB 44, 194, 149 - Primary positive/bullish accent
        "caribbean": "#00DF81",  // RGB 0, 223, 129 - Radiant Hero CTA & neon highlights
        "anti-flash": "#F1F7F6", // RGB 241, 247, 246 - High-contrast text & headings

        // --- Brand Secondary Palette (Official Brand Spec) ---
        "pine": "#06302B",       // RGB 6, 48, 43 - Surface hover, nested cards
        "basil": "#0B453A",      // RGB 11, 69, 58 - Container borders & dividers
        "forest": "#095544",     // RGB 9, 85, 68 - Secondary buttons & chip fills
        "frog": "#17876D",       // RGB 23, 135, 109 - Intermediate badges & icons
        "brand-mint": "#2FA98C", // RGB 47, 169, 140 - Secondary telemetry/chart fills
        "stone": "#707D7D",      // RGB 112, 125, 125 - Muted text, timestamps
        "pistachio": "#AACBC4",  // RGB 170, 203, 196 - Soft headers (th), subtitles

        // --- UI & Canvas Semantic Tokens ---
        void: "#021B1A",
        surface: "#032221",
        "surface-2": "#06302B",
        "border-glass": "rgba(11, 69, 58, 0.6)",
        "text-primary": "#F1F7F6",
        "text-muted": "#AACBC4",
        "text-slate": "#707D7D",

        // --- Semantic Financial Indicators ---
        brand: {
          DEFAULT: "#00DF81",
          glow: "rgba(0, 223, 129, 0.35)",
        },
        mint: {
          DEFAULT: "#00DF81", // Caribbean Green for Bullish
          glow: "rgba(0, 223, 129, 0.25)",
          border: "rgba(0, 223, 129, 0.40)",
        },
        coral: {
          DEFAULT: "#FF5555", // Balanced Crimson/Coral for Bearish
          bg: "rgba(255, 85, 85, 0.12)",
          border: "rgba(255, 85, 85, 0.35)",
        },
        cyan: {
          DEFAULT: "#2CC295", // Mountain Meadow for neutral/balanced active
          glow: "rgba(44, 194, 149, 0.2)",
        },
        amber: {
          DEFAULT: "#2FA98C",
          glow: "rgba(47, 169, 140, 0.2)",
        },
      },
      fontFamily: {
        axiforma: ["Axiforma", "var(--font-jakarta)", "var(--font-sans)", "system-ui", "sans-serif"],
        hero: ["Axiforma", "var(--font-jakarta)", "var(--font-hero)", "sans-serif"],
        sans: ["Axiforma", "var(--font-jakarta)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        "kpi-xl": ["4rem", { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.02em" }],
        "kpi-lg": ["3rem", { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.02em" }],
        "kpi-md": ["2rem", { lineHeight: "1.1", fontWeight: "600" }],
        "th": ["0.75rem", { lineHeight: "1", fontWeight: "600", letterSpacing: "0.06em" }],
        "data": ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      spacing: {
        "sidebar": "80px",       
        "sidebar-open": "280px", 
        "topbar": "64px",
      },
      borderRadius: {
        "card": "24px",
        "panel": "16px",
        "chip": "8px",
        "pill": "9999px",
      },
      backgroundImage: {
        "glass-card": "linear-gradient(135deg, rgba(3, 34, 33, 0.95) 0%, rgba(6, 48, 43, 0.85) 100%)",
        "emerald-glow": "radial-gradient(ellipse at center, rgba(0, 223, 129, 0.15) 0%, transparent 70%)",
        "meadow-glow": "radial-gradient(ellipse at center, rgba(44, 194, 149, 0.15) 0%, transparent 70%)",
        "coral-glow": "radial-gradient(ellipse at center, rgba(255, 85, 85, 0.12) 0%, transparent 70%)",
      },
      boxShadow: {
        "card": "0 20px 40px rgba(2, 27, 26, 0.6)",
        "glow-caribbean": "0 0 24px rgba(0, 223, 129, 0.35)",
        "glow-meadow": "0 0 20px rgba(44, 194, 149, 0.3)",
        "glow-coral": "0 0 20px rgba(255, 85, 85, 0.25)",
      },
      keyframes: {
        shimmer: {
          "100%": {
            transform: "translateX(100%)",
          },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.08)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s infinite",
        slideUp: "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        fadeIn: "fadeIn 0.5s ease-out forwards",
        breathe: "breathe 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
