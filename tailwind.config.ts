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

// Warm neutrals from the house palette: Paper #F4F0EA, Line #E3DBD1, Chrome #D7D2CB, Mute #6D655C, Ink #1A1714, Night #141210.
// Replaces Tailwind's cool slate everywhere, so every existing slate-* utility turns warm.
const warm = {
  50: "#f4f0ea",
  100: "#ede7df",
  200: "#e3dbd1",
  300: "#d7d2cb",
  400: "#a39a90",
  500: "#7a7167",
  600: "#6d655c",
  700: "#4a433c",
  800: "#2b2621",
  900: "#1a1714",
  950: "#141210",
};

// Lacquer seal (#9E1B16) and its tints: the house accent, also the "brand" scale.
const lacquer = {
  50: "#fbf1ef",
  100: "#f5dedb",
  200: "#ebbdb8",
  300: "#dc958e",
  400: "#c8665e",
  500: "#b3382f",
  600: "#9e1b16",
  700: "#84160f",
  800: "#6b130e",
  900: "#56110d",
  950: "#2f0806",
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
          DEFAULT: "#141210",
          800: "#2b2621",
          900: "#1a1714",
          950: "#141210",
        },
        slate: warm,
        paper: "#f4f0ea",
        card: "#fffcf8",
        ink: "#1a1714",
        night: "#141210",
        mute: "#6d655c",
        line: "#e3dbd1",
        chrome: "#d7d2cb",
        lacquer,
        cerulean,
        // Primary actions (name kept from the navy era): Night #141210. The accent is the lacquer "brand" scale.
        harbour: { DEFAULT: "#141210", hi: "#2b2621", deep: "#141210", 50: "#efe9e1", 100: "#e3dbd1" },
        navy: {
          50: cerulean[50],
          100: cerulean[100],
          200: cerulean[200],
          300: cerulean[300],
          400: cerulean[400],
          500: "#007ba7",
          600: "#007ba7",
          700: "#00658a",
          800: "#2b2621",
          900: "#1a1714",
          950: "#141210",
        },
        brand: lacquer,
        rose: lacquer,
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
