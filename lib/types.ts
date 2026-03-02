export type ProductVariant = {
  size: string;
  sku: string;
  priceRetail: number;
  priceWholesale?: number;
};

export type Product = {
  id: string;
  name: string;
  brand?: string;
  line?: string;
  category: string;
  variants: ProductVariant[];
};

export type Variant = {
  productId: string;
  size: string;
  sku: string;
  priceRetail: number;
  priceWholesale: number;
  stock: number;
  status: string;
};

export type CartItem = {
  productId: string;
  variant: Variant;
  qty: number;
};
export type LeadFormData = {
  name: string;
  phone: string;
  city: string;
  businessType: string;
  notes: string;
};
