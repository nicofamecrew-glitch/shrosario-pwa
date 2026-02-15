import { google } from "googleapis";
import "server-only";

export const runtime = "nodejs";

/* ================= CREDENCIALES ================= */

function getCredentials() {
  const raw = process.env.GOOGLE_SHEETS_SA_B64;
  if (!raw) throw new Error("Falta GOOGLE_SHEETS_SA_B64");

  const txt = raw.trim().startsWith("{")
    ? raw.trim()
    : Buffer.from(raw.trim(), "base64").toString("utf-8");

  return JSON.parse(txt);
}

function getSheetsClient(scopes: string[]) {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes,
  });

  return google.sheets({ version: "v4", auth });
}

/* ================= HELPERS LECTURA ================= */

function normalizeHeader(h: any) {
  return String(h ?? "").trim();
}

function rowIsEmpty(row: any[]) {
  return !row?.some((v) => String(v ?? "").trim().length > 0);
}

/**
 * Lee una pestaña y devuelve objetos (1er fila = headers)
 * Ej: home_blocks!A:Z
 */
export async function getSheetRows(sheetName: string) {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

  const sheets = getSheetsClient([
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ]);

  const range = `${sheetName}!A:Z`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const values = (res.data.values ?? []) as any[][];

  if (values.length === 0) return [];

  const headers = (values[0] ?? []).map(normalizeHeader);
  const hasAnyHeader = headers.some((h) => h.length > 0);
  if (!hasAnyHeader) return [];

  const dataRows = values.slice(1).filter((r) => !rowIsEmpty(r));

  return dataRows.map((row) => {
    const obj: Record<string, any> = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      if (!key) continue;
      obj[key] = row[i] ?? "";
    }
    return obj;
  });
}

/* ================= HELPERS ESCRITURA ================= */

/**
 * Append genérico (RAW) a un range.
 * Ej: appendRow("mp_events", "A:H", [...])
 */
