"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function MpSuccessClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("Confirmando pago...");

  useEffect(() => {
    const paymentId = sp.get("payment_id");
    if (!paymentId) {
      setMsg("No llegó payment_id desde Mercado Pago");
      return;
    }

    (async () => {
      try {
        const r = await fetch(`/api/mp/payment/${paymentId}`);
        const data = await r.json();

        if (!r.ok || !data?.ok) {
          setMsg(data?.error || "No se pudo confirmar el pago");
          return;
        }

        const status = data.payment?.status;

        if (status === "approved") {
          setMsg("Pago aprobado ✅");
          setTimeout(() => router.replace("/checkout/confirm"), 800);
          return;
        }

        setMsg(`Estado de pago: ${status ?? "desconocido"}`);
      } catch {
        setMsg("Error confirmando pago");
      }
    })();
  }, [sp, router]);

  return (
    <main className="px-4 pt-16 pb-24">
      <h1 className="text-xl font-bold">Pago</h1>
      <p className="mt-2 text-sm text-white/70">{msg}</p>
    </main>
  );
}
