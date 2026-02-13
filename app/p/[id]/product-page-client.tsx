"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useCartStore, useFavoritesStore } from "@/lib/store";
import { formatPrice, getVariantPrice } from "@/lib/pricing";
import ProductCard from "@/components/ProductCard";
import { withVariantImagesOne, withVariantImages } from "@/lib/withVariantImages";
import { brandAccentFrom } from "@/lib/brandAccent";
import { calcAllPlans } from "@/lib/mpFees";
import Image from "next/image";
import FavoriteHeart from "@/components/ui/FavoriteHeart";

type Rule = { keys: string[]; color: string };
 
  


const BRAND_LINE_COLORS: Record<string, Rule[]> = {
  vexa: [
    { keys: ["revitalize"], color: "#f7b5b5" },
    { keys: ["balance"], color: "#159e91" },
    { keys: ["recovery"], color: "#f59d14" },
    { keys: ["intense"], color: "#d53721" },
    { keys: ["therapy"], color: "#6d1f95" },
  ],
  ossono: [
    { keys: ["lino"], color: "#d2a2c6" },
    { keys: ["argan"], color: "#d8bb8c" },
    { keys: ["complex"], color: "#bc4598" },
    { keys: ["balance"], color: "#bcd6b6" },
    { keys: ["keratina", "queratina"], color: "#f8ccc4" },
    { keys: ["mat"], color: "#ccbdd3" },
  ],
  coalix: [
    { keys: ["density", "plex"], color: "#dfbcc4" },
    { keys: ["balance", "cristal sellador"], color: "#8abfd6" },
    { keys: ["color therapy"], color: "#a193ad" },
    { keys: ["hidratation", "hidratación"], color: "#ccd6ae" },
    { keys: ["resistence", "resistance", "cristal argan"], color: "#e6bdaf" },
    { keys: ["curly", "rulos"], color: "#bdd3b2" },
    {
      keys: ["for men", "spray", "laca", "protector", "brillo", "acido hialuronico"],
      color: "#3e3e47",
    },
    { keys: ["activador", "docta"], color: "#d97e3e" },
    { keys: ["clinical detox"], color: "#9fd0cd" },
    { keys: ["clinical prevent"], color: "#6085a4" },
    { keys: ["clinical control"], color: "#97c8c4" },
    { keys: ["revitalizante"], color: "#109251" },
    { keys: ["oxidante 10v", "10v oxidante", "oxidante 10 vol", "10v"], color: "#e0681e" },
    { keys: ["oxidante 20v", "20v oxidante", "oxidante 20 vol", "20v"], color: "#d21229" },
    { keys: ["oxidante 30v", "30v oxidante", "oxidante 30 vol", "30v"], color: "#1e5834" },
    { keys: ["oxidante 40v", "40v oxidante", "oxidante 40 vol", "40v"], color: "#2189c1" },
  ],
  "lisse extreme": [
    { keys: ["pastificado", "plastificado"], color: "#e1823c" },
    { keys: ["ultra plex", "ultraplex"], color: "#639bd4" },
    { keys: ["shock keratinico", "shock queratina"], color: "#f16be2" },
    { keys: ["argan liss"], color: "#eae45d" },
    { keys: ["biotina liss"], color: "#80e468" },
  ],
};

function normText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getSeparatorByBrand(brand: string) {
  const b = normText(brand);
  if (b.includes("fidelite")) return ".";
  if (b.includes("coalix")) return "_";
  if (b.includes("ossono")) return ",";
  return "/"; // fallback
}

function splitTone(size: any, brand: string) {
  const s = String(size ?? "").trim();
  const sep = getSeparatorByBrand(brand);
  const parts = s.split(sep);
  return {
    base: parts[0] ?? "",
    reflejo: parts[1] ?? "",
    full: s,
  };
}




