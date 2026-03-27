import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

webpush.setVapidDetails(
  "mailto:tu@email.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST() {
  try {
    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("subscription")
      .eq("is_active", true);

    if (error) throw error;

    console.log("[push] subs:", subs?.length);

    for (const row of subs || []) {
      try {
        await webpush.sendNotification(
          row.subscription,
          JSON.stringify({
            title: "🔥 SH Rosario",
            body: "Si te llegó esto, ya está funcionando",
            url: "/",
          })
        );
      } catch (err: any) {
        console.error("[push] send error:", err?.message || err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[push] route error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}