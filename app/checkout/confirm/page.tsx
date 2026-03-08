"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";
import type { Product, Variant } from "@/lib/types";
import products from "@/data/products.json";

const PROFILE_KEY = "sh_checkout_profile_v1";
const DRAFT_KEY = "sh_draft_id_v1";
const SHIPPING_KEY = "sh_shipping_v1";
type ToastType = "success" | "error" | "warn";

function toast(message: string, type: ToastType) {
  window.dispatchEvent(new CustomEvent("toast", { detail: { message, type } }));
}
function getDraftId() {
  try {
    const v = localStorage.getItem(DRAFT_KEY);
    return v && v.startsWith("DRAFT-") ? v : "";
  } catch {
    return "";
  }
}

function createFreshDraftId() {
  const created = `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  localStorage.setItem(DRAFT_KEY, created);
  return created;
}

function readShippingSelection(): any | null {
  try {
    const raw = localStorage.getItem(SHIPPING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
interface OrderItem {
  productId: string;
  sku: string;
  qty: number;
  unitPrice: number;
  name: string;
  brand?: string;
  size?: string;
}

interface Order {
  orderId: string;
  items: OrderItem[];
  priceMode: "minorista" | "mayorista";
  fullName: string;
  phone: string;
  city: string;
  address: string;
  notes?: string;
  shipping?: any | null;
}

export default function ConfirmOrderPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 🔒 anti doble disparo inmediato (no depende del state)
  const sendingRef = useRef(false);

  // 1) cargar perfil guardado
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.fullName === "string") setFullName(p.fullName);
        if (typeof p.phone === "string") setPhone(p.phone);
        if (typeof p.city === "string") setCity(p.city);
        if (typeof p.address === "string") setAddress(p.address);
        if (typeof p.notes === "string") setNotes(p.notes);
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // 2) guardar perfil mientras escribe
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          address: address.trim(),
          notes: notes.trim(),
        })
      );
    } catch {
      // ignore
    }
  }, [loaded, fullName, phone, city, address, notes]);

  const buildOrderItem = (
    product: Product,
    variant: Variant,
    qty: number,
    priceMode: "minorista" | "mayorista"
  ): OrderItem => {
    const unitPrice =
      priceMode === "mayorista" ? variant.priceWholesale : variant.priceRetail;

    return {
      productId: product.id,
      sku: variant?.sku ?? "",
      qty,
      unitPrice,
      name: product.name,
      brand: product.brand ?? "",
      size: variant.size,
    };
  };

  const handleConfirm = async () => {
    // 🔒 anti doble click/tap rápido
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSubmitting(true);

    try {
      const priceMode: "minorista" | "mayorista" = "minorista";

      // Validaciones básicas de perfil
     if (!fullName.trim() || !phone.trim() || !city.trim() || !address.trim()) {
  toast("Completá nombre, teléfono, ciudad y dirección.", "warn");
  return;
} 

      // ✅ Filtrar solo items válidos (con variant y precio)
      const validItems = items.filter(
        (i: any) =>
          i?.variant &&
          ((i.variant.priceRetail ?? 0) > 0 || (i.variant.priceWholesale ?? 0) > 0)
      );

      if (validItems.length === 0) {
        toast("No hay productos válidos para confirmar", "error");
        return;
      }

      // ✅ Construcción de ítems con precios correctos
      const orderItems: OrderItem[] = validItems.map((it: any) => {
        const product = (products as Product[]).find((p) => p.id === it.productId);
        if (!product) throw new Error(`Producto no encontrado: ${it.productId}`);
        return buildOrderItem(product, it.variant as Variant, it.qty ?? 1, priceMode);
      });

      // ✅ Corte por lo sano: no permitas SKU vacío o precio 0
      const bad = orderItems.find((x) => !x.sku || !x.unitPrice || x.unitPrice <= 0);
      if (bad) {
        throw new Error("Hay un producto sin SKU o precio válido. No se puede confirmar.");
      }
      const draftId = createFreshDraftId();
      const shippingSel = readShippingSelection();
      
      const order: Order = {
  orderId: draftId, // ✅ este es el Numero de orden
  items: orderItems,
  priceMode,
  fullName: fullName.trim(),
  phone: phone.trim(),
  city: city.trim(),
  address: address.trim(),
  notes: notes.trim(),

  // ✅ opcional: pegamos envío seleccionado si existe
  shipping: shippingSel
    ? {
        method: shippingSel.method,
        label: shippingSel.label,
        cost: shippingSel.cost,
        zipcode: shippingSel.zipcode,
        notes: shippingSel.notes,
        updatedAt: shippingSel.updatedAt,
      }
    : null,
};

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Error guardando pedido (${res.status}). ${txt}`.trim());
      }

      router.push("/checkout/shipping");
    } catch (e: any) {
      toast(e?.message ?? "Error confirmando pedido", "error");
    } finally {
      setSubmitting(false);
      sendingRef.current = false;
    }
  };

 return (
  <main
    className={[
      "min-h-[calc(100dvh-96px)] px-4 pt-16 pb-6 flex flex-col",
      "bg-[#f6f7f8] text-black",
      "dark:bg-black dark:text-white",
    ].join(" ")}
  >
    {/* HEADER */}
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-bold">Confirmar pedido</h1>
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
      >
        Volver
      </button>
    </div>

    <p className="mt-1 text-sm text-black/60 dark:text-white/60">
      Usamos estos datos solo para coordinar la entrega.
    </p>

    {/* FORM */}
    <div className="mt-6 flex-1 overflow-y-auto space-y-4 pr-1 rounded-2xl border p-4 border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
      {/* Nombre y apellido */}
      <div>
        <label className="text-xs text-black/60 dark:text-white/60">
          Nombre y apellido *
        </label>
        <input
          className="mt-1 w-full rounded-xl border p-3 text-sm border-black/10 bg-white text-black placeholder:text-black/40 outline-none focus:border-black/20 focus:ring-2 focus:ring-[#ee078e]/30 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/20 dark:focus:ring-[#ee078e]/25"
          placeholder="Juan Pérez"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
      </div>

      {/* Teléfono */}
      <div>
        <label className="text-xs text-black/60 dark:text-white/60">
          Teléfono *
        </label>
        <input
          className="mt-1 w-full rounded-xl border p-3 text-sm border-black/10 bg-white text-black placeholder:text-black/40 outline-none focus:border-black/20 focus:ring-2 focus:ring-[#ee078e]/30 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/20 dark:focus:ring-[#ee078e]/25"
          placeholder="341 555 1234"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />
      </div>

      {/* Ciudad */}
      <div>
        <label className="text-xs text-black/60 dark:text-white/60">
          Ciudad *
        </label>
        <input
          className="mt-1 w-full rounded-xl border p-3 text-sm border-black/10 bg-white text-black placeholder:text-black/40 outline-none focus:border-black/20 focus:ring-2 focus:ring-[#ee078e]/30 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/20 dark:focus:ring-[#ee078e]/25"
          placeholder="Rosario"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      {/* Dirección */}
      <div>
        <label className="text-xs text-black/60 dark:text-white/60">
          Dirección / zona *
        </label>
        <input
          className="mt-1 w-full rounded-xl border p-3 text-sm border-black/10 bg-white text-black placeholder:text-black/40 outline-none focus:border-black/20 focus:ring-2 focus:ring-[#ee078e]/30 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/20 dark:focus:ring-[#ee078e]/25"
          placeholder="San Martín 1234, barrio centro"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {/* Observaciones */}
      <div>
        <label className="text-xs text-black/60 dark:text-white/60">
          Observaciones
        </label>
        <textarea
          rows={3}
          className="mt-1 w-full h-12 rounded-xl border px-4 text-sm border-black/10 bg-white text-black placeholder:text-black/40 outline-none focus:border-black/20 focus:ring-2 focus:ring-[#ee078e]/30 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30 dark:focus:border-white/20 dark:focus:ring-[#ee078e]/25 resize-none"
          placeholder="Horarios, referencias, transporte preferido, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>

    {/* CTA */}
    <div className="mt-4">
      <button
        type="button"
        disabled={submitting}
        className="w-full rounded-full py-3 font-bold bg-[#ee078e] text-white shadow-none outline-none ring-0 border-0 focus-visible:outline-none focus-visible:ring-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={handleConfirm}
      >
        {submitting ? "Confirmando…" : "Confirmar pedido"}
      </button>
    </div>
  </main>
);
}