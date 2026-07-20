import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        merk: {
          DEFAULT: "#0f5aa8",
          donker: "#0b4383",
          licht: "#e8f1fb",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
