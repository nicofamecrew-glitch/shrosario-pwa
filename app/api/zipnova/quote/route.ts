import { NextResponse } from "next/server";
import { appendShippingEvent } from "@/lib/lib/sheets"; // ajustá si tu ruta real es otra

export const runtime = "nodejs";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const zipcode = url.searchParams.get("zipcode") ?? "2500";
  const declared_value = Number(url.searchParams.get("declared_value") ?? "20000");

  const fakeReq = new Request(req.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zipcode, declared_value }),
  });

  // Reutiliza tu POST real
  return POST(fakeReq as any);
}


export async function POST(req: Request) {
  try {
    const KEY = mustEnv("ZIPNOVA_API_KEY"); // API Token
    const SECRET = mustEnv("ZIPNOVA_API_SECRET"); // API Secret
    const BASE_URL = mustEnv("ZIPNOVA_BASE_URL"); // https://api.zipnova.com.ar
    const QUOTE_PATH = mustEnv("ZIPNOVA_QUOTE_PATH"); // /v2/shipments/quote

    // ✅ IDs reales
    const ACCOUNT_ID = Number(mustEnv("ZIPNOVA_ACCOUNT_ID")); // 20530
    const ORIGIN_ID = Number(mustEnv("ZIPNOVA_ORIGIN_ID")); // 374137

    const body = await req.json().catch(() => ({}));

    // ======== Normalización dura (evita fallos por formato) ========
    const destZipRaw = String(body?.destination?.zipcode ?? body?.zipcode ?? "2000").trim();
    const destZip = destZipRaw.replace(/\D/g, ""); // solo números

    const destCity = String(body?.destination?.city ?? body?.city ?? "rosario")
      .trim()
      .toLowerCase();

    const destState = String(body?.destination?.state ?? body?.state ?? "santa fe")
      .trim()
      .toLowerCase();

    const rawItems = Array.isArray(body?.items) ? body.items : [];

    const items =
      rawItems.length > 0
        ? rawItems.map((it: any, idx: number) => ({
            sku: String(it?.sku ?? it?.productId ?? `SKU-${idx + 1}`),
            weight: Number(it?.weight ?? 500),
            height: Number(it?.height ?? 10),
            width: Number(it?.width ?? 10),
            length: Number(it?.length ?? 10),
            description: String(it?.description ?? it?.title ?? it?.name ?? it?.productId ?? "Item"),
            classification_id: Number(it?.classification_id ?? 1),
          }))
        : [
            {
              sku: "SKU-1",
              weight: 500,
              height: 10,
              width: 10,
              length: 10,
              description: "Item",
              classification_id: 1,
            },
          ];

    const declared_value = Number(body?.declared_value ?? body?.declaredValue ?? body?.total ?? 10000);

    // ======== Payload v2 ========
    const payload = {
      account_id: ACCOUNT_ID,
      origin_id: ORIGIN_ID,
      declared_value,
      items,
      destination: {
        city: destCity,
        state: destState,
        zipcode: destZip,
        country: "AR",
      },
    };

    const base = String(BASE_URL).replace(/\/$/, "");
    const path = String(QUOTE_PATH).startsWith("/") ? String(QUOTE_PATH) : `/${String(QUOTE_PATH)}`;
    const url = `${base}${path}`;

    const auth = Buffer.from(`${KEY}:${SECRET}`, "utf8").toString("base64");

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await r.text();
    const data = safeJsonParse(text);

    // ✅ Log útil (sin credenciales)
    if (!r.ok) {
      console.error("[ZIPNOVA QUOTE] HTTP error", {
        status: r.status,
        url,
        payload,
        response: data,
      });
    }

    // ✅ Caso A: Zipnova devuelve options[] (si alguna cuenta lo trae así)
    if (r.ok && Array.isArray((data as any)?.options)) {
      return NextResponse.json(
        {
          ok: true,
          status: r.status,
          options: (data as any).options,
        },
        { status: 200 }
      );
    }

    // ✅ Caso B (REAL): Zipnova devuelve results/all_results -> normalizamos a options[]
    if (r.ok) {
      const all = Array.isArray((data as any)?.all_results) ? (data as any).all_results : [];

      const options = all
        .filter((x: any) => x?.selectable !== false)
        .map((x: any) => {
          const carrierName = x?.carrier?.name ?? "Carrier";
          const serviceName = x?.service_type?.name ?? x?.service_type?.code ?? "Servicio";
          const id = `${x?.carrier?.id ?? "c"}_${x?.service_type?.id ?? x?.service_type?.code ?? "s"}`;

          // usamos price_incl_tax si está; si no, price / seller_price*
          const price = Number(
            x?.amounts?.price_incl_tax ??
              x?.amounts?.price ??
              x?.amounts?.seller_price_incl_tax ??
              x?.amounts?.seller_price ??
              0
          );

          const eta = x?.delivery_time?.estimated_delivery ?? null;
          const tags = Array.isArray(x?.tags) ? x.tags : [];

          return {
            id,
            name: `${carrierName} - ${serviceName}`,
            price: Number.isFinite(price) && price > 0 ? Math.round(price) : 12000,
            meta: {
              carrier_id: x?.carrier?.id ?? null,
              service_type_id: x?.service_type?.id ?? null,
              service_code: x?.service_type?.code ?? null,
              logistic_type: x?.logistic_type ?? null,
              eta,
              tags,
              // si después querés mostrar puntos de retiro, lo tenés acá
              pickup_points_count: Array.isArray(x?.pickup_points) ? x.pickup_points.length : 0,
            },
          };
        })
        .sort((a: any, b: any) => a.price - b.price);
await appendShippingEvent({
  event_type: "quote_created",
  provider: "zipnova",
  account_id: ACCOUNT_ID,
  origin_id: ORIGIN_ID,
  destination_zipcode: destZip,
  raw: { options_count: options.length },
});
const selected =
  options.find(
    (o: any) => Array.isArray(o?.meta?.tags) && o.meta.tags.includes("cheapest")
  ) ?? options[0];

await appendShippingEvent({
  event_type: "quote_selected",
  provider: "zipnova",
  account_id: ACCOUNT_ID,
  origin_id: ORIGIN_ID,
  destination_zipcode: destZip,
  option_id: selected?.id,
  option_name: selected?.name,
  price: selected?.price,
  eta: selected?.meta?.eta ?? "",
  carrier_id: selected?.meta?.carrier_id ?? "",
  service_type_id: selected?.meta?.service_type_id ?? "",
  service_code: selected?.meta?.service_code ?? "",
  raw: { selected_id: selected?.id },
});

      if (options.length > 0) {
        return NextResponse.json(
          {
            ok: true,
            status: r.status,
            options,
          },
          { status: 200 }
        );
      }

      // r.ok pero sin resultados seleccionables -> fallback sin romper checkout
      return NextResponse.json(
        {
          ok: false,
          status: r.status,
          error: "Zipnova quote returned no selectable results",
          zipnova_raw: data,
          options: [
            { id: "adriani", name: "Adriani", price: 5000 },
            { id: "zipnova_est", name: "Zipnova (estimado)", price: 12000 },
          ],
        },
        { status: 200 }
      );
    }

    // ❌ HTTP error real -> fallback
    return NextResponse.json(
      {
        ok: false,
        status: r.status,
        error: (data as any)?.message ?? (data as any)?.error ?? "Zipnova API error",
        zipnova_raw: data,
        options: [
          { id: "adriani", name: "Adriani", price: 5000 },
          { id: "zipnova_est", name: "Zipnova (estimado)", price: 12000 },
        ],
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[ZIPNOVA QUOTE] fatal", e?.message);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Unknown error",
        options: [
          { id: "adriani", name: "Adriani", price: 5000 },
          { id: "zipnova_est", name: "Zipnova (estimado)", price: 12000 },
        ],
      },
      { status: 200 }
    );
  }
}
