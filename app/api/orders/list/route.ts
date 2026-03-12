export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

    const { searchParams } = new URL(req.url);
    const phone = safeStr(searchParams.get("phone"));
    const email = safeStr(searchParams.get("email"));

    if (!phone && !email) {
      return NextResponse.json(
        { ok: false, error: "Missing phone or email" },
        { status: 400 }
      );
    }

    const auth = getGoogleClient();
    const sheets = google.sheets({ version: "v4", auth });

    const TAB = "Orders";

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${TAB}!A2:Z`,
    });

    const rows = res.data.values ?? [];

    // Suposición actual de columnas:
    // A createdAt
    // B orderId
    // C status
    // E total
    // G phone
    // H city
    // I shipmentId (si existe)
    // J priceMode (si existe)
    // K email (si existe)  <-- AJUSTAR si tu columna real es otra
    //
    // OJO: si email no está todavía guardado en Orders, esta parte no va a encontrar nada por email.
    // En ese caso seguirá funcionando por phone.

    const orders = rows
      .filter((row) => {
        const rowPhone = safeStr(row?.[6]); // G
        const rowEmail = safeStr(row?.[10]).toLowerCase(); // K (ajustar si hace falta)

        const matchesEmail = !!email && rowEmail === email.toLowerCase();
        const matchesPhone = !!phone && rowPhone === phone;

        return matchesEmail || matchesPhone;
      })
      .map((row) => ({
        createdAt: safeStr(row?.[0]),
        id: safeStr(row?.[1]),
        status: safeStr(row?.[2]),
        total: Number(row?.[4] ?? 0),
        shipmentId: safeStr(row?.[8]), // I si existe
        priceMode: safeStr(row?.[9]) as "mayorista" | "minorista" | "",
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