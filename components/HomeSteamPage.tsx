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
        // light
        "border border-[#e5e7eb] bg-white",
        // dark
        "dark:border-white/10 dark:bg-white/5",
        "min-h-[180px]",
        "active:scale-[0.995] transition-transform",
      ].join(" ")}
    >
      {/* Fondo/imagen */}
      <div className="absolute inset-0">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="h-full w-full object-cover opacity-90 dark:opacity-70"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-black/5 to-black/0 dark:from-white/5 dark:to-white/0" />
        )}

        {/* overlay para legibilidad en ambos */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent dark:from-black/75 dark:via-black/35" />
      </div>

      {/* Texto */}
      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div>
          <div className="text-lg font-black tracking-tight text-white">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm text-white/75">{subtitle}</div>
          ) : null}
        </div>

        <div className="inline-flex items-center gap-2">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
            Ver →
          </span>
        </div>
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
          <h2 className="text-base font-semibold tracking-tight text-[#111] dark:text-white">
            Comprar por marca
          </h2>
          <p className="mt-0.5 text-xs text-[#6b7280] dark:text-white/60">
            Entrás directo al catálogo filtrado
          </p>
        </div>

        <Link
          href="/catalog"
          className="shrink-0 inline-flex items-center justify-center rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[#ee078e] active:scale-[0.98] dark:border-white/15 dark:bg-white/5 dark:text-white/80"
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
              "border border-[#e5e7eb] bg-white",
              "dark:border-white/10 dark:bg-white/5",
              "aspect-square",
              "active:scale-[0.995] transition-transform",
            ].join(" ")}
          >
            <div className="absolute inset-0">
              {b.imageSrc ? (
                <img
                  src={b.imageSrc}
                  alt={b.label}
                  className="h-full w-full object-cover opacity-95 dark:opacity-80"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-black/5 to-black/0 dark:from-white/5 dark:to-white/0" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent dark:from-black/70 dark:via-black/15" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-end p-4">
              <div className="text-sm font-black text-white">{b.label}</div>
              <div className="mt-1 text-xs text-white/75">Ver productos →</div>
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
          <h2 className="text-base font-semibold tracking-tight text-[#111] dark:text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-[#6b7280] dark:text-white/60">
            Selección rápida
          </p>
        </div>

        <Link
          href={href}
          className="shrink-0 inline-flex items-center justify-center rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[#ee078e] active:scale-[0.98] dark:border-white/15 dark:bg-white/5 dark:text-white/80"
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

  const safeProducts = withVariantImages(
    Array.isArray(products) ? (products as any) : []
  );

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

  const brands = [
    {
      key: "vexa",
      label: "Vexa",
      href: "/catalog?brand=vexa",
      imageSrc: "/home/brands/vexa.webp",
    },
    {
      key: "ossono",
      label: "Ossono",
      href: "/catalog?brand=ossono",
      imageSrc: "/home/brands/ossono.webp",
    },
    {
      key: "fidelite",
      label: "Fidelité",
      href: "/catalog?brand=fidelite",
      imageSrc: "/home/brands/fidelite.webp",
    },
    {
      key: "coalix",
      label: "Coalix",
      href: "/catalog?brand=coalix",
      imageSrc: "/home/brands/coalix.webp",
    },
  ];

  const norm = (v?: string) =>
    String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const byBrand = (brand: string, limit = 10) =>
    safeProducts.filter((p) => norm(p.brand) === norm(brand)).slice(0, limit);

  const deals = safeProducts
    .filter((p) => {
      const t = normalizeTags(p.tags);
      return t.includes("oferta") || t.includes("ganga");
    })
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-16 text-[#111] dark:bg-black dark:text-white">
      <SearchBar className="mt-3" />

      {/* Título */}
      <section className="pt-4 pb-4">
        <h1 className="text-2xl font-black tracking-tight text-[#111] dark:text-white">
          ¿Qué querés pedir hoy?
        </h1>
        <p className="mt-2 text-sm text-[#6b7280] dark:text-white/60">
          Entrás, elegís, mandás el pedido. Listo.
        </p>
      </section>

      {/* Tiles */}
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

      {/* Grid marcas */}
      <BrandGrid brands={brands} />

      {/* Gangas */}
      <BrandCarousel
        title="Gangas"
        href="/catalog?tag=oferta"
        items={deals}
        onOpen={(id) => router.push(`/p/${id}`)}
      />

      {/* Carrouseles por marca */}
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
        items={byBrand("fidelite", 10)}
        onOpen={(id) => router.push(`/p/${id}`)}
      />
      <BrandCarousel
        title="Coalix"
        href="/catalog?brand=coalix"
        items={byBrand("coalix", 10)}
        onOpen={(id) => router.push(`/p/${id}`)}
      />

      {/* Home blocks (sheet) */}
      <section id="catalogo" className="mt-10 space-y-8">
        {loading ? (
          <div className="text-sm text-[#6b7280] dark:text-white/60">
            Cargando bloques…
          </div>
        ) : (
          (blocks ?? []).map((block: any, i: number) => {
            const items = selectProductsForBlock(block, safeProducts);
            if (!items.length) return null;

            return (
              <div key={block?.id ?? block?.key ?? i}>
                <div className="flex w-full items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight text-[#111] dark:text-white">
                      {block?.title ?? "Bloque"}
                    </h2>
                    {block?.subtitle ? (
                      <p className="mt-0.5 text-xs text-[#6b7280] dark:text-white/60">
                        {block.subtitle}
                      </p>
                    ) : null}
                  </div>

                  {block?.ctaHref ? (
                    <Link
                      href={block.ctaHref}
                      className="shrink-0 inline-flex items-center justify-center rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[#ee078e] active:scale-[0.98] dark:border-white/15 dark:bg-white/5 dark:text-white/80"
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

      {/* CTA final */}
      <div className="mt-10">
        <Link
          href="/catalog"
          className="block w-full rounded-2xl border border-[#e5e7eb] bg-white py-4 text-center text-sm font-black text-[#111] active:scale-[0.99] dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          Ver todo el catálogo →
        </Link>
      </div>
    </main>
  );
}
