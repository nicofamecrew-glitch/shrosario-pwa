import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing MP_ACCESS_TOKEN" }, { status: 500 });
    }

    const body = await req.json();
    const amount = Number(body?.amount ?? 0);
    const bin = String(body?.bin ?? "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(bin)) {
      return NextResponse.json({ ok: false, error: "Invalid BIN (6 digits)" }, { status: 400 });
    }

    // Endpoint público MP (installments)
    const url =
      `https://api.mercadopago.com/v1/payment_methods/installments` +
      `?amount=${encodeURIComponent(String(amount))}` +
      `&bin=${encodeURIComponent(bin)}`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: "MP installments error", detail: data },
        { status: r.status }
      );
    }

    // Normalizamos respuesta para frontend
    // data: array -> elegimos la primer coincidencia (por BIN)
    const first = Array.isArray(data) ? data[0] : null;
    const payerCosts = first?.payer_costs ?? [];

    const plans = payerCosts.map((pc: any) => ({
      installments: pc.installments,
      installment_amount: pc.installment_amount,
      total_amount: pc.total_amount,
      recommended_message: pc.recommended_message,
      labels: pc.labels ?? [],
    }));

    return NextResponse.json({
      ok: true,
      bin,
      amount,
      payment_method_id: first?.payment_method_id,
      issuer: first?.issuer,
      plans,
      raw_count: Array.isArray(data) ? data.length : 0,
    });
  } catch (err: any) {
    console.error("MP installments route error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "error" }, { status: 500 });
  }
}
