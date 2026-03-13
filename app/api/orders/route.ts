import { NextResponse } from "next/server";
import { google } from "googleapis";
import { OrderItem } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

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

async function findRowByValue(
  sheets: any,
  sheetId: string,
  tab: string,
  col: string, // ej: "B"
  value: string,
  lookbackRows = 1500
) {
  const range = `${tab}!${col}:${col}`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const values: any[][] = res.data.values ?? [];
  if (!values.length) return null;

  const start = Math.max(0, values.length - lookbackRows);

  for (let i = values.length - 1; i >= start; i--) {
    const cell = (values[i]?.[0] ?? "").toString().trim();
    if (cell === value) return i + 1; // Sheets usa filas 1-based
  }

  return null;
}

async function updateOrderRow(
  sheets: any,
  sheetId: string,
  tab: string,
  row: number,
  data: {
    externalRef: string;
    status: string;
    priceMode: string;
    total: number;
    fullName: string;
    phone: string;
    city: string;
    address: string;
    cuit: string;
    businessType: string;
    itemsText: string;
  }
) {
  // C:M
  const range = `${tab}!C${row}:M${row}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        data.externalRef,   // C external_reference
        data.status,        // D estado
        data.priceMode,     // E concepto / modo
        data.total,         // F precio
        data.fullName,      // G nombre
        data.phone,         // H telefono
        data.city,          // I ciudad
        data.address,       // J direccion
        data.cuit,          // K cuit
        data.businessType,  // L businessType
        data.itemsText,     // M items
      ]],
    },
  });
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
    const order = await req.json();

    const createdAt = order?.createdAt ?? new Date().toISOString();
    const orderId = ensureOrderId(order);
    const priceMode = order?.priceMode ?? "";
    const status = order?.status ?? "Pendiente";

    const customer = order?.customer ?? {};
    const fullName = customer?.fullName ?? order?.fullName ?? "Cliente app";
    const phone = customer?.phone ?? order?.phone ?? "";
    const city = customer?.city ?? order?.city ?? "";
    const address = customer?.address ?? order?.address ?? "";
    const cuit = customer?.cuit ?? order?.cuit ?? "";
    const businessType = customer?.businessType ?? order?.businessType ?? "";

    const items: OrderItem[] = Array.isArray(order?.items) ? order.items : [];

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

    // 1) Buscar cliente por phone/cuit
    let customerId: string | null = null;

    const phoneClean = phone.trim();
    const cuitClean = cuit.trim();

    if (phoneClean) {
      const { data: existingCustomerByPhone, error: phoneFindError } =
        await supabaseAdmin
          .from("customers")
          .select("id")
          .eq("phone", phoneClean)
          .maybeSingle();

      if (phoneFindError) throw phoneFindError;
      if (existingCustomerByPhone?.id) customerId = existingCustomerByPhone.id;
    }

    if (!customerId && cuitClean) {
      const { data: existingCustomerByCuit, error: cuitFindError } =
        await supabaseAdmin
          .from("customers")
          .select("id")
          .eq("cuit", cuitClean)
          .maybeSingle();

      if (cuitFindError) throw cuitFindError;
      if (existingCustomerByCuit?.id) customerId = existingCustomerByCuit.id;
    }

    // 2) Crear o actualizar customer
    if (!customerId) {
      const { data: newCustomer, error: customerInsertError } =
        await supabaseAdmin
          .from("customers")
          .insert({
            full_name: fullName,
            phone: phoneClean || null,
            city: city || null,
            address: address || null,
            cuit: cuitClean || null,
            business_type: businessType || null,
            created_at: createdAt,
          })
          .select("id")
          .single();

      if (customerInsertError) throw customerInsertError;
      customerId = newCustomer.id;
    } else {
      const { error: customerUpdateError } = await supabaseAdmin
        .from("customers")
        .update({
          full_name: fullName,
          phone: phoneClean || null,
          city: city || null,
          address: address || null,
          cuit: cuitClean || null,
          business_type: businessType || null,
        })
        .eq("id", customerId);

      if (customerUpdateError) throw customerUpdateError;
    }

    // 3) Buscar si ya existe la orden
    const { data: existingOrder, error: existingOrderError } =
      await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("order_code", orderId)
        .maybeSingle();

    if (existingOrderError) throw existingOrderError;

    let dbOrderId: string;
    let duplicated = false;

    if (!existingOrder?.id) {
      const { data: insertedOrder, error: orderInsertError } =
        await supabaseAdmin
          .from("orders")
          .insert({
            order_code: orderId,
            external_ref: externalRef || null,
            status,
            price_mode: priceMode || null,
            total,
            customer_id: customerId,
            created_at: createdAt,
          })
          .select("id")
          .single();

      if (orderInsertError) throw orderInsertError;
      dbOrderId = insertedOrder.id;
    } else {
      duplicated = true;
      dbOrderId = existingOrder.id;

      const { error: orderUpdateError } = await supabaseAdmin
        .from("orders")
        .update({
          external_ref: externalRef || null,
          status,
          price_mode: priceMode || null,
          total,
          customer_id: customerId,
        })
        .eq("id", dbOrderId);

      if (orderUpdateError) throw orderUpdateError;

      const { error: deleteItemsError } = await supabaseAdmin
        .from("order_items")
        .delete()
        .eq("order_id", dbOrderId);

      if (deleteItemsError) throw deleteItemsError;
    }

    // 4) Insertar items
    const itemRows = items.map((it) => {
      const qty = it.qty ?? 1;
      const unit = it.unitPrice ?? 0;

      return {
        order_id: dbOrderId,
        sku: it.sku ?? "",
        product_id: it.productId ?? null,
        name: it.name ?? null,
        brand: it.brand ?? null,
        size: it.size ?? null,
        qty,
        unit_price: unit,
        line_total: qty * unit,
      };
    });

    if (itemRows.length) {
      const { error: itemsInsertError } = await supabaseAdmin
        .from("order_items")
        .insert(itemRows);

      if (itemsInsertError) throw itemsInsertError;
    }

    // 5) Espejo a Sheets (mantenelo por ahora)
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

    const auth = getGoogleClient();
    const sheets = google.sheets({ version: "v4", auth });
    const TAB = "Orders";

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
    } else {
      const row = await findRowByValue(sheets, sheetId, TAB, "B", orderId, 1500);

      if (!row) {
        throw new Error(`No encontré la fila del pedido existente: ${orderId}`);
      }

      await updateOrderRow(sheets, sheetId, TAB, row, {
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
      });
    }

    await appendOrderItems(sheets, sheetId, orderId, items);

    return NextResponse.json({
      ok: true,
      orderId,
      duplicated,
      db: true,
      sheet: true,
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