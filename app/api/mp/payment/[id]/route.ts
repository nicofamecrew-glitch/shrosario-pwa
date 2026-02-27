import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Missing MP_ACCESS_TOKEN" }, { status: 200 });
  }

  const paymentId = String(params?.id || "").trim();
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "Missing payment id" }, { status: 400 });
  }

  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    const data = await r.json().catch(() => null);

    // nunca 500 para no romper webhook
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: "MP payment fetch failed", status: r.status, mp: data },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, payment: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Fetch error" }, { status: 200 });
  }
}