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
          bg: "#F7F4F0",
          surface: "#FFFFFF",
          primary: "#E8872A",
          primaryDark: "#C96A12",
          primaryLight: "#FEF0E3",
          text: "#1C1410",
          muted: "#6B5B4E",
          border: "#E8DDD4",
          sky: "#0EA5E9",
          green: "#16A34A",
          yellow: "#CA8A04",
          red: "#DC2626",
          teal: "#0D9488",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(28,20,16,0.07), 0 1px 2px rgba(28,20,16,0.05)",
        "card-hover": "0 4px 12px rgba(28,20,16,0.10), 0 2px 4px rgba(28,20,16,0.06)",
        // keep legacy names so nothing breaks
        chunky: "0 1px 3px rgba(28,20,16,0.07), 0 1px 2px rgba(28,20,16,0.05)",
        "chunky-press": "0 1px 2px rgba(28,20,16,0.06)",
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
