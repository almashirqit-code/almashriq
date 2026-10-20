import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Al Mashriq red (from the logo / invoice): 600 = #D71920
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
