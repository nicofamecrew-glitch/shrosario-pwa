import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

export const runtime = "nodejs";

webpush.setVapidDetails(
  "mailto:admin@shrosario.store",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://admin.appshrosario.store",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  try {
       const { title, body, url, image, phone, role, deviceId } = await req.json();
    if (!title || !body) {
      return NextResponse.json(
        { ok: false, error: "Faltan title o body" },
        { status: 400, headers: corsHeaders }
      );
    }

    let query = supabaseAdmin
      .from("push_subscriptions")
      .select("id, subscription, phone, role")
      .eq("is_active", true);

       // 1) Envío dirigido por deviceId
    if (deviceId) {
      query = query.eq("device_id", String(deviceId).trim());
    }
    // 2) Envío dirigido por teléfono
    else if (phone) {
      query = query.eq("phone", String(phone).trim());
    }
    // 3) Envío por rol (admin/public)
    else if (role) {
      query = query.eq("role", String(role).trim());
    }
    // 4) Si no viene nada, manda a todos los activos
    const { data: subs, error } = await query;

    if (error) throw error;

    let sent = 0;
    let deactivated = 0;

    for (const row of subs || []) {
      try {
        await webpush.sendNotification(
          row.subscription,
          JSON.stringify({
            title,
            body,
            url: url || "/",
            ...(image ? { image } : {}),
          })
        );
        sent += 1;
      } catch (err: any) {
        console.error("[push] send error:", err?.message || err);

        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", row.id);

          deactivated += 1;
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        sent,
        matched: subs?.length || 0,
        deactivated,
      },
      { headers: corsHeaders }
    );
  } catch (e: any) {
    console.error("[push] route error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Internal error" },
      { status: 500, headers: corsHeaders }
    );
  }
}