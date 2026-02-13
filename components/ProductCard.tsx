"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useCartStore, useFavoritesStore } from "@/lib/store";
import { formatPrice, getVariantPrice } from "@/lib/pricing";
import { ShoppingCart } from "lucide-react";
import FavoriteHeart from "@/components/ui/FavoriteHeart";
import { brandAccentFrom } from "@/lib/brandAccent";
import { getProductImage } from "@/lib/productImage";

type ProductCardProps = {
  product: Product;
  showFavorite?: boolean;
};

const BRAND_LOGOS: Record<string, string> = {
  vexa: "/brands/vexa.png",
  ossono: "/brands/ossono.png",
  fidelite: "/brands/fidelite.png",
  coalix: "/brands/coalix.png",
  "lisse extreme": "/brands/lisse-extreme.png",
};

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
    { keys: ["lino", "10 en 1", "protector termico"], color: "#d2a2c6" },
    { keys: ["argan", "ddc"], color: "#d8bb8c" },
    { keys: ["complex", "coloracion"], color: "#bc4598" },
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
    { keys: ["for men", "spray", "laca", "protector", "brillo", "acido hialuronico", "texturizante", "sellador"], color: "#3e3e47" },
    { keys: ["activador", "docta"], color: "#d97e3e" },
    { keys: ["clinical detox"], color: "#9fd0cd" },
    { keys: ["clinical prevent"], color: "#6085a4" },
    { keys: ["clinical control"], color: "#97c8c4" },
    { keys: ["crema de peinar coalix"], color: "#109251" },
    { keys: ["polvo decolorante"], color: "#a12b46" },
    { keys: ["oxidante 10v", "10v oxidante", "oxidante 10 vol", "10v 1800ml"], color: "#e0681e" },
    { keys: ["oxidante 20v", "20v oxidante", "oxidante 20 vol", "20v 1800ml"], color: "#d21229" },
    { keys: ["oxidante 30v", "30v oxidante", "oxidante 30 vol", "30v 1800ml"], color: "#1e5834" },
    { keys: ["oxidante 40v", "40v oxidante", "oxidante 40 vol", "40v 1800ml"], color: "#2189c1" },
  ],
  "lisse extreme": [
    { keys: ["pastificado", "plastificado"], color: "#e1823c" },
    { keys: ["ultra plex", "ultraplex"], color: "#639bd4" },
    { keys: ["shock keratinico", "shock queratina"], color: "#f16be2" },
    { keys: ["argan liss"], color: "#eae45d" },
    { keys: ["biotina liss"], color: "#80e468" },
  ],
  fidelite: [
    { keys: ["complejo nutritivo"], color: "#d2a2c6" },
    { keys: ["argan", "elixir", "ultra black", "cera wax"], color: "#000000" },
    { keys: ["oxidante", "neutro", "polvo decolorante", "crema acida", "quita manchas"], color: "#d53721" },
    { keys: ["complex", "serum caviar", "mascara caviar", "multiaccion", "ampollas caviar"], color: "#bc4598" },
    { keys: ["girasol", "spray brillo"], color: "#f59d14" },
    { keys: ["acido"], color: "#c4c4c4" },
    { keys: ["keratina", "queratina", "keratin"], color: "#fc7730" },
    { keys: ["7/9", "10", "corrector", "correctora"], color: "#ccbdd3" },
    { keys: ["coco"], color: "#e9e6a2" },
    { keys: ["kill frizz", "lacios"], color: "#f20091" },
    { keys: ["free"], color: "#00d10e" },
    { keys: ["ampollas lino"], color: "#639bd4" },
  ],
};


