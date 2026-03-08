import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "wholesale",
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}