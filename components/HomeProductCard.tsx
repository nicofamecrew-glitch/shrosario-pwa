"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/store";
import { formatPrice, getVariantPrice } from "@/lib/pricing";
import { getProductImage } from "@/lib/productImage";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  product: Product;
};

export default function HomeProductCard({ product }: Props) {
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

    for (const v of raw) {
      const sku = String(v?.sku ?? "").trim();
      const size = String(v?.size ?? "").trim();

      if (!sku && !size) continue;

      const key = sku
        ? `sku:${sku}`
        : `size:${size.toLowerCase()}`;

      if (seen.has(key)) continue;

      seen.add(key);
      result.push(v);
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

  const shownVariants = variants.slice(0, 3);
  const remainingVariants = Math.max(
    0,
    variants.length - 3
  );

  const handleAdd = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canAdd || !variant) return;

    if (navigator?.vibrate) {
      navigator.vibrate(18);
    }

    addItem({
      productId: product.id,
      variant,
      qty: 1,
    });
  };

  return (
    <article
      className="
        relative flex h-[250px] flex-col overflow-hidden
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
          relative flex h-[130px] shrink-0
          items-center justify-center
          bg-[#f5f5f5] p-3
          dark:bg-[#1b1b1b]
        "
      >
        <img
          key={`${product.id}-${selectedIndex}-${imgSrc}`}
          src={imgSrc}
          alt={product?.name ?? "Producto"}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={(e) => {
            e.currentTarget.src =
              "/product/placeholder.png";
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

        {/* VARIANTES */}
        {variants.length > 0 && (
          <div className="mt-2 flex items-center gap-1 overflow-hidden">
            {shownVariants.map(
              (v: any, index: number) => {
                const active =
                  index === selectedIndex;

                return (
                  <button
                    key={`${product.id}-${v.sku}-${index}`}
                    type="button"
                    data-no-nav
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedIndex(index);
                    }}
                    className={[
                      "max-w-[58px] truncate rounded-full px-2 py-1",
                      "text-[9px] font-bold transition",
                      active
                        ? "bg-[#ee078e] text-white"
                        : "bg-black/5 text-black/55 dark:bg-white/10 dark:text-white/60",
                    ].join(" ")}
                  >
                    {v.size}
                  </button>
                );
              }
            )}

            {remainingVariants > 0 && (
              <button
                type="button"
                data-no-nav
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/p/${product.id}`);
                }}
                className="
                  shrink-0 rounded-full
                  bg-black/5 px-2 py-1
                  text-[9px] font-bold text-black/55
                  dark:bg-white/10 dark:text-white/60
                "
              >
                +{remainingVariants}
              </button>
            )}
          </div>
        )}

        {/* BOTÓN */}
        <div className="mt-auto flex items-end justify-end">
          <button
            type="button"
            data-no-nav
            disabled={!canAdd}
            onClick={handleAdd}
            aria-label={`Agregar ${variant?.size ?? ""} al carrito`}
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