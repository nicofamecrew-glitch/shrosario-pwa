import type { CartItem, LeadFormData, Product } from "@/lib/types";
import { findVariant, formatPrice, getVariantPrice } from "@/lib/pricing";
import { WHATSAPP_NUMBER } from "@/lib/constants";

export function buildWhatsAppMessage({
  lead,
  items,
  products,
  isWholesale,
  notes,
  whatsappNumber
}: {
  lead: LeadFormData;
  items: CartItem[];
  products: Product[];
  isWholesale: boolean;
  notes: string;
  whatsappNumber?: string;
}) {
  const lines: string[] = [];
  lines.push("Pedido SH Rosario");
  lines.push(`Cliente: ${lead.name}`);
  lines.push(`Ciudad: ${lead.city}`);
  lines.push(`Telefono: ${lead.phone}`);
  lines.push(`Rubro: ${lead.businessType}`);
  lines.push("");
  lines.push("Items:");

  let total = 0;

  items.forEach((item) => {
  const product = products.find((entry) => entry.id === item.productId);
  if (!product) return;

  const variant = findVariant(product, item.variantSku);
  if (!variant) {
    console.warn("[WHATSAPP_MISSING_VARIANT]", {
      product_id: product.id,
      product: product.name,
      sku: item.variantSku,
      variants: product.variants,
    });
    return;
  }

  const price = getVariantPrice(variant, isWholesale);
  total += price * item.quantity;

  lines.push(
    `- ${item.quantity}x ${product.brand} ${product.line} ${product.name} (${variant.size}) - ${formatPrice(price)}`
  );
});

  lines.push("");
  lines.push(`Total estimado: ${formatPrice(total)}`);

  if (notes.trim()) {
    lines.push("");
    lines.push(`Observaciones: ${notes}`);
  }

  const encoded = encodeURIComponent(lines.join("\n"));

  // ✅ si viene de Sheets lo usa, si no, cae al fijo (no se rompe)
  const phone = (whatsappNumber || WHATSAPP_NUMBER).replace(/\D/g, "");

  return `https://wa.me/${phone}?text=${encoded}`;
}
