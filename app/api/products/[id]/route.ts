import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function getCredentials() {
  const raw = process.env.GOOGLE_SHEETS_SA_B64;
  if (!raw) throw new Error("Falta GOOGLE_SHEETS_SA_B64");
  const txt = raw.trim().startsWith("{")
    ? raw.trim()
    : Buffer.from(raw.trim(), "base64").toString("utf-8");
  return JSON.parse(txt);
}

function normKey(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

async function getSheetRows(sheetName: string) {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID!;
  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:Z`,
  });

  const values = res.data.values ?? [];
  if (values.length === 0) return [];

  const [headersRaw, ...rows] = values;

  // ✅ normaliza headers (clave del bug)
  const headers = headersRaw.map((h: any) => normKey(h));

  return rows.map((row) =>
    headers.reduce((acc: any, key: string, i: number) => {
      acc[key] = row[i] ?? "";
      return acc;
    }, {})
  );
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const productId = normKey(params.id);

  const products = await getSheetRows("products");
  const variants = await getSheetRows("variants");

  // ✅ DEBUG: si querés, dejalo 1 minuto para ver keys reales
  // return NextResponse.json(
  //   { received: productId, sampleKeys: Object.keys(products[0] ?? {}), sampleRow: products[0] ?? null },
  //   { status: 200 }
  // );

  const product = products.find((p: any) => normKey(p.id) === productId);
  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado", received: productId, sampleKeys: Object.keys(products[0] ?? {}) },
      { status: 404 }
    );
  }

  const productVariants = variants
    .filter((v: any) => normKey(v.product_id) === productId && normKey(v.status) === "active")
    .map((v: any) => ({
      size: v.size,
      sku: v.sku,
      // OJO: si en Sheets tus headers son "priceRetail" y los normalizamos, pasa a "priceretail"
      // Por eso leo ambas variantes:
      priceRetail:
        parseFloat(String(v.priceretail ?? v.priceretail ?? v.priceretail ?? v.priceretail ?? v.priceretail ?? v.priceretail)) ||
        parseFloat(String(v.priceretail ?? v.priceretail).replace(",", ".")) ||
        parseFloat(String(v.priceretail ?? v.priceretail).replace(",", ".")) ||
        0,
      priceWholesale:
        parseFloat(String(v.pricewholesale ?? v.pricewholesale).replace(",", ".")) || 0,
      stock: Number(v.stock) || 0,
    }));

  const response = {
    ...product,
    variants: productVariants,
    images: product.image ? [product.image] : [],
    tags: String(product.tags ?? "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean),
  };

  return NextResponse.json(response);
}
