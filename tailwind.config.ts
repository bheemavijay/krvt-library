import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          purple: "#6C3BAA",
          gold: "#D4AF37",
          black: "#0B0B0F",
          crimson: "#DC143C",
        },
      },
    },
  },
  plugins: [],
};

export default config;