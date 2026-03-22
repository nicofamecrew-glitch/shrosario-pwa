import { NextResponse } from "next/server";
import { appendMpEvent } from "@/lib/lib/sheets";
import { updateOrderStatusInSheets } from "@/lib/server/ordersSheets";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

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
  try {
    const expected = process.env.MP_WEBHOOK_TOKEN;
    if (!expected) {
      console.error("Falta MP_WEBHOOK_TOKEN en entorno");
      return NextResponse.json(
        { ok: false, error: "Missing MP_WEBHOOK_TOKEN" },
        { status: 200 }
      );
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
      const moId = extractMerchantOrderId(
        payload?.resource ?? url.searchParams.get("resource") ?? ""
      );

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

    console.log("[MP WEBHOOK] incoming", {
  type,
  action,
  paymentId: paymentId || "(none)",
  merchantOrderId: merchantOrderId || "(none)",
  status: status || "(none)",
  externalRef: externalRef || "(none)",
  qs: url.search,
  payloadSummary: {
    id: payload?.id ?? null,
    live_mode: payload?.live_mode ?? null,
    date_created: payload?.date_created ?? null,
    user_id: payload?.user_id ?? null,
    api_version: payload?.api_version ?? null,
  },
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

    if (!paymentId) {
      return NextResponse.json({ ok: true, skipped: "no_payment_id" }, { status: 200 });
    }

    let real: any = null;
    try {
      const base = url.origin;
      const res = await fetch(`${base}/api/mp/payment/${paymentId}`, {
        cache: "no-store",
      });

      real = await res.json();

      if (!res.ok) {
        console.warn("Consulta de pago real falló", {
          paymentId,
          httpStatus: res.status,
        });
        return NextResponse.json({ ok: true, skipped: "payment_lookup_failed" }, { status: 200 });
      }
    } catch (e) {
      console.error("Error consultando pago real:", e);
      return NextResponse.json({ ok: true, skipped: "payment_lookup_error" }, { status: 200 });
    }

    if (!real?.ok || !real?.payment) {
      console.warn("Respuesta de pago real inválida", { paymentId, realOk: real?.ok });
      return NextResponse.json({ ok: true, skipped: "invalid_payment_payload" }, { status: 200 });
    }

  console.log("[MP WEBHOOK] real payment", {
  paymentId,
  status: real?.payment?.status ?? null,
  status_detail: real?.payment?.status_detail ?? null,
  amount: real?.payment?.transaction_amount ?? null,
  external_reference: real?.payment?.external_reference ?? null,
  merchant_order_id: real?.payment?.order?.id ?? null,
  payment_type_id: real?.payment?.payment_type_id ?? null,
  date_approved: real?.payment?.date_approved ?? null,
});

    if (real.payment.status !== "approved") {
      return NextResponse.json(
        { ok: true, skipped: `payment_status_${real.payment.status}` },
        { status: 200 }
      );
    }

        try {
      const orderRef = String(real.payment.external_reference ?? externalRef ?? "");

      if (orderRef) {
        // 1) Sheets
        await updateOrderStatusInSheets({
          orderId: orderRef,
          status: "Pagado",
          externalReference: orderRef,
          paymentId: String(paymentId),
          paymentStatus: String(real.payment.status),
        });

              console.log("[MP WEBHOOK] Sheets updated OK", {
          orderRef,
          paymentId,
          paymentStatus: real?.payment?.status ?? null,
        });

        console.log("[MP WEBHOOK] updating Supabase order", {
          orderRef,
          paymentId,
          targetTable: "orders",
          matchField: "order_code",
          newStatus: "Pagado",
        });

        // 2) Supabase
        const { data: updatedOrder, error: supabaseOrderError } = await supabaseAdmin
          .from("orders")
          .update({
            status: "Pagado",
            external_ref: orderRef,
          })
          .eq("order_code", orderRef)
          .select("id, order_code, status, external_ref")
          .maybeSingle();

        if (supabaseOrderError) {
          console.error("[MP WEBHOOK] Supabase update error", {
            message: supabaseOrderError.message,
            details: supabaseOrderError.details ?? null,
            hint: supabaseOrderError.hint ?? null,
            code: supabaseOrderError.code ?? null,
            orderRef,
            paymentId,
          });
          throw supabaseOrderError;
        }

              console.log("[MP WEBHOOK] Supabase update result", {
          found: !!updatedOrder,
          updatedOrder: updatedOrder ?? null,
          orderRef,
          paymentId,
        });

        if (!updatedOrder) {
          console.warn("Pago aprobado pero no encontré la orden en Supabase", {
            orderRef,
            paymentId,
          });
        } else {
          console.log("Pedido marcado como PAGADO en Supabase ✅", {
            orderId: updatedOrder.order_code,
            status: updatedOrder.status,
          });
        }

        console.log("Pedido marcado como PAGADO ✅", { orderId: orderRef });
      } else {
        console.warn("Pago aprobado pero sin external_reference", { paymentId });
      }
    } catch (e) {console.error("[MP WEBHOOK] order update failed", e);
      return NextResponse.json(
        { ok: false, error: "order_update_failed" },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, processed: true }, { status: 200 });
  } catch (e) {
    console.error("Webhook fatal error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}