"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";
import { useCatalogStore } from "@/lib/lib/catalogStore";
import { findVariant, getVariantPrice } from "@/lib/pricing";
import LocationAutocomplete, { type ZipRow } from "@/components/shipping/LocationAutocomplete";

const STORAGE_KEY = "sh_shipping_v1";
const DRAFT_KEY = "sh_draft_id_v1";

type ShippingOption = {
  id: string;
  label: string;
  cost: number;
};

type ShippingSelection = {
  orderId: string;
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

  const pageBg = "bg-[#f6f7f8] text-black dark:bg-black dark:text-white";

  const card =
    "rounded-2xl border p-4 shadow-sm " +
    "border-black/10 bg-white " +
    "dark:border-white/10 dark:bg-white/5 dark:shadow-none";

  const label = "text-sm font-bold text-black dark:text-white";
  const muted = "text-sm text-black/60 dark:text-white/60";
  const muted2 = "text-black/60 dark:text-white/60";

  const textarea =
    "mt-2 w-full rounded-xl border p-3 text-sm " +
    "border-black/10 bg-white text-black placeholder:text-black/40 " +
    "outline-none focus:border-black/20 focus:ring-2 focus:ring-[#ee078e]/30 " +
    "dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30 " +
    "dark:focus:border-white/20 dark:focus:ring-[#ee078e]/25";

  const btn =
    "w-full rounded-xl px-4 py-3 font-bold transition active:scale-[0.99] " +
    "bg-black/5 text-black hover:bg-black/10 disabled:opacity-40 " +
    "dark:bg-white/10 dark:text-white dark:hover:bg-white/15";

  const pickupOption: ShippingOption = {
    id: "pickup_local",
    label: "Retiro en local",
    cost: 0,
  };

  const freeShippingThreshold = 80000;

  const cartTotal = useMemo(() => {
    return items.reduce((acc: number, it: any) => {
      const qty = Number(it?.quantity ?? 1);
      const direct = Number(it?.unitPrice ?? it?.price ?? 0);

      if (Number.isFinite(direct) && direct > 0) {
        return acc + direct * qty;
      }

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

  const draftId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const v = localStorage.getItem(DRAFT_KEY) || "";
    return v.startsWith("DRAFT-") ? v : "";
  }, []);

  const [zipcode, setZipcode] = useState("");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selected, setSelected] = useState<ShippingOption | null>(null);
  const [notes, setNotes] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [picked, setPicked] = useState<ZipRow | null>(null);

  const finalCost = useMemo(() => {
    if (!selected) return 0;
    if (selected.id === pickupOption.id) return 0;
    return cartTotal >= freeShippingThreshold ? 0 : selected.cost;
  }, [selected, cartTotal]);

  async function fetchZipnovaOptions(explicitZipcode?: string) {
    try {
      const cp = (explicitZipcode ?? zipcode).trim();
      if (!cp) return;

      const res = await fetch("/api/zipnova/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftId,
          destination: { zipcode: cp },
          declared_value: Math.round(cartTotal),
          items: items.map((it: any) => ({
            sku: String(it?.variantSku ?? it?.sku ?? it?.id ?? it?.productId ?? "")
              .trim()
              .toUpperCase(),
            qty: Number(it?.quantity ?? 1),
          })),
        }),
      });

      const data = await res.json();

      const opts: ShippingOption[] = (data?.options ?? []).map((o: any, idx: number) => ({
        id: o.id ?? `opt-${idx}`,
        label: o.name ?? "Opción de envío",
        cost: Number(o.price ?? 0),
      }));

      setOptions(opts);

      setSelected((prev) => {
        if (!prev) return opts[0] ?? null;
        if (prev.id === pickupOption.id) return prev;

        const stillExists = opts.find((o) => o.id === prev.id);
        return stillExists ?? opts[0] ?? null;
      });
    } catch (err) {
      console.error("Error cotizando Zipnova:", err);
      setOptions([]);
    }
  }

  function saveAndContinue() {
    if (!draftId) {
      alert("Falta el número de orden (DRAFT). Volvé a Confirmar pedido.");
      router.push("/checkout/confirm");
      return;
    }

    if (!selected) return;

    const payload: ShippingSelection = {
      orderId: draftId,
      method: selected.id,
      label: selected.label,
      cost: finalCost,
      notes: notes?.trim() ? notes.trim() : undefined,
      updatedAt: new Date().toISOString(),
      total: cartTotal,
      zipcode: selected.id === pickupOption.id ? "" : zipcode,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    router.push("/checkout/payment");
  }

  const optionBtn = (active: boolean) =>
    [
      "w-full rounded-2xl border p-4 text-left transition active:scale-[0.98]",
      "border-black/10 bg-white hover:bg-black/5",
      "dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
      active ? "ring-2 ring-[#ee078e]/30" : "",
    ].join(" ");

  if (!items?.length) {
    return (
      <main className={`p-4 ${pageBg}`}>
        <h1 className="text-xl font-bold">Envío</h1>
        <p className="mt-2 text-black/60 dark:text-white/60">Tu carrito está vacío.</p>
        <button onClick={() => router.push("/")} className={`mt-4 ${btn}`}>
          Volver al catálogo
        </button>
      </main>
    );
  }

  return (
    <main className={`p-4 ${pageBg}`}>
      <h1 className="text-xl font-bold">Envío</h1>

      {/* TOTAL */}
      <div className={`mt-4 ${card}`}>
        <div className="flex items-center justify-between">
          <div className={muted2}>Total del carrito</div>
          <div className="font-bold">{formatARS(cartTotal)}</div>
        </div>

        <div className={`mt-2 ${muted}`}>
          Envío a domicilio gratis desde {formatARS(freeShippingThreshold)}.
        </div>

        <div className={`mt-1 ${muted}`}>Retiro en local: gratis.</div>
      </div>

      {/* DESTINO */}
      <div className={`mt-4 ${card}`}>
        <label className={label}>Destino</label>

        <LocationAutocomplete
          value={locationQuery}
          onChange={(v) => {
            setLocationQuery(v);
            setPicked(null);
            if (zipcode) setZipcode("");
          }}
          onSelect={(row) => {
            setPicked(row);
            setZipcode(row.zipcode);
            setLocationQuery(`${row.city} (${row.state}) · CP ${row.zipcode}`);
            setTimeout(() => fetchZipnovaOptions(row.zipcode), 0);
          }}
          placeholder="Buscar por localidad o CP (ej: 2500 o Cañada)"
        />

        {picked && (
          <div className="mt-2 text-xs text-black/60 dark:text-white/70">
            Seleccionado:{" "}
            <span className="font-semibold text-black dark:text-white">{picked.city}</span>,{" "}
            {picked.state} — CP{" "}
            <span className="font-semibold text-black dark:text-white">{picked.zipcode}</span>
          </div>
        )}

        <button
          onClick={() => fetchZipnovaOptions()}
          disabled={!zipcode.trim()}
          className={`mt-3 ${btn}`}
        >
          Cotizar envíos
        </button>
      </div>

      {/* OPCIONES */}
      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={() => setSelected(pickupOption)}
          className={optionBtn(selected?.id === pickupOption.id)}
        >
          <div className="font-bold text-black dark:text-white">Retiro en local</div>
          <div className="text-sm text-black/60 dark:text-white/70">{formatARS(0)}</div>
        </button>

        {options.length === 0 && (
          <div className={muted}>
            No hay envíos cotizados todavía. Podés ingresar un código postal o elegir retiro en local.
          </div>
        )}

        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt)}
            className={optionBtn(selected?.id === opt.id)}
          >
            <div className="font-bold text-black dark:text-white">{opt.label}</div>
            <div className="text-sm text-black/60 dark:text-white/70">
              {cartTotal >= freeShippingThreshold ? formatARS(0) : formatARS(opt.cost)}
            </div>
          </button>
        ))}
      </div>

      {/* OBSERVACIONES */}
      <div className={`mt-4 ${card}`}>
        <label className={label}>Observaciones (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Entregar de 9 a 18 / Dejar en mostrador / Llamar antes"
          className={textarea}
          rows={3}
        />
      </div>

      {/* RESUMEN + CONTINUAR */}
      <div className={`mt-4 ${card}`}>
        <div className="flex items-center justify-between">
          <div className={muted2}>Envío</div>
          <div className="font-bold">{selected ? formatARS(finalCost) : "-"}</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => router.push("/cart")} className={btn}>
            Volver
          </button>

          <button onClick={saveAndContinue} disabled={!selected} className={btn}>
            Continuar
          </button>
        </div>
      </div>
    </main>
  );
}