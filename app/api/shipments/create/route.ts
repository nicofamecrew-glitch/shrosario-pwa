import { NextResponse } from "next/server";
import { getOrderById, updateOrderWithShipment } from "@/lib/server/ordersSheets";
import { zipnovaCreateShipment } from "@/lib/server/zipnova";


export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    if (String(order.status) !== "Pagado") {
      return NextResponse.json({ ok: false, error: "Order not paid" }, { status: 409 });
    }

    if (order.shipmentId) {
      return NextResponse.json({ ok: true, skipped: true, shipmentId: order.shipmentId }, { status: 200 });
    }

    const shipment = await zipnovaCreateShipment(order);
    if (!shipment?.id) {
      return NextResponse.json({ ok: false, error: "Shipment creation failed" }, { status: 502 });
    }

    await updateOrderWithShipment({
      orderId,
      shipmentId: shipment.id,
      shipmentStatus: shipment.status || "pending",
    });

    return NextResponse.json({ ok: true, shipmentId: shipment.id }, { status: 200 });
  } catch (e: any) {
    console.error("SHIPMENTS/CREATE ERROR:", e);
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
