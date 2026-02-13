export function getProductImage(product: any, variant?: any, idx: number = 0) {
  const v = variant ?? null;

  // ✅ 0) resolved
  if (v?._resolvedImage) return v._resolvedImage;
  if (v?.image_url) return v.image_url;

  // 1) Variante
  if (v?.image) return v.image;
  if (v?.imageUrl) return v.imageUrl;
  if (v?.img) return v.img;
  if (Array.isArray(v?.images) && v.images[0]) return v.images[idx] ?? v.images[0];

  // 2) Producto
  if (product?.image) return product.image;
  if (product?.imageUrl) return product.imageUrl;
  if (product?.img) return product.img;
  if (Array.isArray(product?.images) && product.images[0]) return product.images[idx] ?? product.images[0];

  return "/product/placeholder.png";
}
