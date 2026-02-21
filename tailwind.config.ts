import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0ebff",
          100: "#e2d5ff",
          200: "#c3acff",
          300: "#a37fff",
          400: "#8d3df7",
          500: "#7540df",
          600: "#4a35a5",
          700: "#332373",
          800: "#1e1550",
          900: "#0f0b2e",
          950: "#080619",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
