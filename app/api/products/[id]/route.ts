import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/server/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const id = String(ctx?.params?.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    const catalog = await getCatalog();

    const product = catalog.find(
      (p: any) => String(p?.id ?? "").trim() === id
    );

    if (!product) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product, {
      status: 200,
    });
  } catch (err: any) {
    console.error("GET PRODUCT ERROR:", err);

    return NextResponse.json(
      {
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}