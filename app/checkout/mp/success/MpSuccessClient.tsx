"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type MPResp =
  | { ok: true; payment: any }
  | { ok: false; error?: string; status?: number };

type View =
  | "checking"
  | "approved"
  | "pending"
  | "rejected"
  | "error"
  | "missing";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
      {children}
    </span>
  );
}

export default function MpSuccessClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const paymentId = useMemo(
    () => String(sp.get("payment_id") || "").trim(),
    [sp]
  );

  const [view, setView] = useState<View>("checking");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!paymentId) {
      setView("missing");
      setError("No llegó el identificador del pago (payment_id).");
      return;
    }

    let cancelled = false;

    const started = Date.now();
    const intervalMs = 1200;
    const maxMs = 12000;

    async function tick() {
      try {
      const r = await fetch(`/api/mp/payment/${encodeURIComponent(paymentId)}`, {
  cache: "no-store",
});

        const data = (await r.json().catch(() => null)) as MPResp | null;
        if (cancelled) return;

        if (!data || (data as any)?.ok === undefined) {
          throw new Error("Respuesta inválida");
        }

        if (!data.ok) {
          setView("error");
          setError(data.error || "No se pudo verificar el pago.");
        } else {
          const st = String(data.payment?.status || "");
          setStatus(st);

          if (st === "approved") {
            setView("approved");
            setTimeout(() => {
              if (!cancelled) router.replace("/checkout/confirm");
            }, 900);
            return;
          }

          if (st === "pending" || st === "in_process") {
            setView("pending");
          } else if (st === "rejected" || st === "cancelled") {
            setView("rejected");
          } else {
            setView("pending");
          }

          const done =
            st === "approved" || st === "rejected" || st === "cancelled";
          const elapsed = Date.now() - started;
          if (done || elapsed >= maxMs) return;
        }
      } catch {
        if (cancelled) return;
        setView("error");
        setError(
          "No pudimos verificar el pago todavía. Probá recargar en unos segundos."
        );

        const elapsed = Date.now() - started;
        if (elapsed >= maxMs) return;
      }

      setTimeout(tick, intervalMs);
    }

    // reset + start
    setView("checking");
    setError("");
    setStatus("");
    tick();

    return () => {
      cancelled = true;
    };
  }, [paymentId, router]);

  const title =
    view === "approved"
      ? "Pago aprobado"
      : view === "pending"
      ? "Pago en proceso"
      : view === "rejected"
      ? "Pago rechazado o cancelado"
      : view === "missing"
      ? "Pago recibido"
      : view === "error"
      ? "No pudimos verificar el pago"
      : "Confirmando tu pago…";

  const desc =
    view === "approved"
      ? "Listo. Tu pedido quedó confirmado."
      : view === "pending"
      ? "Tu pago está pendiente. Puede tardar un rato en acreditarse."
      : view === "rejected"
      ? "Podés intentar nuevamente con otro medio de pago."
      : view === "missing"
      ? error
      : view === "error"
      ? error
      : "Esto puede tardar unos segundos. No cierres esta pestaña.";

  return (
    <main className="px-4 pt-16 pb-24">
      <div className="mx-auto max-w-lg space-y-4">
        <Badge>Mercado Pago</Badge>

        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-white/70">{desc}</p>

        <Card>
          <div className="space-y-2 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span>Payment ID</span>
              <span className="font-mono text-white">{paymentId || "-"}</span>
            </div>

            {status ? (
              <div className="flex items-center justify-between">
                <span>Estado</span>
                <span className="font-semibold text-white">{status}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {view === "approved" ? (
              <Link
                className="rounded-xl bg-white text-black px-4 py-2 text-center font-semibold"
                href="/checkout/confirm"
              >
                Continuar
              </Link>
            ) : (
              <Link
                className="rounded-xl bg-white text-black px-4 py-2 text-center font-semibold"
                href="/checkout/payment"
              >
                Volver al checkout
              </Link>
            )}

            <Link
              className="rounded-xl border border-white/15 px-4 py-2 text-center font-semibold"
              href="/"
            >
              Volver al inicio
            </Link>

            {(view === "pending" || view === "error") && (
              <button
                type="button"
                className="rounded-xl border border-white/15 px-4 py-2 text-center font-semibold"
                onClick={() => window.location.reload()}
              >
                Reintentar verificación
              </button>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
