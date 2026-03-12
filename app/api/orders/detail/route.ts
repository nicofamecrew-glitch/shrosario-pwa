import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function getGoogleClient() {
  const b64 = process.env.GOOGLE_SHEETS_SA_B64;
  if (!b64) throw new Error("Missing GOOGLE_SHEETS_SA_B64");

  const json = Buffer.from(b64, "base64").toString("utf8");
  const creds = JSON.parse(json);

  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get("id");
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const auth = getGoogleClient();
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      range: "Order_Items!A:F",
    });

    const rows = res.data.values ?? [];

    const items = rows
      .filter((r) => r[0] === orderId)
      .map((r) => ({
        productId: r[1],
        sku: r[1],
        name: r[2],
        qty: Number(r[3] || 0),
        unitPrice: Number(r[4] || 0),
      }));

    const total = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

    return NextResponse.json({
      ok: true,
      order: {
        id: orderId,
        items,
        total,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}