function resolveProductColor(product: any): string {
  const brand = normText(String(product?.brand ?? ""));
  const text = normText(`${product?.name ?? ""} ${product?.line ?? ""}`);

  const rules = BRAND_LINE_COLORS[brand] ?? [];
  for (const r of rules) {
    if (r.keys.some((k) => text.includes(normText(k)))) return r.color;
  }

  return brandAccentFrom(product).ribbon;
}

type Props = {
  product: Product;
  bestSellers?: Product[];
  description?: any;
};

export default function ProductPageClient({ product, bestSellers = [], description = null }: Props) {

  const { addItem, isWholesale } = useCartStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  const productFixed = useMemo(() => withVariantImagesOne(product), [product]);
  const bestSellersFixed = useMemo(() => withVariantImages(bestSellers as any), [bestSellers]);

  // -----------------------
  // STATE (primero)
  // -----------------------
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [isFav, setIsFav] = useState(false);

  // Zipnova (informativo en /p)
  const [zipCp, setZipCp] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState("");
  const [zipOptions, setZipOptions] = useState<any[]>([]);

  // -----------------------
  // MATRIX HELPERS (Color Master)
  // -----------------------
  const BASE_LEVELS = ["0","1","3","4","5","6","7","8","9","10","100"];


function baseLevelOfSize(size: any, brand?: string) {
  const s = String(size ?? "").trim();
  const sep = brand ? getSeparatorByBrand(brand) : "/";
  return s.split(sep)[0];
}


function isBaseTone(size: any, brand?: string) {
  const s = String(size ?? "").trim();
  const sep = brand ? getSeparatorByBrand(brand) : "/";
  return !s.includes(sep);
}

// Abajo queremos ver solo lo “reflejo” (sin repetir la base)
function labelReflejo(size: any) {
  const s = String(size ?? "").trim();
  const parts = s.split("/");
  if (parts.length < 2) return s;
  return parts[1]; // "7/33" -> "33", "10/11" -> "11"
}
function isColorLevelsProduct(product: any) {
  const id = normText(String(product?.id ?? ""));
  const name = normText(String(product?.name ?? ""));
  const line = normText(String(product?.line ?? ""));
  const brand = normText(String(product?.brand ?? ""));

  // Caso específico: Color Master (lo que estás armando)
  if (brand.includes("fidelite") && (id.includes("color-master") || name.includes("color") || line.includes("color"))) {
    return true;
  }

  // Regla genérica: si tiene MUCHAS variantes y hay varias con "/"
  const vars = Array.isArray(product?.variants) ? product.variants : [];
  const hasSlash = vars.filter((v: any) => String(v?.size ?? "").includes("/")).length;
  return vars.length >= 20 && hasSlash >= 10;
}


  // -----------------------
  // VARIANTS + MATRIX DATA
  // -----------------------
  const variantsRaw = (productFixed as any)?.variants ?? [];

const variants = useMemo(() => {
  const seen = new Set<string>();
  const out: any[] = [];

  for (const v of variantsRaw) {
    const key = String(v?.sku ?? v?.size ?? "");
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }

  return out;
}, [productFixed?.id, variantsRaw]);

  const isColorLevels = isColorLevelsProduct(productFixed);

 const variantsByBase = useMemo(() => {
  const map = new Map<string, any[]>();

  for (const v of variants) {
    const b = baseLevelOfSize(v.size);
    if (!map.has(b)) map.set(b, []);
    map.get(b)!.push(v);
  }

  // ordenar dentro del mismo memo
  for (const [b, list] of map.entries()) {
    list.sort((a, c) => {
      const as = String(a.size ?? "");
      const cs = String(c.size ?? "");
      const aIsBase = as === b;
      const cIsBase = cs === b;

      if (aIsBase && !cIsBase) return -1;
      if (!aIsBase && cIsBase) return 1;

      return as.localeCompare(cs, "es", { numeric: true });
    });
  }

  return map;
}, [variants]);


  const [baseSelected, setBaseSelected] = useState<string>(() => {
    const v0 = variants[selectedIndex];
    const b0 = v0 ? baseLevelOfSize(v0.size) : "7";
    return BASE_LEVELS.includes(b0) ? b0 : "7";
  });

useEffect(() => {
  const v0 = variants[0];
  const b0 = v0 ? baseLevelOfSize(v0.size) : "7";
  const next = BASE_LEVELS.includes(b0) ? b0 : "7";
  setBaseSelected(next);
}, [productFixed?.id, variants]);


  // reset al cambiar producto
  useEffect(() => {
    setSelectedIndex(0);
    setActiveImage(0);
    setZipError("");
    setZipOptions([]);
  }, [productFixed?.id]);

  // -----------------------
  // DERIVADOS (como ya tenías)
  // -----------------------
  const selectedVariant = useMemo(() => {
    return (
      (productFixed as any)?.variants?.[selectedIndex] ??
      (productFixed as any)?.variants?.[0] ??
      null
    );
  }, [productFixed, selectedIndex]);

  const price = useMemo(() => {
    return selectedVariant ? getVariantPrice(selectedVariant as any, isWholesale) : 0;
  }, [selectedVariant, isWholesale]);

  const mpPlans = useMemo(() => {
    return price > 0 ? calcAllPlans(price, [2, 3, 6, 9, 12]) : [];
  }, [price]);

  const stock = useMemo(
    () => Number((selectedVariant as any)?.stock ?? 0),
    [selectedVariant]
  );

  const productColor = useMemo(
    () => resolveProductColor(productFixed as any),
    [productFixed]
  );

  const gallery = useMemo(() => {
    const v: any = selectedVariant ?? {};
    const p: any = productFixed ?? {};

    const vImgs: string[] = Array.isArray(v?.images) ? v.images.filter(Boolean) : [];
    const vFirst =
      (typeof v?.image === "string" && v.image) ||
      (typeof v?.imageUrl === "string" && v.imageUrl) ||
      (typeof v?.img === "string" && v.img) ||
      vImgs[0];

    if (vFirst) return [vFirst, ...vImgs.filter((x: string) => x !== vFirst)];

    const pImgs: string[] = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
    const pFirst =
      pImgs[selectedIndex] ||
      pImgs[0] ||
      (typeof p?.image === "string" && p.image) ||
      (typeof p?.imageUrl === "string" && p.imageUrl) ||
      (typeof p?.img === "string" && p.img);

    if (pFirst) return [pFirst];

    return ["/product/placeholder.png"];
  }, [productFixed, selectedVariant, selectedIndex]);

  const heroSrc = useMemo(() => {
    return gallery[activeImage] ?? gallery[0] ?? "/product/placeholder.png";
  }, [gallery, activeImage]);

  async function fetchZipnovaQuote() {
    const postalCode = String(zipCp || "").replace(/\s/g, "");
    if (!postalCode) {
      setZipError("Ingresá tu código postal.");
      return;
    }

    setZipLoading(true);
    setZipError("");
    setZipOptions([]);

    try {
      const res = await fetch("/api/zipnova/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: { zipcode: postalCode },
          items: [
            {
              sku: String((selectedVariant as any)?.sku ?? (productFixed as any)?.id ?? "SKU-1"),
              description: String((productFixed as any)?.name ?? "Producto"),
              weight: Number((selectedVariant as any)?.weight ?? 500),
              height: Number((selectedVariant as any)?.height ?? 10),
              width: Number((selectedVariant as any)?.width ?? 10),
              length: Number((selectedVariant as any)?.length ?? 10),
              classification_id: Number((selectedVariant as any)?.classification_id ?? 1),
            },
          ],
          declared_value: Number(price || 0),
        }),
        cache: "no-store",
      });

      const data = await res.json();
      const options = Array.isArray(data?.options) ? data.options : [];

      if (!options.length) {
        setZipError("No se encontraron opciones para ese CP.");
        return;
      }

      setZipOptions(options);
    } catch {
      setZipError("No se pudo cotizar el envío. Probá de nuevo.");
    } finally {
      setZipLoading(false);
    }
  }

  return (
    // ... tu return como lo tenés

    <div className="min-h-screen bg-black text-white">

 <div className="absolute top-0 left-0 right-0 z-40">
  <div className="mx-auto flex h-14 max-w-[520px] items-center justify-between px-4">
    {/* Flecha volver (NEGRA) */}
    <button
      type="button"
      onClick={() => history.back()}
      aria-label="Volver"
      className="text-2xl font-semibold text-black active:scale-95"
    >
      ←
    </button>
</div>

 {/* favorite */}
       {true && (
 
         <button
           type="button"
           aria-label="Favorito"
           onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             const wasFav = isFavorite(product.id);
             toggleFavorite(product.id);
             window.dispatchEvent(
               new CustomEvent("toast", {
                 detail: {
                   message: wasFav ? "Quitado de favoritos" : "Guardado en favoritos",
                   kind: "success",
                 },
               })
             );
           }}
           className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/10 backdrop-blur border border-black/10 active:scale-95"
         >
           <FavoriteHeart active={isFavorite(product.id)} size={18} />
         </button>
       )}
 
