import { NextResponse } from "next/server";
import { getSheetRows } from "@/lib/lib/sheets"; // asumimos que tenés esto armado

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const productId = params.id;

  // 1. Traer productos
  const products = await getSheetRows("productos"); // hoja con info general
  const variants = await getSheetRows("variantes"); // hoja con variantes

  // 2. Buscar producto
  const product = products.find((p: any) => p.id === productId);
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  // 3. Buscar variantes activas
  const productVariants = variants
    .filter((v: any) => v.product_id === productId && v.status === "active")
    .map((v: any) => ({
      size: v.size,
      sku: v.sku,
      priceRetail: parseFloat(String(v.priceRetail).replace(",", ".")) || 0,
      priceWholesale: parseFloat(String(v.priceWholesale).replace(",", ".")) || 0,
      stock: Number(v.stock) || 0,
    }));

  // 4. Armar respuesta
  const response = {
    ...product,
    variants: productVariants,
    images: product.image ? [product.image] : [],
    tags: product.tags?.split(",").map((t: string) => t.trim()).filter(Boolean) ?? [],
  };

  return NextResponse.json(response);
}
