import { NextResponse } from "next/server";
import { appendShippingEvent, getZipCache, getSkuGramsMap, upsertZipCache } from "@/lib/lib/sheets";

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

function optEnv(name: string, fallback: string) {
  const v = process.env[name];
  return v ? v : fallback;
}

async function resolveDestinationFromZipnova(args: {
  baseUrl: string;
  key: string;
  secret: string;
  zipcode: string;
}) {
  const { baseUrl, key, secret, zipcode } = args;

  // Endpoint configurable por env para no adivinar a futuro
  // Si tu Zipnova usa otro path, lo ajustás en Vercel sin tocar código.
  const RESOLVE_PATH = optEnv("ZIPNOVA_RESOLVE_PATH", "/v2/locations/resolve");

  const base = String(baseUrl).replace(/\/$/, "");
  const path = RESOLVE_PATH.startsWith("/") ? RESOLVE_PATH : `/${RESOLVE_PATH}`;

  // Asumo query por zipcode (si tu endpoint usa body, lo cambiamos en 30s)
  const url = `${base}${path}?zipcode=${encodeURIComponent(zipcode)}`;

  const auth = Buffer.from(`${key}:${secret}`, "utf8").toString("base64");

  const r = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  const text = await r.text();
  const data = safeJsonParse(text);

  if (!r.ok) {
    return { ok: false as const, status: r.status, data };
  }

  // Normalización flexible (por si cambia el shape)
  const city =
    (data as any)?.city ??
    (data as any)?.destination?.city ??
    (data as any)?.location?.city ??
    null;

  const state =
    (data as any)?.state ??
    (data as any)?.destination?.state ??
    (data as any)?.location?.state ??
    null;

  const destination_id =
    (data as any)?.id ??
    (data as any)?.destination?.id ??
    (data as any)?.location?.id ??
    null;

  if (!city || !state) {
    return { ok: false as const, status: 200, data };
  }

  return {
    ok: true as const,
    city: String(city).trim().toLowerCase(),
    state: String(state).trim().toLowerCase(),
    destination_id: destination_id != null ? String(destination_id) : undefined,
    raw: data,
  };
}


type PackedBox = {
  weight: number; // gramos
  height: number;
  width: number;
  length: number;
  description: string;
};

function packIntoBoxes(totalGrams: number): PackedBox[] {
  // 3–4 bultos máximo, conservador
  const S = 3000,
    M = 6000,
    L = 10000;

  const boxes: PackedBox[] = [];
  let remaining = Math.max(0, Math.round(totalGrams));

  const pushBox = (w: number, dims: [number, number, number], label: string) => {
    const [length, width, height] = dims;
    boxes.push({ weight: w, length, width, height, description: label });
  };

  while (remaining > 0 && boxes.length < 4) {
    if (remaining <= S) {
      pushBox(remaining, [20, 20, 20], "Bulto S");
      remaining = 0;
    } else if (remaining <= M) {
      pushBox(remaining, [30, 25, 20], "Bulto M");
      remaining = 0;
    } else if (remaining <= L) {
      pushBox(remaining, [40, 30, 25], "Bulto L");
      remaining = 0;
    } else {
      pushBox(L, [40, 30, 25], "Bulto L");
      remaining -= L;
    }
  }

  // si quedó resto y ya tenés 4 bultos, lo sumás al último y lo agrandás
  if (remaining > 0 && boxes.length > 0) {
    const last = boxes[boxes.length - 1];
    last.weight += remaining;
    last.length = 50;
    last.width = 40;
    last.height = 30;
    last.description = "Bulto XL";
  }

  return boxes.length ? boxes : [{ weight: 500, length: 10, width: 10, height: 10, description: "Bulto S" }];
}

