"use client";

import { useMemo } from "react";
import { useCatalogStore } from "@/lib/lib/catalogStore";
import ProductCard from "@/components/ProductCard"; // ajustá si tu path es distinto
import { withVariantImages } from "@/lib/withVariantImages";

function hasTag(p: any, tag: string) {
  const tags = Array.isArray(p?.tags) ? p.tags : [];
  return tags.map((t: any) => String(t).toLowerCase()).includes(tag.toLowerCase());
}

export default function NovedadesPage() {
  const products = useCatalogStore((s) => s.products); // si tu store usa otro nombre, decime y lo adapto

 const newProducts = useMemo(() => {
  const list = Array.isArray(products) ? products : [];
  const safe = withVariantImages(list);
  return safe.filter((p) => hasTag(p, "new"));
}, [products]);


  return (
    <main className="px-4 pt-16 pb-[120px]">
      <h1 className="text-xl font-bold">Novedades</h1>
      <p className="mt-1 text-sm text-white/60">
        Productos recién cargados o reingresados.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {newProducts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black p-4 text-sm text-white/60">
            No hay novedades por ahora.
          </div>
        ) : (
          newProducts.map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))
        )}
      </div>
    </main>
  );
}
