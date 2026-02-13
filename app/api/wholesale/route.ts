import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: "'SH Rosario - Mayoristas'!A:G",

      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          new Date().toISOString(),
          "pending",
          body.cuit,
          body.razonSocial,
          body.condicionFiscal,
          body.ciudad,
          body.telefono,
        ]],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WHOLESALE POST ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