</div>
  
    {/* HERO (full-bleed blanco) */}
<div className="w-full bg-white">
  <div className="relative mx-auto max-w-[520px] ">
    <div
      className="pointer-events-none absolute right-0 top-0 h-full w-[62%]"
      style={{
        background: productColor,
        clipPath: "polygon(45% 0%, 100% 0%, 100% 100%, 0% 62%)",
      }}
    />

    <div className="relative flex items-center justify-center px-6 py-8">
      <img
        key={`${(productFixed as any)?.id}-${selectedIndex}-${activeImage}-${heroSrc}`}
        src={heroSrc}
        alt={(productFixed as any)?.name ?? "Producto"}
        className="h-[320px] w-full object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/product/placeholder.png";
        }}
      />
    </div>
  </div>

  {/* Dots (también sobre blanco full-bleed) */}
  <div className="mb-4 flex items-center justify-center gap-2">
    {gallery.slice(0, 5).map((_img: string, i: number) => (
      <button
        key={i}
        type="button"
        onClick={() => setActiveImage(i)}
        className={[
          "h-2.5 w-2.5 rounded-full",
          i === activeImage ? "bg-black" : "bg-black/20",
        ].join(" ")}
        aria-label={`Imagen ${i + 1}`}
      />
    ))}
  </div>
