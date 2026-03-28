import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { subscription, phone, deviceId } = await req.json();

    if (!subscription?.endpoint) {
      return NextResponse.json(
        { ok: false, error: "Missing subscription endpoint" },
        { status: 400 }
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        { ok: false, error: "Missing deviceId" },
        { status: 400 }
      );
    }

    const endpoint = String(subscription.endpoint).trim();
    const cleanPhone = String(phone ?? "").trim() || null;
    const cleanDeviceId = String(deviceId).trim();

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          role: "public",
          endpoint,
          subscription,
          phone: cleanPhone,
          device_id: cleanDeviceId,
          is_active: true,
        },
        {
          onConflict: "endpoint",
        }
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/push/subscribe error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}