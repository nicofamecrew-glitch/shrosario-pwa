import { NextResponse } from "next/server";

export const runtime = "nodejs"; // importante: evitar edge por compatibilidad

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function GET() {
  const key = must("ZIPNOVA_API_KEY");
  const secret = must("ZIPNOVA_API_SECRET");

  // ✅ ACÁ va la URL REAL que te da la doc de Zipnova
  // Poné por ahora la base y endpoint de "health" o "me" o "account" si existe.
  const url = "PONE_ACA_ENDPOINT_DE_PRUEBA";

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        // 👇 Ajustamos estos headers cuando veamos la doc:
        "X-API-KEY": key,
        "X-API-SECRET": secret,
      },
      cache: "no-store",
    });

    const text = await r.text();

    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      bodyPreview: text.slice(0, 500),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
