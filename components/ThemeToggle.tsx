"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggle}
      className="fixed right-4 bottom-24 z-[9999] rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
      aria-label="Cambiar tema"
      title="Cambiar tema"
    >
      ⚙️ Tema: {theme === "dark" ? "Oscuro" : "Claro"}
    </button>
  );
}
