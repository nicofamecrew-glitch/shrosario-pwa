"use client";

import { useRouter } from "next/navigation";

export default function MpPendingPage() {
  const router = useRouter();

  return (
    <main className="min-h-[calc(100dvh-96px)] px-4 pt-16 pb-6 flex flex-col">
      <h1 className="text-2xl font-bold text-white">Pago pendiente</h1>
      <p className="mt-2 text-white/60">
        El pago todavía no se acreditó. Cuando se confirme, el pedido aparecerá en “Mis pedidos”.
      </p>

      <div className="mt-6 rounded-2xl bg-white/5 p-4 text-sm text-white/70">
        Esto puede pasar por validaciones del banco o demora de acreditación.
      </div>

      <div className="mt-auto grid gap-3">
        <button
          onClick={() => router.push("/account/orders")}
          className="w-full rounded-xl bg-white px-4 py-3 font-bold text-black transition active:scale-[0.98]"
        >
          Ver Mis pedidos
        </button>

        <button
          onClick={() => router.push("/checkout/payment")}
          className="w-full rounded-xl bg-white/10 px-4 py-3 font-bold text-white transition active:scale-[0.98]"
        >
          Volver a pagos
        </button>
      </div>
    </main>
  );
}
