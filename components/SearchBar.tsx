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
    // light
    "bg-[#f8f9fb] border border-[#e5e7eb]",
    // dark (tu look actual)
    "data-[theme=dark]:bg-white/10 data-[theme=dark]:border-white/10",
  ].join(" ")}
>

        <svg
  className="h-5 w-5 opacity-70 text-[#6b7280] data-[theme=dark]:text-white"

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
         className="w-full bg-transparent text-[#111] placeholder:text-[#9ca3af] outline-none data-[theme=dark]:text-white data-[theme=dark]:placeholder:text-white/50"

        />

        <button
          onClick={go}
         className={[
  "rounded-xl px-3 py-2 text-sm font-semibold active:scale-[0.98] transition-transform",
  // light
  "bg-white border border-[#e5e7eb] text-[#111]",
  // dark
  "data-[theme=dark]:bg-white/10 data-[theme=dark]:border-transparent data-[theme=dark]:text-white",
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
  // light
  "bg-white border border-[#e5e7eb] text-[#111]",
  // dark
  "data-[theme=dark]:bg-white/10 data-[theme=dark]:border-transparent data-[theme=dark]:text-white/90",
].join(" ")}

          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

