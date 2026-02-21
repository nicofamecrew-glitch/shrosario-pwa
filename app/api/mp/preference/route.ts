import { NextRequest, NextResponse } from "next/server";
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

function getBaseUrl(req: NextRequest) {
  // 1) PRIORIDAD: URL fija por ENV (producción)
  const envBase =
    process.env.APP_BASE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  if (envBase && /^https?:\/\//.test(envBase)) return envBase.replace(/\/$/, "");

  // 2) fallback: detectar host real (Vercel / proxy)
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) throw new Error("Missing host headers");

  return `${proto}://${host}`.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
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

    const base = getBaseUrl(req);

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
        if (!Number.isFinite(unit) || unit <= 0) return null;

        return {
          title: it.title || it.name || it.productId,
          quantity: Math.max(1, Number(it.quantity ?? 1)),
          unit_price: unit,
          currency_id: "ARS",
        };
      })
      .filter(Boolean) as any[];

    if (!items.length) {
      return NextResponse.json(
        { ok: false, error: "No valid items (price <= 0)" },
        { status: 400 }
      );
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preferenceClient = new Preference(client);

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
      ok: true,
      debug: "PREFERENCE_ROUTE_V3",
      base,
      init_point: res.init_point,
      id: res.id,
    });
  } catch (err: any) {
    console.error("MP ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "MP error" },
      { status: 500 }
    );
  }
}