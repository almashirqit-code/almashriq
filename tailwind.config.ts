import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcdaff",
          300: "#8ec2ff",
          400: "#599eff",
          500: "#3378fc",
          600: "#1d58f1",
          700: "#1543de",
          800: "#1838b4",
          900: "#1a358d",
          950: "#152256",
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
