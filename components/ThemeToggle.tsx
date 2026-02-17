"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function applyTheme(next: Theme) {
  const root = document.documentElement;

  // Mantengo tu dataset por compatibilidad
  root.dataset.theme = next;

  // Esto habilita Tailwind `dark:`
  root.classList.toggle("dark", next === "dark");

  // Persistencia
  localStorage.setItem("theme", next);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Evita crash si algo raro: default dark
    const saved = (localStorage.getItem("theme") as Theme) || "dark";
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
      className={[
        "fixed right-4 bottom-24 z-[9999] rounded-full px-4 py-2 text-sm font-semibold backdrop-blur",
        // light
        "border border-[#e5e7eb] bg-white/80 text-[#111]",
        // dark
        "dark:border-white/15 dark:bg-black/40 dark:text-white",
        "active:scale-[0.98] transition-transform",
      ].join(" ")}
      aria-label="Cambiar tema"
      title="Cambiar tema"
    >
      ⚙️ Tema: {theme === "dark" ? "Oscuro" : "Claro"}
    </button>
  );
}
