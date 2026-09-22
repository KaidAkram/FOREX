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
        // Base canvas
        void: "#000000",
        // Elevated surfaces
        surface: "#151515",
        "surface-2": "#1E1E1E",
        // Borders
        "border-glass": "rgba(255, 255, 255, 0.07)",
        // Text
        "text-primary": "#FFFFFF",
        "text-muted": "#8B949E",
        "text-slate": "#8B949E",
        // Accents
        brand: {
          DEFAULT: "#1C51C5",
          glow: "rgba(28, 81, 197, 0.4)",
        },
        mint: {
          DEFAULT: "#6FF542", // Electric Neon Green (Bullish/Active)
          glow: "rgba(111, 245, 66, 0.25)",
          border: "rgba(111, 245, 66, 0.40)",
        },
        coral: {
          DEFAULT: "#FF4444", // Coral Red (Bearish/Alert)
          bg: "rgba(255, 68, 68, 0.10)",
          border: "rgba(255, 68, 68, 0.40)",
        },
        cyan: {
          DEFAULT: "#00E5FF", // Electric Cyan
          glow: "rgba(0, 229, 255, 0.15)",
        },
        amber: {
          DEFAULT: "#FFB300",
          glow: "rgba(255, 179, 0, 0.15)",
        },
      },
      fontFamily: {
        hero: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      fontSize: {
        "kpi-xl": ["4rem", { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.02em" }],
        "kpi-lg": ["3rem", { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.02em" }],
        "kpi-md": ["2rem", { lineHeight: "1.1", fontWeight: "600" }],
        "th": ["0.75rem", { lineHeight: "1", fontWeight: "500", letterSpacing: "0.05em" }], // Inter xs uppercase tracking-wider
        "data": ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      spacing: {
        "sidebar": "80px",       
        "sidebar-open": "260px", 
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
        "mint-glow": "radial-gradient(ellipse at center, rgba(111, 245, 66, 0.15) 0%, transparent 70%)",
        "coral-glow": "radial-gradient(ellipse at center, rgba(255, 68, 68, 0.12) 0%, transparent 70%)",
      },
      boxShadow: {
        "card": "0 20px 40px rgba(0,0,0,0.4)", // + custom borders will be applied in classes
        "glow-mint": "0 0 20px rgba(111,245,66,0.25)",
        "glow-coral": "0 0 20px rgba(255,68,68,0.25)",
      },
      keyframes: {
        shimmer: {
          "100%": {
            transform: "translateX(100%)",
          },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s infinite",
        slideUp: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        fadeIn: "fadeIn 0.6s ease-out forwards",
        breathe: "breathe 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
