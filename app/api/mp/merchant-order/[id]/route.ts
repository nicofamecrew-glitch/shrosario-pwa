import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "Missing MP_ACCESS_TOKEN" },
      { status: 500 }
    );
  }

  const id = params.id;

  try {
    const r = await fetch(`https://api.mercadopago.com/merchant_orders/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: "Merchant order not found", raw: data },
        { status: r.status }
      );
    }

    // payments puede venir vacío; tomamos el primero aprobado si existe
    const payments = Array.isArray(data.payments) ? data.payments : [];
    const approvedPayment =
      payments.find((p: any) => p?.status === "approved") || payments[0] || null;

    return NextResponse.json({
      ok: true,
      merchant_order_id: String(data.id),
      status: data.status || null,
      external_reference: data.external_reference || null,
      payment_id: approvedPayment ? String(approvedPayment.id) : null,
      payment_status: approvedPayment?.status || null,
      raw: data,
    });
  } catch (err: any) {
    console.error("Error merchant_order:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to fetch merchant order" },
      { status: 500 }
    );
  }
}
