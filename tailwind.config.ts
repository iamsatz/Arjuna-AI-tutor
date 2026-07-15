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
        display: ["var(--font-fredoka)", "system-ui", "sans-serif"],
        sans:    ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      colors: {
        arjuna: {
          // ── 90 % neutral ───────────────────────────────────────────────
          bg:      "#FFFFFF",   // pure white page background
          surface: "#FFFFFF",   // white cards
          border:  "#EFEFEF",   // hairline borders — very subtle
          text:    "#111111",   // near-black heading
          body:    "#444444",   // body copy
          muted:   "#AAAAAA",   // placeholder, meta

          // ── 10 % accent — warm coral (hero card + CTA only) ────────────
          primary:      "#E05A2B",   // warm coral-red (matches reference gradient start)
          primaryDark:  "#B84520",   // darker press state
          primaryLight: "#FDF2EE",   // tinted chip / badge bg

          // ── Feedback ──────────────────────────────────────────────────
          success: "#16A34A",
          warning: "#D97706",
          error:   "#DC2626",
          info:    "#0284C7",

          // ── Subject dots ──────────────────────────────────────────────
          maths:   "#7C3AED",
          english: "#0284C7",
          science: "#059669",
          hindi:   "#DB2777",
          sst:     "#D97706",
        },
      },
      backgroundImage: {
        // The hero card gradient — warm coral blob, exactly like the reference
        "hero-gradient": "linear-gradient(135deg, #E05A2B 0%, #C23B00 60%, #A12E00 100%)",
      },
      boxShadow: {
        // Reference cards use a soft diffuse shadow, no borders
        card:   "0 4px 20px 0 rgba(0,0,0,0.07)",
        hero:   "0 8px 32px 0 rgba(224,90,43,0.28)",
        sm:     "0 2px 8px 0 rgba(0,0,0,0.05)",
        focus:  "0 0 0 3px rgba(224,90,43,0.20)",
        // legacy — keep so nothing breaks
        chunky:        "0 4px 20px 0 rgba(0,0,0,0.07)",
        "chunky-press":"0 2px 8px 0 rgba(0,0,0,0.05)",
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
