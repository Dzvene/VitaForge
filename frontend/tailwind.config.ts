import type { Config } from "tailwindcss";

/**
 * VitaForge design language — "graphite + steel".
 * Strict, athletic, dark. Near-black graphite canvas, layered cool-grey
 * surfaces, a steel-blue brand accent, and dedicated macro hues
 * (protein = blue, fat = gold, carbs = green). Numbers use tabular figures.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0C10",
        surface: {
          DEFAULT: "#11141B",
          2: "#161B24",
          3: "#1C222D",
        },
        line: {
          DEFAULT: "#232A36",
          strong: "#2E3744",
        },
        brand: {
          400: "#5C9CFF",
          500: "#3D7BFF",
          600: "#2E63E0",
          700: "#234FB8",
        },
        accent: "#38BDF8",
        ink: {
          DEFAULT: "#E7ECF3",
          muted: "#97A1B2",
          faint: "#5F6B7C",
        },
        macro: {
          protein: "#4F8DFD",
          fat: "#F4B740",
          carb: "#34D39A",
        },
        ok: "#34D39A",
        warn: "#F5A623",
        danger: "#FF5C63",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(61,123,255,0.35), 0 8px 30px -8px rgba(61,123,255,0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
