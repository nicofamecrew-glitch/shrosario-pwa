import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const sub = await req.json();

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .insert({
        subscription: sub,
        role: "admin", // por ahora solo vos
        is_active: true,
      });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("subscribe error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}