import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/server/catalog";

export const runtime = "nodejs";

// Cache en CDN (Vercel) por 60s, y sirve stale mientras revalida
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET() {
  try {
    const products = await getCatalog();

    return NextResponse.json(products, {
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (err: any) {
    console.error("api/catalog error:", err);

    // errores no se cachean
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
