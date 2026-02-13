import { NextResponse } from "next/server";
import { getSheetRows } from "@/lib/lib/sheets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await getSheetRows("home_blocks");

    // Normalizamos: si viene raro, que no rompa
    const safeRows = Array.isArray(rows) ? rows : [];

    return NextResponse.json({
      ok: true,
      count: safeRows.length,
      first: safeRows[0] ?? null,
      rows: safeRows,
    });
  } catch (err: any) {
    // Log real en terminal (no en el cliente)
    console.error("[home-blocks] GET failed:", err?.message ?? err);

    // NO tiramos 500 para que la app no se caiga
    return NextResponse.json(
      {
        ok: false,
        error: "home_blocks_unavailable",
        message: "No se pudo leer home_blocks en Sheets.",
        rows: [],
        count: 0,
        first: null,
      },
      { status: 200 }
    );
  }
}
