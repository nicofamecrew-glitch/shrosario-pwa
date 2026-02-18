"use client";

import type { Product } from "@/lib/types";
import { useState } from "react";

export default function Filters({
  products,
  search,
  onSearch,
  brand,
  onBrand,
  category,
  onCategory,
  size,
  onSize,
  type,
  onType,
  isWholesale,
}: {
  products: Product[];
  search: string;
  onSearch: (value: string) => void;
  brand: string;
  onBrand: (value: string) => void;
  category: string;
  onCategory: (value: string) => void;
  size: string;
  onSize: (value: string) => void;
  type: string;
  onType: (value: string) => void;
  isWholesale: boolean;
}) {
  const [open, setOpen] = useState(false);

  const brands = Array.from(new Set(products.map((p) => p.brand)));

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(
    (cat) => (isWholesale ? true : cat.toLowerCase() !== "mayoristas")
  );

  const sizes = Array.from(
    new Set(products.flatMap((p) => p.variants.map((v) => v.size)))
  );

  const types = Array.from(
    new Set(products.flatMap((p) => (p.tags ?? []).map((t) => String(t).toLowerCase())))
  );

  const controlClass =
    "mt-2 w-full rounded-2xl " +
    "border border-gray-200 dark:border-white/10 " +
    "bg-white dark:bg-black " +
    "px-4 py-3 text-sm " +
    "text-black dark:text-white " +
    "shadow-sm outline-none " +
    "focus:ring-2 focus:ring-[#ee078e]/40 " +
    "transition";

  return (
    <section
      id="catalogo"
      className="mt-4 rounded-3xl border border-gray-200 bg-white dark:border-white/10 dark:bg-black overflow-hidden"
    >
      {/* HEADER COLAPSABLE */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-black dark:text-white">
          Filtrar productos
        </span>

        <span className="text-xs text-black/60 dark:text-white/60">
          {open ? "Ocultar" : "Mostrar"}
        </span>
      </button>

      {/* CONTENIDO DE FILTROS */}
      {open && (
        <div className="p-4 pt-0 md:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-black/60 dark:text-white/60">
                Buscador
              </label>

              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                className={
                  controlClass +
                  " placeholder:text-gray-400 dark:placeholder:text-white/40"
                }
                placeholder="Buscar por marca, linea o producto"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-black/60 dark:text-white/60">
                Marca
              </label>

              <select
                value={brand}
                onChange={(e) => onBrand(e.target.value)}
                className={controlClass}
              >
                <option value="all">Todas</option>
                {brands.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-black/60 dark:text-white/60">
                Categoria
              </label>

              <select
                value={category}
                onChange={(e) => onCategory(e.target.value)}
                className={controlClass}
              >
                <option value="all">Todas</option>
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-black/60 dark:text-white/60">
                Tamano
              </label>

              <select
                value={size}
                onChange={(e) => onSize(e.target.value)}
                className={controlClass}
              >
                <option value="all">Todos</option>
                {sizes.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-black/60 dark:text-white/60">
                Tipo
              </label>

              <select
                value={type}
                onChange={(e) => onType(e.target.value)}
                className={controlClass}
              >
                <option value="all">Todos</option>
                {types.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
