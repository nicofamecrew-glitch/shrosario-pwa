import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function privateKeyFix(k: string) {
  // En Vercel suele venir con \n escapados
  return k.replace(/\\n/g, "\n");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sku = String(searchParams.get("sku") ?? "").trim();

    if (!sku) {
      return NextResponse.json({ error: "Missing sku" }, { status: 400 });
    }

    const SHEET_ID = must("GOOGLE_SHEETS_SPREADSHEET_ID");
    const CLIENT_EMAIL = must("GOOGLE_SHEETS_CLIENT_EMAIL");
    const PRIVATE_KEY = privateKeyFix(must("GOOGLE_SHEETS_PRIVATE_KEY"));

    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Lee toda la pestaña (ajustá columnas si agregás más)
    const range = "DESCRIPTIONS!A:Z";

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    const rows = (resp.data.values ?? []) as string[][];
    if (rows.length < 2) {
      return NextResponse.json({ error: "No data" }, { status: 404 });
    }

    const headers = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
    const iSku = headers.indexOf("sku");
    const iShort = headers.indexOf("short");
    const iLong = headers.indexOf("long");
    const iBenefits = headers.indexOf("benefits");
    const iUsage = headers.indexOf("usage");

    if (iSku === -1) {
      return NextResponse.json(
        { error: "Header 'sku' not found in DESCRIPTIONS" },
        { status: 500 }
      );
    }

    const target = sku.toLowerCase();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      const rowSku = String(row[iSku] ?? "").trim();
      if (!rowSku) continue;

      if (rowSku.toLowerCase() === target) {
        const short = iShort >= 0 ? String(row[iShort] ?? "").trim() : "";
        const long = iLong >= 0 ? String(row[iLong] ?? "").trim() : "";
        const benefitsRaw = iBenefits >= 0 ? String(row[iBenefits] ?? "").trim() : "";
        const usage = iUsage >= 0 ? String(row[iUsage] ?? "").trim() : "";

        const benefits =
          benefitsRaw && benefitsRaw.includes("|")
            ? benefitsRaw
                .split("|")
                .map((b) => b.trim())
                .filter((b) => b.length > 0)
            : benefitsRaw
            ? [benefitsRaw]
            : [];

        return NextResponse.json(
          {
            sku: rowSku,
            short,
            long,
            benefits,
            usage,
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
