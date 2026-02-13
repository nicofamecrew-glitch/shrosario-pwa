import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/server/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getCatalog();
  return NextResponse.json(products, {
    headers: { "Cache-Control": "no-store" },
  });
}
