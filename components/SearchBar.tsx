"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  className?: string;
  placeholder?: string;
};

export default function SearchBar({
  className = "",
  placeholder = "Buscar productos, marcas o combos",
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const go = () => {
    const query = q.trim();
    if (!query) return;
    router.push(`/catalog?q=${encodeURIComponent(query)}`);
  };

  const chips = [
    { label: "🔥 Más vendidos", href: "/catalog?q=bestseller" },
    { label: "🎁 Combos", href: "/catalog?q=combo" },
    { label: "🆕 Novedades", href: "/catalog?q=new" },
    { label: "📚 Catálogo", href: "/catalog" },
  ];

  return (
    <div className={className}>
      <div
        className={[
          "flex items-center gap-2 rounded-2xl px-4 py-3 backdrop-blur-md",
          "border bg-appsurface",
          // borde coherente en ambos temas
          "border-black/10 dark:border-white/10",
        ].join(" ")}
      >
        <svg
          className="h-5 w-5 opacity-70 text-black/50 dark:text-white/70"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M21 21l-4.3-4.3m1.3-5.2a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          placeholder={placeholder}
          className={[
            "w-full bg-transparent outline-none",
            "text-appfg placeholder:text-black/40",
            "dark:placeholder:text-white/40",
          ].join(" ")}
        />

        <button
          onClick={go}
          className={[
            "rounded-xl px-3 py-2 text-sm font-semibold active:scale-[0.98] transition-transform",
            "border border-black/10 bg-white text-black",
            "dark:border-white/10 dark:bg-white/10 dark:text-white",
          ].join(" ")}
        >
          Buscar
        </button>
      </div>

      {/* chips rápidos */}
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => router.push(c.href)}
            className={[
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium active:scale-[0.98] transition-transform",
              "border border-black/10 bg-white text-black",
              "dark:border-white/10 dark:bg-white/10 dark:text-white/90",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
