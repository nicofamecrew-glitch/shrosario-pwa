/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111",
        surface: "#f0f0f0",
        panel: "#222",
        accent: "#ee078e",
        muted: "#9b9b9b"
      }
    }
  },
  plugins: []
};
