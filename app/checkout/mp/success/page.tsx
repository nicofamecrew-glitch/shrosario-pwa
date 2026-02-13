"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function MpSuccessPage() {
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

        if (status === "pending") {
          setMsg("Pago pendiente ⏳");
          return;
        }

        setMsg("Pago rechazado ❌");
      } catch (e) {
        setMsg("Error confirmando el pago");
      }
    })();
  }, [sp, router]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Checkout</h1>
      <p>{msg}</p>
    </div>
  );
}
