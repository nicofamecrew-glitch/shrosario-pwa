"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";
import { useCatalogStore } from "@/lib/lib/catalogStore";
import { findVariant, getVariantPrice } from "@/lib/pricing";

const PROFILE_KEY = "sh_checkout_profile_v1";
const SHIPPING_KEY = "sh_shipping_v1";
const PAYMENT_KEY = "sh_payment_v1";
const DRAFT_ID_KEY = "sh_order_draft_id";

type ShippingSelection = {
  method: string;
  label: string;
  cost: number;
  notes?: string;
  updatedAt: string;
  total?: number;
};

function formatARS(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default function PaymentPage() {
  const router = useRouter();

  const items = useCartStore((s) => s.items);
  const isWholesale = useCartStore((s) => s.isWholesale);
  const byId = useCatalogStore((s) => s.byId);

  const [shipping, setShipping] = useState<ShippingSelection | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Total productos (fallback si shipping no trae total)
  const cartTotalFallback = useMemo(() => {
    return items.reduce((acc: number, it: any) => {
      const qty = Math.max(1, Number(it?.quantity ?? 1));
      const direct = Number(it?.unitPrice ?? it?.price ?? 0);

      if (Number.isFinite(direct) && direct > 0) return acc + direct * qty;

      const productId = String(it?.productId ?? "");
      const variantSku = String(it?.variantSku ?? it?.sku ?? "");
      const p = byId?.[productId];
      if (!p) return acc;

      const v = findVariant(p, variantSku);
      if (!v) return acc;

      const unit = Number(getVariantPrice(v, isWholesale) ?? 0);
      return acc + unit * qty;
    }, 0);
  }, [items, byId, isWholesale]);

  const cartTotal = Number(shipping?.total ?? cartTotalFallback);
  const shippingCost = Number(shipping?.cost ?? 0);
  const grandTotal = cartTotal + shippingCost;

  // Cargar envío desde localStorage
  useEffect(() => {
    try {
      const sraw = localStorage.getItem(SHIPPING_KEY);
      if (sraw) setShipping(JSON.parse(sraw));
    } catch {}
    setLoaded(true);
  }, []);

  // Validar pasos previos
  useEffect(() => {
    if (!loaded) return;
    try {
      const prof = localStorage.getItem(PROFILE_KEY);
      const ship = localStorage.getItem(SHIPPING_KEY);

      if (!prof) {
        router.replace("/checkout/confirm");
        return;
      }
      if (!ship) {
        router.replace("/checkout/shipping");
        return;
      }
    } catch {}
  }, [loaded, router]);

  // Guardar método pago elegido
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(PAYMENT_KEY, JSON.stringify({ method: "mp", updatedAt: new Date().toISOString() }));
    } catch {}
  }, [loaded]);

  // Carrito vacío
  if (!items?.length) {
    return (
      <main className="p-4">
        <h1 className="text-xl font-bold text-white">Pago</h1>
        <p className="mt-2 text-gray-300">Tu carrito está vacío.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 w-full rounded-xl bg-white/10 px-4 py-3 font-bold text-white transition active:scale-[0.98]"
        >
          Volver al catálogo
        </button>
      </main>
    );
  }

  async function goToMercadoPago() {
    if (submitting) return;

    if (!shipping) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Falta seleccionar envío.", type: "warn" },
        })
      );
      router.push("/checkout/shipping");
      return;
    }

    setSubmitting(true);

    try {
      const draftId = `DRAFT-${Date.now()}`;
      localStorage.setItem(DRAFT_ID_KEY, draftId);

      // Items para MP (precios reales)
      const itemsMP = items
        .map((it: any) => {
          const qty = Math.max(1, Number(it?.quantity ?? 1));
          const direct = Number(it?.unitPrice ?? it?.price ?? 0);

          let unit = direct;
          if (!Number.isFinite(unit) || unit <= 0) {
            const productId = String(it?.productId ?? "");
            const variantSku = String(it?.variantSku ?? it?.sku ?? "");
            const p = byId?.[productId];
            const v = p ? findVariant(p, variantSku) : null;
            unit = v ? Number(getVariantPrice(v, isWholesale) ?? 0) : 0;
          }

          return {
            productId: String(it?.productId ?? ""),
            title: it?.name || it?.title || it?.productId,
            quantity: qty,
            unit_price: unit,
          };
        })
        .filter((it) => Number(it.unit_price) > 0 && Number(it.quantity) > 0);

      // Sumamos envío como ítem
      if (shippingCost > 0) {
        itemsMP.push({
          productId: "shipping",
          title: shipping.label || "Envío",
          quantity: 1,
          unit_price: Number(shippingCost),
        });
      }

      console.log("itemsMP:", itemsMP);

      const res = await fetch("/api/mp/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 👇 Body LIMPIO: tu API arma back_urls y notification_url por su cuenta (con token)
        body: JSON.stringify({
          orderDraftId: draftId,
          items: itemsMP,
        }),
      });

      const data = await res.json();
      console.log("MP preference response:", data);

      // ✅ ESTE era el bug: no uses data.ok (tu API no lo devuelve)
      if (!res.ok) throw new Error(data?.error ?? "mp_preference_failed");
      if (!data?.init_point) throw new Error("missing_init_point");

      window.location.href = data.init_point;
    } catch (e) {
      console.error(e);
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: {
            message: "No se pudo iniciar Mercado Pago. Revisá MP_ACCESS_TOKEN y /api/mp/preference.",
            type: "warn",
          },
        })
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold text-white">Pago</h1>

      {/* Resumen */}
      <div className="mt-3 rounded-2xl bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Productos</span>
          <span className="font-bold text-white">{formatARS(cartTotal)}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-gray-300">Envío</span>
          <span className="font-bold text-white">{formatARS(shippingCost)}</span>
        </div>

        <div className="mt-3 h-px bg-white/10" />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-gray-200 font-bold">Total</span>
          <span className="font-bold text-white">{formatARS(grandTotal)}</span>
        </div>

        {shipping?.label && <div className="mt-2 text-sm text-gray-400">{shipping.label}</div>}
      </div>

      {/* Método de pago */}
      <div className="mt-4 rounded-2xl bg-white/5 p-4">
        <div className="font-bold text-white">Mercado Pago</div>
        <div className="mt-1 text-sm text-gray-300">Tarjeta, débito o dinero en cuenta.</div>
      </div>

      {/* Botones */}
      <div className="mt-4 rounded-2xl bg-white/5 p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/checkout/shipping")}
            className="rounded-xl bg-white/10 px-4 py-3 font-bold text-white transition active:scale-[0.98]"
          >
            Volver
          </button>

          <button
            onClick={goToMercadoPago}
            disabled={submitting}
            className="rounded-xl bg-white px-4 py-3 font-bold text-black transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Redirigiendo..." : "Pagar con Mercado Pago"}
          </button>
        </div>
      </div>
    </main>
  );
}
