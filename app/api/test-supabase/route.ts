import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const envCheck = {
      hasUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlPreview: process.env.SUPABASE_URL?.slice(0, 35) ?? null,
      keyPreview: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 12) ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_code, created_at")
      .limit(1);

    if (error) {
      return NextResponse.json({
        ok: false,
        stage: "supabase-query",
        envCheck,
        error: error.message,
        details: error,
      });
    }

    return NextResponse.json({
      ok: true,
      stage: "supabase-query",
      envCheck,
      data,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        stage: "catch",
        error: e?.message || "Error",
        stack: e?.stack ?? null,
        hasUrl: !!process.env.SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        urlPreview: process.env.SUPABASE_URL?.slice(0, 35) ?? null,
        keyPreview: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 12) ?? null,
      },
      { status: 500 }
    );
  }
}