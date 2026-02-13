import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/server/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getCatalog();
    return NextResponse.json(products, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("api/catalog error:", err);
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
