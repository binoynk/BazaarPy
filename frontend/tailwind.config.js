/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:       "rgb(var(--color-bg) / <alpha-value>)",
        surface:  "rgb(var(--color-surface) / <alpha-value>)",
        surface2: "rgb(var(--color-surface-2) / <alpha-value>)",
        line:     "rgb(var(--color-line) / <alpha-value>)",
        line2:    "rgb(var(--color-line-2) / <alpha-value>)",
        ink:      "rgb(var(--color-ink) / <alpha-value>)",
        ink2:     "rgb(var(--color-ink-2) / <alpha-value>)",
        muted:    "rgb(var(--color-muted) / <alpha-value>)",
        faint:    "rgb(var(--color-faint) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
