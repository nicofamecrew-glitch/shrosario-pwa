import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.ZIPNOVA_API_KEY;
  const secret = process.env.ZIPNOVA_API_SECRET;

  // No mostramos valores, solo que existen
  return NextResponse.json({
    ok: true,
    hasKey: Boolean(key),
    hasSecret: Boolean(secret),
    keyLen: key?.length ?? 0,
    secretLen: secret?.length ?? 0,
  });
}
