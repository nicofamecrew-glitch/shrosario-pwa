import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { getCatalog } from "@/lib/server/catalog";
import { getFlashProducts } from "@/lib/flashSale";

export const runtime = "nodejs";

type CartItem = {
  productId: string;
  quantity?: number;
  unit_price?: number;
  unitPrice?: number;
  price?: number;
  title?: string;
  name?: string;
  sku?: string;
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
   
   // Catálogo real del servidor
const catalog = await getCatalog();

// Productos que pertenecen a la tanda Flash actual
const flashProducts = getFlashProducts(catalog);

const flashIds = new Set(
  flashProducts.map((p) => p.id)
);

   const items = body.items
  .map((it: CartItem) => {
    // ENVÍO: no existe en el catálogo
    if (it.productId === "shipping") {
      const shippingPrice = Number(
        it.unit_price ?? it.unitPrice ?? it.price ?? 0
      );

      if (!Number.isFinite(shippingPrice) || shippingPrice <= 0) {
        return null;
      }

      return {
        title: it.title || "Envío",
        quantity: 1,
        unit_price: shippingPrice,
        currency_id: "ARS",
      };
    }

    // PRODUCTO: lo validamos contra el catálogo real
    const product = catalog.find(
      (p: any) => p.id === it.productId
    );

    if (!product) return null;

    const variants = Array.isArray(product.variants)
      ? product.variants
      : [];

    const variant = variants.find(
      (v: any) => v.sku === it.sku
    );

    if (!variant) return null;

    const retail = Number(variant.priceRetail ?? 0);

    if (!Number.isFinite(retail) || retail <= 0) {
      return null;
    }

    // El servidor decide si realmente está en Flash
    const isFlash = flashIds.has(product.id);

    const unitPrice = isFlash
      ? Math.round(retail * 0.85)
      : retail;

    return {
      title: `${product.brand ?? ""} ${
        product.name ?? product.id
      }`.trim(),
      quantity: Math.max(1, Number(it.quantity ?? 1)),
      unit_price: unitPrice,
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

    const draftId = body.external_reference || body.orderDraftId;

if (!draftId || !String(draftId).startsWith("DRAFT-")) {
  return NextResponse.json(
    { ok: false, error: "Missing valid DRAFT id" },
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
     external_reference: draftId,
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