function normText(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function resolveProductColor(product: Product, variant?: any): string {
  const brand = normText(String(product?.brand ?? ""));
  const text = normText(`${product?.name ?? ""} ${product?.line ?? ""}`);

  const rules = BRAND_LINE_COLORS[brand] ?? [];
  for (const r of rules) {
    if (r.keys.some((k) => text.includes(normText(k)))) return r.color;
  }

  // Ajuste por tamaño de variante
  const size = normText(String(variant?.size ?? ""));
  if (size.includes("1kg")) return "#ff9800";
  if (size.includes("250ml")) return "#009688";
  if (size.includes("180ml")) return "#3f51b5";
  if (size.includes("60gr")) return "#e91e63";

  return brandAccentFrom(product).ribbon;
}



export default function ProductCard({ product, showFavorite = true }: ProductCardProps) {
  const { addItem, isWholesale } = useCartStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [product?.id]);

  const variants = useMemo(() => {
  const raw = Array.isArray((product as any)?.variants) ? (product as any).variants : [];

  // Dedup por SKU si existe; si no, por size
  const seen = new Set<string>();
  const out: any[] = [];

  for (const v of raw) {
    const sku = String(v?.sku ?? "").trim();
    const size = String(v?.size ?? "").trim();

    // si no tiene ni sku ni size, no sirve
    if (!sku && !size) continue;

    const key = sku ? `sku:${sku}` : `size:${size.toLowerCase()}`;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(v);
  }

  return out;
}, [product?.id, (product as any)?.variants]);

useEffect(() => {
  const raw = Array.isArray((product as any)?.variants)
    ? (product as any).variants
    : [];

  console.log("[DEBUG variants RAW]", {
    productId: product.id,
    name: product.name,
    rawCount: raw.length,
    sizes: raw.map((v: any) => v?.size),
    skus: raw.map((v: any) => v?.sku),
  });
}, [product?.id]);

  const MAX_VARIANTS_PREVIEW = 5;
  const shown = variants.slice(0, MAX_VARIANTS_PREVIEW);
  const remaining = Math.max(0, variants.length - shown.length);
  const selectedVariant = useMemo(() => {
    return variants[selectedIndex] ?? variants[0] ?? null;
  }, [variants, selectedIndex]);
const variantSku = (selectedVariant as any)?.sku ?? "";

// Asumimos que el store lo expone (lo armamos en el punto 2)
const { getStockBySku, getQtyBySku } = useCartStore();

const stock = variantSku ? getStockBySku(variantSku) : null; // number | null
const inCart = variantSku ? getQtyBySku(variantSku) : 0;

const remainingStock = stock === null ? null : Math.max(0, stock - inCart);
const canAdd = !!variantSku && (remainingStock === null ? true : remainingStock > 0);


  const price = useMemo(() => {
    return selectedVariant ? getVariantPrice(selectedVariant as any, isWholesale) : 0;
  }, [selectedVariant, isWholesale]);

 const productColor = useMemo(
  () => resolveProductColor(product, selectedVariant),
  [product, selectedVariant]
);


  // ✅ UNA SOLA FUENTE: getProductImage()
  const imgSrc = useMemo(() => {
    return getProductImage(product as any, selectedVariant as any, selectedIndex);
  }, [product, selectedVariant, selectedIndex]);

  // Debug (opcional)
  useEffect(() => {
    const v: any = selectedVariant;
    console.log("[ProductCard img]", {
      id: product?.id,
      idx: selectedIndex,
      size: v?.size,
      sku: v?.sku,
      resolved: v?._resolvedImage,
      image_url: v?.image_url,
      image: v?.image,
      images0: Array.isArray(v?.images) ? v.images[0] : null,
      imgSrc,
    });
  }, [product?.id, selectedIndex, selectedVariant, imgSrc]);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#f5f5f5] shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
      {/* diagonal ribbon */}
      <div
        className="absolute right-0 top-0 h-[70%] w-[70%] opacity-95 z-0 pointer-events-none"
        style={{
          background: productColor,
          clipPath: "polygon(55% 0%, 100% 0%, 100% 100%, 0% 60%)",
        }}
      />

      {/* price badge */}
      <div className="absolute right-3 top-3 z-30">
        <div
          className="rounded-xl px-3 py-1.5 text-xl font-extrabold text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] tracking-tight leading-none tabular-nums"
          style={{ background: productColor }}
        >
          {formatPrice(price)}
        </div>
      </div>

      {/* favorite */}
      {showFavorite && (
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
          className="absolute left-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/10 backdrop-blur border border-black/10 active:scale-95"
        >
          <FavoriteHeart active={isFavorite(product.id)} size={18} />
        </button>
      )}

      {/* image area */}
      {(() => {
        const cat = String((product as any)?.category ?? "").toLowerCase();
        const isJar = cat.includes("mascara") || cat.includes("mascarilla") || cat.includes("tratamiento");

        return (
<div className="relative flex h-[210px] items-center justify-center px-4 pt-10">
            <div className="pointer-events-none absolute bottom-6 left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-full bg-black/20 blur-xl" />

            <img
              key={`${product.id}-${selectedIndex}-${imgSrc}`}
              src={imgSrc}
              alt={product?.name ?? "Producto"}
              loading="lazy"
              className={[
                "relative z-10 h-full w-full object-contain drop-shadow-[0_20px_18px_rgba(0,0,0,0.35)] transition-transform duration-200",
                isJar ? "p-3 scale-[1.10]" : "p-1 scale-[1.38]",
                "group-hover:scale-[1.03]",
              ].join(" ")}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/product/placeholder.png";
              }}
            />
          </div>
        );
      })()}

      {/* content */}
      <div className="relative z-10 flex flex-1 flex-col px-4 pb-4 pt-2">
        {/* brand */}
        <div className="flex items-center gap-2">
          {BRAND_LOGOS[product.brand?.toLowerCase()] ? (
            <img src={BRAND_LOGOS[product.brand.toLowerCase()]} alt={product.brand} className="h-16 w-auto opacity-80" />
          ) : (
            <div className="text-[10px] uppercase tracking-[0.22em] text-black/50">{product.brand}</div>
          )}
        </div>

        <div className="mt-2 line-clamp-2 text-[15px] font-extrabold leading-tight text-black">{product.name}</div>
        <div className="mt-1 line-clamp-1 text-xs text-black/55">{product.line}</div>


