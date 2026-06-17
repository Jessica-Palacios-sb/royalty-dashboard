import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FFC400",
          dark: "#E6B000",
        },
      },
    },
  },
  plugins: [],
};

export default config;
