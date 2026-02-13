import productsJson from "@/data/products.json";
import type { Product } from "@/lib/types";

/* ================= helpers ================= */

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function firstStr(x: any): string | null {
  if (typeof x === "string" && x.trim()) return x.trim();
  return null;
}

function normImages(...candidates: any[]): string[] {
  const out: string[] = [];
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === "string" && c.trim()) out.push(c.trim());
    if (Array.isArray(c)) {
      for (const x of c) if (typeof x === "string" && x.trim()) out.push(x.trim());
    }
  }
  return Array.from(new Set(out)).filter(Boolean);
}

function pickFirstImage(obj: any): string | undefined {
  return (
    firstStr(obj?.image) ??
    firstStr(obj?.image_url) ??
    firstStr(obj?.imageUrl) ??
    firstStr(obj?.img) ??
    (Array.isArray(obj?.images) ? obj.images[0] : undefined)
  );
}

function getSheetId(p: any) {
  return (
    p?.id ??
    p?.ID ??
    p?.Id ??
    p?.product_id ??
    p?.productId ??
    p?.productID ??
    p?.slug ??
    ""
  );
}

/* ================= main ================= */

export function withVariantImages(fromSheets: Product[]): Product[] {
  const jsonList = productsJson as any[];

  /** Mapas del JSON */
  const jsonById = new Map<string, any>();
  const jsonBySku = new Map<string, any>();
  const jsonByBrandName = new Map<string, any>();

  for (const jp of jsonList) {
    const jid = norm(jp?.id);
    if (jid) jsonById.set(jid, jp);

    const key = `${norm(jp?.brand)}|${norm(jp?.name)}`;
    if (key !== "|") jsonByBrandName.set(key, jp);

    for (const v of jp?.variants ?? []) {
      const sku = norm(v?.sku);
      if (sku) jsonBySku.set(sku, jp);
    }
  }

  return (fromSheets ?? []).map((p) => {
    const pAny: any = p;

    /* ========= match producto JSON ========= */
    const pid = norm(getSheetId(pAny));
    let jp =
      (pid && jsonById.get(pid)) ||
      (() => {
        for (const v of pAny?.variants ?? []) {
          const sku = norm(v?.sku);
          if (sku && jsonBySku.has(sku)) return jsonBySku.get(sku);
        }
        return null;
      })() ||
      jsonByBrandName.get(`${norm(pAny?.brand)}|${norm(pAny?.name)}`) ||
      null;

    const productImages = normImages(
      pAny?.images,
      pickFirstImage(pAny),
      jp ? pickFirstImage(jp) : null
    );

    /* ========= variantes ========= */
    const mergedVariants = (pAny?.variants ?? []).map((v: any) => {
      const jv =
        jp?.variants?.find((x: any) => norm(x?.sku) === norm(v?.sku)) ??
        jp?.variants?.find((x: any) => norm(x?.size) === norm(v?.size)) ??
        null;

      const imageFromSku = firstStr(v?.image_url);
      const imageFromVariant = pickFirstImage(v);
      const imageFromJson = pickFirstImage(jv);

      const resolved =
        imageFromSku ||
        imageFromVariant ||
        imageFromJson ||
        productImages[0] ||
        "/product/placeholder.png";

      return {
        ...v,

        /** 🔥 FUENTE DE VERDAD */
        _resolvedImage: resolved,

        /** legacy / compat */
        image_url: imageFromSku ?? undefined,
        image: resolved,
        images: [resolved],
        imageUrl: v?.imageUrl ?? jv?.imageUrl,
        img: v?.img ?? jv?.img,
      };
    });

    return {
      ...p,
      id: String(getSheetId(pAny) || pAny.id || jp?.id || "").trim(),
      images: productImages.length ? productImages : ["/product/placeholder.png"],
      variants: mergedVariants,
    } as Product;
  });
}

export function withVariantImagesOne(p: Product): Product {
  return withVariantImages([p])[0] ?? p;
}
