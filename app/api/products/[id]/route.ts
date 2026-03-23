// app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { google } from "googleapis";
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
  const raw = String(v ?? "").trim();
  if (!raw) return 0;

  let s = raw.replace(/\s/g, "").replace(/\$/g, "");

  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  } else {
    const parts = s.split(".");
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      s = parts.join("");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

async function getSheets() {
  const email = mustEnv("GOOGLE_SHEETS_CLIENT_EMAIL");
  const key = normalizeKey(mustEnv("GOOGLE_SHEETS_PRIVATE_KEY"));

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
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
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // 1) Producto base desde products.json
    const base = (products as any[]).find((p) => toStr(p?.id) === id);
    if (!base) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const baseVariants = Array.isArray(base?.variants) ? base.variants : [];

    function findBaseVariantMatch(sku: string, size: string) {
      return (
        baseVariants.find((bv: any) => toStr(bv?.sku) === sku) ||
        baseVariants.find(
          (bv: any) => toStr(bv?.size).toLowerCase() === size.toLowerCase()
        ) ||
        null
      );
    }

    // Fallback final solo si no hay nada mejor
    const fallbackImages: string[] =
      (Array.isArray(base?.images) && base.images.filter(Boolean)) ||
      ["/product/placeholder.png"];

    // 2) Variantes desde SHEET
    const sheets = await getSheets();
    const VARIANTS_SHEET_ID = mustEnv("VARIANTS_SHEET_ID");
    const VARIANTS_SHEET_NAME = mustEnv("VARIANTS_SHEET_NAME");

    const vRows = await readAll(sheets, VARIANTS_SHEET_ID, VARIANTS_SHEET_NAME);

    if (!vRows.length) {
      return NextResponse.json(base, { status: 200 });
    }

    const vH = headerMap(vRows);

    // 3) Filtrar filas del producto
    const rowsForProduct = vRows
      .slice(1)
      .filter((r) => toStr(getCell(r, vH, "product_id")) === id);

    if (!rowsForProduct.length) {
      return NextResponse.json(base, { status: 200 });
    }

    // 4) Armar variantes desde sheet + imágenes desde JSON
    const variantsFromSheet = rowsForProduct
      .map((r) => {
        const status = toStr(getCell(r, vH, "status")) || "active";
        if (status && status !== "active") return null;

        const size = toStr(getCell(r, vH, "size"));
        const sku = toStr(getCell(r, vH, "sku"));

        const baseMatch = findBaseVariantMatch(sku, size);

        const resolvedImages =
          (Array.isArray(baseMatch?.images) && baseMatch.images.filter(Boolean)) ||
          (baseMatch?.image ? [baseMatch.image] : null) ||
          (baseMatch?.imageUrl ? [baseMatch.imageUrl] : null) ||
          (baseMatch?.img ? [baseMatch.img] : null) ||
          fallbackImages;

        return {
          size,
          sku,
          priceRetail: toNum(getCell(r, vH, "priceRetail")),
          priceWholesale: toNum(getCell(r, vH, "priceWholesale")),
          stock: toNum(getCell(r, vH, "stock")),
          status,

          image: baseMatch?.image ?? null,
          imageUrl: baseMatch?.imageUrl ?? null,
          img: baseMatch?.img ?? null,
          images: resolvedImages,
        };
      })
      .filter(Boolean) as any[];

    // 5) Deduplicar por SKU
    const seen = new Set<string>();
    const cleanVariants: any[] = [];

    for (const v of variantsFromSheet) {
      if (!v?.sku) continue;
      if (seen.has(v.sku)) continue;
      seen.add(v.sku);
      cleanVariants.push(v);
    }

    // 6) Ordenar
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