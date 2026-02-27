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
async function appendOrderItems(
  sheets: any,
  sheetId: string,
  orderId: string,
  items: any[]
) {
  const TAB_ITEMS = "Order_Items";

  const rows = items.map((it) => {
    const qty = it.qty ?? it.quantity ?? 1;
    const unit = it.unitPrice ?? 0;

    return [
      orderId,
      it.sku ?? "",
      it.name ?? it.productId ?? "",
      qty,
      unit,
      qty * unit,
    ];
  });

  if (!rows.length) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${TAB_ITEMS}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });
}

export async function POST(req: Request) {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

    const order = await req.json();

    const auth = getGoogleClient();
    const sheets = google.sheets({ version: "v4", auth });

    // ⚠️ LA PESTAÑA EN GOOGLE SHEETS DEBE LLAMARSE EXACTO ASÍ:
    const TAB = "Orders";

    const createdAt = order?.createdAt ?? new Date().toISOString();
    const orderId = order?.id ?? "";
    const total = order?.total ?? 0;
    const priceMode = order?.priceMode ?? "";
    const status = "Pendiente";

    const customer = order?.customer ?? {};
    const fullName = customer?.fullName ?? "";
    const phone = customer?.phone ?? "";
    const city = customer?.city ?? "";
    const address = customer?.address ?? "";
    const cuit = customer?.cuit ?? "";
    const businessType = customer?.businessType ?? "";

    const items = Array.isArray(order?.items) ? order.items : [];
    const externalRef =
  order?.external_reference ??
  order?.externalRef ??
  "";
    const itemsText = items
    
      .map((it: any) => {
        const brand = it?.brand ? `${it.brand} ` : "";
        const name = it?.name ?? it?.productId ?? "";
        const size = it?.size ? ` (${it.size})` : "";
        const sku = it?.sku ? ` SKU:${it.sku}` : "";
        const qty = it?.qty ?? 0;
        const unit = it?.unitPrice ?? 0;
        return `${qty}x ${brand}${name}${size} $${unit}${sku}`;
      })
      .join(" | ");

await sheets.spreadsheets.values.append({
  spreadsheetId: sheetId,
  range: `${TAB}!A1`,
  valueInputOption: "USER_ENTERED",
  requestBody: {
    values: [[
      createdAt,
      orderId,
      externalRef,
      status,
      priceMode,
      total,
      fullName,
      phone,
      city,
      address,
      cuit,
      businessType,
      itemsText,
    ]],
  },
});
await appendOrderItems(
  sheets,
  sheetId,
  orderId,
  items
);

    return NextResponse.json({ ok: true });
 } catch (e: any) {
  console.error("API /api/orders ERROR:", e);
  console.error("MESSAGE:", e?.message);
  console.error("STACK:", e?.stack);
  console.error("DETAILS:", e?.response?.data || e?.errors || e);

  return NextResponse.json(
    {
      ok: false,
      error: e?.message || "Error",
      details: e?.response?.data || null,
    },
    { status: 500 }
  );
}
}