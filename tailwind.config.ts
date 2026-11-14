import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-fredoka)", "var(--font-plus-jakarta)", "sans-serif"],
      },
      boxShadow: {
        surface:
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -4px rgba(15, 23, 42, 0.06)",
        elevated:
          "0 4px 12px rgba(15, 23, 42, 0.06), 0 24px 48px -8px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
