"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function applyTheme(next: Theme) {
  const root = document.documentElement;

  if (next === "dark") root.classList.add("dark");
  else root.classList.remove("dark");

  localStorage.setItem("theme", next);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) || "light";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className="fixed right-4 bottom-24 z-[9999] rounded-full px-4 py-2 text-sm font-semibold backdrop-blur border border-[#e5e7eb] bg-white text-[#111] dark:border-white/15 dark:bg-black/40 dark:text-white active:scale-[0.98] transition-transform"
      aria-label="Cambiar tema"
      title="Cambiar tema"
    >
      ⚙️ Tema: {theme === "dark" ? "Oscuro" : "Claro"}
    </button>
  );
}
