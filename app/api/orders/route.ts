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

function ensureOrderId(order: any) {
  const existing =
    order?.id ??
    order?.orderId ??
    order?.draftId ??
    order?.external_reference ??
    order?.externalRef ??
    "";

  if (existing && typeof existing === "string") return existing;

  // fallback estable-ish: timestamp + random
  return `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function columnHasValue(
  sheets: any,
  sheetId: string,
  tab: string,
  colRange: string, // e.g. "B:B"
  value: string,
  lookbackRows = 500 // para no traerte 20k filas
) {
  // Trae solo las últimas N filas aproximadas usando un rango amplio
  // (Sheets API no tiene "tail", así que hacemos un compromiso).
  const range = `${tab}!${colRange}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const values: any[][] = res.data.values ?? [];
  if (!values.length) return false;

  // buscar desde el final, y con lookback
  const start = Math.max(0, values.length - lookbackRows);
  for (let i = values.length - 1; i >= start; i--) {
    const cell = (values[i]?.[0] ?? "").toString().trim();
    if (cell === value) return true;
  }
  return false;
}

async function appendOrderItems(
  sheets: any,
  sheetId: string,
  orderId: string,
  items: OrderItem[]
) {
  const TAB_ITEMS = "Order_Items";

  // idempotencia: si ya hay items para este orderId, no re-apendear
  const itemsExist = await columnHasValue(
    sheets,
    sheetId,
    TAB_ITEMS,
    "A:A",
    orderId,
    1500
  );
  if (itemsExist) return;

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
    requestBody: { values: rows },
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
    const orderId = ensureOrderId(order);
    const priceMode = order?.priceMode ?? "";
    const status = order?.status ?? "Pendiente";

    // soporta customer anidado y también campos root (como tu confirm/page)
    const customer = order?.customer ?? {};
    const fullName = customer?.fullName ?? order?.fullName ?? "Cliente app";
    const phone = customer?.phone ?? order?.phone ?? "";
    const city = customer?.city ?? order?.city ?? "";
    const address = customer?.address ?? order?.address ?? "";
    const cuit = customer?.cuit ?? order?.cuit ?? "";
    const businessType = customer?.businessType ?? order?.businessType ?? "";

    const items: OrderItem[] = Array.isArray(order?.items) ? order.items : [];

    // ✅ validación dura: sin esto, te aparecen filas $0 y SKU vacío
    if (!items.length) {
      return NextResponse.json(
        { ok: false, error: "Pedido sin items" },
        { status: 400 }
      );
    }
    const bad = items.find((it) => {
      const qty = it.qty ?? 1;
      const unit = it.unitPrice ?? 0;
      const sku = (it.sku ?? "").trim();
      return qty <= 0 || unit <= 0 || !sku;
    });
    if (bad) {
      return NextResponse.json(
        {
          ok: false,
          error: "Item inválido (falta SKU o precio).",
          badItem: {
            productId: bad.productId ?? null,
            name: bad.name ?? null,
            sku: bad.sku ?? null,
            unitPrice: bad.unitPrice ?? null,
            qty: bad.qty ?? null,
          },
        },
        { status: 400 }
      );
    }

    const total = items.reduce(
      (acc, it) => acc + (it.qty ?? 1) * (it.unitPrice ?? 0),
      0
    );

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

    const externalRef =
      order?.external_reference ?? order?.externalRef ?? "";

    // ✅ idempotencia Orders: si ya existe orderId en col B, no duplicar
    const orderExists = await columnHasValue(
      sheets,
      sheetId,
      TAB,
      "B:B",
      orderId,
      1500
    );

    if (!orderExists) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${TAB}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
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
            ],
          ],
        },
      });
    }

    await appendOrderItems(sheets, sheetId, orderId, items);

    return NextResponse.json({
      ok: true,
      orderId,
      duplicated: orderExists,
    });
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