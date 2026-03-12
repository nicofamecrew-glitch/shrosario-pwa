"use client";

import { useMemo } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useFavoritesStore } from "@/lib/store";
import { useCatalogStore } from "@/lib/lib/catalogStore";
import products from "@/data/products.json";

function norm(s: unknown) {
  return String(s ?? "").trim().toLowerCase();
}

function mergeVariants(liveVariants: any[] = [], staticVariants: any[] = []) {
  return liveVariants.map((live) => {
    const liveSku = norm(live?.sku);
    const liveSize = norm(live?.size);

    const staticMatch =
      staticVariants.find((sv) => norm(sv?.sku) === liveSku && liveSku) ||
      staticVariants.find((sv) => norm(sv?.size) === liveSize && liveSize) ||
      null;

    if (!staticMatch) return live;

    return {
      ...staticMatch,
      ...live,

      // priorizar imágenes visuales del JSON si existen
      image_url:
        live?.image_url ||
        staticMatch?.image_url ||
        live?.image ||
        staticMatch?.image ||
        "",

      image:
        live?.image ||
        staticMatch?.image ||
        live?.image_url ||
        staticMatch?.image_url ||
        "",

      images:
        Array.isArray(live?.images) && live.images.length > 0
          ? live.images
          : Array.isArray(staticMatch?.images)
          ? staticMatch.images
          : [],
    };
  });
}

export default function FavoritesPage() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const byId = useCatalogStore((s) => s.byId);

  const favProducts = useMemo(() => {
    return favorites
      .map((id) => {
        const live = byId?.[id];
        const staticProduct = products.find((p: any) => p.id === id);

        if (!live && !staticProduct) return null;

        const mergedVariants = mergeVariants(
          Array.isArray((live as any)?.variants) ? (live as any).variants : [],
          Array.isArray((staticProduct as any)?.variants)
            ? (staticProduct as any).variants
            : []
        );

        return {
          ...(staticProduct ?? {}),
          ...(live ?? {}),

          // visuales del producto base
          image:
            (live as any)?.image ||
            (staticProduct as any)?.image ||
            "",
          image_url:
            (live as any)?.image_url ||
            (staticProduct as any)?.image_url ||
            "",
          images:
            Array.isArray((live as any)?.images) && (live as any).images.length > 0
              ? (live as any).images
              : Array.isArray((staticProduct as any)?.images)
              ? (staticProduct as any).images
              : [],

          // clave: variantes mergeadas
          variants: mergedVariants.length
            ? mergedVariants
            : (live as any)?.variants ?? (staticProduct as any)?.variants ?? [],
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