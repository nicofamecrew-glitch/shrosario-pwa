"use client";

import { useMemo } from "react";
import type { Product } from "@/lib/types";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import productsJson from "@/data/products.json";

function withVariantImages(fromSheets: Product[]): Product[] {
  const jsonList = productsJson as any[];

  const jsonById = new Map<string, any>();
  for (const p of jsonList) if (p?.id) jsonById.set(String(p.id), p);

  return fromSheets.map((p) => {
    const jp = jsonById.get(String((p as any).id));
    if (!jp) return p;

    const mergedVariants = (p as any).variants?.map((v: any) => {
      const jv =
        jp?.variants?.find((x: any) => x?.sku && v?.sku && String(x.sku) === String(v.sku)) ??
        jp?.variants?.find((x: any) => x?.size && v?.size && String(x.size) === String(v.size)) ??
        null;

      return {
        ...v,
        image: v?.image ?? jv?.image,
        imageUrl: v?.imageUrl ?? jv?.imageUrl,
        img: v?.img ?? jv?.img,
        images: v?.images ?? jv?.images,
      };
    });

    return {
      ...p,
      image: (p as any).image ?? jp?.image,
      images: (p as any).images ?? jp?.images,
      variants: mergedVariants ?? (p as any).variants,
    } as Product;
  });
}

export default function HomeProductsGrid({
  products,
  limit = 12,
}: {
  products: Product[];
  limit?: number;
}) {
  const enriched = useMemo(() => withVariantImages(products), [products]);
  const sliced = useMemo(() => enriched.slice(0, limit), [enriched, limit]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr">
      {sliced.map((product) => (
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
