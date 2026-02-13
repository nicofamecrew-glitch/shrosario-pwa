import { headers } from "next/headers";
import CatalogPage from "@/components/CatalogPage";

export default async function Page() {
  const h = await headers();
  const host = h.get("host");
  const proto = process.env.NODE_ENV === "development" ? "http" : "https";

  const res = await fetch(`${proto}://${host}/api/catalog`, { cache: "no-store" });
  if (!res.ok) throw new Error("api/catalog failed");

  const products = await res.json();
  return <CatalogPage products={products} />;
}
