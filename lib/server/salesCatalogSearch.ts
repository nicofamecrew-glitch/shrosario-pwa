// Motor determinista: no permite que una IA invente productos, SKUs o presentaciones.
// Los datos de producto siempre llegan del catálogo activo de SH.
export type SalesProduct = {
  id?: string; name?: string; brand?: string; line?: string; category?: string;
  tags?: string[] | string;
  variants?: Array<{ sku?: string; size?: string; status?: string; stock?: number | string }>;
};

const normalize = (value: unknown) =>
  String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const tokens = (value: unknown) => normalize(value).split(" ").filter(Boolean);
const TYPES: Record<string, string[]> = {
  shampoo: ["shampoo", "shampoos", "shampu", "champu"],
  acondicionador: ["acondicionador", "acondicionadores", "enjuague"],
  mascara: ["mascara", "mascaras", "mascarilla", "mascarillas", "bano de crema"],
  ampolla: ["ampolla", "ampollas"],
  tintura: ["tintura", "tinturas", "coloracion"],
};
const BRANDS = ["ossono", "vexa", "coalix", "fidelite", "kleno", "lisse extreme"];
const STOP = new Set(["necesito", "quiero", "dame", "mandame", "pasame", "tenes", "tienen", "de", "del", "la", "el", "los", "las", "un", "una", "por", "favor", "para", "que", "me", "y", "con", "x"]);

function getSizeQuery(text: string) {
  const match = text.match(/\b(\d+(?:[.,]\d+)?)\s*(litros?|lts?|l|ml|cc|gr|gramos?|kg|kilos?)\b/i);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  const unit = normalize(match[2]);
  const normalizedMl = ["l", "lt", "lts", "litro", "litros"].includes(unit) ? amount * 1000 :
    ["kg", "kilo", "kilos"].includes(unit) ? amount * 1000 : amount;
  const kind = ["kg", "kilo", "kilos", "gr", "gramo", "gramos"].includes(unit) ? "g" : "ml";
  return { amount: normalizedMl, kind };
}
function variantMatchesSize(value: string, expected: ReturnType<typeof getSizeQuery>) {
  if (!expected) return true;
  const found = getSizeQuery(value);
  return !!found && found.kind === expected.kind && found.amount === expected.amount;
}
function typeOf(text: string) {
  const n = normalize(text);
  return Object.entries(TYPES).find(([, aliases]) => aliases.some(a => n.split(" ").includes(normalize(a))))?.[0] ?? null;
}
function catalogType(p: SalesProduct) {
  return typeOf([p.name, p.category, p.line].join(" "));
}

export function searchSalesCatalog(query: string, catalog: SalesProduct[]) {
  const q = normalize(query);
  if (!q || q.length > 180) return { status: "invalid" as const, quantity: null, matches: [], question: "Indicame qué producto buscás." };
  const qtyMatch = q.match(/\b(\d{1,3})\s*(?:unidades|unidad|u|x)?\s*(?=shampoo|shampoos|shampu|champu|acondicionador|mascara|ampolla|tintura)/);
  const quantity = qtyMatch ? Number(qtyMatch[1]) : null;
  const brand = BRANDS.find(b => q.includes(b)) ?? null;
  const kind = typeOf(q);
  const size = getSizeQuery(q);
  const terms = tokens(q).filter(t => !STOP.has(t) && !/^\d+$/.test(t) &&
    !Object.values(TYPES).flat().includes(t) && !BRANDS.flatMap(tokens).includes(t) &&
    !["ml", "cc", "gr", "kg", "litro", "litros", "lts", "lt", "l", "unidad", "unidades"].includes(t));
  if (!brand && !kind && !terms.length) return { status: "invalid" as const, quantity, matches: [], question: "¿Qué producto y marca necesitás?" };
  const matches = catalog.flatMap(p => {
    if (brand && normalize(p.brand) !== brand) return [];
    if (kind && catalogType(p) !== kind) return [];
    const searchable = normalize([p.name, p.brand, p.line, p.category, ...(Array.isArray(p.tags) ? p.tags : String(p.tags ?? "").split(","))].join(" "));
    if (terms.some(t => !searchable.split(" ").includes(t))) return [];
    return (p.variants ?? []).filter(v => v.sku && normalize(v.status ?? "active") !== "paused" &&
        variantMatchesSize(String(v.size ?? ""), size)).map(v => ({
      productId: String(p.id ?? ""), name: String(p.name ?? ""),
      brand: String(p.brand ?? ""), sku: String(v.sku),
      size: String(v.size ?? ""), stock: v.stock ?? null,
    }));
  }).filter(m => m.productId);
  const status = matches.length === 0 ? "not_found" : matches.length === 1 ? "exact" : "ambiguous";
  const question = status === "ambiguous" ? "Encontré varias opciones. ¿Cuál línea o presentación querés?" :
    status === "not_found" ? "No encontré una variante que coincida exactamente. ¿Podés confirmar marca, línea y tamaño?" : null;
  return { status, quantity, filters: { brand, kind, size }, matches: matches.slice(0, 15), question, totalMatches: matches.length };
}
