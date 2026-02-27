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
  externalReference?: string;
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

  // Traer toda la hoja
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TAB}!A:Z`,
  });

  const rows = res.data.values ?? [];
  if (rows.length < 2) throw new Error("Orders sin headers o sin filas");

  const header = rows[0].map((h: any) => String(h ?? "").trim());

  const colIndex = (name: string) => {
    const idx = header.findIndex(
      (h) => h.toLowerCase() === name.toLowerCase()
    );
    if (idx === -1) throw new Error(`No existe columna '${name}' en Orders`);
    return idx;
  };

  const q = String(args.orderId ?? "").trim();

  // Buscar por DRAFT o por ORD
  const keyCol =
    q.startsWith("DRAFT-") ? "external_reference" : "Numero de orden";

  const keyIdx = colIndex(keyCol);

  const rowIdx = rows.findIndex((r: any, i: number) => {
    if (i === 0) return false;
    return String(r?.[keyIdx] ?? "").trim() === q;
  });

  if (rowIdx === -1) {
    throw new Error(`No encontré ${keyCol}=${q} en Orders`);
  }

  const set: Array<{ col: string; value: any }> = [];

  set.push({ col: "estado", value: args.status });

  if (args.externalReference != null) {
    set.push({ col: "external_reference", value: args.externalReference });
  }

  if (args.paymentId != null)
    set.push({ col: "payment_id", value: args.paymentId });

  if (args.paymentStatus != null)
    set.push({ col: "payment_status", value: args.paymentStatus });

  if (args.shipmentId != null)
    set.push({ col: "shipment_id", value: args.shipmentId });

  if (args.shipmentStatus != null)
    set.push({ col: "shipment_status", value: args.shipmentStatus });

  if (args.shippingCost != null)
    set.push({ col: "shipping_cost", value: args.shippingCost });

  if (args.shippingProvider != null)
    set.push({ col: "shipping_provider", value: args.shippingProvider });

  if (args.shippingOptionId != null)
    set.push({ col: "shipping_option_id", value: args.shippingOptionId });

  if (args.shippingOptionName != null)
    set.push({ col: "shipping_option_name", value: args.shippingOptionName });

  if (args.shippingPrice != null)
    set.push({ col: "shipping_price", value: args.shippingPrice });

  if (args.shippingEta != null)
    set.push({ col: "shipping_eta", value: args.shippingEta });

  if (args.shippingMeta != null) {
    set.push({
      col: "shipping_meta",
      value:
        typeof args.shippingMeta === "string"
          ? args.shippingMeta
          : JSON.stringify(args.shippingMeta),
    });
  }

  const a1 = (row1: number, col0: number) => {
    let n = col0 + 1;
    let s = "";
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return `${TAB}!${s}${row1}`;
  };

  const rowNumber = rowIdx + 1;

  const data = set.map((u) => {
    const cIdx = colIndex(u.col);
    return { range: a1(rowNumber, cIdx), values: [[u.value]] };
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  return { ok: true, rowNumber };
}

export async function getOrderById(orderId: string) {
  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

  const auth = getGoogleClient();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TAB}!A:Z`,
  });

  const rows = res.data.values ?? [];
  if (rows.length < 2) return null;

  const header = rows[0];
  const orderIdx = header.findIndex((h: string) =>
    String(h).toLowerCase() === "numero de orden"
  );

  if (orderIdx === -1) return null;

  const row = rows.find((r: any, i: number) =>
    i > 0 && String(r?.[orderIdx] ?? "") === orderId
  );

  return row ?? null;
}

export async function updateOrderWithShipment(args: any) {
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