import type { Product, ProductVariant } from "@/lib/types";

export type ActiveCatalogProduct = {
  productId: string;
  productName: string;
  brand: string;
  variantId: string | null;
  variantName: string | null;
  price: number;
  quantity: number;
};

export type ProductQuickViewSelection = {
  product: Product;
  variant: ProductVariant | null;
  context: ActiveCatalogProduct;
};

