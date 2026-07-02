import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        surface: "#f6f8f9",
        accent: "#0f766e"
      }
    }
  },
  plugins: []
} satisfies Config;
