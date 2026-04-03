"use client";

import { useMemo, useState,  useEffect } from "react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/store";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import Filters from "@/components/Filters";
import ProductCard from "@/components/ProductCard";
import WholesaleGate from "@/components/WholesaleGate";





   

export default function CatalogPage({ products }: { products: Product[] }) {
  const sp = useSearchParams();
  const brandFromUrl = sp.get("brand") || "all";
  const tagFromUrl = sp.get("tag") || "all";

  const qRaw = sp.get("q") || "";

  const norm = (s: string) =>
    String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const q = norm(qRaw);

  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState(brandFromUrl);
  const [category, setCategory] = useState("all");
  const [size, setSize] = useState("all");
  const [type, setType] = useState(tagFromUrl);

  const { isWholesale } = useCartStore();

useEffect(() => {
  setBrand(brandFromUrl);
}, [brandFromUrl]);
useEffect(() => {
  setType(tagFromUrl);
}, [tagFromUrl]);

  // Render parcial (evita stutter en móvil)
  const PAGE_SIZE = 20;
  const [visible, setVisible] = useState(PAGE_SIZE);

   

  const preparedProducts = useMemo(() => {
    const seen = new Set<string>();
    const out: Product[] = [];

    for (const p of products) {
      const sku0 = (p as any)?.variants?.[0]?.sku ?? "";
      const key = `${(p as any)?.id ?? ""}::${sku0}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }

    return out;
  }, [products]);


   const filteredProducts = useMemo(() => {
    const s = norm(search);

    return preparedProducts.filter((product) => {
      if (!isWholesale && norm((product as any).category) === "mayoristas") return false;

      const matchesSearch =
        !s ||
        norm((product as any).name).includes(s) ||
        norm((product as any).line).includes(s) ||
        norm((product as any).brand).includes(s);

      const matchesBrand = brand === "all" || norm((product as any).brand) === norm(brand);

      const matchesCategory =
        category === "all" || (product as any).category === category;

      const matchesSize =
        size === "all" ||
        (product as any).variants?.some((variant: any) => variant.size === size);

      const tags = Array.isArray((product as any).tags) ? (product as any).tags : [];
      const normTags = tags.map((t: any) => norm(String(t)));

const hasAnyTag = (...expected: string[]) =>
  expected.some((tag) => normTags.includes(norm(tag)));

const matchesType =
  type === "all" ||
  (type === "gangas"
    ? hasAnyTag("oferta", "ganga", "deal", "deals")
    : type === "nuevo"
    ? hasAnyTag("nuevo", "new")
    : type === "mas-vendido"
    ? hasAnyTag("mas-vendido", "bestseller", "best-seller", "best seller")
    : type === "combo"
    ? hasAnyTag("combo", "combos")
    : hasAnyTag(type));

      const matchesQ = !q
        ? true
        : [
            (product as any).name,
            (product as any).brand,
            (product as any).line,
            (product as any).category,
            ...tags,
          ]
            .filter(Boolean)
            .map((x: any) => norm(String(x)))
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
    }, [preparedProducts, search, brand, category, size, type, isWholesale, q]);

  // Index JSON una sola vez
  
  // Slice visible
    const shown = useMemo(() => filteredProducts.slice(0, visible), [filteredProducts, visible]);
  const canLoadMore = filteredProducts.length > visible;

  return (
  <div className="min-h-screen bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))]">

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
          <div className="mt-4 text-sm text-black/60 dark:text-white/60">
  Resultados para: <span className="text-black/90 dark:text-white/90">“{qRaw}”</span>
</div>

        ) : null}

        <section className="mt-8">
          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-black/60 dark:text-white/60">
                No encontramos productos con esos filtros.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setBrand("all");
                  setCategory("all");
                  setSize("all");
                  setType("all");
                  setVisible(PAGE_SIZE);
                }}
className="mt-4 inline-flex items-center justify-center rounded-full border border-black/10 bg-[hsl(var(--app-surface))] px-4 py-2 text-sm text-[hsl(var(--app-fg))] dark:border-white/10"

              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr">
                {shown.map((product) => {
                  const sku0 = (product as any)?.variants?.[0]?.sku ?? "nosku";

                  return (
                    <Link
                      key={`${(product as any).id}::${sku0}`}
                      href={`/p/${(product as any).id}`}
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

              {canLoadMore ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                   className="rounded-full border border-black/10 bg-[hsl(var(--app-surface))] px-5 py-2 text-sm font-semibold text-[hsl(var(--app-fg))] dark:border-white/10"

                  >
                     Ver más ({Math.min(visible + PAGE_SIZE, filteredProducts.length)}/
                    {filteredProducts.length})
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>

      <WholesaleGate />
    </div>
  );
}
