import { getSheetRows } from "@/lib/lib/sheets";
import "server-only";


export async function getProducts() {
  const base = await getSheetRows("products");
  const variants = await getSheetRows("variants");

  const byProductId: Record<string, any[]> = {};
  for (const v of variants) {
    const pid = v.product_id?.trim();
    if (!pid) continue;
    if (!byProductId[pid]) byProductId[pid] = [];
    byProductId[pid].push({
      size: v.size,
      sku: v.sku,
      priceRetail: Number(v.priceRetail ?? 0),
      priceWholesale: Number(v.priceWholesale ?? 0),
      stock: Number(v.stock ?? 0),
      status: v.status ?? "active",
    });
    console.log("[DBG_VARIANTS_KEYS_SAMPLE]", Object.keys(variants?.[0] ?? {}));

for (const pid of [
  "ossono-amino-plex-500ml",
  "ossono-coloracion-60gr",
  "vexa-ampolla-recovery-argan",
  "ossono-crema-peinar-10en1",
]) {
  console.log("[DBG_JOIN_COUNT]", pid, (byProductId[pid]?.length ?? 0));
}

  }
return base.map((p: any) => {
  const id = String(p.id ?? "").trim();

  return {
    id,
    brand: p.brand,
    line: p.line,
    name: p.name,
    category: p.category,
    status: p.status ?? "active",
    tags: p.tags?.split(",").map((t: string) => t.trim()).filter(Boolean) ?? [],
    image: p.image ?? "",
    sort: Number(p.sort ?? 0),
    variants: byProductId[id] ?? [],
  };
});

}
