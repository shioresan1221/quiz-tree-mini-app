import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#142114",
        moss: "#244b2d",
        leaf: "#74c365",
        sun: "#f3c969",
        bark: "#5f3b22",
        mist: "#eef7e9"
      },
      boxShadow: {
        bloom: "0 18px 50px rgba(36, 75, 45, 0.18)"
      },
      backgroundImage: {
        canopy:
          "radial-gradient(circle at top, rgba(243, 201, 105, 0.35), transparent 36%), linear-gradient(180deg, #f8ffe9 0%, #d6efce 45%, #c3e8b8 100%)"
      }
    }
  },
  plugins: []
};

export default config;
