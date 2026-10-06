"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Minus, Plus, ShoppingBag, X } from "lucide-react";

import type { Product, ProductVariant } from "@/lib/types";
import type { ActiveCatalogProduct } from "@/lib/catalog/activeProduct";
import { useCartStore } from "@/lib/store";
import { formatPrice, getVariantPrice } from "@/lib/pricing";
import { getProductImage } from "@/lib/productImage";
import { brandAccentFrom } from "@/lib/brandAccent";

type Props = {
  product: Product | null;
  initialVariantSku?: string | null;
  flashDiscountPercent?: number;
  onClose: () => void;
  onActiveProductChange?: (context: ActiveCatalogProduct | null) => void;
};

function uniqueVariants(product: Product | null): ProductVariant[] {
  const raw = Array.isArray((product as any)?.variants) ? (product as any).variants : [];
  const seen = new Set<string>();
  return raw.filter((variant: any) => {
    const sku = String(variant?.sku ?? "").trim();
    const size = String(variant?.size ?? "").trim();
    const key = sku ? `sku:${sku}` : `size:${size.toLowerCase()}`;
    if ((!sku && !size) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ProductQuickView({
  product,
  initialVariantSku,
  flashDiscountPercent = 0,
  onClose,
  onActiveProductChange,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<{ y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const variants = useMemo(() => uniqueVariants(product), [product]);
  const initialIndex = initialVariantSku ? variants.findIndex((v) => v.sku === initialVariantSku) : 0;
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [quantity, setQuantity] = useState(1);
  const { addItem, isWholesale, getStockBySku, getQtyBySku } = useCartStore();

  useEffect(() => {
    setSelectedIndex(initialVariantSku ? variants.findIndex((v) => v.sku === initialVariantSku) : 0);
    setQuantity(1);
    setDragOffset(0);
    setDragging(false);
  }, [product?.id, initialVariantSku, variants]);

  useEffect(() => {
    if (!product) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [product, onClose]);

  const variant = variants[selectedIndex] ?? null;
  const sku = String(variant?.sku ?? "");
  const normalPrice = variant ? getVariantPrice(variant, isWholesale) : 0;
  const price = variant ? getVariantPrice(variant, isWholesale, flashDiscountPercent) : 0;
  const stock = sku ? getStockBySku(sku) : null;
  const inCart = sku ? getQtyBySku(sku) : 0;
  const remaining = stock === null ? null : Math.max(0, stock - inCart);
  const maximum = remaining === null ? 99 : Math.max(1, remaining);
  const canAdd = !!sku && (remaining === null || remaining > 0);
  const accent = product ? brandAccentFrom(product) : { ribbon: "#ee078e" };
  const image = product ? getProductImage(product as any, variant as any, selectedIndex) : "";

  const context = useMemo<ActiveCatalogProduct | null>(() => {
    if (!product) return null;
    return {
      productId: product.id,
      productName: product.name,
      brand: product.brand ?? "",
      variantId: variant?.sku ?? null,
      variantName: variant?.size ?? null,
      price,
      quantity,
    };
  }, [product, variant, price, quantity]);

  useEffect(() => onActiveProductChange?.(context), [context, onActiveProductChange]);

  if (!product || !context || typeof document === "undefined") return null;

  const addToCart = () => {
    if (!variant || !canAdd) return;
    addItem({
      productId: product.id,
      variant: variant as any,
      qty: quantity,
      flashDiscountPercent: !isWholesale && flashDiscountPercent > 0 ? flashDiscountPercent : undefined,
    });
    navigator?.vibrate?.(18);
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center md:items-center md:p-6" role="presentation">
      <button
        type="button"
        aria-label="Cerrar vista rápida"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        style={{ transform: `translateY(${dragOffset}px)`, transition: dragging ? "none" : "transform 200ms ease-out" }}
        className="relative flex max-h-[65dvh] w-full animate-[quickViewIn_.24s_ease-out] flex-col overflow-hidden rounded-t-[26px] border border-white/10 bg-[#0d0d0f] text-white shadow-[0_-18px_60px_rgba(0,0,0,.55)] md:max-h-[76vh] md:max-w-[760px] md:flex-row md:rounded-[26px]"
      >
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 z-20 flex h-11 w-28 -translate-x-1/2 touch-none justify-center pt-2 md:hidden"
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragStart.current = { y: event.clientY, time: event.timeStamp };
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (dragStart.current) setDragOffset(Math.max(0, event.clientY - dragStart.current.y));
          }}
          onPointerUp={(event) => {
            const start = dragStart.current;
            if (!start) return;
            const distance = Math.max(0, event.clientY - start.y);
            const velocity = distance / Math.max(1, event.timeStamp - start.time);
            dragStart.current = null;
            setDragging(false);
            setDragOffset(0);
            if (distance >= 100 || (distance >= 35 && velocity > 0.65)) onClose();
          }}
          onPointerCancel={() => { dragStart.current = null; setDragging(false); setDragOffset(0); }}
        ><span className="h-1 w-11 rounded-full bg-white/25" /></div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white/90 text-black shadow-sm transition active:scale-90"
        >
          <X size={20} />
        </button>

        <div
          className="relative flex min-h-[136px] shrink-0 items-center justify-center overflow-hidden bg-[#18181b] p-3 md:min-h-[480px] md:w-[40%] md:p-5"
          style={{ backgroundImage: `radial-gradient(circle at 50% 45%, ${accent.ribbon}22 0%, transparent 58%)` }}
        >
          <div className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-white" style={{ backgroundColor: accent.ribbon }}>
            {product.brand || "SH Rosario"}
          </div>
          <img
            src={image}
            alt={product.name}
            className="h-[108px] w-full drop-shadow-[0_16px_22px_rgba(0,0,0,.42)] object-contain md:h-[300px]"
            onError={(event) => { event.currentTarget.src = "/product/placeholder.png"; }}
          />
        </div>

        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-5 pb-[max(8px,env(safe-area-inset-bottom))] pt-3 md:px-6 md:py-6">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-white/45">{product.brand}</p>
          <h2 id="quick-view-title" className="mt-1 pr-10 text-xl font-black leading-tight md:text-[26px]">{product.name}</h2>


          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[22px] font-black">{price > 0 ? formatPrice(price) : "Consultar"}</span>
            {flashDiscountPercent > 0 && !isWholesale ? (
              <><span className="text-sm text-white/35 line-through">{formatPrice(normalPrice)}</span><span className="rounded-full bg-[#ee078e] px-2 py-1 text-[10px] font-black">-{flashDiscountPercent}%</span></>
            ) : null}
          </div>

          {variants.length ? (
            <div className="mt-3 md:mt-4">
              <div className="mb-2 flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-wide text-white/65">Presentación</span><span className="text-xs text-white/45">{variant?.size}</span></div>
              <div className="flex max-h-[116px] flex-wrap gap-2 overflow-y-auto pr-1">
                {variants.map((item, index) => {
                  const itemSku = String(item.sku ?? "");
                  const itemStock = itemSku ? getStockBySku(itemSku) : null;
                  const available = !!itemSku && (itemStock === null || itemStock > getQtyBySku(itemSku));
                  return <button key={`${itemSku}-${index}`} type="button" disabled={!available} onClick={() => { setSelectedIndex(index); setQuantity(1); }} className={["rounded-full border px-3 py-2 text-xs font-bold transition active:scale-95", index === selectedIndex ? "border-[#ee078e] bg-[#ee078e] text-white" : available ? "border-white/10 bg-white/[.07] text-white/70" : "cursor-not-allowed border-white/5 bg-white/[.03] text-white/20 line-through"].join(" ")}>{item.size || item.sku}</button>;
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.05] p-2 md:mt-4 md:p-2.5">
            <div><div className="text-sm font-bold">Cantidad</div><div className="text-[11px] text-white/45">{remaining === null ? "Disponibilidad a confirmar" : remaining > 0 ? `${remaining} disponibles` : "Sin stock"}</div></div>
            <div className="flex items-center gap-1 rounded-full bg-black/45 p-1">
              <button type="button" aria-label="Quitar una unidad" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="grid h-9 w-9 place-items-center rounded-full text-white/70 active:bg-white/10"><Minus size={16} /></button>
              <span className="w-8 text-center text-sm font-black">{quantity}</span>
              <button type="button" aria-label="Agregar una unidad" onClick={() => setQuantity((q) => Math.min(maximum, q + 1))} className="grid h-9 w-9 place-items-center rounded-full text-white active:bg-white/10"><Plus size={16} /></button>
            </div>
          </div>

          <button type="button" disabled={!canAdd} onClick={addToCart} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ee078e] px-5 py-3 text-sm font-black text-white shadow-[0_10px_30px_rgba(238,7,142,.22)] transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-35 md:mt-4 md:py-3.5"><ShoppingBag size={19} />Agregar {quantity > 1 ? `${quantity} al carrito` : "al carrito"}</button>


          <Link href={`/p/${product.id}`} onClick={onClose} className="mt-2 flex w-full items-center justify-center gap-1 py-2 text-xs font-bold text-white/55">Ver detalles <ChevronRight size={15} /></Link>
        </div>
      </section>
      <style jsx global>{`@keyframes quickViewIn { from { opacity: 0; transform: translateY(36px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </div>,
    document.body
  );
}

