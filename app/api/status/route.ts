import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const { error } = await supabaseAdmin
      .from("orders")
      .select("id")
      .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      service: "shrosario-pwa",
      env: process.env.NODE_ENV,
      timestamp,
      supabase: {
        ok: true,
      },
    });
  } catch (error: any) {
    console.error("STATUS SUPABASE ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        service: "shrosario-pwa",
        env: process.env.NODE_ENV,
        timestamp,
        supabase: {
          ok: false,
          error:
            error?.message ||
            "Supabase no responde",
        },
      },
      { status: 503 }
    );
  }
}