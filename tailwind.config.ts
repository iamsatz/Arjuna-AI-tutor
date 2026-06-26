import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arjuna: {
          bg: "#FFF8F0",
          surface: "#FFFFFF",
          primary: "#E8872A",
          primaryDark: "#C96A12",
          text: "#2D2419",
          muted: "#7A6B5A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
