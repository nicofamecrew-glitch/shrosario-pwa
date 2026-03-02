import { NextResponse } from "next/server";
import { google } from "googleapis";
import { OrderItem } from "@/lib/orders";

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
  items: OrderItem[]
) {
  const TAB_ITEMS = "Order_Items";

  const rows = items.map((it: OrderItem) => {
    const qty = it.qty ?? 1;
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

    const TAB = "Orders";

    const createdAt = order?.createdAt ?? new Date().toISOString();
    const orderId = order?.id ?? "";
    const priceMode = order?.priceMode ?? "";
    const status = order?.status ?? "Pendiente";

    const customer = order?.customer ?? {};
    const fullName = customer?.fullName ?? "";
    const phone = customer?.phone ?? "";
    const city = customer?.city ?? "";
    const address = customer?.address ?? "";
    const cuit = customer?.cuit ?? "";
    const businessType = customer?.businessType ?? "";

    const items: OrderItem[] = Array.isArray(order?.items) ? order.items : [];

    const total = items.reduce((acc, it) => acc + (it.qty ?? 1) * (it.unitPrice ?? 0), 0);

    const itemsText = items
      .map((it) => {
        const brand = it.brand ? `${it.brand} ` : "";
        const size = it.size ? ` (${it.size})` : "";
        const name = it.name ?? it.productId ?? "Sin nombre";
        const qty = it.qty ?? 1;
        const unit = it.unitPrice ?? 0;
        const subtotal = qty * unit;
        const sku = it.sku ?? "";
        return `${qty}x ${brand}${name}${size} $${unit} (subtotal $${subtotal}) SKU:${sku}`;
      })
      .join(" | ");

    const externalRef = order?.external_reference ?? order?.externalRef ?? "";

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

    await appendOrderItems(sheets, sheetId, orderId, items);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("API /api/orders ERROR:", e);
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