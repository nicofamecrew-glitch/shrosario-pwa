"use client";

import Link from "next/link";
import LoopRow from "@/components/LoopRow";
import { useHomeBlocks } from "@/lib/lib/useHomeBlocks";
import SearchBar from "@/components/SearchBar";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { withVariantImages } from "@/lib/withVariantImages";
import type { Product } from "@/lib/types";

function normalizeTags(tags?: string[] | string): string[] {
  if (!tags) return [];
  if (Array.isArray(tags))
    return tags.map(String).map((t) => t.trim()).filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function selectProductsForBlock(block: any, all?: Product[]): Product[] {
  const safeAll = Array.isArray(all) ? all : [];
  const limit = Number(block.limit) || 5;
  const source = String(block.source || "").toLowerCase();
  const value = String(block.value || "");

  switch (source) {
    case "ids": {
      const ids = value.split(",").map((s: string) => s.trim()).filter(Boolean);
      const map = new Map(safeAll.map((p) => [p.id, p]));
      return ids
        .map((id: string) => map.get(id))
        .filter(Boolean)
        .slice(0, limit) as Product[];
    }
    case "brand":
      return safeAll
        .filter((p) => (p.brand || "").toLowerCase() === value.toLowerCase())
        .slice(0, limit);
    case "line":
      return safeAll
        .filter((p) => (p.line || "").toLowerCase() === value.toLowerCase())
        .slice(0, limit);
    case "tag":
    case "combo":
      return safeAll
        .filter((p) => normalizeTags(p.tags).includes(value))
        .slice(0, limit);
    default:
      return safeAll.slice(0, limit);
  }
}

/** ✅ Bloque tipo Adidas (vertical, con imagen, CTA) */
function ActionTile({
  title,
  subtitle,
  href,
  imageSrc,
}: {
  title: string;
  subtitle?: string;
  href: string;
  imageSrc?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "group relative block overflow-hidden rounded-3xl",
        "border border-white/10 bg-white/5",
        "min-h-[180px]",
        "active:scale-[0.995] transition-transform",
      ].join(" ")}
    >
      {/* Fondo/imagen */}
      <div className="absolute inset-0">
        {imageSrc ? (
          // simple y robusto (sin Next/Image para no pelear con configs)
          <img
            src={imageSrc}
            alt={title}
            className="h-full w-full object-cover opacity-70"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-white/5 to-white/0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      </div>

      {/* Texto */}
      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div>
        
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm text-white/70">{subtitle}</div>
          ) : null}
        </div>

        <div className="inline-flex items-center gap-2">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/85">
            Ver →
          </span>
        </div>
    
    </Link>
  );
}

