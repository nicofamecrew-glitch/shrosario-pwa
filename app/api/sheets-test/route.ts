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

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

    const auth = new google.auth.GoogleAuth({
      credentials: getCredentials(),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Leer la pestaña "productos"
 const res = await sheets.spreadsheets.values.get({
  spreadsheetId: sheetId,
  range: "products!A:Z", // ajustá según el nombre real
});

    const values = res.data.values ?? [];

    return NextResponse.json({
      ok: true,
      count: values.length,
      head: values.slice(0, 5), // primeras 5 filas para validar
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
