import type { Config } from "tailwindcss";

/*
 * Al Mashriq brand palette: jet black · cerulean blue · logo red.
 * The scale names (navy / brand) are kept so every existing utility picks up the new colours.
 *  - navy:  light end = cerulean tints, 400–700 = cerulean (600 = #007BA7), 800–950 = jet black
 *  - brand: logo red (600 = #D71920, the red in the logo and on invoices; 600+ carries white text at ≥ 4.5:1)
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

const logoRed = {
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
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "white" follows --fg (an RGB triplet): real white everywhere by default (admin), but the public
        // site's light theme sets --fg to jet black, so text-white/60, bg-white/10, border-white/10… become
        // dark text, light tints and hairlines there. Black areas (header, footer, buttons) set it back to white.
        white: "rgb(var(--fg, 255 255 255) / <alpha-value>)",
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
        brand: logoRed,
        rose: logoRed,
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
