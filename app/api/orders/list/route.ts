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

function normalizePhone(v: unknown) {
  return String(v ?? "").replace(/\D/g, "");
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

        // Columnas reales en Orders:
    // A fecha
    // B Numero de orden
    // C external_reference
    // D estado
    // E concepto
    // F precio final
    // G nombre
    // H telefono
    // I ciudad
    // J direccion
    // K cuit
    // L tipo
    // M detalle
    // N payment_id
    // O payment_status
    // P shipment_id
    // Q shipment_status
    // R shipping_cost
    // S shipping_provider
    // T shipping_option_id
    // U shipping_option_name
    // V shipping_price
    // W shipping_eta
    // X shipping_meta

        const orders = rows
      .filter((row) => {
        const rowPhone = normalizePhone(row?.[7]); // H = telefono
        const queryPhone = normalizePhone(phone);
        const matchesPhone = !!queryPhone && rowPhone === queryPhone;
        return matchesPhone;
      })
      .map((row) => ({
        createdAt: safeStr(row?.[0]),   // A
        id: safeStr(row?.[1]),          // B
        status: safeStr(row?.[3]),      // D
        total: Number(row?.[5] ?? 0),   // F
        shipmentId: safeStr(row?.[15]), // P
        priceMode: safeStr(row?.[4]) as "mayorista" | "minorista" | "", // E
      }));

      return NextResponse.json({
      ok: true,
      orders,
      debug: {
        phoneReceived: phone,
        phoneNormalized: normalizePhone(phone),
        totalRows: rows.length,
      },
    });
  } catch (e: any) {
    console.error("GET /api/orders/list ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}