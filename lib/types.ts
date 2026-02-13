export type ProductVariant = {
  size: string;
  sku: string;
  priceRetail: number;
  priceWholesale?: number;
};

export type Product = {
  id: string;
  brand: string;
  line: string;
  name: string;
  category: string;
  variants: ProductVariant[];
  tags?: string[];
  imageUrl?: string;
  images?: string[];
};


export type CartItem = {
  productId: string;
  variantSku: string;
  quantity: number;
};

export type LeadFormData = {
  name: string;
  phone: string;
  city: string;
  businessType: string;
  notes: string;
};
