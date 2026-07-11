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
      range: "'SH Rosario - Mayoristas'!A:H",
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
          body.device_id || "",
        ]],
      },
    });

  try {
  const pushRes = await fetch(
    "https://admin.appshrosario.store/api/admin/push/notify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-push-secret": process.env.INTERNAL_PUSH_SECRET || "",
      },
      body: JSON.stringify({
        title: "🏪 Nueva solicitud mayorista",
        body: `${body.razonSocial || "Un cliente"} · ${
          body.ciudad || "Sin ciudad"
        }`,
        url: "/admin/mayorista",
      }),
    }
  );

  const pushData = await pushRes.json();

  if (!pushRes.ok || !pushData?.ok) {
    console.error("WHOLESALE PUSH ERROR:", pushData);
  }
} catch (pushErr) {
  console.error("WHOLESALE PUSH ERROR:", pushErr);
}

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WHOLESALE POST ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}