/** ✅ Grid de marcas con imagen */
function BrandGrid({
  brands,
}: {
  brands: { key: string; label: string; imageSrc?: string; href: string }[];
}) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-white">
            Comprar por marca
          </h2>
          <p className="mt-0.5 text-xs text-white/60">
            Entrás directo al catálogo filtrado
          </p>
        </div>
        <Link
          href="/catalog"
          className="shrink-0 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 active:scale-[0.98]"
        >
          Ver todas
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {brands.map((b) => (
          <Link
            key={b.key}
            href={b.href}
            className={[
              "relative overflow-hidden rounded-3xl",
              "border border-white/10 bg-white/5",
              "aspect-square",
              "active:scale-[0.995] transition-transform",
            ].join(" ")}
          >
            <div className="absolute inset-0">
              {b.imageSrc ? (
                <img
                  src={b.imageSrc}
                  alt={b.label}
                  className="h-full w-full object-cover opacity-80"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-white/5 to-white/0" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-end p-4">
            
              <div className="mt-1 text-xs text-white/70">Ver productos →</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BrandCarousel({
  title,
  href,
  items,
  onOpen,
}: {
  title: string;
  href: string;
  items: Product[];
  onOpen: (productId: string) => void;
}) {
  if (!items.length) return null;

  return (
    <section className="mt-10">
      <div className="flex w-full items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-white/60">Selección rápida</p>
        </div>

        <Link
          href={href}
          className="shrink-0 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 active:scale-[0.98]"
        >
          Ver todo
        </Link>
      </div>

      <div className="mt-3">

        <LoopRow
          items={items}
          renderItem={(p: Product, idx: number) => (
            <div
      
  key={`${p.id}-${idx}`}
  className="min-w-[240px] max-w-[240px] snap-start"
  onClick={(e) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-no-nav]")) return;
    onOpen(p.id);
  }}
>

              <ProductCard product={p as any} />
            </div>
          )}
        />
      </div>
    </section>
  );
}

export default function HomeSteamPage({ products }: { products: Product[] }) {
  const router = useRouter();
  const { items: blocks, loading } = useHomeBlocks();

  const safeProducts = withVariantImages(Array.isArray(products) ? (products as any) : []);

  // ✅ BLOQUES tipo Adidas (reemplazo conceptual de chips)
  const actionTiles = [
    {
      title: "Más vendidos",
      subtitle: "Lo que más se mueve",
      href: "/catalog?sort=best",
      imageSrc: "/home/tiles/best.webp",
    },
    {
      title: "Gangas",
      subtitle: "Ofertas y oportunidades",
      href: "/catalog?tag=oferta",
      imageSrc: "/home/tiles/deals.webp",
    },
    {
      title: "Combos",
      subtitle: "Arma el pedido más rápido",
      href: "/catalog?tag=combo",
      imageSrc: "/home/tiles/combos.webp",
    },
    {
      title: "Novedades",
      subtitle: "Recién llegados",
      href: "/catalog?sort=new",
      imageSrc: "/home/tiles/new.webp",
    },
  ];

  // ✅ GRID marcas con imágenes
  const brands = [
    { key: "vexa", label: "Vexa", href: "/catalog?brand=vexa", imageSrc: "/home/brands/vexa.webp" },
    { key: "ossono", label: "Ossono", href: "/catalog?brand=ossono", imageSrc: "/home/brands/ossono.webp" },
    { key: "fidelite", label: "Fidelité", href: "/catalog?brand=fidelite", imageSrc: "/home/brands/fidelite.webp" },
    { key: "coalix", label: "Coalix", href: "/catalog?brand=coalix", imageSrc: "/home/brands/coalix.webp" },
  ];

  // ✅ Carrouseles por marca y gangas (derivados del catálogo)
 
 const norm = (v?: string) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

 
 const byBrand = (brand: string, limit = 10) =>
  safeProducts
    .filter((p) => norm(p.brand) === norm(brand))
    .slice(0, limit);


  const deals = safeProducts
    .filter((p) => normalizeTags(p.tags).includes("oferta") || normalizeTags(p.tags).includes("ganga"))
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-16 text-[#111] data-[theme=dark]:bg-black data-[theme=dark]:text-white">

      <SearchBar className="mt-3" />

      {/* ✅ Título (cambiado) */}
      <section className="pt-4 pb-4">
      <h1 className="text-2xl font-black tracking-tight text-[#111] data-[theme=dark]:text-white">
          ¿Qué querés pedir hoy?
        </h1>
        <p className="mt-2 text-sm text-[#6b7280] data-[theme=dark]:text-white/60">
          Entrás, elegís, mandás el pedido. Listo.
        </p>
      </section>

      {/* ✅ Adidas tiles */}
      <section className="space-y-3">
        {actionTiles.map((t) => (
          <ActionTile
            key={t.title}
            title={t.title}
            subtitle={t.subtitle}
            href={t.href}
            imageSrc={t.imageSrc}
          />
        ))}
      </section>

      {/* ✅ Brand grid */}
      <BrandGrid brands={brands} />

      {/* ✅ Gangas carousel (si hay) */}
      <BrandCarousel
        title="Gangas"
        href="/catalog?tag=oferta"
        items={deals}
        onOpen={(id) => router.push(`/p/${id}`)}
      />

      {/* ✅ Carrouseles por marca */}
      <BrandCarousel
        title="Vexa"
        href="/catalog?brand=vexa"
        items={byBrand("vexa", 10)}
        onOpen={(id) => router.push(`/p/${id}`)}
      />
      <BrandCarousel
        title="Ossono"
        href="/catalog?brand=ossono"
        items={byBrand("ossono", 10)}
        onOpen={(id) => router.push(`/p/${id}`)}
      />
      <BrandCarousel
        title="Fidelité"
        href="/catalog?brand=fidelite"
        items={byBrand("fidelité", 10)}
        onOpen={(id) => router.push(`/p/${id}`)}
      />
      <BrandCarousel
        title="Coalix"
        href="/catalog?brand=coalix"
        items={byBrand("coalix", 10)}
        onOpen={(id) => router.push(`/p/${id}`)}
      />

      {/* ✅ Tus home-blocks existentes (los dejé al final para que sumen sin dominar) */}
      <section id="catalogo" className="mt-10 space-y-8">
        {loading ? (
          <div className="text-sm text-white/60">Cargando bloques…</div>
        ) : (
          (blocks ?? []).map((block: any, i: number) => {
            const items = selectProductsForBlock(block, safeProducts);
            if (!items.length) return null;

            return (
              <div key={block?.id ?? block?.key ?? i}>
                <div className="flex w-full items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight text-white">
                      {block?.title ?? "Bloque"}
                    </h2>
                    {block?.subtitle ? (
                      <p className="mt-0.5 text-xs text-white/60">
                        {block.subtitle}
                      </p>
                    ) : null}
                  </div>

                  {block?.ctaHref ? (
                    <Link
                      href={block.ctaHref}
                      className="shrink-0 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 active:scale-[0.98]"
                    >
                      {block?.ctaLabel?.trim() ? block.ctaLabel : "Ver todo"}
                    </Link>
                  ) : null}
                </div>

                <div className="mt-3">

                  <LoopRow
                    items={items.slice(0, Number(block?.limit) || 5)}
                    renderItem={(p: Product, idx: number) => (
                      <div
                        key={`${p.id}-${idx}`}
                        className="min-w-[240px] max-w-[240px] snap-start"
                    onClick={(e) => {
  const target = e.target as HTMLElement | null;
  if (target?.closest("[data-no-nav]")) return;
  router.push(`/p/${p.id}`);
}}

                      >
                        <ProductCard product={p as any} />
                      </div>
                    )}
                  />
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ✅ CTA final */}
      <div className="mt-10">
        <Link
          href="/catalog"
          className="block w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-center text-sm font-black text-white active:scale-[0.99]"
        >
          Ver todo el catálogo →
        </Link>
      </div>
    </main>
  );
}
