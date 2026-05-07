import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /* Alinhado à landing (styles.css --primary-blue / gradientes) */
        "of-blue": "#00b8ff",
        "of-blue-deep": "#0095d4",
        "of-navy": "#0f172a",
        "of-muted": "#64748b",
        "of-hint": "#e0f2fe",
        "of-hint-border": "#bae6fd",
      },
    },
  },
  plugins: [],
};

export default config;
