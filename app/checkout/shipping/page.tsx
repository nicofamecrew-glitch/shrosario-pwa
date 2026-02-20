"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";
import { useCatalogStore } from "@/lib/lib/catalogStore";
import { findVariant, getVariantPrice } from "@/lib/pricing";
import LocationAutocomplete, { type ZipRow } from "@/components/shipping/LocationAutocomplete";

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
const [isTest, setIsTest] = useState(false);

useEffect(() => {
  setIsTest(new URLSearchParams(window.location.search).get("test") === "1");
}, []);


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

  const field =
    "mt-2 w-full h-12 rounded-xl border px-3 text-sm " +
    "border-black/10 bg-white text-black placeholder:text-black/40 " +
    "outline-none focus:border-black/20 focus:ring-2 focus:ring-[#ee078e]/30 " +
    "dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30 " +
    "dark:focus:border-white/20 dark:focus:ring-[#ee078e]/25";

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
  const [locationQuery, setLocationQuery] = useState("");
  const [picked, setPicked] = useState<ZipRow | null>(null);
   
 function addTestOption() {
  const opt: ShippingOption = {
    id: "test_1peso",
    label: "Envío Test $1",
    cost: 1,
  };

  setOptions((prev) => {
    // si ya existe, no lo agregamos
    if (prev.some((x) => x.id === opt.id)) return prev;
    // lo ponemos arriba de todo
    return [opt, ...prev];
  });

  setSelected(opt);
}


  const finalCost = useMemo(() => {
  if (!selected) return 0;
  return cartTotal >= freeShippingThreshold ? 0 : selected.cost;
}, [selected, cartTotal, freeShippingThreshold]);

if (process.env.NODE_ENV === "development") {
  console.log("Zipnova items", items.map((it: any) => ({
    variantSku: it?.variantSku, productId: it?.productId, qty: it?.quantity
  })));
}



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

const testOpt: ShippingOption = { id: "test_1peso", label: "Envío Test $1", cost: 1 };
const finalOpts = isTest ? [testOpt, ...opts] : opts;

setOptions(finalOpts);
setSelected(finalOpts[0] ?? null);;
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
  <main className={`p-4 ${pageBg}`}>

       <h1 className="text-xl font-bold">Envío</h1>

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
  <main className={`p-4 ${pageBg}`}>

      <h1 className="text-xl font-bold text-white">Envío</h1>

      <div className={`mt-3 ${card}`}>
  <div className="flex items-center justify-between">
    <div className={muted2}>Total del carrito</div>
    <div className="font-bold">{formatARS(cartTotal)}</div>
  </div>

  <div className={`mt-2 ${muted}`}>
    Envío gratis desde {formatARS(freeShippingThreshold)} (no aplica a retiro).
  </div>
</div>

{/* DESTINO (autocomplete) */}
<div className={`mt-4 ${card}`}>
  <label className={label}>Destino</label>


  <LocationAutocomplete
    value={locationQuery}
    onChange={(v) => {
      setLocationQuery(v);
      setPicked(null);
      // si vuelve a tipear, “desbloqueamos” el zipcode hasta que seleccione
      if (zipcode) setZipcode("");
    }}
    onSelect={(row) => {
      setPicked(row);
      setZipcode(row.zipcode);
      setLocationQuery(`${row.city} (${row.state}) · CP ${row.zipcode}`);
      setTimeout(() => fetchZipnovaOptions(), 0);
    }}
    placeholder="Buscar por localidad o CP (ej: 2500 o Cañada)"
  />

  {picked && (
 <div className="mt-2 text-xs text-black/60 dark:text-white/70">
  Seleccionado: <span className="font-semibold text-black dark:text-white">{picked.city}</span>,{" "}
  {picked.state} — CP <span className="font-semibold text-black dark:text-white">{picked.zipcode}</span>
</div>

  )}

  <button
    onClick={fetchZipnovaOptions}
    disabled={!zipcode.trim()}
    className={`mt-3 ${btn}`}

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
          className={[
  "w-full rounded-2xl border p-4 text-left transition active:scale-[0.98]",
  "border-black/10 bg-white hover:bg-black/5",
  "dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
  selected?.id === opt.id ? "ring-2 ring-[#ee078e]/30" : "",
].join(" ")}

          >
            <div className="font-bold text-black dark:text-white">{opt.label}</div>
<div className="text-sm text-black/60 dark:text-white/70">

              {cartTotal >= freeShippingThreshold ? formatARS(0) : formatARS(opt.cost)}
            </div>
          </button>
        ))}
      </div>

      {/* Observaciones */}
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


      {/* Resumen y continuar */}
     <div className={`mt-4 ${card}`}>
  <div className="flex items-center justify-between">
    <div className={muted2}>Envío</div>
    <div className="font-bold">
      {selected ? formatARS(finalCost) : "-"}
    </div>
  </div>

  <div className="mt-4 grid grid-cols-2 gap-3">
    <button onClick={() => router.push("/cart")} className={btn}>
      Volver
    </button>

    <button
      onClick={saveAndContinue}
      disabled={!selected}
      className={btn}
    >
      Continuar
    </button>
  </div>
</div>

    </main>
  );
}
