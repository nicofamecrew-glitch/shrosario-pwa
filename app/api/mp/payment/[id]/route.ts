import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("Falta MP_ACCESS_TOKEN en entorno");
    return NextResponse.json(
      { ok: false, error: "Missing MP_ACCESS_TOKEN" },
      { status: 200 } // nunca 500 para no romper webhook
    );
  }

  const paymentIdRaw = String(params?.id || "").trim();
  if (!paymentIdRaw) {
    console.warn("Webhook sin payment id");
    return NextResponse.json(
      { ok: false, error: "Missing payment id" },
      { status: 400 }
    );
  }

  // MP suele usar ids numéricos; si es numérico lo convertimos
  const paymentId: any = /^\d+$/.test(paymentIdRaw) ? Number(paymentIdRaw) : paymentIdRaw;

  console.log("Consultando pago en MP:", paymentIdRaw);

  try {
    const client = new MercadoPagoConfig({ accessToken });
    const paymentClient = new Payment(client);

    const payment = await paymentClient.get({ id: paymentId });

    return NextResponse.json({ ok: true, payment }, { status: 200 });
  } catch (err: any) {
    const status = err?.status || err?.response?.status || 500;
    const mpData = err?.response?.data || null;

    console.error("[MP] payment.get error:", {
      paymentIdRaw,
      status,
      message: err?.message,
      mpData,
    });

    // Si MP dice "no existe", devolvemos 404
    if (status === 404) {
      return NextResponse.json(
        { ok: false, error: "Payment not found", status },
        { status: 404 }
      );
    }

    // Si el token es inválido
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized / invalid MP token", status },
        { status }
      );
    }

    // Fallback seguro: nunca 500
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch payment", status },
      { status: 200 }
    );
  }
}
