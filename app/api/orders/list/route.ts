import { NextResponse } from "next/server";
import { google } from "googleapis";

function getGoogleClient() {
  const b64 = process.env.GOOGLE_SHEETS_SA_B64;
  if (!b64) throw new Error("Falta GOOGLE_SHEETS_SA_B64");

  const json = Buffer.from(b64, "base64").toString("utf8");
  const creds = JSON.parse(json);

  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function GET(req: Request) {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "Missing phone" },
        { status: 400 }
      );
    }

    const auth = getGoogleClient();
    const sheets = google.sheets({ version: "v4", auth });

    const TAB = "Orders";

    // Traemos todas las filas
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${TAB}!A2:Z`,
    });

    const rows = res.data.values ?? [];

    // Columnas según tu sheet:
    // A createdAt
    // B orderId
    // C status
    // E total
    // G phone
    const orders = rows
      .filter((row) => String(row?.[6] ?? "") === phone)
      .map((row) => ({
        createdAt: row[0],
        id: row[1],
        status: row[2],
        total: Number(row[4] ?? 0),
      }));

    return NextResponse.json({ ok: true, orders });
  } catch (e: any) {
    console.error("GET /api/orders/list ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}
