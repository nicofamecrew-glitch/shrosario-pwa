"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCartStore } from "@/lib/store";
import { useCatalogStore } from "@/lib/lib/catalogStore";

import { findVariant, formatPrice, getVariantPrice } from "@/lib/pricing";

export default function CartDrawer() {
  const router = useRouter();

  const { items, updateQuantity, removeItem, clearCart, isWholesale } = useCartStore();
  const products = useCatalogStore((s) => s.products);
  const byId = useCatalogStore((s) => s.byId);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);

    window.addEventListener("cart:open", onOpen);
    window.addEventListener("cart:close", onClose);

    return () => {
      window.removeEventListener("cart:open", onOpen);
      window.removeEventListener("cart:close", onClose);
    };
  }, []);

  const close = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("cart:close"));
  };

  const hasCatalog = products.length > 0;
  const hasItems = items.length > 0;

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = byId[item.productId];
      if (!product) return sum;
      const variant = findVariant(product as any, item.variantSku);
if (!variant) return sum; // ✅ si no hay variant, lo ignoramos
return sum + getVariantPrice(variant as any, isWholesale) * item.quantity;

    }, 0);
  }, [items, byId, isWholesale]);

  const ctaDisabled = !hasItems || !hasCatalog;

  const ctaLabel = !hasItems
    ? "Agregá productos para continuar"
    : !hasCatalog
    ? 'Cargando catálogo… (abrí "Categorías" una vez)'
    : "Confirmar pedido";

  const onGoConfirm = () => {
    if (!hasItems) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "El carrito está vacío.", type: "warn" },
        })
      );
      return;
    }

    if (!hasCatalog) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            message: 'Todavía no cargó el catálogo. Abrí "Categorías" una vez y volvé.',
            type: "warn",
          },
        })
      );
      return;
    }

    close();
    router.push("/checkout/confirm");
  };

  if (!open) return null;

  return (
    <nav className="fixed inset-0 z-40">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Cerrar carrito"
        onClick={close}
        className="absolute inset-0 bg-black/60"
      />

      {/* panel */}
      <div
  className={[
    "absolute bottom-0 left-0 right-0 mx-auto h-[85vh] w-full max-w-md",
    "rounded-t-3xl border shadow-xl flex flex-col overflow-hidden",
    // light
    "bg-white text-black border-black/10",
    // dark
    "dark:bg-black dark:text-white dark:border-white/10",
  ].join(" ")}
>

        {/* Header fijo */}
        <div className="shrink-0 p-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tu pedido</h2>
            <button
  onClick={close}
  className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
>

              Cerrar
            </button>
          </div>

          {items.length === 0 && (
            <div className="mt-4 rounded-xl border border-black/10 bg-black/5 p-4 text-sm text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
>
              Todavía no agregaste productos.
            </div>
          )}

          {!hasCatalog && items.length > 0 && (
            <div className="mt-4 rounded-xl border border-black/10 bg-black/5 p-4 text-sm text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              El catálogo todavía no cargó. Abrí “Categorías” una vez y volvé.
            </div>
          )}
        </div>

        {/* Lista scrolleable */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-4">
            {items.map((item) => {
              const product = byId[item.productId];
              if (!product) return null;

              const variant = findVariant(product, item.variantSku);
if (!variant) return null;
const price = getVariantPrice(variant, isWholesale);


              return (
                <div
                  key={`${item.productId}-${item.variantSku}`}
                 className="rounded-xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5"

                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {product.brand} {product.name}
                      </p>
                      <p className="text-xs text-black/60 dark:text-white/60">

                        {variant?.size ?? ""} - {product.line}
                      </p>
                    </div>

                    <button
                     className="text-xs text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"

                      onClick={() => removeItem(item.productId, item.variantSku)}
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                       className="h-8 w-8 rounded-full border border-black/10 bg-white text-black hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"

                        onClick={() =>
                          updateQuantity(item.productId, item.variantSku, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>

                      <span className="text-sm">{item.quantity}</span>

                      <button
                        className="h-8 w-8 rounded-full border border-panel"
                        onClick={() =>
                          updateQuantity(item.productId, item.variantSku, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <div className="text-sm font-semibold">
                      {formatPrice(price * item.quantity)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer fijo */}
        <div
          className="shrink-0 border-t border-black/10 bg-white p-6 pt-4 dark:border-white/10 dark:bg-black"
          style={{ paddingBottom: "calc(110px + env(safe-area-inset-bottom))" }}
        >
          {/* TOTAL */}
          <div className="rounded-xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5"
>
            <div className="flex items-center justify-between">
             <span className="text-sm text-black/60 dark:text-white/60">
Total estimado</span>
              <span className="text-lg font-semibold">{formatPrice(total)}</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-4 flex flex-col gap-3">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={onGoConfirm}
              disabled={ctaDisabled}
              className="rounded-full bg-[#ee078e] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {ctaLabel}
            </button>

            <button
              onClick={clearCart}
              disabled={!hasItems}
             className="rounded-full border border-black/10 bg-white px-4 py-3 text-sm text-black hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"

            >
              Vaciar carrito
            </button>

            <div className="text-xs text-black/50 dark:text-white/40">

              El pedido se confirma en el siguiente paso (datos de entrega).
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
