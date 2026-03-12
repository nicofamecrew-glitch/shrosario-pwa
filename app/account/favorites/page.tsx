"use client";

import { useMemo } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useFavoritesStore } from "@/lib/store";
import { useCatalogStore } from "@/lib/lib/catalogStore";
import products from "@/data/products.json";

export default function FavoritesPage() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const byId = useCatalogStore((s) => s.byId);

  const favProducts = useMemo(() => {
    return favorites
      .map((id) => {
        const live = byId?.[id];
        const staticProduct = products.find((p) => p.id === id);

        if (!live && !staticProduct) return null;

        return {
          ...(staticProduct ?? {}),
          ...(live ?? {}),
          image:
            (live as any)?.image ||
            (staticProduct as any)?.image ||
            "",
          images:
            Array.isArray((live as any)?.images) && (live as any).images.length > 0
              ? (live as any).images
              : Array.isArray((staticProduct as any)?.images)
              ? (staticProduct as any).images
              : [],
        };
      })
      .filter(Boolean);
  }, [favorites, byId]);

  return (
    <main className="min-h-[100svh] bg-[hsl(var(--app-bg))] p-4 pb-24 text-[hsl(var(--app-fg))]">
      <h1 className="text-xl font-bold">Favoritos</h1>
      <p className="mt-1 text-sm text-[hsl(var(--app-muted))]">
        Productos que guardaste para volver después.
      </p>

      {favProducts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-[hsl(var(--app-muted))]">
            Todavía no agregaste productos a favoritos.
          </p>

          <Link
            href="/catalog"
            className="mt-4 inline-flex rounded-full border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] px-4 py-2 text-sm font-medium text-[hsl(var(--app-fg))] transition hover:opacity-90"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {favProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}