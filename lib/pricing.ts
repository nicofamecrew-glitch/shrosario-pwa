import type { Product, ProductVariant } from "@/lib/types";

export function getVariantPrice(
  variant: ProductVariant | null,
  isWholesale: boolean
) {
  if (!variant) return 0;

  if (isWholesale && typeof variant.priceWholesale === "number") {
    return variant.priceWholesale;
  }
  return variant.priceRetail;
}



export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

export function findVariant(product: Product, sku?: string) {
  const variants = Array.isArray((product as any)?.variants)
    ? (product as any).variants
    : [];

  if (variants.length === 0) {
    // loguear una sola vez por product_id para no spamear consola
    (globalThis as any).__noVariantsLogged ??= new Set<string>();
    const key = String((product as any)?.id ?? "");

    if (!(globalThis as any).__noVariantsLogged.has(key)) {
      (globalThis as any).__noVariantsLogged.add(key);
      console.warn("[NO_VARIANTS]", {
        product_id: (product as any)?.id,
        name: (product as any)?.name,
        brand: (product as any)?.brand,
        skuRequested: sku,
        variants: (product as any)?.variants,
      });
    }

    return null;
  }

  if (sku) {
    return variants.find((v: any) => v.sku === sku) ?? variants[0];
  }

  return variants[0];
}
