"use client";

import { useEffect, useRef, useState } from "react";

export type ZipRow = {
  zipcode: string;
  city: string;
  state: string;
  destination_id?: string | null;
};

export default function LocationAutocomplete(props: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (row: ZipRow) => void;
  placeholder?: string;
}) {
  const { value, onChange, onSelect, placeholder } = props;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ZipRow[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const r = await fetch(
          `/api/locations/search?q=${encodeURIComponent(q)}&limit=20`,
          { cache: "no-store" }
        );
        const data = await r.json();
        const list = Array.isArray(data?.results) ? data.results : [];
        setResults(list);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim().length >= 2 && setOpen(true)}
        placeholder={placeholder ?? "Buscar por localidad o CP"}
       className={[
  "mt-2 w-full h-12 rounded-xl border px-3 text-sm",
  "border-black/10 bg-white text-black placeholder:text-black/40",
  "outline-none focus:border-black/20 focus:ring-2 focus:ring-[#ee078e]/30",
  "dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30",
  "dark:focus:border-white/20 dark:focus:ring-[#ee078e]/25",
].join(" ")}

      />

      {open && (loading || results.length > 0) && (
       <div
  className={[
    "absolute z-50 mt-2 w-full rounded-xl border shadow max-h-64 overflow-auto",
    "border-black/10 bg-white",
    "dark:border-white/10 dark:bg-[#0b0b0b]",
  ].join(" ")}
>

          {loading && (
            <div className="px-3 py-2 text-sm text-black/70 dark:text-white/70">Buscando…</div>

          )}

          {!loading &&
            results.map((r) => (
              <button
                key={`${r.zipcode}-${r.city}-${r.state}`}
                type="button"
                onClick={() => {
                  onSelect(r);
                  setOpen(false);
                }}
               className="w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5"

              >
                <div className="font-semibold text-black dark:text-white">{r.city}</div>
<div className="text-xs text-black/60 dark:text-white/60">{r.state} · CP {r.zipcode}</div>

                
              </button>
            ))}

          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-white/70">
              Sin resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
