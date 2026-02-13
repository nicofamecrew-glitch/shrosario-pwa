import { NextResponse } from "next/server";
import { getSheetRows } from "@/lib/lib/sheets";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shipmentId = (url.searchParams.get("shipment_id") || "").trim();

  if (!shipmentId) {
    return NextResponse.json({ ok: false, error: "shipment_id required" }, { status: 400 });
  }

  const rows = await getSheetRows("shipments_events");

  // Filtramos por shipment_id
  const matches = rows.filter((r: any) => String(r.shipment_id ?? "").trim() === shipmentId);

  if (!matches.length) {
    return NextResponse.json({ ok: true, shipment_id: shipmentId, status_internal: "pending" });
  }

  // Elegimos el más reciente por timestamp (ISO)
  matches.sort((a: any, b: any) => (String(a.timestamp) < String(b.timestamp) ? 1 : -1));

  const latest = matches[0];

  return NextResponse.json({
    ok: true,
    shipment_id: shipmentId,
    status_internal: String(latest.status_internal ?? "pending"),
    status_raw: String(latest.status ?? ""),
    timestamp: String(latest.timestamp ?? ""),
  });
}
