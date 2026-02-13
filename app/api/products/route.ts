import { NextResponse } from "next/server";
import { google } from "googleapis";
import { withVariantImages } from "@/lib/withVariantImages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCredentials() {
  const raw = process.env.GOOGLE_SHEETS_SA_B64;
  if (!raw) throw new Error("Falta GOOGLE_SHEETS_SA_B64");

  const txt = raw.trim().startsWith("{")
    ? raw.trim()
    : Buffer.from(raw.trim(), "base64").toString("utf-8");

  return JSON.parse(txt);
}

export async function GET() {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  const sheetName = process.env.PRODUCTS_SHEET_NAME;

  if (!sheetId || !sheetName) {
    return NextResponse.json(
      { ok: false, error: "Missing sheet envs" },
      { status: 500 }
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const range = `${sheetName}!A:Z`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return NextResponse.json([]);

  const headers = rows[0];
 const products = rows.slice(1).map((r) => {
  const o: any = {};
  headers.forEach((h, i) => (o[h] = r[i] ?? ""));

  // ✅ NORMALIZACIÓN CRÍTICA: asegurá o.id
  o.id =
    o.id ??
    o.ID ??
    o.Id ??
    o.product_id ??
    o.productId ??
    o.productID ??
    o.slug ??
    "";

  // por las dudas: siempre string
  o.id = String(o.id || "").trim();

  return o;
});



const cooked = withVariantImages(products as any);

// DEBUG: cuántos vienen con fotos reales
const total = cooked.length;
const withReal = cooked.filter((p: any) => Array.isArray(p.images) && p.images[0] && !String(p.images[0]).includes("placeholder")).length;

console.log("[api/products] total:", total, "withRealImages:", withReal);
console.log("[api/products] sample:", {
  id: (cooked as any)[0]?.id,
  name: (cooked as any)[0]?.name,
  images0: (cooked as any)[0]?.images?.[0],
});

return NextResponse.json(cooked, {
  headers: { "Cache-Control": "no-store" },
});
}
