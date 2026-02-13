// lib/server/zipnova.ts
export const runtime = "nodejs";

type QuoteItem = {
  sku: string;
  weight: number;   // gramos
  height: number;   // cm
  width: number;    // cm
  length: number;   // cm
  description: string;
  classification_id: number;
};

type QuoteInput = {
  declared_value: number;
  destination: {
    city: string;
    state: string;
    zipcode: string;
  };
  items: QuoteItem[];
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function basicAuthHeader(token: string, secret: string) {
  const raw = `${token}:${secret}`;
  const b64 = Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${b64}`;
}

const API_BASE = "https://api.zipnova.com.ar/v2";

async function zipnovaFetch(path: string, body?: any) {
  const token = mustEnv("ZIPNOVA_API_KEY");
  const secret = mustEnv("ZIPNOVA_API_SECRET");

  const url = `${API_BASE}${path}`;

  const r = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(token, secret),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  let data: any = null;
  try {
    data = await r.json();
  } catch {
    // noop
  }

  if (!r.ok) {
    // IMPORTANTE: devolvemos el body real para debug
    const msg =
      data?.message ||
      data?.error ||
      data?.errors ||
      JSON.stringify(data) ||
      `HTTP ${r.status}`;
    throw new Error(`ZIPNOVA ${path} failed (${r.status}): ${msg}`);
  }

  return data;
}

/**
 * Quote: /shipments/quote
 * OJO: requiere account_id + origin_id (de tu cuenta Zipnova)
 */
export async function zipnovaQuote(input: QuoteInput) {
  const account_id = mustEnv("ZIPNOVA_ACCOUNT_ID");
  const origin_id = mustEnv("ZIPNOVA_ORIGIN_ID");

  const payload = {
    account_id: String(account_id),
    origin_id: String(origin_id),
    declared_value: Number(input.declared_value || 0),
    items: input.items,
    destination: input.destination,
  };

  return zipnovaFetch("/shipments/quote", payload);
}

/**
 * Create shipment: /shipments
 * (esto después; primero que funcione quote)
 */
export async function zipnovaCreateShipment(payload: any) {
  return zipnovaFetch("/shipments", payload);
}
export { zipnovaCreateShipment as createZipnovaShipment };
