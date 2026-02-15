import { NextResponse } from "next/server";
import { getZipCache } from "@/lib/lib/sheets";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const zipcode = (url.searchParams.get("zipcode") ?? "").trim();

  const z = zipcode.replace(/\D/g, "");
  if (!z) {
    return NextResponse.json(
      { ok: false, error: "Missing zipcode" },
      { status: 400 }
    );
  }

  const cached = await getZipCache(z);
  if (!cached?.city || !cached?.state) {
    return NextResponse.json(
      {
        ok: false,
        error: "Zipcode not found in zip_cache",
        zipcode: z,
        hint: "Add zipcode, city, state to zip_cache sheet",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    zipcode: z,
    city: cached.city,
    state: cached.state,
    destination_id: cached.destination_id ?? null,
    source: "zip_cache",
  });
}
