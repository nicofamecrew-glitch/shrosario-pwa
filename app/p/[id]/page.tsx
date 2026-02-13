import ProductPageClient from "./product-page-client";
import { headers } from "next/headers";


type PageProps = { params: { id: string } };

export default async function Page({ params }: PageProps) {
  const h = await headers();
  const host = h.get("host");
  const proto = process.env.NODE_ENV === "development" ? "http" : "https";

  const [prodRes, catRes] = await Promise.all([
 fetch(`${proto}://${host}/api/products/${params.id}`, {
  next: { revalidate: 60 },
}),
fetch(`${proto}://${host}/api/catalog`, {
  next: { revalidate: 60 },
}),
  ]);

  if (!prodRes.ok) {
    return (
      <div className="min-h-screen bg-white text-black p-6">
        <p className="text-black/70">
          {prodRes.status === 404 ? "Producto no encontrado" : "Error cargando producto"}
        </p>
        <p className="mt-2 text-xs text-black/50">
          /api/products/{params.id} → {prodRes.status} {prodRes.statusText}
        </p>
      </div>
    );
  }

  const product = (await prodRes.json()) as any;
  const skuKey =
  product?.sku ??
  product?.variants?.[0]?.sku ??
  "";

const descRes = skuKey
  ? await fetch(`${proto}://${host}/api/descriptions?sku=${encodeURIComponent(skuKey)}`, {
      next: { revalidate: 300 },

    })
  : null;

const description = descRes?.ok ? await descRes.json() : null;

  const all = catRes.ok ? ((await catRes.json()) as any[]) : [];

  const bestSellers = all
    .filter((p) => p?.id && p.id !== params.id)
    .filter((p) => {
      const tags = Array.isArray(p.tags) ? p.tags : String(p.tags ?? "").split(",");
      return tags.map((t: any) => String(t).toLowerCase().trim()).includes("bestseller");
    })
    .slice(0, 10);

  return (
  <ProductPageClient
    product={product}
    bestSellers={bestSellers}
    description={description}
  />
);
}