export async function appendRow(
  sheetName: string,
  rangeCols: string, // "A:H" / "A:O"
  row: (string | number)[]
) {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

  const sheets = getSheetsClient(["https://www.googleapis.com/auth/spreadsheets"]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!${rangeCols}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

/* ================= ESCRITURA EVENTOS SHIPMENTS ================= */

export type ShipmentEvent = {
  timestamp: string;
  topic: string;
  shipment_id: string;
  status: string;
  status_internal: string;
  raw_payload: string;
};

export async function appendShipmentEvent(event: ShipmentEvent) {
  return appendRow("shipments_events", "A:F", [
    event.timestamp,
    event.topic,
    event.shipment_id,
    event.status,
    event.status_internal,
    event.raw_payload,
  ]);
}

/* ================= ESCRITURA EVENTOS MP ================= */

export type MpEvent = {
  timestamp: string;
  type: string;
  action: string;
  payment_id: string;
  merchant_order_id: string;
  status: string;
  external_reference: string;
  raw_payload: string;
};

/**
 * Mantengo tu firma actual para no romper imports existentes.
 * OJO: el sheetName que le pases debe tener 8 columnas (A:H).
 */
export async function appendMpEvent(sheetName: string, row: (string | number)[]) {
  return appendRow(sheetName, "A:H", row);
}

/* ================= ESCRITURA EVENTOS SHIPPING (ZIPNOVA) ================= */

export type ShippingEvent = {
  created_at?: string; // ISO
  event_type: string; // "quote_created" | "quote_selected" | "order_confirmed" etc
  order_id?: string;

  provider?: string; // "zipnova"
  account_id?: number | string;
  origin_id?: number | string;
  destination_zipcode?: string;

  option_id?: string; // "208_1"
  option_name?: string; // "OCA - Entrega a domicilio"
  price?: number;

  eta?: string | null;

  carrier_id?: number | string | null;
  service_type_id?: number | string | null;
  service_code?: string | null;

  raw?: any; // opcional (se stringify)
};

/**
 * Escribe en la sheet: shipping_events (A:O)
 * Headers esperados:
 * created_at | event_type | order_id | provider | account_id | origin_id | destination_zipcode | option_id | option_name | price | eta | carrier_id | service_type_id | service_code | raw
 */
export async function appendShippingEvent(ev: ShippingEvent) {
  const created_at = ev.created_at ?? new Date().toISOString();

  const row: (string | number)[] = [
    created_at,
    ev.event_type ?? "",
    ev.order_id ?? "",
    ev.provider ?? "zipnova",
    ev.account_id ?? "",
    ev.origin_id ?? "",
    ev.destination_zipcode ?? "",
    ev.option_id ?? "",
    ev.option_name ?? "",
    typeof ev.price === "number" ? Math.round(ev.price) : "",
    ev.eta ?? "",
    ev.carrier_id ?? "",
    ev.service_type_id ?? "",
    ev.service_code ?? "",
    ev.raw ? JSON.stringify(ev.raw) : "",
  ];

  return appendRow("shipping_events", "A:O", row);
}

/* ================= ZIP CACHE (CP -> CIUDAD/PROVINCIA) ================= */

export type ZipCacheRow = {
  zipcode: string;
  city: string;
  state: string;
  destination_id?: string;
  updated_at?: string;
};

/**
 * Busca un CP en la pestaña "zip_cache".
 * Requiere headers: zipcode | city | state | destination_id | updated_at
 */
export async function getZipCache(zipcode: string): Promise<ZipCacheRow | null> {
  const z = String(zipcode ?? "").trim().replace(/\D/g, "");
  if (!z) return null;

  const rows = await getSheetRows("zip_cache");
  if (!rows?.length) return null;

  const found = rows.find((r: any) => String(r.zipcode ?? "").trim() === z);
  if (!found) return null;

  return {
    zipcode: z,
    city: String(found.city ?? "").trim().toLowerCase(),
    state: String(found.state ?? "").trim().toLowerCase(),
    destination_id: String(found.destination_id ?? "").trim() || undefined,
    updated_at: String(found.updated_at ?? "").trim() || undefined,
  };
}

export async function upsertZipCache(row: {
  zipcode: string;
  city: string;
  state: string;
  destination_id?: string | number | null;
}) {
  const zipcode = String(row.zipcode ?? "").trim().replace(/\D/g, "");
  const city = String(row.city ?? "").trim().toLowerCase();
  const state = String(row.state ?? "").trim().toLowerCase();
  const destination_id =
    row.destination_id == null ? "" : String(row.destination_id).trim();
  const updated_at = new Date().toISOString();

  if (!zipcode || !city || !state) {
    throw new Error("upsertZipCache requires zipcode, city, state");
  }

  const existing = await getZipCache(zipcode);
  if (existing) return { ok: true, action: "exists", zipcode };

  await appendRow("zip_cache", "A:E", [zipcode, city, state, destination_id, updated_at]);
  return { ok: true, action: "inserted", zipcode };
}

/* ================= PESOS POR SKU (variants -> gramos) ================= */

function normKey(k: any) {
  return String(k ?? "").trim().toLowerCase();
}

function pickFirst(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return null;
}

function parseNumberLoose(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lee la sheet "variants" y devuelve un Record SKU -> gramos.
 * Columnas aceptadas:
 * - sku / sku_code / sku_id / codigo
 * - grams / gramos / weight_g / peso_g
 * - weight / peso / kg / weight_kg (si <50 se asume kg y se pasa a gramos)
 */
export async function getSkuGramsMap(): Promise<Record<string, number>> {
  const rows = await getSheetRows("variants");
  const map: Record<string, number> = {};

  for (const r0 of rows as any[]) {
    const r: any = {};
    for (const k of Object.keys(r0)) r[normKey(k)] = r0[k];

    const sku = String(
      pickFirst(r, ["sku", "sku_code", "sku_id", "codigo", "código"]) ?? ""
    )
      .trim()
      .toUpperCase();

    if (!sku) continue;

    let grams =
      parseNumberLoose(pickFirst(r, ["grams", "gramos", "weight_g", "peso_g", "g"])) ??
      null;

    if (grams == null) {
      const w = parseNumberLoose(pickFirst(r, ["weight", "peso", "kg", "weight_kg"]));
      if (w != null) grams = w < 50 ? Math.round(w * 1000) : Math.round(w);
    }

    if (grams == null || grams <= 0) continue;
    map[sku] = Math.round(grams);
  }

  return map;
}

/* ================= UTILIDAD: STATUS DE ORDER ================= */

export async function updateOrderStatus(orderId: string, status: string) {
  await appendMpEvent("orders", [new Date().toISOString(), orderId, status]);
}
