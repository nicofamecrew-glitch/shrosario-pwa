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

    // 1) Leer orden
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    // 2) Guardas absolutas
    if (order.status !== "Pagado") {
      return NextResponse.json({ ok: false, error: "Order not paid" }, { status: 409 });
    }
    if (order.shipmentId) {
      return NextResponse.json({ ok: true, skipped: true, shipmentId: order.shipmentId });
    }

    // 3) Crear envío real (Zipnova)
    const shipment = await zipnovaCreateShipment(order);
    if (!shipment?.id) {
      return NextResponse.json({ ok: false, error: "Shipment creation failed" }, { status: 502 });
    }

    // 4) Persistir shipmentId
    await updateOrderWithShipment({
      orderId,
      shipmentId: shipment.id,
      shipmentStatus: shipment.status || "pending",
    });

    return NextResponse.json({ ok: true, shipmentId: shipment.id });
  } catch (e: any) {
    console.error("SHIPMENT CREATE ERROR:", e);
    return NextResponse.json({ ok: false, error: e.message || "error" }, { status: 500 });
  }
}
