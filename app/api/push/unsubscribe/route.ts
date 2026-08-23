import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { endpoint, deviceId } = await req.json();

    if (!endpoint || !deviceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta endpoint o deviceId",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .update({
        is_active: false,
      })
      .eq("endpoint", String(endpoint).trim())
      .eq("device_id", String(deviceId).trim());

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    console.error("POST /api/push/unsubscribe error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Internal error",
      },
      { status: 500 }
    );
  }
}