/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        surface: "#121212",
        panel: "#1a1a1a",
        accent: "#ee078e",
        muted: "#9b9b9b",
        
        appbg: "hsl(var(--app-bg) / <alpha-value>)",
appfg: "hsl(var(--app-fg) / <alpha-value>)",
appsurface: "hsl(var(--app-surface) / <alpha-value>)",
apppanel: "hsl(var(--app-panel) / <alpha-value>)",

      },
    },
  },
  plugins: [],
};
