import { NextResponse } from "next/server";
import { appendMpEvent } from "@/lib/lib/sheets";
import { updateOrderStatusInSheets } from "@/lib/server/ordersSheets";

export const runtime = "nodejs";

// ==============================
// Helpers
// ==============================
function pickPaymentId(payload: any, url: URL) {
  const qDataId = url.searchParams.get("data.id");
  const qId = url.searchParams.get("id");
  const qPaymentId = url.searchParams.get("payment_id");

  const bDataId = payload?.data?.id;
  const bId = payload?.id;
  const bPaymentId = payload?.payment_id;

  return qDataId ?? qId ?? qPaymentId ?? bDataId ?? bId ?? bPaymentId ?? "";
}

function extractMerchantOrderId(resource?: string) {
  if (!resource) return null;
  const m = String(resource).match(/merchant_orders\/(\d+)/);
  return m?.[1] ?? null;
}

async function fetchMerchantOrder(moId: string, accessToken: string) {
  const r = await fetch(`https://api.mercadopago.com/merchant_orders/${moId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  let data: any = null;
  try {
    data = await r.json();
  } catch (e) {
    console.error("merchant_order parse error:", e);
  }

  return { ok: r.ok, status: r.status, data };
}

// ==============================
// Handlers
// ==============================

// 👉 Nuevo GET para evitar 405 y servir como healthcheck
export async function GET() {
  return NextResponse.json({ ok: true, msg: "MP Webhook activo" }, { status: 200 });
}

export async function POST(req: Request) {
  const expected = process.env.MP_WEBHOOK_TOKEN;
  if (!expected) {
    console.error("Falta MP_WEBHOOK_TOKEN en entorno");
    return NextResponse.json({ ok: false, error: "Missing MP_WEBHOOK_TOKEN" }, { status: 200 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (token !== expected) {
    console.warn("Token inválido en webhook");
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN || "";
  if (!accessToken) {
    console.error("Falta MP_ACCESS_TOKEN en entorno");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    console.warn("Payload vacío o inválido (seguimos con querystring)");
    payload = {};
  }

  const type = String(
    payload?.type ??
      payload?.topic ??
      url.searchParams.get("type") ??
      url.searchParams.get("topic") ??
      ""
  );
  const action = String(payload?.action ?? url.searchParams.get("action") ?? "");

  let paymentId = "";
  let merchantOrderId = "";
  let status = "";
  let externalRef = "";

  const pid = String(pickPaymentId(payload, url));

  if ((type === "payment" || payload?.type === "payment") && pid) {
    paymentId = pid;
    merchantOrderId = String(payload?.data?.merchant_order_id ?? payload?.merchant_order_id ?? "");
    status = String(payload?.data?.status ?? payload?.status ?? "");
    externalRef = String(payload?.data?.external_reference ?? payload?.external_reference ?? "");
  }

  if (!paymentId && (type === "merchant_order" || payload?.topic === "merchant_order")) {
    const moId = extractMerchantOrderId(payload?.resource ?? url.searchParams.get("resource") ?? "");
    if (moId) {
      merchantOrderId = moId;
      const moRes = await fetchMerchantOrder(moId, accessToken);
      if (moRes.ok && moRes.data) {
        externalRef = String(moRes.data.external_reference ?? "");
        const payments = Array.isArray(moRes.data.payments) ? moRes.data.payments : [];
        const chosen =
          payments.find((p: any) => p?.status === "approved") ||
          payments.find((p: any) => p?.status === "in_process") ||
          payments[0] ||
          null;

        paymentId = chosen?.id ? String(chosen.id) : "";
        status = chosen?.status ? String(chosen.status) : String(moRes.data.status ?? "");
      }
    }
  }

  console.log("[MP WEBHOOK]", {
    type,
    action,
    paymentId: paymentId || "(none)",
    merchantOrderId: merchantOrderId || "(none)",
    status: status || "(none)",
    qs: url.search,
  });

  try {
    await appendMpEvent("mp_events", [
      new Date().toISOString(),
      type,
      action,
      paymentId,
      merchantOrderId,
      status,
      externalRef,
      JSON.stringify(payload),
    ]);
  } catch (e) {
    console.error("mp_events append failed:", e);
  }

  if (!paymentId) return NextResponse.json({ ok: true }, { status: 200 });

  let real: any = null;
  try {
    const base = url.origin;
    const res = await fetch(`${base}/api/mp/payment/${paymentId}`, { cache: "no-store" });
    real = await res.json();
    if (!res.ok) {
      console.warn("Consulta de pago real falló", { paymentId, httpStatus: res.status });
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  } catch (e) {
    console.error("Error consultando pago real:", e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!real?.ok || !real?.payment) {
    console.warn("Respuesta de pago real inválida", { paymentId, realOk: real?.ok });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  console.log("Pago real recibido", {
    paymentId,
    status: real.payment.status,
    amount: real.payment.transaction_amount,
    external_reference: real.payment.external_reference,
  });

  if (real.payment.status !== "approved") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const orderRef = String(real.payment.external_reference ?? externalRef ?? "");
    if (orderRef) {
    await updateOrderStatusInSheets({
  orderId: orderRef,
  status: "Pagado",
  paymentId: String(paymentId),
  paymentStatus: String(real.payment.status),
  externalReference: String(real.payment.external_reference ?? ""),
});
      console.log("Pedido marcado como PAGADO ✅", { orderId: orderRef });
    } else {
      console.warn("Pago aprobado pero sin external_reference", { paymentId });
    }
  } catch (e) {
    console.error("No pude actualizar pedido:", e);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
