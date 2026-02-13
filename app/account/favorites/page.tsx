"use client";

import { useFavoritesStore } from "@/lib/store";
import products from "@/data/products.json";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

export default function FavoritesPage() {
  const favorites = useFavoritesStore((s) => s.favorites);

  const favProducts = products.filter((p) => favorites.includes(p.id));

  return (
    <main className="p-4 pb-24">
      <h1 className="text-xl font-bold">Favoritos</h1>
      <p className="mt-1 text-sm text-white/60">
        Productos que guardaste para volver después.
      </p>

      {favProducts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-white/60">
            Todavía no agregaste productos a favoritos.
          </p>

          <Link
            href="/catalog"
            className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr">
          {favProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
