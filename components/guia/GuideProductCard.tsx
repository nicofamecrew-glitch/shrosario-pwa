"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/store";
import { formatPrice, getVariantPrice } from "@/lib/pricing";
import { getProductImage } from "@/lib/productImage";
import { Plus, ArrowRight } from "lucide-react";

type Props = {
  product: Product;
};

export default function GuideProductCard({ product }: Props) {
  const router = useRouter();

  const {
    addItem,
    isWholesale,
    getStockBySku,
    getQtyBySku,
  } = useCartStore();

  const [selectedIndex, setSelectedIndex] = useState(0);

  const variants = useMemo(() => {
    const raw = Array.isArray((product as any)?.variants)
      ? (product as any).variants
      : [];

    const seen = new Set<string>();
    const result: any[] = [];

    for (const variant of raw) {
      const sku = String(variant?.sku ?? "").trim();
      const size = String(variant?.size ?? "").trim();

      if (!sku && !size) continue;

      const key = sku
        ? `sku:${sku}`
        : `size:${size.toLowerCase()}`;

      if (seen.has(key)) continue;

      seen.add(key);
      result.push(variant);
    }

    return result;
  }, [product]);

  const variant =
    variants[selectedIndex] ??
    variants[0] ??
    null;

  const sku = String(variant?.sku ?? "");

  const price = variant
    ? getVariantPrice(variant, isWholesale)
    : 0;

  const stock = sku
    ? getStockBySku(sku)
    : null;

  const inCart = sku
    ? getQtyBySku(sku)
    : 0;

  const remaining =
    stock === null
      ? null
      : Math.max(0, stock - inCart);

  const canAdd =
    !!sku &&
    (remaining === null || remaining > 0);

  const imgSrc = useMemo(() => {
    if (variant?.image) return variant.image;
    if (variant?.imageUrl) return variant.imageUrl;
    if (variant?.img) return variant.img;

    if (
      Array.isArray(variant?.images) &&
      variant.images[0]
    ) {
      return variant.images[0];
    }

    if ((product as any)?.defaultImage) {
      return (product as any).defaultImage;
    }

    return getProductImage(
      product as any,
      variant as any,
      selectedIndex
    );
  }, [product, variant, selectedIndex]);

  function handleAdd() {
    if (!canAdd || !variant) return;

    if (navigator?.vibrate) {
      navigator.vibrate(18);
    }

    addItem({
      productId: product.id,
      variant,
      qty: 1,
    });
  }

  return (
    <article
      className="
        overflow-hidden rounded-[24px]
        border border-violet-400/20
        bg-gradient-to-br
        from-violet-500/10
        via-white/[0.04]
        to-fuchsia-500/10
        shadow-[0_12px_40px_rgba(139,92,246,0.12)]
      "
    >
      {/* PRODUCTO */}
      <div className="flex gap-3 p-3">
        <div
          className="
            flex h-[96px] w-[96px] shrink-0
            items-center justify-center
            overflow-hidden rounded-[18px]
            bg-white
            p-2
          "
        >
          <img
            src={imgSrc}
            alt={product.name}
            className="h-full w-full object-contain"
            onError={(e) => {
              e.currentTarget.src =
                "/product/placeholder.png";
            }}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">
            Recomendado por GUÍA
          </div>

          <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-white">
            {product.name}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="text-[17px] font-black text-white">
              {formatPrice(price)}
            </div>

            <button
              type="button"
              onClick={() => router.push(`/p/${product.id}`)}
              className="
                flex items-center gap-1
                text-[11px] font-semibold
                text-white/55
                transition hover:text-white
              "
            >
              Ver
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* VARIANTES */}
      {variants.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-3">
          {variants.map((item: any, index: number) => {
            const active = index === selectedIndex;

            return (
              <button
                key={`${item.sku}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5",
                  "text-[10px] font-bold transition",
                  active
                    ? "bg-violet-500 text-white"
                    : "bg-white/10 text-white/55",
                ].join(" ")}
              >
                {item.size}
              </button>
            );
          })}
        </div>
      )}

      {/* ACCIÓN */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          disabled={!canAdd}
          onClick={handleAdd}
          className="
            flex h-11 w-full items-center
            justify-center gap-2
            rounded-[16px]
            bg-gradient-to-r
            from-violet-600 to-fuchsia-500
            text-[13px] font-bold text-white
            transition active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-35
          "
        >
          <Plus size={17} strokeWidth={2.5} />

          {canAdd
            ? "Agregar al carrito"
            : "Sin stock"}
        </button>
      </div>
    </article>
  );
}