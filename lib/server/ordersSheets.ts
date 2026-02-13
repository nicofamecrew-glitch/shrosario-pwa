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

const TAB = "Orders";

export type OrderRow = {
  orderId: string;          // Col B
  status: string;           // Col C
  concept?: string;         // Col D
  total?: number;           // Col E
  fullName?: string;        // Col F
  phone?: string;           // Col G
  city?: string;            // Col H
  address?: string;         // Col I
  cuit?: string;            // Col J
  businessType?: string;    // Col K
  detail?: string;          // Col L

  // columnas “técnicas” (si existen / las escribimos igual)
  paymentId?: string | null;        // Col M
  paymentStatus?: string | null;    // Col N
  shipmentId?: string | null;       // Col O
  shipmentStatus?: string | null;   // Col P
  shippingCost?: number | null;     // Col Q
};

type UpdateArgs = {
  orderId: string;
  status: string;

  paymentId?: string;
  paymentStatus?: string;

  shipmentId?: string;
  shipmentStatus?: string;

  shippingCost?: number; // Q (tu costo final/logístico)

  // ✅ NUEVO: shipping elegido (R–W)
  shippingProvider?: string;
  shippingOptionId?: string;
  shippingOptionName?: string;
  shippingPrice?: number;
  shippingEta?: string;
  shippingMeta?: any; // lo stringify adentro
};


export async function updateOrderStatusInSheets(args: UpdateArgs) {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

  const auth = getGoogleClient();
  const sheets = google.sheets({ version: "v4", auth });

  // Buscar fila por Col B (Numero de orden)
  const colB = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TAB}!B:B`,
  });

  const values = colB.data.values ?? [];
  const idx = values.findIndex((row, i) => i > 0 && String(row?.[0] ?? "").trim() === String(args.orderId).trim());

  if (idx === -1) {
    throw new Error(`No encontré orderId=${args.orderId} en ${TAB}!B:B`);
  }

  const rowNumber = idx + 1; // 1-indexed

  // C = estado
  // M = payment_id
  // N = payment_status
  // O = shipment_id
  // P = shipment_status
  // Q = shipping_cost
  const updates: Array<{ range: string; value: any }> = [
    { range: `${TAB}!C${rowNumber}`, value: args.status },
  ];

  if (args.paymentId != null) updates.push({ range: `${TAB}!M${rowNumber}`, value: args.paymentId });
  if (args.paymentStatus != null) updates.push({ range: `${TAB}!N${rowNumber}`, value: args.paymentStatus });
  if (args.shipmentId != null) updates.push({ range: `${TAB}!O${rowNumber}`, value: args.shipmentId });
  if (args.shipmentStatus != null) updates.push({ range: `${TAB}!P${rowNumber}`, value: args.shipmentStatus });
  if (args.shippingCost != null) updates.push({ range: `${TAB}!Q${rowNumber}`, value: args.shippingCost });
// R = shipping_provider
if (args.shippingProvider != null) updates.push({ range: `${TAB}!R${rowNumber}`, value: args.shippingProvider });
// S = shipping_option_id
if (args.shippingOptionId != null) updates.push({ range: `${TAB}!S${rowNumber}`, value: args.shippingOptionId });
// T = shipping_option_name
if (args.shippingOptionName != null) updates.push({ range: `${TAB}!T${rowNumber}`, value: args.shippingOptionName });
// U = shipping_price
if (args.shippingPrice != null) updates.push({ range: `${TAB}!U${rowNumber}`, value: args.shippingPrice });
// V = shipping_eta
if (args.shippingEta != null) updates.push({ range: `${TAB}!V${rowNumber}`, value: args.shippingEta });
// W = shipping_meta (JSON)
if (args.shippingMeta != null) {
  updates.push({
    range: `${TAB}!W${rowNumber}`,
    value: typeof args.shippingMeta === "string" ? args.shippingMeta : JSON.stringify(args.shippingMeta),
  });
}

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates.map((u) => ({
        range: u.range,
        values: [[u.value]],
      })),
    },
  });

  return { ok: true, rowNumber };
}

export async function getOrderById(orderId: string): Promise<OrderRow | null> {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

  const auth = getGoogleClient();
  const sheets = google.sheets({ version: "v4", auth });

  const q = String(orderId || "").trim();
  if (!q) return null;

  // Traemos A:Q para tener todo (Orders + columnas técnicas)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TAB}!A:W`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return null;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const colB = String(r[1] ?? "").trim(); // B = Numero de orden

    if (colB === q) {
      return {
        orderId: colB,
        status: String(r[2] ?? "").trim(),      // C
        concept: String(r[3] ?? "").trim(),     // D
        total: Number(r[4] ?? 0) || 0,          // E
        fullName: String(r[5] ?? "").trim(),    // F
        phone: String(r[6] ?? "").trim(),       // G
        city: String(r[7] ?? "").trim(),        // H
        address: String(r[8] ?? "").trim(),     // I
        cuit: String(r[9] ?? "").trim(),        // J
        businessType: String(r[10] ?? "").trim(), // K
        detail: String(r[11] ?? "").trim(),     // L

        paymentId: r[12] != null ? String(r[12]).trim() : null,       // M
        paymentStatus: r[13] != null ? String(r[13]).trim() : null,   // N
        shipmentId: r[14] != null ? String(r[14]).trim() : null,      // O
        shipmentStatus: r[15] != null ? String(r[15]).trim() : null,  // P
        shippingCost: r[16] != null ? Number(r[16]) || 0 : null,      // Q
      };
    }
  }

  return null;
}

export async function updateOrderWithShipment(args: {
  orderId: string;
  shipmentId: string;
  shipmentStatus: string;
  shippingCost?: number;

  // ✅ NUEVO (R–W)
  shippingProvider?: string;
  shippingOptionId?: string;
  shippingOptionName?: string;
  shippingPrice?: number;
  shippingEta?: string;
  shippingMeta?: any;

}) {
  return updateOrderStatusInSheets({
    orderId: args.orderId,
    status: "Pagado",
    shipmentId: args.shipmentId,
    shipmentStatus: args.shipmentStatus,
    shippingCost: args.shippingCost,
      shippingProvider: args.shippingProvider,
  shippingOptionId: args.shippingOptionId,
  shippingOptionName: args.shippingOptionName,
  shippingPrice: args.shippingPrice,
  shippingEta: args.shippingEta,
  shippingMeta: args.shippingMeta,

  });
}
