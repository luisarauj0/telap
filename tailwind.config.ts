import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Alinhado à landing do Privacy (gradient laranja → rosa) */
        "of-blue": "#f97316",
        "of-blue-deep": "#ec4899",
        "of-navy": "#0f172a",
        "of-muted": "#64748b",
        "of-hint": "#fff7ed",
        "of-hint-border": "#fed7aa",
      },
    },
  },
  plugins: [],
};

export default config;
