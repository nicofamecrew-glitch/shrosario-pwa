"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/store";
import { ShoppingCart } from "lucide-react";
import { formatPrice, getVariantPrice } from "@/lib/pricing";
import type { Product } from "@/lib/types";



// Copiamos la lógica de acento (NO tocamos la original)
function brandAccent(brand?: string) {
  const b = String(brand ?? "").toLowerCase();
  if (b.includes("vexa")) return { ribbon: "#7c3aed" };
  if (b.includes("ossono")) return { ribbon: "#14b8a6" };
  if (b.includes("coalix")) return { ribbon: "#f97316" };
  if (b.includes("fidelite")) return { ribbon: "#60a5fa" };
  if (b.includes("lisse")) return { ribbon: "#f5aa5c" };
  return { ribbon: "#334155" }; // gris sobrio por defecto
}

function getMainImage(product: any) {
  // Soporta varias estructuras sin romper
  const direct =
    product?.image ||
    product?.img ||
    product?.images?.[0] ||
    product?.variants?.[0]?.image ||
    product?.variants?.[0]?.images?.[0];

  // Si es objeto tipo {src} o {url}
  if (direct && typeof direct === "object") return direct.src || direct.url || "";
  return typeof direct === "string" ? direct : "";
}
export default function ProductCardCatalog({
  product,
}: {
  product: Product & Partial<{ product_id: string; images: any[]; image: any }>;
}) {

  const accent = brandAccent((product as any)?.brand);
  const href = `/p/${(product as any)?.id ?? (product as any)?.product_id ?? ""}`;

  const img = getMainImage(product);
const v0 = (product as any)?.variants?.[0] ?? null;
const { getStockBySku, getQtyBySku } = useCartStore();

const sku = v0?.sku ?? "";
const stock = sku ? getStockBySku(sku) : null; // number | null
const inCart = sku ? getQtyBySku(sku) : 0;

const remaining = stock === null ? null : Math.max(0, stock - inCart);
const outOfStock = stock === null ? true : stock <= inCart;
const canAdd = !!sku && stock !== null && stock > inCart;



// por ahora: retail (false). Después lo conectamos a la sesión.
const isWholesale = false;

const price = getVariantPrice(v0, isWholesale);
const priceText = price > 0 ? formatPrice(price) : "Consultar";


 return (
  <div
  className={[
    "rounded-2xl border border-white/10 bg-black/80 hover:bg-black/70 transition overflow-hidden shadow-sm relative",
    outOfStock ? "opacity-60 grayscale" : "",
  ].join(" ")}
>

    {/* Ribbon */}
    <div className="h-1.5 w-full" style={{ backgroundColor: accent.ribbon }} />
{outOfStock && (
  <div className="absolute left-3 top-3 z-20 rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-white">
    Sin stock
  </div>
)}

    {/* ✅ Link SOLO en la parte navegable */}
    <Link href={href} prefetch={false} className="block p-3">

      {/* Imagen */}
      <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden aspect-square flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={(product as any)?.name ?? "Producto"}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="text-white/40 text-sm">Sin imagen</div>
        )}
      </div>

      {/* Texto */}
      <div className="mt-3">
        <div className="text-white font-semibold leading-snug line-clamp-2">
          {(product as any)?.name ?? "Sin nombre"}
        </div>

        {(product as any)?.brand ? (
          <div className="mt-1 text-xs text-white/60">
            {(product as any)?.brand}
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between">
          <div className="text-white font-bold">{priceText}</div>
          <div
            className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-white/70"
            style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            Ver
          </div>
        </div>
      </div>
    </Link>

    {/* ✅ CTA afuera del Link (NO navega) */}
    <div className="px-3 pb-3">
   <button
  type="button"
  data-no-nav
  disabled={!canAdd}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAdd) return;

    if (navigator?.vibrate) navigator.vibrate(18);

    const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent("cart:fly", {
        detail: {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          img: img,
        },
      })
    );

    useCartStore.getState().addItem({
      productId: (product as any)?.id ?? (product as any)?.product_id ?? "",
      variantSku: sku,
      quantity: 1,
    });
  }}
  className={[
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl font-extrabold transition",
    "shadow-[0_12px_20px_rgba(0,0,0,0.25)]",
    canAdd
      ? "bg-black text-white active:scale-[0.99]"
      : "bg-black/40 text-white/70 cursor-not-allowed",
  ].join(" ")}
>
 <ShoppingCart size={18} />
{stock === null
  ? "Sin stock"
  : outOfStock
    ? "Sin stock"
    : remaining !== null
      ? `Agregar (quedan ${remaining})`
      : "Agregar al carrito"}

</button>
    </div>
  </div>
);
}