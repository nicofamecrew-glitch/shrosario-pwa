"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";
import { useCatalogStore } from "@/lib/lib/catalogStore";
import { findVariant, getVariantPrice } from "@/lib/pricing";

const STORAGE_KEY = "sh_shipping_v1";

type ShippingOption = {
  id: string;
  label: string;
  cost: number;
};

type ShippingSelection = {
  method: string;
  label: string;
  cost: number;
  notes?: string;
  updatedAt: string;
  total?: number;
  zipcode: string;
};

function formatARS(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default function ShippingPage() {
  const router = useRouter();

  const items = useCartStore((s) => s.items);
  const isWholesale = useCartStore((s) => s.isWholesale);
  const byId = useCatalogStore((s) => s.byId);

  const cartTotal = useMemo(() => {
    return items.reduce((acc: number, it: any) => {
      const qty = Number(it?.quantity ?? 1);
      const direct = Number(it?.unitPrice ?? it?.price ?? 0);
      if (Number.isFinite(direct) && direct > 0) return acc + direct * qty;

      const productId = String(it?.productId ?? "");
      const variantSku = String(it?.variantSku ?? "");
      const p = byId?.[productId];
      if (!p) return acc;

      const v = findVariant(p, variantSku);
      if (!v) return acc;

      const unit = Number(getVariantPrice(v, isWholesale) ?? 0);
      return acc + unit * qty;
    }, 0);
  }, [items, byId, isWholesale]);

  const freeShippingThreshold = 80000;

  const [zipcode, setZipcode] = useState("");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selected, setSelected] = useState<ShippingOption | null>(null);
  const [notes, setNotes] = useState("");

  const finalCost = useMemo(() => {
  if (!selected) return 0;
  return cartTotal >= freeShippingThreshold ? 0 : selected.cost;
}, [selected, cartTotal, freeShippingThreshold]);

 console.log(
  "Zipnova items",
  items.map((it: any) => ({ variantSku: it?.variantSku, productId: it?.productId, qty: it?.quantity }))
);


  async function fetchZipnovaOptions() {
  try {
    if (!zipcode.trim()) return;

    const res = await fetch("/api/zipnova/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        destination: { zipcode: zipcode.trim() },
        declared_value: Math.round(cartTotal), // <- era total
        items: items.map((it: any) => ({
          // Zipnova espera SKU + qty
          sku: String(it?.variantSku ?? it?.sku ?? it?.id ?? it?.productId ?? "")
            .trim()
            .toUpperCase(),
          qty: Number(it?.quantity ?? 1),
        })),
      }),
    });

    const data = await res.json();
    console.log("Respuesta Zipnova:", data);

    const opts = (data?.options ?? []).map((o: any, idx: number) => ({
      id: o.id ?? `opt-${idx}`,
      label: o.name ?? "Opción de envío",
      cost: Number(o.price ?? 0),
    }));

    setOptions(opts);
    setSelected(opts[0] ?? null);
  } catch (err) {
    console.error("Error cotizando Zipnova:", err);
    setOptions([]);
    setSelected(null);
  }
}

  function saveAndContinue() {
    if (!selected) return;
    const payload: ShippingSelection = {
      method: selected.id,
      label: selected.label,
      cost: finalCost,
      notes: notes?.trim() ? notes.trim() : undefined,
      updatedAt: new Date().toISOString(),
      total: cartTotal,
      zipcode,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    router.push("/checkout/payment");
  }

  if (!items?.length) {
    return (
      <main className="p-4">
        <h1 className="text-xl font-bold text-white">Envíos</h1>
        <p className="mt-2 text-gray-300">Tu carrito está vacío.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 w-full rounded-xl bg-white/10 px-4 py-3 font-bold text-white"
        >
          Volver al catálogo
        </button>
      </main>
    );
  }

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold text-white">Envío</h1>

      <div className="mt-3 rounded-2xl bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-gray-300">Total del carrito</div>
          <div className="font-bold text-white">{formatARS(cartTotal)}</div>
        </div>
        <div className="mt-2 text-sm text-gray-400">
          Envío gratis desde {formatARS(freeShippingThreshold)} (no aplica a retiro).
        </div>
      </div>

      {/* Campo para código postal */}
      <div className="mt-4 rounded-2xl bg-white/5 p-4">
        <label className="text-sm font-bold text-white">Código Postal destino</label>
        <input
          type="text"
          value={zipcode}
          onChange={(e) => setZipcode(e.target.value)}
          placeholder="Ej: 3300"
          className="mt-2 w-full rounded-xl bg-black/40 p-3 text-white outline-none"
        />
        <button
          onClick={fetchZipnovaOptions}
          className="mt-3 w-full rounded-xl bg-white/10 px-4 py-3 font-bold text-white"
        >
          Cotizar envíos
        </button>
      </div>

      {/* Opciones dinámicas */}
      <div className="mt-4 space-y-3">
        {options.length === 0 && (
          <div className="text-gray-400 text-sm">No hay opciones aún. Ingresá un código postal y cotizá.</div>
        )}
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt)}
            className={`w-full rounded-2xl p-4 text-left transition active:scale-[0.98] hover:bg-white/10 ${
              selected?.id === opt.id ? "bg-white/10" : "bg-white/5"
            }`}
          >
            <div className="font-bold text-white">{opt.label}</div>
            <div className="text-sm text-gray-300">
              {cartTotal >= freeShippingThreshold ? formatARS(0) : formatARS(opt.cost)}
            </div>
          </button>
        ))}
      </div>

      {/* Observaciones */}
      <div className="mt-4 rounded-2xl bg-white/5 p-4">
        <label className="text-sm font-bold text-white">Observaciones (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Entregar de 9 a 18 / Dejar en mostrador / Llamar antes"
          className="mt-2 w-full rounded-xl bg-black/40 p-3 text-white outline-none"
          rows={3}
        />
      </div>

      {/* Resumen y continuar */}
      <div className="mt-4 rounded-2xl bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-gray-300">Envío</div>
          <div className="font-bold text-white">
            {selected ? formatARS(finalCost) : "-"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/cart")}
            className="rounded-xl bg-white/10 px-4 py-3 font-bold text-white"
          >
            Volver
          </button>
          <button
            onClick={saveAndContinue}
            disabled={!selected}
            className="rounded-xl bg-white/10 px-4 py-3 font-bold text-white"
          >
            Continuar
          </button>
        </div>
      </div>
    </main>
  );
}
