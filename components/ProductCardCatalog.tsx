"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Product } from "@/lib/types";
import { useCartStore } from "@/lib/store";
import { formatPrice, getVariantPrice } from "@/lib/pricing";
import { getProductImage } from "@/lib/productImage";

type Props = {
  product: Product;
};

export default function ProductCardCatalog({ product }: Props) {
  const router = useRouter();

  const {
    addItem,
    isWholesale,
    getStockBySku,
    getQtyBySku,
  } = useCartStore();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

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

  const selectedVariant =
    variants[selectedIndex] ??
    variants[0] ??
    null;

  const sku = String(selectedVariant?.sku ?? "");

  const price = selectedVariant
    ? getVariantPrice(selectedVariant, isWholesale)
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
    if (selectedVariant?.image) return selectedVariant.image;
    if (selectedVariant?.imageUrl) return selectedVariant.imageUrl;
    if (selectedVariant?.img) return selectedVariant.img;

    if (
      Array.isArray(selectedVariant?.images) &&
      selectedVariant.images[0]
    ) {
      return selectedVariant.images[0];
    }

    if ((product as any)?.defaultImage) {
      return (product as any).defaultImage;
    }

    return getProductImage(
      product as any,
      selectedVariant as any,
      selectedIndex
    );
  }, [product, selectedVariant, selectedIndex]);

  const shownVariants = variants.slice(0, 3);
  const remainingVariants = Math.max(0, variants.length - 3);

  const handleAdd = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canAdd || !selectedVariant) return;

    if (navigator?.vibrate) {
      navigator.vibrate(18);
    }

    const r =
      e.currentTarget.getBoundingClientRect();

    window.dispatchEvent(
      new CustomEvent("cart:fly", {
        detail: {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          img: imgSrc,
        },
      })
    );

    addItem({
      productId: product.id,
      variant: selectedVariant,
      qty: 1,
    });
  };

  return (
    <article
      className="
        relative flex h-[310px] flex-col overflow-hidden
        rounded-[22px]
        border border-black/10 bg-white
        shadow-[0_5px_18px_rgba(0,0,0,0.07)]
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
        {price > 0 ? formatPrice(price) : "Consultar"}
      </div>

      {/* SIN STOCK DE ESTA VARIANTE */}
      {!canAdd && selectedVariant && (
        <div
          className="
            absolute left-2 top-2 z-20
            rounded-full bg-black/75 px-2 py-1
            text-[9px] font-bold text-white
          "
        >
          Sin stock
        </div>
      )}

      {/* IMAGEN */}
      <div
        className="
          relative flex h-[170px] shrink-0
          items-center justify-center
          bg-[#f4f4f4] p-4
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

      {/* CONTENIDO */}
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2.5">
        <h3
          className="
            line-clamp-2
            text-[13px] font-extrabold leading-[1.15]
            text-black dark:text-white
          "
        >
          {product.name}
        </h3>

        <div
          className="
            mt-1 truncate text-[10px] font-medium
            text-black/45 dark:text-white/45
          "
        >
          {product.brand ?? ""}
        </div>

        {/* VARIANTES */}
        {variants.length > 0 && (
          <div className="mt-2 flex items-center gap-1 overflow-hidden">
            {shownVariants.map(
              (v: any, index: number) => {
                const active =
                  index === selectedIndex;

                const variantSku = String(
                  v?.sku ?? ""
                );

                const variantStock = variantSku
                  ? getStockBySku(variantSku)
                  : null;

                const variantInCart = variantSku
                  ? getQtyBySku(variantSku)
                  : 0;

                const variantAvailable =
                  !!variantSku &&
                  (variantStock === null ||
                    variantStock > variantInCart);

                return (
                  <button
                    key={`${product.id}-${v.sku}-${index}`}
                    type="button"
                    data-no-nav
                    disabled={!variantAvailable}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedIndex(index);
                    }}
                    className={[
                      "max-w-[58px] truncate rounded-full px-2 py-1",
                      "text-[9px] font-bold transition",
                      !variantAvailable
                        ? "cursor-not-allowed bg-black/5 text-black/20 dark:bg-white/5 dark:text-white/20"
                        : active
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

        {/* PIE */}
        <div className="mt-auto flex items-end justify-between gap-2">
          <span
            className="
              truncate text-[10px] font-medium
              text-black/40 dark:text-white/40
            "
          >
            {!mounted
  ? selectedVariant?.size ?? ""
  : remaining !== null && canAdd
    ? `${remaining} disponibles`
    : selectedVariant?.size ?? ""}
          </span>

          <button
            type="button"
            data-no-nav
            disabled={!canAdd}
            onClick={handleAdd}
            aria-label={`Agregar ${selectedVariant?.size ?? ""} al carrito`}
            className={[
              "grid h-10 w-10 shrink-0 place-items-center rounded-full",
              "transition active:scale-90",
              canAdd
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "cursor-not-allowed bg-black/15 text-black/30 dark:bg-white/15 dark:text-white/30",
            ].join(" ")}
          >
            <Plus size={21} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}
