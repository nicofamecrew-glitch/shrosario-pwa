"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/store";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import productsJson from "@/data/products.json";
import Filters from "@/components/Filters";
import ProductCard from "@/components/ProductCard";
import WholesaleGate from "@/components/WholesaleGate";

function withVariantImages(fromSheets: Product[]): Product[] {
  const jsonList = productsJson as any[];

  // index por product.id
  const jsonById = new Map<string, any>();
  for (const p of jsonList) {
    if (p?.id) jsonById.set(String(p.id), p);
  }

  return fromSheets.map((p) => {
    const jp = jsonById.get(String((p as any).id));
    if (!jp) return p;

    const mergedVariants = (p as any).variants?.map((v: any) => {
      const jv =
        jp?.variants?.find(
          (x: any) => x?.sku && v?.sku && String(x.sku) === String(v.sku)
        ) ??
        jp?.variants?.find(
          (x: any) => x?.size && v?.size && String(x.size) === String(v.size)
        ) ??
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

export default function CatalogPage({ products }: { products: Product[] }) {
  const sp = useSearchParams();
  const qRaw = sp.get("q") || "";

  const norm = (s: string) =>
    String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const q = norm(qRaw);

  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [size, setSize] = useState("all");
  const [type, setType] = useState("all");

  const { isWholesale } = useCartStore();

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (!isWholesale && norm(product.category) === "mayoristas") return false;

      const s = norm(search);

      const matchesSearch =
        !s ||
        norm(product.name).includes(s) ||
        norm(product.line).includes(s) ||
        norm(product.brand).includes(s);

      const matchesBrand = brand === "all" || product.brand === brand;
      const matchesCategory = category === "all" || product.category === category;

      const matchesSize =
        size === "all" || product.variants?.some((variant) => variant.size === size);

      const matchesType =
        type === "all" ||
        (Array.isArray(product.tags) ? product.tags : [])
          .map((t) => norm(String(t)))
          .includes(norm(type));

      const matchesQ = !q
        ? true
        : [
            product.name,
            product.brand,
            product.line,
            product.category,
            ...(Array.isArray(product.tags) ? product.tags : []),
          ]
            .filter(Boolean)
            .map((x) => norm(String(x)))
            .join(" ")
            .includes(q);

      return (
        matchesSearch &&
        matchesBrand &&
        matchesCategory &&
        matchesSize &&
        matchesType &&
        matchesQ
      );
    });
  }, [products, search, brand, category, size, type, isWholesale, q]);

  const filteredWithImages = useMemo(
    () => withVariantImages(filteredProducts),
    [filteredProducts]
  );

  // dedupe defensivo para evitar "children with same key" por data sucia
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    const out: Product[] = [];

    for (const p of filteredWithImages) {
      const sku0 = (p as any)?.variants?.[0]?.sku ?? "";
      const key = `${p.id}::${sku0}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }

    return out;
  }, [filteredWithImages]);

  return (
    <div className="min-h-screen bg-ink text-white">
      <main className="container pb-20">
        <Filters
          products={products}
          search={search}
          onSearch={setSearch}
          brand={brand}
          onBrand={setBrand}
          category={category}
          onCategory={setCategory}
          size={size}
          onSize={setSize}
          type={type}
          onType={setType}
          isWholesale={isWholesale}
        />

        {qRaw ? (
          <div className="mt-4 text-sm text-white/60">
            Resultados para: <span className="text-white/90">“{qRaw}”</span>
          </div>
        ) : null}

        <section className="mt-8">
          {deduped.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-muted">No encontramos productos con esos filtros.</p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setBrand("all");
                  setCategory("all");
                  setSize("all");
                  setType("all");
                }}
                className="mt-4 inline-flex items-center justify-center rounded-full border border-panel px-4 py-2 text-sm"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr">
              {deduped.map((product) => {
                const sku0 = (product as any)?.variants?.[0]?.sku ?? "nosku";
                return (
                  <Link
                    key={`${product.id}::${sku0}`}
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
                );
              })}
            </div>
          )}
        </section>
      </main>

      <WholesaleGate />
    </div>
  );
}
