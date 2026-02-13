import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export const runtime = "nodejs";

type CartItem = {
  productId: string;
  quantity?: number;
  unit_price?: number;
  unitPrice?: number;
  price?: number;
  title?: string;
  name?: string;
};

export async function POST(req: Request) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Missing MP_ACCESS_TOKEN" },
        { status: 500 }
      );
    }

    const webhookToken = process.env.MP_WEBHOOK_TOKEN;
    if (!webhookToken) {
      return NextResponse.json(
        { ok: false, error: "Missing MP_WEBHOOK_TOKEN" },
        { status: 500 }
      );
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preferenceClient = new Preference(client);

    const base = (process.env.APP_BASE_URL || new URL(req.url).origin).replace(/\/$/, "");

    const body = await req.json();
console.log("MP /preference body:", body);

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { ok: false, error: "items must be an array" },
        { status: 400 }
      );
    }

    const items = body.items
      .map((it: CartItem) => {
        const unit = Number(it.unit_price ?? it.unitPrice ?? it.price ?? 0);
        if (unit <= 0) return null;

        return {
          title: it.title || it.name || it.productId,
          quantity: Math.max(1, Number(it.quantity ?? 1)),
          unit_price: unit,
          currency_id: "ARS",
        };
      })
      .filter(Boolean);

    if (!items.length) {
      return NextResponse.json(
        { ok: false, error: "No valid items (price <= 0)" },
        { status: 400 }
      );
    }

    const preference = {
      items,
      payer: body.payer?.email ? { email: body.payer.email } : undefined,
      back_urls: {
        success: `${base}/checkout/mp/success`,
        pending: `${base}/checkout/mp/pending`,
        failure: `${base}/checkout/mp/failure`,
      },
      auto_return: "approved",
      external_reference: body.orderDraftId || `order-${Date.now()}`,
      notification_url: `${base}/api/mp/webhook?token=${webhookToken}`,
    };

    const res = await preferenceClient.create({ body: preference });

return NextResponse.json({
  debug: "PREFERENCE_ROUTE_V2",
  init_point: res.init_point,
  id: res.id,
  installments: [],
});

  } catch (err: any) {
    console.error("MP ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "MP error" },
      { status: 500 }
    );
  }
}
