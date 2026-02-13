"use client";

import { useState } from "react";

export default function MpDebugPage() {
  const [pref, setPref] = useState<any>(null);
  const [paymentId, setPaymentId] = useState("");
  const [payment, setPayment] = useState<any>(null);
  const [err, setErr] = useState<any>(null);

  async function createPref() {
    setErr(null);
    setPayment(null);
    const r = await fetch("/api/mp/preference/test", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) return setErr(j);
    setPref(j);
  }

  async function checkPayment() {
    setErr(null);
    setPayment(null);
    const r = await fetch(`/api/mp/payment/${paymentId}`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) return setErr(j);
    setPayment(j);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Debug Mercado Pago</h1>

      <button
        onClick={createPref}
        className="px-4 py-2 rounded bg-black text-white"
      >
        1) Crear preferencia (test)
      </button>

      {pref?.ok && (
        <div className="p-4 rounded border space-y-2">
          <div><b>preferenceId:</b> {pref.preferenceId}</div>
          <div><b>external_reference:</b> {pref.external_reference}</div>

          <div className="flex gap-2 flex-wrap">
            <a className="underline" href={pref.init_point} target="_blank">
              Abrir init_point (REAL)
            </a>
            <a className="underline" href={pref.sandbox_init_point} target="_blank">
              Abrir sandbox_init_point (SANDBOX)
            </a>
          </div>
        </div>
      )}

      <div className="p-4 rounded border space-y-2">
        <div className="font-semibold">2) Consultar pago</div>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Pegá payment_id o collection_id (solo el número)"
          value={paymentId}
          onChange={(e) => setPaymentId(e.target.value)}
        />
        <button
          onClick={checkPayment}
          className="px-4 py-2 rounded bg-black text-white"
          disabled={!paymentId}
        >
          Consultar /api/mp/payment/[id]
        </button>
      </div>

      {payment && (
        <pre className="p-4 rounded border overflow-auto text-sm">
          {JSON.stringify(payment, null, 2)}
        </pre>
      )}

      {err && (
        <pre className="p-4 rounded border overflow-auto text-sm">
          {JSON.stringify(err, null, 2)}
        </pre>
      )}
    </div>
  );
}
