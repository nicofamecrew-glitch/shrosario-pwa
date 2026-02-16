import { NextResponse } from "next/server";
import { searchZipCache } from "@/lib/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "20");

  if (!q.trim()) {
    return NextResponse.json({ ok: true, results: [] }, { status: 200 });
  }

  const results = await searchZipCache(q, Math.min(50, Math.max(1, limit)));

  return NextResponse.json({ ok: true, results }, { status: 200 });
}
