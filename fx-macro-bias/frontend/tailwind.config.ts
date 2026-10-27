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
        // --- Sleek Dark Canvas & Surface Tokens (Restored Screenshot Palette) ---
        void: "#0C0D12",            // Deep matte obsidian canvas
        surface: "#121418",         // Primary elevated glass card surface
        "surface-2": "#181A20",     // Secondary surface, nested cards, pills
        "surface-3": "#20232B",     // Active dark pill, hover states
        "border-glass": "rgba(255, 255, 255, 0.08)",
        "text-primary": "#FFFFFF",
        "text-muted": "#A0A5B1",
        "text-slate": "#8B949E",

        // --- Signature Volt Lime Accent (The Exact Screenshot Pill & Accent) ---
        volt: {
          DEFAULT: "#D2F646",
          hover: "#E1FA68",
          glow: "rgba(210, 246, 70, 0.35)",
          border: "rgba(210, 246, 70, 0.40)",
        },
        brand: {
          DEFAULT: "#D2F646",
          glow: "rgba(210, 246, 70, 0.35)",
        },
        mint: {
          DEFAULT: "#6FF542",        // Electric Neon Green for Status & Bullish
          glow: "rgba(111, 245, 66, 0.25)",
          border: "rgba(111, 245, 66, 0.40)",
        },
        coral: {
          DEFAULT: "#FF5B5B",        // Coral Red for Bearish & Alerts
          bg: "rgba(255, 91, 91, 0.12)",
          border: "rgba(255, 91, 91, 0.35)",
        },
        cyan: {
          DEFAULT: "#00E5FF",        // Electric Cyan
          glow: "rgba(0, 229, 255, 0.2)",
        },
        amber: {
          DEFAULT: "#FFD066",        // Warm Amber / Forecast Indicator
          glow: "rgba(255, 208, 102, 0.2)",
        },

        // --- Backwards-Compatibility Aliases (Mapped to Sleek Charcoal / Volt) ---
        "rich-black": "#0C0D12",
        "dark-green": "#121418",
        "bangladesh": "#1F222A",
        "meadow": "#6FF542",
        "caribbean": "#D2F646",
        "anti-flash": "#FFFFFF",
        "pine": "#181A20",
        "basil": "rgba(255, 255, 255, 0.08)",
        "forest": "#20232B",
        "frog": "#D2F646",
        "brand-mint": "#6FF542",
        "stone": "#8B949E",
        "pistachio": "#A0A5B1",
      },
      fontFamily: {
        display: ["var(--font-display)", "'Cabinet Grotesk'", "sans-serif"],
        sans: ["var(--font-sans)", "'Satoshi'", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "'Fragment Mono'", "monospace"],
        hero: ["var(--font-display)", "'Cabinet Grotesk'", "sans-serif"],
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
        "glass-card": "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
        "volt-glow": "radial-gradient(ellipse at center, rgba(210, 246, 70, 0.20) 0%, transparent 70%)",
        "mint-glow": "radial-gradient(ellipse at center, rgba(111, 245, 66, 0.15) 0%, transparent 70%)",
        "coral-glow": "radial-gradient(ellipse at center, rgba(255, 91, 91, 0.12) 0%, transparent 70%)",
      },
      boxShadow: {
        "card": "0 20px 40px rgba(0, 0, 0, 0.5)",
        "glow-volt": "0 0 24px rgba(210, 246, 70, 0.35)",
        "glow-mint": "0 0 20px rgba(111, 245, 66, 0.25)",
        "glow-coral": "0 0 20px rgba(255, 91, 91, 0.25)",
        "glow-caribbean": "0 0 24px rgba(210, 246, 70, 0.35)",
        "glow-meadow": "0 0 20px rgba(111, 245, 66, 0.25)",
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
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(210, 246, 70, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(210, 246, 70, 0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s infinite",
        slideUp: "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        fadeIn: "fadeIn 0.5s ease-out forwards",
        breathe: "breathe 4s ease-in-out infinite",
        pulseGlow: "pulseGlow 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
