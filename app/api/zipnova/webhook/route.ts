import { NextResponse } from "next/server";
import { appendShipmentEvent } from "@/lib/lib/sheets";
import { mapZipnovaStatus } from "@/lib/lib/zipnovaStatus";
import { updateOrderStatusInSheets } from "@/lib/server/ordersSheets";

export const runtime = "nodejs";

// 👉 Nuevo GET para healthcheck
export async function GET() {
  return NextResponse.json({ ok: true, msg: "Zipnova Webhook activo" }, { status: 200 });
}

export async function POST(req: Request) {
  const expected = process.env.ZIPNOVA_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Missing ZIPNOVA_WEBHOOK_TOKEN" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const provided = url.searchParams.get("token") || "";

  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  console.log("ZIPNOVA WEBHOOK:", body);

  try {
    const topic = String(body?.topic ?? "shipment");

    const shipmentId =
      body?.shipment?.id ??
      body?.shipment_id ??
      body?.tracking ??
      "";

    const status =
      body?.status ??
      body?.shipment?.status ??
      "unknown";

    const statusInternal: string = mapZipnovaStatus(String(status));

    await appendShipmentEvent({
      timestamp: new Date().toISOString(),
      topic,
      shipment_id: String(shipmentId),
      status: String(status),
      status_internal: statusInternal,
      raw_payload: JSON.stringify(body),
    });

    // 👉 Bloque de actualización de pedido
    try {
      const orderId = String(body?.external_reference ?? body?.order_id ?? "");
      if (orderId && statusInternal) {
        let newStatus: string | null = null;

        if (statusInternal === "Despachado") {
          newStatus = "En camino";
        } else if (statusInternal === "Entregado") {
          newStatus = "Entregado";
        } else if (statusInternal === "Cancelado") {
          newStatus = "Cancelado";
        }

        if (newStatus) {
          await updateOrderStatusInSheets({
            orderId,
            status: newStatus,
            shipmentId: String(shipmentId),
            shipmentStatus: String(status),
          });
          console.log("Pedido actualizado por Zipnova ✅", { orderId, newStatus });
        } else {
          console.log("Estado Zipnova no requiere actualización de pedido");
        }
      } else {
        console.warn("No se pudo determinar orderId o statusInternal para actualizar pedido");
      }
    } catch (e) {
      console.error("Error actualizando pedido desde Zipnova:", e);
    }
  } catch (err) {
    console.error("ZIPNOVA PERSIST ERROR:", err);
  }

  return NextResponse.json({ ok: true });
}
