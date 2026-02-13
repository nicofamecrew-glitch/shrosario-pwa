import { NextResponse } from "next/server";
import { google } from "googleapis";

function getServiceAccountFromEnv() {
  const b64 = process.env.GOOGLE_SHEETS_SA_B64;
  if (!b64) throw new Error("Falta GOOGLE_SHEETS_SA_B64 en .env.local");
  const json = Buffer.from(b64, "base64").toString("utf-8");
  return JSON.parse(json);
}

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID en .env.local");

    const sa = getServiceAccountFromEnv();

    const auth = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const sheets = google.sheets({ version: "v4", auth });

    const range = "home_carousel!A:H";
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const [, ...data] = rows; // saltea headers

   const items = data
  .map((r) => ({
    product_id: String(r[0] ?? "").trim(),
    brand: String(r[1] ?? "").trim(),
    variant_sku: String(r[2] ?? "").trim(),
    order: Number(r[3] ?? 999),
    active: String(r[4] ?? "").toUpperCase() === "TRUE",
  }))
  .filter((x) => x.product_id && x.variant_sku && x.active)
  .sort((a, b) => a.order - b.order);

return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Error leyendo home_carousel" },
      { status: 500 }
    );
  }
}
