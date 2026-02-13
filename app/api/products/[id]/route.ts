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

function toNum(v: any) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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

  // normaliza headers => todo lowercase
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

  const [products, variants] = await Promise.all([
    getSheetRows("products"),
    getSheetRows("variants"),
  ]);

  const product = products.find((p: any) => normKey(p.id) === productId);
  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado", received: productId },
      { status: 404 }
    );
  }

  const productVariants = variants
    .filter((v: any) => {
      if (normKey(v.product_id) !== productId) return false;

      // ✅ si no hay status, lo tomamos como active
      const st = normKey(v.status || "active");

      // ✅ solo excluimos paused (y opcionalmente otros)
      if (st === "paused") return false;

      return true;
    })
    .map((v: any) => ({
      size: String(v.size ?? ""),
      sku: String(v.sku ?? ""),
      priceRetail: toNum(v.priceretail ?? v.priceretail), // header normalizado => priceretail
      priceWholesale: toNum(v.pricewholesale),
      stock: toNum(v.stock),
      status: String(v.status || "active"),
    }))
    .filter((v: any) => v.sku); // defensivo

  return NextResponse.json({
    ...product,
    variants: productVariants,
    images: product.image ? [product.image] : [],
    tags: String(product.tags ?? "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean),
  });
}
