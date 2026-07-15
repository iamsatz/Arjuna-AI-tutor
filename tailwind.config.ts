import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Fredoka stays for display/heading; Plus Jakarta Sans replaces Inter for body
        display: ["var(--font-fredoka)", "system-ui", "sans-serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      colors: {
        arjuna: {
          // ── 90 % neutral surfaces ──────────────────────────────────────
          bg:      "#F4F6F9",   // cool light grey page background
          surface: "#FFFFFF",   // white cards
          border:  "#E4E8EF",   // neutral card/input border
          text:    "#111827",   // near-black heading
          body:    "#374151",   // body copy — readable, not harsh
          muted:   "#9CA3AF",   // placeholder, meta text

          // ── 10 % accent — single indigo ──────────────────────────────
          primary:     "#4F46E5",   // indigo — CTA, active tab, hero card
          primaryDark: "#3730A3",   // pressed state
          primaryLight:"#EEF2FF",  // tinted bg (chips, badges)

          // ── Feedback (used sparingly) ─────────────────────────────────
          success: "#16A34A",
          warning: "#CA8A04",
          error:   "#DC2626",
          info:    "#0284C7",

          // ── Subject dots (tiny only, never fills) ────────────────────
          maths:   "#7C3AED",   // violet
          english: "#0284C7",   // sky blue
          science: "#059669",   // emerald
          hindi:   "#DB2777",   // rose
          sst:     "#D97706",   // amber
        },
      },
      boxShadow: {
        // Softer shadows to match the clean neutral palette
        sm:    "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)",
        card:  "0 2px 8px 0 rgba(0,0,0,0.06)",
        focus: "0 0 0 3px rgba(79,70,229,0.25)",
        // Keep legacy names so existing components don't break
        chunky:       "0 2px 8px 0 rgba(0,0,0,0.08)",
        "chunky-press":"0 1px 4px 0 rgba(0,0,0,0.06)",
      },
      animation: {
        "arrow-hit": "arrowHit 0.6s ease-out",
        bounceSoft:  "bounceSoft 0.5s ease-out",
        "fade-up":   "fadeUp 0.25s ease-out",
      },
      keyframes: {
        arrowHit: {
          "0%":   { transform: "translateX(-40px) scale(0.8)", opacity: "0" },
          "60%":  { transform: "translateX(0) scale(1.1)",     opacity: "1" },
          "100%": { transform: "translateX(0) scale(1)",        opacity: "1" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
