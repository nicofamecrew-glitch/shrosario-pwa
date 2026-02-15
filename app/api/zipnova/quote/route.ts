import { NextResponse } from "next/server";
import { appendShippingEvent } from "@/lib/lib/sheets";

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

function cleanZip(v: any) {
  return String(v ?? "").trim().replace(/\D/g, "");
}

function toNum(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * GET proxy para test rápido desde navegador:
 * /api/zipnova/quote?debug=1&zipcode=2500&declared_value=20000
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const zipcode = url.searchParams.get("zipcode") ?? "";
  const declared_value = url.searchParams.get("declared_value");

  const body: any = {};
  if (zipcode) body.zipcode = zipcode;
  if (declared_value != null) body.declared_value = Number(declared_value);

  const fakeReq = new Request(req.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return POST(fakeReq as any);
}

export async function POST(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  try {
    const KEY = mustEnv("ZIPNOVA_API_KEY");
    const SECRET = mustEnv("ZIPNOVA_API_SECRET");
    const BASE_URL = mustEnv("ZIPNOVA_BASE_URL"); // https://api.zipnova.com.ar
    const QUOTE_PATH = mustEnv("ZIPNOVA_QUOTE_PATH"); // /v2/shipments/quote
    const ACCOUNT_ID = Number(mustEnv("ZIPNOVA_ACCOUNT_ID"));
    const ORIGIN_ID = Number(mustEnv("ZIPNOVA_ORIGIN_ID"));

    const body = await req.json().catch(() => ({}));

    // ------------------------
    // DESTINO: zipcode obligatorio (NO default 2000)
    // ------------------------
    const destZip = cleanZip(body?.destination?.zipcode ?? body?.zipcode);
    if (!destZip) {
      return NextResponse.json(
        { ok: false, error: "Missing destination zipcode" },
        { status: 400 }
      );
    }

    // city/state SOLO si vienen (NO default rosario/santa fe)
    const destCityRaw = body?.destination?.city ?? body?.city;
    const destStateRaw = body?.destination?.state ?? body?.state;

    const destination: any = { zipcode: destZip, country: "AR" };
    if (destCityRaw) destination.city = String(destCityRaw).trim().toLowerCase();
    if (destStateRaw) destination.state = String(destStateRaw).trim().toLowerCase();

    // ------------------------
    // ITEMS: defaults razonables
    // ------------------------
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const items =
      rawItems.length > 0
        ? rawItems.map((it: any, idx: number) => ({
            sku: String(it?.sku ?? it?.productId ?? `SKU-${idx + 1}`),
            weight: toNum(it?.weight, 500),
            height: toNum(it?.height, 10),
            width: toNum(it?.width, 10),
            length: toNum(it?.length, 10),
            description: String(
              it?.description ?? it?.title ?? it?.name ?? it?.productId ?? "Item"
            ),
            classification_id: toNum(it?.classification_id, 1),
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

    const declared_value = toNum(
      body?.declared_value ?? body?.declaredValue ?? body?.total,
      10000
    );

    const payload = {
      account_id: ACCOUNT_ID,
      origin_id: ORIGIN_ID,
      declared_value,
      items,
      destination,
    };

    const base = String(BASE_URL).replace(/\/$/, "");
    const path = String(QUOTE_PATH).startsWith("/")
      ? String(QUOTE_PATH)
      : `/${String(QUOTE_PATH)}`;
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

    if (!r.ok) {
      console.error("[ZIPNOVA QUOTE] HTTP error", {
        status: r.status,
        url,
        payload,
        response: data,
      });
    }

    // ------------------------
    // Normalización de opciones
    // ------------------------
    let options: any[] = [];

    // Caso A: options[]
    if (r.ok && Array.isArray((data as any)?.options)) {
      options = (data as any).options;
    }

    // Caso B: all_results[]
    if (r.ok && options.length === 0) {
      const all = Array.isArray((data as any)?.all_results) ? (data as any).all_results : [];

      options = all
        .filter((x: any) => x?.selectable !== false)
        .map((x: any) => {
          const carrierName = x?.carrier?.name ?? "Carrier";
          const serviceName = x?.service_type?.name ?? x?.service_type?.code ?? "Servicio";
          const id = `${x?.carrier?.id ?? "c"}_${
            x?.service_type?.id ?? x?.service_type?.code ?? "s"
          }`;

          const priceRaw =
            x?.amounts?.price_incl_tax ??
            x?.amounts?.price ??
            x?.amounts?.seller_price_incl_tax ??
            x?.amounts?.seller_price ??
            null;

          const price = priceRaw == null ? null : Number(priceRaw);
          const eta = x?.delivery_time?.estimated_delivery ?? null;
          const tags = Array.isArray(x?.tags) ? x.tags : [];

          return {
            id,
            name: `${carrierName} - ${serviceName}`,
            price: Number.isFinite(price as any) ? Math.round(price as number) : null,
            meta: {
              carrier_id: x?.carrier?.id ?? null,
              service_type_id: x?.service_type?.id ?? null,
              service_code: x?.service_type?.code ?? null,
              logistic_type: x?.logistic_type ?? null,
              eta,
              tags,
              pickup_points_count: Array.isArray(x?.pickup_points)
                ? x.pickup_points.length
                : 0,
            },
          };
        })
        // 👇 clave: si no hay precio, NO inventamos 12000
        .filter((o: any) => typeof o.price === "number" && o.price > 0)
        .sort((a: any, b: any) => a.price - b.price);
    }

    // ------------------------
    // Logs a Sheets
    // ------------------------
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

    if (selected) {
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
    }

    // ------------------------
    // Respuesta
    // ------------------------
    if (r.ok && options.length > 0) {
      return NextResponse.json(
        {
          ok: true,
          status: r.status,
          options,
          ...(debug ? { payloadSent: payload, zipnova_raw: data } : {}),
        },
        { status: 200 }
      );
    }

    // fallback sin romper checkout
    return NextResponse.json(
      {
        ok: false,
        status: r.status,
        error: r.ok
          ? "Zipnova quote returned no selectable priced results"
          : (data as any)?.message ?? (data as any)?.error ?? "Zipnova API error",
        ...(debug ? { payloadSent: payload, zipnova_raw: data } : {}),
        options: [{ id: "zipnova_est", name: "Zipnova (estimado)", price: 12000 }],
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[ZIPNOVA QUOTE] fatal", e?.message);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Unknown error",
        options: [{ id: "zipnova_est", name: "Zipnova (estimado)", price: 12000 }],
      },
      { status: 200 }
    );
  }
}
