import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function normalizeDigits(v: unknown) {
  return safeStr(v).replace(/\D/g, "");
}

function mapStatus(raw: string) {
  const s = safeStr(raw).toLowerCase();

  if (s === "aprobado" || s === "approved") return "approved";
  if (s === "rechazado" || s === "rejected") return "rejected";
  if (s === "pendiente" || s === "pending") return "pending";

  return "none";
}

export async function GET(req: NextRequest) {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

    const cuit = normalizeDigits(req.nextUrl.searchParams.get("cuit"));
    const phone = normalizeDigits(req.nextUrl.searchParams.get("phone"));

    if (!cuit && !phone) {
      return NextResponse.json(
        { ok: false, error: "Missing cuit or phone" },
        { status: 400 }
      );
    }

    const auth = getGoogleClient();
    const sheets = google.sheets({ version: "v4", auth });

    const TAB = "SH Rosario - Mayoristas";

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${TAB}!A2:Z`,
    });

    const rows = res.data.values ?? [];

    // A fecha
    // B estado
    // C cuit
    // D razon_social
    // E condicion_fiscal
    // F ciudad
    // G telefono
    const matches = rows.filter((row) => {
      const rowCuit = normalizeDigits(row?.[2]);
      const rowPhone = normalizeDigits(row?.[6]);

      const matchByCuit = !!cuit && rowCuit === cuit;
      const matchByPhone = !!phone && rowPhone === phone;

      return matchByCuit || matchByPhone;
    });

    if (!matches.length) {
      return NextResponse.json({
        ok: true,
        status: "none",
      });
    }

    // Tomamos la ÚLTIMA coincidencia
    const row = matches[matches.length - 1];

    return NextResponse.json({
      ok: true,
      status: mapStatus(row?.[1]),
      request: {
        fecha: safeStr(row?.[0]),
        cuit: normalizeDigits(row?.[2]),
        razonSocial: safeStr(row?.[3]),
        condicionFiscal: safeStr(row?.[4]),
        ciudad: safeStr(row?.[5]),
        telefono: normalizeDigits(row?.[6]),
      },
    });
  } catch (e: any) {
    console.error("GET /api/wholesale/status ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}