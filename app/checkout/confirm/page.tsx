"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";

const PROFILE_KEY = "sh_checkout_profile_v1";

export default function ConfirmOrderPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);

  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 1) cargar al entrar (una sola vez)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.phone === "string") setPhone(p.phone);
        if (typeof p.city === "string") setCity(p.city);
        if (typeof p.address === "string") setAddress(p.address);
        if (typeof p.notes === "string") setNotes(p.notes);
      }
    } catch {}
    setLoaded(true);
  }, []);

  // 2) guardar mientras escribe (solo después de cargar)
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          phone: phone.trim(),
          city: city.trim(),
          address: address.trim(),
          notes: notes.trim(),
        })
      );
    } catch {}
  }, [loaded, phone, city, address, notes]);

  return (
    <main className="min-h-[calc(100dvh-96px)] px-4 pt-16 pb-6 flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Confirmar pedido</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-white/60 hover:text-white"
        >
          Volver
        </button>
      </div>

      <p className="mt-1 text-sm text-white/60">
        Usamos estos datos solo para coordinar la entrega.
      </p>

      {/* FORM (solo scrollea si no entra en pantalla) */}
      <div className="mt-6 flex-1 overflow-y-auto space-y-4 pr-1">
        <div>
          <label className="text-xs text-white/60">Teléfono *</label>
          <input
            className="mt-1 w-full rounded-xl bg-black border border-white/10 p-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
            placeholder="341 555 1234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
        </div>

        <div>
          <label className="text-xs text-white/60">Ciudad *</label>
          <input
            className="mt-1 w-full rounded-xl bg-black border border-white/10 p-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
            placeholder="Rosario"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-white/60">Dirección / zona *</label>
          <input
            className="mt-1 w-full rounded-xl bg-black border border-white/10 p-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
            placeholder="San Martín 1234, barrio centro"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-white/60">Observaciones</label>
          <textarea
            className="mt-1 w-full min-h-[90px] rounded-xl bg-black border border-white/10 p-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
            placeholder="Horarios, referencias, transporte preferido, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* CTA — EN EL FLUJO, NO FIXED */}
      <div className="mt-4">
        <button
          type="button"
          disabled={submitting}
          className="w-full rounded-full py-3 font-bold bg-[#ee078e] text-white
                     shadow-none outline-none ring-0 border-0
                     focus-visible:outline-none focus-visible:ring-0
                     active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => {
            if (submitting) return;

            if (!items.length) {
              window.dispatchEvent(
                new CustomEvent("toast", {
                  detail: { message: "El carrito está vacío.", type: "warn" },
                })
              );
              return;
            }

            if (!phone.trim() || !city.trim() || !address.trim()) {
              window.dispatchEvent(
                new CustomEvent("toast", {
                  detail: {
                    message: "Completá teléfono, ciudad y dirección.",
                    type: "warn",
                  },
                })
              );
              return;
            }

            // ✅ no creamos pedido todavía: solo seguimos el flujo
            router.push("/checkout/shipping");
          }}
        >
          {submitting ? "Continuando…" : "Continuar a envío"}
        </button>
      </div>
    </main>
  );
}
