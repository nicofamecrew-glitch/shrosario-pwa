"use client";

import { useRouter } from "next/navigation";

export default function MpFailurePage() {
  const router = useRouter();

  return (
    <main className="min-h-[calc(100dvh-96px)] px-4 pt-16 pb-6 flex flex-col">
      <h1 className="text-2xl font-bold text-white">Pago rechazado</h1>
      <p className="mt-2 text-white/60">
        No se pudo completar el pago. Probá de nuevo o usá otro medio dentro de Mercado Pago.
      </p>

      <div className="mt-6 rounded-2xl bg-white/5 p-4 text-sm text-white/70">
        Tip típico: tarjeta sin límite, datos mal cargados, o validación del banco.
      </div>

      <div className="mt-auto grid gap-3">
        <button
          onClick={() => router.push("/checkout/payment")}
          className="w-full rounded-xl bg-white px-4 py-3 font-bold text-black transition active:scale-[0.98]"
        >
          Reintentar pago
        </button>

        <button
          onClick={() => router.push("/")}
          className="w-full rounded-xl bg-white/10 px-4 py-3 font-bold text-white transition active:scale-[0.98]"
        >
          Volver al catálogo
        </button>
      </div>
    </main>
  );
}
