import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const subscription = await req.json();

    if (!subscription?.endpoint) {
      return NextResponse.json(
        { ok: false, error: "Missing subscription endpoint" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .insert({
        role: "public",
        subscription,
        is_active: true,
      });

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