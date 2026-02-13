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

function rowsToConfig(rows: any[][]) {
  const out: Record<string, string> = {};
  for (const r of rows || []) {
    const key = String(r?.[0] ?? "").trim();
    const value = String(r?.[1] ?? "").trim();
    if (key) out[key] = value;
  }
  return out;
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

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "settings!A:B",
    });

    const rows = res.data.values ?? [];
    const cfg = rowsToConfig(rows);

    return NextResponse.json({
      ok: true,
      config: {
        whatsapp_number: cfg.whatsapp_number ?? "",
        wholesale_code: cfg.wholesale_code ?? "",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
