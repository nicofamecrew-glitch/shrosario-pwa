/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
    
  ],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        surface: "#121212",
        panel: "#1a1a1a",
        accent: "#ee078e",
        muted: "#9b9b9b"
      }
    }
  },
  plugins: []
};
