import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/server/catalog";
import { searchSalesCatalog } from "@/lib/server/salesCatalogSearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fase 1: solo lectura. No confirma pedidos, no hace descuentos y no expone precios mayoristas.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim() || q.length > 180) {
    return NextResponse.json({ ok: false, error: "Consulta requerida (máximo 180 caracteres)" }, { status: 400 });
  }
  try {
    const catalog = await getCatalog();
    const result = searchSalesCatalog(q, catalog);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo consultar el catálogo" }, { status: 503 });
  }
}
