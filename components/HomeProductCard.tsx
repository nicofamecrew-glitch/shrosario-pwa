"use client";

import { useMemo } from "react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/store";
import { formatPrice, getVariantPrice } from "@/lib/pricing";
import { getProductImage } from "@/lib/productImage";
import { Plus } from "lucide-react";

type Props = {
  product: Product;
};

export default function HomeProductCard({ product }: Props) {
  const { addItem, isWholesale, getStockBySku, getQtyBySku } =
    useCartStore();

  const variants = useMemo(() => {
    const raw = Array.isArray((product as any)?.variants)
      ? (product as any).variants
      : [];

    const seen = new Set<string>();

    return raw.filter((v: any) => {
      const sku = String(v?.sku ?? "").trim();
      const size = String(v?.size ?? "").trim();

      if (!sku && !size) return false;

      const key = sku
        ? `sku:${sku}`
        : `size:${size.toLowerCase()}`;

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }, [product]);

  const variant = variants[0] ?? null;
  const sku = variant?.sku ?? "";

  const price = variant
    ? getVariantPrice(variant, isWholesale)
    : 0;

  const stock = sku ? getStockBySku(sku) : null;
  const inCart = sku ? getQtyBySku(sku) : 0;

  const remaining =
    stock === null ? null : Math.max(0, stock - inCart);

  const canAdd =
    !!sku && (remaining === null || remaining > 0);

  const imgSrc = useMemo(() => {
    if (variant?.image) return variant.image;
    if (variant?.imageUrl) return variant.imageUrl;
    if (variant?.img) return variant.img;

    if (Array.isArray(variant?.images) && variant.images[0]) {
      return variant.images[0];
    }

    if ((product as any)?.defaultImage) {
      return (product as any).defaultImage;
    }

    return getProductImage(product as any, variant as any, 0);
  }, [product, variant]);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canAdd || !variant) return;

    if (navigator?.vibrate) navigator.vibrate(18);

    addItem({
      productId: product.id,
      variant,
      qty: 1,
    });
  };

  return (
    <article
      className="
        relative flex h-[230px] flex-col overflow-hidden
        rounded-[20px]
        border border-black/10 bg-white
        shadow-[0_4px_14px_rgba(0,0,0,0.06)]
        dark:border-white/10 dark:bg-[#121212]
      "
    >
      {/* PRECIO */}
      <div
        className="
          absolute right-2 top-2 z-20
          rounded-full bg-black px-2.5 py-1
          text-[13px] font-extrabold text-white
          dark:bg-white dark:text-black
        "
      >
        {formatPrice(price)}
      </div>

      {/* IMAGEN */}
      <div
        className="
          relative flex h-[135px] shrink-0
          items-center justify-center
          bg-[#f5f5f5] p-3
          dark:bg-[#1b1b1b]
        "
      >
        <img
          src={imgSrc}
          alt={product?.name ?? "Producto"}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={(e) => {
            e.currentTarget.src = "/product/placeholder.png";
          }}
        />
      </div>

      {/* INFORMACIÓN */}
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2.5">
        <h3
          className="
            line-clamp-2
            text-[13px] font-bold leading-[1.15]
            text-black dark:text-white
          "
        >
          {product.name}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-2">
          <span
            className="
              max-w-[80px] truncate
              text-[11px] font-medium
              text-black/45 dark:text-white/45
            "
          >
            {variant?.size ?? product?.brand ?? ""}
          </span>

          <button
            type="button"
            data-no-nav
            disabled={!canAdd}
            onClick={handleAdd}
            aria-label="Agregar al carrito"
            className={[
              "grid h-9 w-9 shrink-0 place-items-center rounded-full",
              "transition active:scale-90",
              canAdd
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "cursor-not-allowed bg-black/15 text-black/30 dark:bg-white/15 dark:text-white/30",
            ].join(" ")}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}