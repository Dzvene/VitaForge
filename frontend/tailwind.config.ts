import type { Config } from "tailwindcss";

/**
 * VitaForge design language — light-first, friendly, clean.
 *
 * Semantic colors are backed by CSS variables (RGB channel triplets so Tailwind
 * opacity modifiers keep working: `bg-surface/60`). The palette lives in
 * globals.css under `:root` (light, the default) and `.dark`. Switching the
 * theme re-points the variables and recolors the whole app — components only
 * ever name semantic tokens (surface / ink / line / brand / macro …).
 *
 * Accent is a teal that's ours; macro hues stay protein-blue / fat-gold /
 * carb-green, tuned per theme for contrast.
 */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        surface: {
          DEFAULT: v("surface"),
          2: v("surface-2"),
          3: v("surface-3"),
        },
        line: {
          DEFAULT: v("line"),
          strong: v("line-strong"),
        },
        brand: {
          400: v("brand-400"),
          500: v("brand-500"),
          600: v("brand-600"),
          700: v("brand-700"),
        },
        accent: v("accent"),
        ink: {
          DEFAULT: v("ink"),
          muted: v("ink-muted"),
          faint: v("ink-faint"),
        },
        macro: {
          protein: v("macro-protein"),
          fat: v("macro-fat"),
          carb: v("macro-carb"),
        },
        ok: v("ok"),
        warn: v("warn"),
        danger: v("danger"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        // Soft, layered card shadow (defined per theme via vars in globals.css).
        card: "var(--shadow-card)",
        "card-lg": "var(--shadow-card-lg)",
        glow: "0 0 0 1px rgb(var(--brand-500) / 0.35), 0 10px 32px -10px rgb(var(--brand-500) / 0.4)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-44px)" },
          "50%": { transform: "translateY(44px)" },
          "100%": { transform: "translateY(-44px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        shimmer: "shimmer 1.6s infinite",
        "scan-line": "scan-line 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
