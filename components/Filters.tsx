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
  isWholesale
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

  const brands = Array.from(new Set(products.map((product) => product.brand)));
  const categories = Array.from(new Set(products.map((product) => product.category))).filter((cat) =>
    isWholesale ? true : cat.toLowerCase() !== "mayoristas"
  );
  const sizes = Array.from(
    new Set(products.flatMap((product) => product.variants.map((variant) => variant.size)))
  );
  const types = Array.from(
    new Set(
  products.flatMap((product) =>
    (product.tags ?? []).map((tag) => tag.toLowerCase())
  )
)

  );

  return (
   
  <section
    id="catalogo"
    className="mt-4 rounded-3xl border border-panel bg-surface overflow-hidden"
  >
    {/* HEADER COLAPSABLE */}
    <button
      onClick={() => setOpen(!open)}
      className="w-full flex items-center justify-between px-4 py-3 text-left"
    >
      <span className="text-sm font-medium">Filtrar productos</span>
      <span className="text-xs text-muted">
        {open ? "Ocultar" : "Mostrar"}
      </span>
    </button>

    {/* CONTENIDO DE FILTROS */}
    {open && (
      <div className="p-4 pt-0 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-muted">
              Buscador
            </label>
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              className="mt-2 w-full rounded-xl border border-panel bg-ink px-3 py-2 text-sm"
              placeholder="Buscar por marca, linea o producto"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted">
              Marca
            </label>
            <select
              value={brand}
              onChange={(event) => onBrand(event.target.value)}
              className="mt-2 w-full rounded-xl border border-panel bg-ink px-3 py-2 text-sm"
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
            <label className="text-xs uppercase tracking-wide text-muted">
              Categoria
            </label>
            <select
              value={category}
              onChange={(event) => onCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border border-panel bg-ink px-3 py-2 text-sm"
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
            <label className="text-xs uppercase tracking-wide text-muted">
              Tamano
            </label>
            <select
              value={size}
              onChange={(event) => onSize(event.target.value)}
              className="mt-2 w-full rounded-xl border border-panel bg-ink px-3 py-2 text-sm"
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
            <label className="text-xs uppercase tracking-wide text-muted">
              Tipo
            </label>
            <select
              value={type}
              onChange={(event) => onType(event.target.value)}
              className="mt-2 w-full rounded-xl border border-panel bg-ink px-3 py-2 text-sm"
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