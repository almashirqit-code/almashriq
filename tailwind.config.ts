import type { Config } from "tailwindcss";

/*
 * Al Mashriq brand palette: jet black · cerulean blue · neon rose.
 * The scale names (navy / brand) are kept so every existing utility picks up the new colours.
 *  - navy:  light end = cerulean tints, 400–700 = cerulean (600 = #007BA7), 800–950 = jet black
 *  - brand: neon rose (500 = #FF2E88 for glows/decoration; 600+ carries white text at ≥ 4.5:1)
 *  - rose / sky / blue are aliased to the brand colours so decorative gradients stay on-palette.
 * Semantic colours (red = error, emerald = success, amber = warning, violet/indigo status badges) are untouched.
 */
const cerulean = {
  50: "#eaf6fc",
  100: "#cfeaf7",
  200: "#a3d6ef",
  300: "#6bbde3",
  400: "#2ea8df",
  500: "#0a8cc2",
  600: "#007ba7",
  700: "#00658a",
  800: "#05506d",
  900: "#063f56",
  950: "#04293a",
};

const neonRose = {
  50: "#fff0f7",
  100: "#ffe0ef",
  200: "#ffc2df",
  300: "#ff94c5",
  400: "#ff5ca4",
  500: "#ff2e88",
  600: "#e0156f",
  700: "#b80e5a",
  800: "#920d49",
  900: "#780f3e",
  950: "#46031f",
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jet: {
          DEFAULT: "#0a0a0c",
          800: "#17181c",
          900: "#111114",
          950: "#0a0a0c",
        },
        cerulean,
        navy: {
          50: cerulean[50],
          100: cerulean[100],
          200: cerulean[200],
          300: cerulean[300],
          400: cerulean[400],
          500: "#007ba7",
          600: "#007ba7",
          700: "#00658a",
          800: "#17181c",
          900: "#111114",
          950: "#0a0a0c",
        },
        brand: neonRose,
        rose: neonRose,
        sky: cerulean,
        blue: { ...cerulean, 600: "#00658a", 700: "#05506d" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Noto Sans JP", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
