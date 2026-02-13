"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/p/${product.id}`}
          className="block"
          onClickCapture={(e) => {
            const el = e.target as HTMLElement | null;
            if (!el) return;
            if (el.closest("[data-no-nav]")) e.preventDefault();
          }}
        >
          <ProductCard product={product} />
        </Link>
      ))}
    </div>
  );
}
