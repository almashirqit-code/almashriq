import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Al Mashriq red (from the logo / invoice): 600 = #D71920
        // Public website: deep navy with Al Mashriq red accents
        navy: {
          50: "#eef3fb",
          100: "#d9e4f5",
          200: "#b6c9ea",
          300: "#8aa7da",
          400: "#5c80c5",
          500: "#3b61ad",
          600: "#2b4b8f",
          700: "#233c73",
          800: "#1b2f5a",
          900: "#142344",
          950: "#0b1630",
        },
        brand: {
          50: "#fef2f2",
          100: "#fee2e3",
          200: "#fecacc",
          300: "#fca5a8",
          400: "#f76d72",
          500: "#ec3a40",
          600: "#d71920",
          700: "#b5141a",
          800: "#95151a",
          900: "#7c171c",
          950: "#430709",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Noto Sans JP", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
