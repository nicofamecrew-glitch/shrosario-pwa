// lib/brandAccent.ts
export function brandAccentFrom(product: { brand?: string; id?: string; name?: string }) {
  const raw = `${product.brand ?? ""} ${product.id ?? ""} ${product.name ?? ""}`.toLowerCase();

  if (raw.includes("vexa")) return { ribbon: "#7c3aed" };
  if (raw.includes("ossono")) return { ribbon: "#14b8a6" };
  if (raw.includes("coalix")) return { ribbon: "#f97316" };
  if (raw.includes("fidelite")) return { ribbon: "#60a5fa" };
  if (raw.includes("lisse")) return { ribbon: "#f5aa5c" };

  return { ribbon: "#999999" };
}
