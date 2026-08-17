import { headers } from "next/headers";
import FlashPageClient from "./flash-page-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FlashPage() {
  const h = await headers();
  const host = h.get("host");
  const proto =
    process.env.NODE_ENV === "development" ? "http" : "https";

  const res = await fetch(`${proto}://${host}/api/catalog`, {
    cache: "no-store",
  });

  const products = res.ok ? await res.json() : [];

  return <FlashPageClient products={products} />;
}