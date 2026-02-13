// app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { google } from "googleapis";

// Ajustá este import si tu ruta difiere.
// En tu repo normalmente es: data/products.json
import products from "@/data/products.json";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeKey(raw: string) {
  let k = String(raw ?? "");
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1);
  }
  k = k.replace(/\\n/g, "\n");
  return k.trim();
}

function toStr(v: any) {
  return String(v ?? "").trim();
}

function toNum(v: any) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

async function getSheets() {
  const email = mustEnv("GOOGLE_SHEETS_CLIENT_EMAIL");
  const key = normalizeKey(mustEnv("GOOGLE_SHEETS_PRIVATE_KEY"));

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

async function readAll(sheets: any, spreadsheetId: string, sheetName: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
  return (res.data.values || []) as string[][];
}

function headerMap(rows: string[][]) {
  const headers = (rows[0] || []).map((h) => String(h).trim());
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    if (h) map.set(h, i);
  });
  return map;
}

function getCell(row: any[], hmap: Map<string, number>, key: string) {
  const idx = hmap.get(key);
  if (idx === undefined) return "";
  return row[idx] ?? "";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const id = toStr(ctx?.params?.id);
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // 1) Producto base desde products.json
    const base = (products as any[]).find((p) => toStr(p?.id) === id);
    if (!base) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Imagen fallback para variantes nuevas (si el JSON tiene 1 sola imagen)
    const fallbackImages: string[] =
      (Array.isArray(base?.variants) &&
        base.variants[0] &&
        Array.isArray(base.variants[0].images) &&
        base.variants[0].images.filter(Boolean)) ||
      (Array.isArray(base?.images) && base.images.filter(Boolean)) ||
      ["/product/placeholder.png"];

    // 2) Variantes desde SHEET (la posta)
    const sheets = await getSheets();
    const VARIANTS_SHEET_ID = mustEnv("VARIANTS_SHEET_ID");
    const VARIANTS_SHEET_NAME = mustEnv("VARIANTS_SHEET_NAME");

    const vRows = await readAll(sheets, VARIANTS_SHEET_ID, VARIANTS_SHEET_NAME);
    if (!vRows.length) {
      // Si por algo el sheet está vacío, devolvemos el base para no romper
      return NextResponse.json(base, { status: 200 });
    }

    const vH = headerMap(vRows);

    // 3) Filtrar filas del producto
    const rowsForProduct = vRows
      .slice(1)
      .filter((r) => toStr(getCell(r, vH, "product_id")) === id);

    // Si no hay filas en Sheet, devolvemos el base
    if (!rowsForProduct.length) {
      return NextResponse.json(base, { status: 200 });
    }

    // 4) Armar variants normalizados desde sheet
    //    (y NO depender de products.json)
    const variantsFromSheet = rowsForProduct
      .map((r) => {
        const status = toStr(getCell(r, vH, "status")) || "active";
        if (status && status !== "active") return null; // si querés mostrar disabled, sacá esto

        return {
          size: toStr(getCell(r, vH, "size")),
          sku: toStr(getCell(r, vH, "sku")),
          priceRetail: toNum(getCell(r, vH, "priceRetail")),
          priceWholesale: toNum(getCell(r, vH, "priceWholesale")),
          stock: toNum(getCell(r, vH, "stock")),
          status,
          images: fallbackImages, // misma imagen para todos (por ahora)
        };
      })
      .filter(Boolean) as any[];

    // 5) Deduplicar por SKU por las dudas
    const seen = new Set<string>();
    const cleanVariants: any[] = [];
    for (const v of variantsFromSheet) {
      if (!v?.sku) continue;
      if (seen.has(v.sku)) continue;
      seen.add(v.sku);
      cleanVariants.push(v);
    }

    // 6) Orden: bases primero (1,3,4,5...) y después los reflejos
    cleanVariants.sort((a, b) =>
      String(a.size ?? "").localeCompare(String(b.size ?? ""), "es", {
        numeric: true,
      })
    );

    // 7) Respuesta final
    const merged = {
      ...base,
      variants: cleanVariants,
    };

    return NextResponse.json(merged, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
