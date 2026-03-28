import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { deviceId, phone } = await req.json();

    if (!deviceId || !phone) {
      return NextResponse.json(
        { ok: false, error: "Missing deviceId or phone" },
        { status: 400 }
      );
    }

    const cleanDeviceId = String(deviceId).trim();
    const cleanPhone = String(phone).trim();

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .update({ phone: cleanPhone })
      .eq("device_id", cleanDeviceId)
      .eq("is_active", true);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/push/link-phone error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}