/**
 * GET proxy para test:
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
    const BASE_URL = mustEnv("ZIPNOVA_BASE_URL");
    const QUOTE_PATH = mustEnv("ZIPNOVA_QUOTE_PATH");
    const ACCOUNT_ID = Number(mustEnv("ZIPNOVA_ACCOUNT_ID"));
    const ORIGIN_ID = Number(mustEnv("ZIPNOVA_ORIGIN_ID"));

    const body = await req.json().catch(() => ({}));

    // ------------------------
    // DESTINO (CP obligatorio)
    // ------------------------
    const destZip = cleanZip(body?.destination?.zipcode ?? body?.zipcode);
    if (!destZip) {
      return NextResponse.json({ ok: false, error: "Missing destination zipcode" }, { status: 400 });
    }

    let destCityRaw = body?.destination?.city ?? body?.city;
    let destStateRaw = body?.destination?.state ?? body?.state;

 // Si no viene city/state: 1) intento cache 2) si no existe, consulto Zipnova y cacheo
// ------------------------
// Resolver city/state (cache → resolve → quote fallback)
// ------------------------
if (!destCityRaw || !destStateRaw) {
  const cached = await getZipCache(destZip);

  if (cached?.city && cached?.state) {
    destCityRaw = cached.city;
    destStateRaw = cached.state;

    if (debug) {
      console.log("[ZIPNOVA] destination from cache", {
        destZip,
        destCityRaw,
        destStateRaw,
      });
    }
  } else {
    // 1️⃣ Intento resolve endpoint
    const resolved = await resolveDestinationFromZipnova({
      baseUrl: BASE_URL,
      key: KEY,
      secret: SECRET,
      zipcode: destZip,
    });

    if (resolved.ok) {
      destCityRaw = resolved.city;
      destStateRaw = resolved.state;

      await upsertZipCache({
        zipcode: destZip,
        city: resolved.city,
        state: resolved.state,
        destination_id: resolved.destination_id ?? null,
      });

      if (debug) {
        console.log("[ZIPNOVA] resolved via endpoint", {
          destZip,
          destCityRaw,
          destStateRaw,
        });
      }
    } else {
      // 2️⃣ Fallback: intento quote mínimo
      const minimalPayload = {
        account_id: ACCOUNT_ID,
        origin_id: ORIGIN_ID,
        declared_value: 10000,
        items: [
          {
            sku: "BOX-1",
            weight: 500,
            height: 10,
            width: 10,
            length: 10,
            description: "Item",
            classification_id: 1,
          },
        ],
        destination: {
          zipcode: destZip,
          country: "AR",
        },
      };

      const base = String(BASE_URL).replace(/\/$/, "");
      const path = String(QUOTE_PATH).startsWith("/")
        ? String(QUOTE_PATH)
        : `/${String(QUOTE_PATH)}`;
      const urlQuote = `${base}${path}`;
      const auth = Buffer.from(`${KEY}:${SECRET}`, "utf8").toString("base64");

      const r0 = await fetch(urlQuote, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(minimalPayload),
        cache: "no-store",
      });

      const t0 = await r0.text();
      const d0 = safeJsonParse(t0);

      const zDest = (d0 as any)?.destination;

      const cityFromZipnova = zDest?.city
        ? String(zDest.city).trim().toLowerCase()
        : "";
      const stateFromZipnova = zDest?.state
        ? String(zDest.state).trim().toLowerCase()
        : "";

      if (cityFromZipnova && stateFromZipnova) {
        destCityRaw = cityFromZipnova;
        destStateRaw = stateFromZipnova;

        await upsertZipCache({
          zipcode: destZip,
          city: cityFromZipnova,
          state: stateFromZipnova,
          destination_id: zDest?.id ?? null,
        });

        if (debug) {
          console.log("[ZIPNOVA] auto-resolved via quote", {
            destZip,
            destCityRaw,
            destStateRaw,
          });
        }
      } else {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No se pudo resolver city/state para ese CP. Cargalo en zip_cache.",
            zipcode: destZip,
            zipnova_status: r0.status,
            zipnova_raw: debug ? d0 : undefined,
          },
          { status: 404 }
        );
      }
    }
  }
}




    const destination: any = {
      zipcode: destZip,
      country: "AR",
      city: String(destCityRaw).trim().toLowerCase(),
      state: String(destStateRaw).trim().toLowerCase(),
    };

    // ------------------------
    // ITEMS (PRO)
    // ------------------------
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    let items: any[] = [];

    // A) Si el frontend ya manda weight/dims => respetamos
    if (rawItems.length > 0 && rawItems.some((x: any) => x?.weight)) {
      items = rawItems.map((it: any, idx: number) => ({
        sku: String(it?.sku ?? it?.productId ?? `SKU-${idx + 1}`).trim().toUpperCase(),
        weight: toNum(it?.weight, 500),
        height: toNum(it?.height, 10),
        width: toNum(it?.width, 10),
        length: toNum(it?.length, 10),
        description: String(it?.description ?? it?.title ?? it?.name ?? "Item"),
        classification_id: toNum(it?.classification_id, 1),
      }));
    }
    // B) PRO: frontend manda [{sku, qty}] => calculamos gramos desde variants
    else if (rawItems.length > 0) {
      const gramsBySku = await getSkuGramsMap(); // Record<string, number>

      let totalGrams = 0;
      const missing: string[] = [];

      for (const it of rawItems) {
        const sku = String(it?.sku ?? "").trim().toUpperCase();
        const qty = Math.max(1, toNum(it?.qty ?? it?.quantity ?? 1, 1));

        if (!sku) continue;

        const g = gramsBySku[sku];
        if (!g) {
          missing.push(sku);
          totalGrams += 500 * qty; // fallback conservador
        } else {
          totalGrams += g * qty;
        }
      }

      const boxes = packIntoBoxes(totalGrams);

      items = boxes.map((b, i) => ({
        sku: `BOX-${i + 1}`,
        weight: b.weight,
        height: b.height,
        width: b.width,
        length: b.length,
        description: b.description,
        classification_id: 1,
      }));

      if (debug) {
        console.log("[ZIPNOVA] pack debug", { totalGrams, boxes, missingCount: missing.length, missing });
      }
    }
    // C) Sin items => fallback
    else {
      items = [
        {
          sku: "BOX-1",
          weight: 500,
          height: 10,
          width: 10,
          length: 10,
          description: "Item",
          classification_id: 1,
        },
      ];
    }

    const declared_value = toNum(body?.declared_value ?? body?.declaredValue ?? body?.total, 10000);
// total grams enviados a Zipnova (suma de bultos)
const totalWeight = items.reduce((acc, it) => acc + (Number(it?.weight) || 0), 0);

// modo de armado (para auditar)
const quote_mode =
  rawItems.length > 0 && rawItems.some((x: any) => x?.weight)
    ? "frontend_weight"
    : rawItems.length > 0
    ? "sku_qty"
    : "fallback";

    const payload = {
      account_id: ACCOUNT_ID,
      origin_id: ORIGIN_ID, // <-- ORIGEN ROSARIO (tu origin_id)
      declared_value,
      items,
      destination,
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

    if (!r.ok) {
      console.error("[ZIPNOVA QUOTE] HTTP error", { status: r.status, url, payload, response: data });
    }

    // ------------------------
    // Normalización options
    // ------------------------
    let options: any[] = [];

    if (r.ok && Array.isArray((data as any)?.options)) {
      options = (data as any).options;
    }

    if (r.ok && options.length === 0) {
      const all = Array.isArray((data as any)?.all_results) ? (data as any).all_results : [];

      options = all
        .filter((x: any) => x?.selectable !== false)
        .map((x: any) => {
          const carrierName = x?.carrier?.name ?? "Carrier";
          const serviceName = x?.service_type?.name ?? x?.service_type?.code ?? "Servicio";
          const id = `${x?.carrier?.id ?? "c"}_${x?.service_type?.id ?? x?.service_type?.code ?? "s"}`;

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
              pickup_points_count: Array.isArray(x?.pickup_points) ? x.pickup_points.length : 0,
            },
          };
        })
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
  raw: {
    options_count: options.length,
    items_count: items.length,
    total_weight_grams: totalWeight,
    quote_mode,
  },
});


    const selected =
      options.find((o: any) => Array.isArray(o?.meta?.tags) && o.meta.tags.includes("cheapest")) ?? options[0];

    if (selected) {
      await appendShippingEvent({
        event_type: "quote_selected",
        provider: "zipnova",
        account_id: ACCOUNT_ID,
        origin_id: ORIGIN_ID,
        destination_zipcode: destZip,
        option_id: selected.id,
        option_name: selected.name,
        price: selected.price,
        eta: selected?.meta?.eta ?? "",
        carrier_id: selected?.meta?.carrier_id ?? "",
        service_type_id: selected?.meta?.service_type_id ?? "",
        service_code: selected?.meta?.service_code ?? "",
        raw: { selected_id: selected.id },
      });
    }

    // ------------------------
    // Respuesta
    // ------------------------
    if (r.ok && options.length > 0) {
      return NextResponse.json(
        { ok: true, status: r.status, options, ...(debug ? { payloadSent: payload, zipnova_raw: data } : {}) },
        { status: 200 }
      );
    }

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
      { ok: false, error: e?.message ?? "Unknown error", options: [{ id: "zipnova_est", name: "Zipnova (estimado)", price: 12000 }] },
      { status: 200 }
    );
  }
}
