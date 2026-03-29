export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { google } from "googleapis";
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

function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

function lastDigitsVariants(v: unknown) {
  const s = String(v ?? "").replace(/\D/g, "");
  if (!s) return [];

  const set = new Set<string>();

  if (s.length >= 8) set.add(s.slice(-8));
  if (s.length >= 7) set.add(s.slice(-7));

  return Array.from(set);
}

type OrderOut = {
  createdAt: string;
  id: string;
  status: string;
  total: number;
  shipmentId: string;
  priceMode: "mayorista" | "minorista" | "";
};

export async function GET(req: Request) {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    if (!sheetId) throw new Error("Falta GOOGLE_SHEETS_SHEET_ID");

    const { searchParams } = new URL(req.url);
    const phone = safeStr(searchParams.get("phone"));
    const email = safeStr(searchParams.get("email"));
    const deviceId = safeStr(searchParams.get("device_id"));

    if (!deviceId && !phone && !email) {
      return NextResponse.json(
        { ok: false, error: "Missing device_id, phone or email" },
        { status: 400 }
      );
    }

    const auth = getGoogleClient();
    const sheets = google.sheets({ version: "v4", auth });
    const TAB = "Orders";

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${TAB}!A2:X`,
    });

    const rows = res.data.values ?? [];

    // Mapa por order id para enriquecer con shipment_id desde Sheets
    const sheetByOrderId = new Map<string, any[]>();
    for (const row of rows) {
      const orderId = safeStr(row?.[1]); // B Numero de orden
      if (orderId) sheetByOrderId.set(orderId, row);
    }

    let orders: OrderOut[] = [];
    let source = "";

    // 1) PRIORIDAD ABSOLUTA: device_id en Supabase
    if (deviceId) {
      const { data: dbOrders, error } = await supabaseAdmin
        .from("orders")
        .select("order_code, created_at, status, total, price_mode, device_id")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (Array.isArray(dbOrders) && dbOrders.length > 0) {
        orders = dbOrders.map((o: any) => {
          const row = sheetByOrderId.get(safeStr(o.order_code));

          return {
            createdAt: safeStr(o.created_at),
            id: safeStr(o.order_code),
            status: safeStr(o.status),
            total: Number(o.total ?? 0),
            shipmentId: safeStr(row?.[15]), // P shipment_id en Sheets
            priceMode: safeStr(o.price_mode) as "mayorista" | "minorista" | "",
          };
        });

        source = "supabase:device_id";
      }
    }

    // 2) FALLBACK: teléfono contra Sheets
    if (!orders.length && phone) {
      const queryVariants = lastDigitsVariants(phone);

      orders = rows
        .filter((row) => {
          const rowVariants = lastDigitsVariants(row?.[7]); // H telefono
          return rowVariants.some((rv) => queryVariants.includes(rv));
        })
        .map((row) => ({
          createdAt: safeStr(row?.[0]), // A fecha
          id: safeStr(row?.[1]), // B Numero de orden
          status: safeStr(row?.[3]), // D estado
          total: Number(row?.[5] ?? 0), // F precio final
          shipmentId: safeStr(row?.[15]), // P shipment_id
          priceMode: safeStr(row?.[4]) as "mayorista" | "minorista" | "", // E
        }))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      source = "sheets:phone_fallback";
    }

    return NextResponse.json({
      ok: true,
      orders,
      debug: {
        source,
        deviceIdReceived: deviceId,
        phoneReceived: phone,
        phoneVariants: lastDigitsVariants(phone),
        totalRows: rows.length,
      },
    });
  } catch (e: any) {
    console.error("GET /api/orders/list ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}