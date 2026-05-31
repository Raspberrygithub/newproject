import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1115",
        surface: "#191c23",
        surface2: "#222631",
        accent: "#6c8cff",
        accentDim: "#3a4a8c",
        good: "#3ecf8e",
        warn: "#f0a23a",
        bad: "#f0556a",
        muted: "#8b93a7",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
