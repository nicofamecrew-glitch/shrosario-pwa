import { google } from "googleapis";
import "server-only";

function getCredentials() {
  const raw = process.env.GOOGLE_SHEETS_SA_B64;
  if (!raw) throw new Error("Falta GOOGLE_SHEETS_SA_B64");

  const txt = raw.trim().startsWith("{")
    ? raw.trim()
    : Buffer.from(raw.trim(), "base64").toString("utf-8");

  return JSON.parse(txt);
}

function rowsToObjects(rows: any[][]) {
  if (!rows || rows.length <= 1) return [];
  const headers = rows[0].map((h) => String(h).trim());

  return rows
    .slice(1)
    .filter((r) => r.some((cell) => String(cell ?? "").trim() !== ""))
    .map((r) => {
      const obj: any = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        if (!key) continue;
        obj[key] = r[i] ?? "";
      }
      return obj;
    });
}

function normalizeTags(raw: any): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  return String(raw ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toNum(v: any): number {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// ----------------------
// CACHE EN MEMORIA (TTL)
// ----------------------
let _catalogCache: any[] | null = null;
let _catalogCacheAt = 0;
let _catalogInFlight: Promise<any[]> | null = null;

// Ajustá si querés: 60s es buen balance.
const CATALOG_TTL_MS = 60_000;

async function loadCatalogFromSheets(): Promise<any[]> {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

  const PRODUCTS_SHEET_NAME = process.env.PRODUCTS_SHEET_NAME ?? "products";
  const VARIANTS_SHEET_NAME = process.env.VARIANTS_SHEET_NAME ?? "variants";

  if (!PRODUCTS_SHEET_NAME.trim()) throw new Error("Falta PRODUCTS_SHEET_NAME");
  if (!VARIANTS_SHEET_NAME.trim()) throw new Error("Falta VARIANTS_SHEET_NAME");

  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const [pRes, vRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${PRODUCTS_SHEET_NAME}!A:Z`,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${VARIANTS_SHEET_NAME}!A:Z`,
    }),
  ]);

  const products = rowsToObjects((pRes.data.values ?? []) as any[][]);
  const variants = rowsToObjects((vRes.data.values ?? []) as any[][]);

  const byProductId = new Map<string, any[]>();
  for (const v of variants) {
    const pid = String(v.product_id ?? "").trim();
    if (!pid) continue;
    const arr = byProductId.get(pid) ?? [];
    arr.push(v);
    byProductId.set(pid, arr);
  }

  const catalog = products
    .map((p: any) => {
      const id = String(p.id ?? "").trim();
      const vs = byProductId.get(id) ?? [];

      const active = vs.filter((x) => String(x.status ?? "active") !== "paused");

      const retailNums = active
        .map((x) => toNum(x.priceRetail))
        .filter((n) => n > 100);

      const wholesaleNums = active
        .map((x) => toNum(x.priceWholesale))
        .filter((n) => n > 100);

      const priceRetailFrom = retailNums.length ? Math.min(...retailNums) : null;
      const priceWholesaleFrom = wholesaleNums.length ? Math.min(...wholesaleNums) : null;

      return {
        ...p,
        tags: normalizeTags(p.tags),
        priceRetailFrom,
        priceWholesaleFrom,
        variants: active.map((v: any) => ({
          size: String(v.size ?? ""),
          sku: String(v.sku ?? ""),
          priceRetail: toNum(v.priceRetail),
          priceWholesale: toNum(v.priceWholesale),
          stock: String(v.stock ?? ""),
          status: String(v.status ?? "active"),
          _row: Number(v._row ?? 0),
        })),
      };
    })
    .filter((p: any) => Array.isArray(p.variants) && p.variants.length > 0);

  return catalog;
}

export async function getCatalog() {
  const now = Date.now();

  // HIT de cache
  if (_catalogCache && now - _catalogCacheAt < CATALOG_TTL_MS) {
    return _catalogCache;
  }

  // Evita “thundering herd”: si entran 10 requests juntos, 1 sola pega a Sheets
  if (_catalogInFlight) {
    return _catalogInFlight;
  }

  _catalogInFlight = (async () => {
    const fresh = await loadCatalogFromSheets();
    _catalogCache = fresh;
    _catalogCacheAt = Date.now();
    return fresh;
  })();

  try {
    return await _catalogInFlight;
  } finally {
    _catalogInFlight = null;
  }
}