{/* variants pills */}
{variants.length ? (
  <div className="mt-3 h-[72px] overflow-hidden">
    <div className="flex flex-wrap gap-2">
      {shown.map((v: any, i: number) => {
        const active = i === selectedIndex;
        return (
          <button
            key={`${product.id}::${String(v?.sku ?? "nosku")}::${String(v?.size ?? "nosize")}::${i}`}


            type="button"
            data-no-nav
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedIndex(i);
            }}
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold border",
              active ? "text-white" : "border-black/10 bg-white text-black/70",
            ].join(" ")}
            style={active ? { background: productColor } : undefined}
          >
            {v.size}
          </button>
        );
      })}

      {remaining > 0 && (
        <button
          type="button"
          data-no-nav
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `/p/${product.id}`;
          }}
          className="rounded-full px-3 py-1 text-xs font-semibold border border-black/10 bg-white text-black/70"
        >
          +{remaining}
        </button>
      )}
    </div>
  </div>
) : null}

<button
  type="button"
  data-no-nav
  disabled={!canAdd}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!variantSku) return;
    // A) haptic
if (navigator?.vibrate) navigator.vibrate(18);

// B) fly-to-cart (usa la imagen de la variante actual)
const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
window.dispatchEvent(
  new CustomEvent("cart:fly", {
    detail: {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      img: imgSrc, // <-- ya existe en ProductCard
    },
  })
);


    addItem({
      productId: product.id,
      variantSku,
      quantity: 1,
    });
    // el toast “Agregado” NO lo tires acá a ciegas
    // lo va a tirar el store (ver punto 2)
  }}
  className={[
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl font-extrabold shadow-[0_12px_20px_rgba(0,0,0,0.25)] active:scale-[0.99]",
    canAdd ? "bg-black text-white" : "bg-black/40 text-white/70 cursor-not-allowed",
  ].join(" ")}
>
  <ShoppingCart size={18} />{canAdd
  ? "Agregar al carrito"
  : stock !== null && stock <= 0
    ? "Sin stock"
    : remainingStock !== null
      ? `Te quedan ${remainingStock}`
      : "Agregar al carrito"}

</button>

</div>
</div>
  );
}
