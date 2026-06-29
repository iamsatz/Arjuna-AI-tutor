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
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        arjuna: {
          bg: "#FFF8F0",
          surface: "#FFFFFF",
          primary: "#E8872A",
          primaryDark: "#C96A12",
          text: "#2D2419",
          muted: "#7A6B5A",
          sky: "#38BDF8",
          purple: "#A855F7",
          green: "#22C55E",
          yellow: "#FACC15",
        },
      },
      boxShadow: {
        chunky:
          "0 4px 0 0 rgba(45,36,25,0.15), 0 8px 16px rgba(45,36,25,0.08)",
        "chunky-press":
          "0 2px 0 0 rgba(45,36,25,0.15), 0 4px 8px rgba(45,36,25,0.08)",
      },
      animation: {
        "arrow-hit": "arrowHit 0.6s ease-out",
        bounceSoft: "bounceSoft 0.5s ease-out",
      },
      keyframes: {
        arrowHit: {
          "0%": { transform: "translateX(-40px) scale(0.8)", opacity: "0" },
          "60%": { transform: "translateX(0) scale(1.1)", opacity: "1" },
          "100%": { transform: "translateX(0) scale(1)", opacity: "1" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