</div>

{/* CONTENT (pegado al hero, sin redondeo arriba) */}
<div className="w-full bg-white">
  <div className="mx-auto max-w-[520px] px-4 pb-28">
    <section className="-mt-8 rounded-[18px] rounded-t-none bg-[#d2d2d2] p-5">
      <div className="text-3xl font-extrabold leading-tight text-zinc-900">
        {(productFixed as any)?.name}
      </div>

      <div className="mt-1 text-lg font-semibold tracking-wide text-black/70">
        {productFixed?.line}
      </div>

      {variants.length ? (
  isColorLevels ? (
    <div className="mt-4">
      {/* TITULO */}
      <div className="mb-2 text-sm font-extrabold text-black/70">Bases</div>

      {/* BASES (arriba) */}
      <div className="flex flex-wrap gap-3">
        {BASE_LEVELS.map((b) => {
          const list = variantsByBase.get(b) ?? [];
          const hasAny = list.length > 0;
          const active = b === baseSelected;

          return (
            <button
              key={b}
              type="button"
              disabled={!hasAny}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!hasAny) return;

                setBaseSelected(b);

                const baseVar = list.find((x) => String(x.size) === b) ?? list[0];
                const globalIdx = variants.findIndex((x: any) => x.sku === baseVar?.sku);
                if (globalIdx >= 0) {
                  setSelectedIndex(globalIdx);
                  setActiveImage(0);
                  setZipError("");
                  setZipOptions([]);
                }
              }}
              className={[
                "rounded-full px-6 py-2 text-sm font-extrabold border",
                active
                  ? "bg-black text-white border-black"
                  : "bg-white text-black/90 border-black/10",
                !hasAny ? "opacity-30 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {b}
            </button>
          );
        })}
      </div>

      {/* TITULO */}
      <div className="mt-4 mb-2 text-sm font-extrabold text-black/70">Reflejos</div>

      {/* REFLEJOS (abajo) */}
      <div className="flex flex-wrap gap-3">
        {(variantsByBase.get(baseSelected) ?? [])
          .filter((v: any) => !isBaseTone(v.size))
          .slice()
          .sort((a: any, c: any) =>
            String(a.size ?? "").localeCompare(String(c.size ?? ""), "es", { numeric: true })
          )
          .map((v: any) => {
            const globalIdx = variants.findIndex((x: any) => x.sku === v.sku);
            const active = globalIdx === selectedIndex;

            return (
              <button
                key={v.sku ?? `${(productFixed as any).id}-${String(v.size)}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (globalIdx < 0) return;
                  setSelectedIndex(globalIdx);
                  setActiveImage(0);
                  setZipError("");
                  setZipOptions([]);
                }}
                className={[
                  "rounded-full px-5 py-2 text-sm font-extrabold border",
                  active
                    ? "bg-black text-white border-black"
                    : "bg-white text-black/90 border-black/10",
                ].join(" ")}
              >
                {String(v.size)}
              </button>
            );
          })}
      </div>
    </div>
  ) : null
) : null}


{/* Marca */}
<div className="mt-3 flex items-center">
  <img
    src={`/brands/${normText(productFixed.brand)}.png`}
    alt={productFixed.brand}
    className="h-32 w-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
    

  />
</div>

          {/* Precio */}
          <div className="mt-6">
            <div
              className="inline-flex items-center rounded-full border-2 bg-black px-8 py-4 text-4xl font-black text-white"
              style={{ borderColor: productColor }}
            >
              {formatPrice(price)}
            </div>

            <div className="mt-3 text-sm font-semibold">
              {stock > 0 ? (
                <span className="text-green-700">✔ EN STOCK</span>
              ) : (
                <span className="text-red-700">✖ SIN STOCK</span>
              )}
              <span className="ml-2 text-black/60">
                {isWholesale ? "Mayorista" : "Minorista"}
              </span>
            </div>
          </div>

          {/* Cuotas (informativo) */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
<div className="text-2xl font-extrabold text-zinc-900">
  Cuotas
</div>


  <div className="flex items-center gap-2 px-1">

    <span className="text-xs font-semibold text-black/70">Pagá con</span>
    <Image
  src="/brands/mercado-pago.png"
  alt="Mercado Pago"
  width={160}
  height={40}
  className="h-[85px] w-auto"
  priority
/>

  </div>
</div>


            <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_10px_22px_rgba(0,0,0,0.08)]">
              <div className="text-sm font-semibold text-black/70">
                Contado:{" "}
                <span className="font-black text-black">{formatPrice(price)}</span>
                <span className="ml-2 text-xs text-black/50">
                  (contado 0% interés)
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {mpPlans.map((p: any) => (
                  <div
                    key={p.installments}
                    className="flex items-center justify-between rounded-xl border border-black/10 bg-black/5 px-3 py-2"
                  >
                    <div className="text-sm font-black text-black">
                      {p.installments} cuotas
                    </div>

                    <div className="text-right">
                     <div className="text-sm font-black text-zinc-900">
  {formatPrice(p.per)}
</div>

                      <div className="text-xs text-black/60">
                        Total: {formatPrice(p.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-xs text-black/60">
                Las cuotas son informativas. El valor final se confirma en Mercado Pago
                al momento de pagar.
              </div>
            </div>
          </div>

          {/* Envío (informativo Zipnova) */}
          <div className="mt-6">
            <div className="rounded-[18px] bg-[#c2c2c2] p-4 shadow-[0_10px_22px_rgba(0,0,0,0.08)]">

              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-black">Calcula tu envio</div>
                <div className="text-xs text-black/50">Estimado</div>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={zipCp}
                  onChange={(e) => setZipCp(e.target.value)}
                  placeholder="Ingresá tu CP"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={fetchZipnovaQuote}
                  className="rounded-xl bg-black px-4 py-3 text-sm font-extrabold text-white"
                >
                  {zipLoading ? "..." : "Calcular"}
                </button>
              </div>

              {zipError ? (
                <div className="mt-3 text-xs font-semibold text-red-600">{zipError}</div>
              ) : null}

              {zipOptions.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {zipOptions.slice(0, 4).map((op: any, idx: number) => {
                    const label =
                      op?.label ||
                      op?.name ||
                      op?.service_name ||
                      `Opción ${idx + 1}`;

                    const cost = Number(op?.cost ?? op?.price ?? op?.amount ?? 0) || 0;

                    const eta =
                      op?.eta ||
                      op?.delivery_time ||
                      op?.estimated_delivery ||
                      op?.meta?.eta ||
                      "";

                    return (
                      <div
                        key={op?.id ?? `${label}-${idx}`}
                        className="flex items-center justify-between rounded-xl bg-black/5 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-black">
                            {label}
                          </div>
                          {eta ? (
                            <div className="text-xs text-black/60">{String(eta)}</div>
                          ) : null}
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-black">
                            {formatPrice(cost)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-2 text-xs leading-relaxed text-black/60">
                    Cotización estimada. El costo final se confirma al finalizar la compra.
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            disabled={!selectedVariant?.sku || stock <= 0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!selectedVariant?.sku) return;

              addItem({
                productId: (productFixed as any).id,
                variantSku: (selectedVariant as any).sku,
                quantity: 1,
              });

              window.dispatchEvent(
                new CustomEvent("toast", {
                  detail: { message: "Agregado al carrito", kind: "success" },
                })
              );
            }}
            className={[
              "mt-8 w-full rounded-full bg-black py-5 text-2xl font-black text-white",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            Agregar al carrito
          </button>
        </section>

        {/* Descripción */}
        <section className="mt-8">
          <div className="text-xl font-extrabold">Descripción</div>

          <div className="mt-3 rounded-[16px] bg-white p-4 text-sm leading-relaxed text-black/80 shadow-[0_10px_22px_rgba(0,0,0,0.08)]">
            {description?.short ? (
  <p className="font-semibold text-black/90">{description.short}</p>
) : null}

{description?.long ? (
  <p className={description?.short ? "mt-3" : ""}>{description.long}</p>
) : (
  <p className="text-black/60">
    Próximamente: estamos completando la descripción de este producto.
  </p>
)}

{description?.benefits ? (
  <div className="mt-4">
    <div className="text-xs font-extrabold text-black/70">Beneficios</div>

    <ul className="mt-2 list-disc pl-5 space-y-1">
      {(Array.isArray(description.benefits)
        ? (description.benefits as string[])
        : String(description.benefits).split("|")
      )
        .map((b: string) => b.trim())
        .filter((b: string) => b.length > 0)
        .slice(0, 8)
        .map((b: string, i: number) => (
          <li key={i}>{b}</li>
        ))}
    </ul>
  </div>
) : null}

{description?.usage ? (
  <div className="mt-4">
    <div className="text-xs font-extrabold text-black/70">Modo de uso</div>
    <p className="mt-2">{description.usage}</p>
  </div>
) : null}

          </div>
        </section>

        {/* Lo más vendido — carrusel */}
        {bestSellersFixed.length > 0 ? (
          <section className="mt-10">
            <div className="text-xl font-extrabold">Lo más vendido…</div>

            <div className="mt-4 -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 snap-x snap-mandatory">
              {bestSellersFixed.map((p) => (
                <a
                  key={(p as any).id}
                  href={`/p/${(p as any).id}`}
                  className="block min-w-[220px] snap-start"
                  onClickCapture={(e) => {
                    const el = e.target as HTMLElement | null;
                    if (!el) return;
                    if (el.closest("[data-no-nav]")) e.preventDefault();
                  }}
                >
                  <ProductCard product={p as any} />
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      </div>
    </div>
  );
}
