import fs from "fs";

const IN_FILE = "./product.generated.json";
const OUT_FILE = "./product.final.json";

const products = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));

const lower = (s) => String(s || "").toLowerCase();
const isFidelite = (p) => lower(p.brand).includes("fidel");
const titleFix = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\bY\b/g, "y")
    .trim();

function ensureCategory(p, cat) {
  p.category = cat;
}

function mergeProducts(target, source) {
  // merge variants by size; union images
  for (const sv of source.variants || []) {
    let tv = (target.variants || []).find((x) => x.size === sv.size);
    if (!tv) {
      target.variants.push(sv);
    } else {
      tv.images = Array.from(new Set([...(tv.images || []), ...(sv.images || [])]));
      // preserve prices if any
      tv.priceRetail = tv.priceRetail || sv.priceRetail || 0;
      tv.priceWholesale = tv.priceWholesale || sv.priceWholesale || 0;
      tv.sku = tv.sku || sv.sku || "";
    }
  }
}

// 1) Normalizar typos y nombres base
for (const p of products) {
  if (!isFidelite(p)) continue;

  // nombres
  p.name = titleFix(p.name);

  // acondicionador typos
  p.name = p.name.replace("Acondicionardor", "Acondicionador");
  p.name = p.name.replace("Acondicionaldor", "Acondicionador");

  // keratin -> keratina (Fidelité)
  p.name = p.name.replace(/\bKeratin\b/gi, "Keratina");

  // mascara.caviar
  p.name = p.name.replace("Mascara.caviar", "Mascara Caviar");

  // oxidate -> oxidante
  p.name = p.name.replace(/\bOxidate\b/gi, "Oxidante");

  // categorías: crema de peinado
  if (lower(p.name).includes("crema de peinado") || lower(p.name).includes("crema peinar")) {
    ensureCategory(p, "Crema de peinar");
  }

  // wax
  if (lower(p.name).includes("wax")) {
    ensureCategory(p, "Cera/Wax");
  }

  // crema acida (mejor orden)
  if (lower(p.name) === "crema acida") {
    ensureCategory(p, "Tratamientos");
  }
}

// 2) Unificar duplicados conocidos por ID/name (Máscara Caviar, Acondicionador Argan, etc.)
const out = [];
const byKey = new Map();

function keyOf(p) {
  // marca + nombre normalizado + categoria
  return `${lower(p.brand)}::${lower(p.name)}::${lower(p.category)}`;
}

for (const p of products) {
  if (!isFidelite(p)) {
    out.push(p);
    continue;
  }
  const k = keyOf(p);
  if (!byKey.has(k)) {
    byKey.set(k, p);
    out.push(p);
  } else {
    mergeProducts(byKey.get(k), p);
  }
}

// 3) Fix oxidantes Fidelité: size por regla
for (const p of out) {
  if (!isFidelite(p)) continue;
  if (!lower(p.name).startsWith("oxidante")) continue;
  // 3b) Fix SERUM 30ml (Fidelité): size por regla de imagen
for (const p of out) {
  if (!isFidelite(p)) continue;
  if (!lower(p.name).includes("serum")) continue;

  for (const v of p.variants || []) {
    const imgs = (v.images || []).join(" ").toLowerCase();
    if (imgs.includes("30ml")) v.size = "30ml";
  }

  // nombre limpio (si quedó "Serum ... 30ml" en el name)
  p.name = p.name.replace(/\s*30ml\s*/gi, " ").replace(/\s+/g, " ").trim();
  ensureCategory(p, "Serum");
}


  // mirar imágenes para decidir voltaje
  for (const v of p.variants || []) {
    const imgs = (v.images || []).join(" ").toLowerCase();
    if (imgs.includes("oxidante-10")) v.size = "10v";
    if (imgs.includes("oxidante-20")) v.size = "20v";
    if (imgs.includes("oxidante-30")) v.size = "30v";
    if (imgs.includes("40v")) v.size = "40v";
  }

  // renombrar producto si corresponde (ej: "Oxidante 10")
  // si tiene una sola variante con 10v, lo dejamos "Oxidante 10v"
  const sizes = (p.variants || []).map((x) => x.size);
  if (sizes.length === 1 && ["10v", "20v", "30v", "40v"].includes(sizes[0])) {
    p.name = `Oxidante ${sizes[0]}`;
  }

  ensureCategory(p, "Oxidante");
}

// 4) Re-unificar por si el renombre generó claves nuevas
const final = [];
const fidelMap = new Map();
for (const p of out) {
  if (!isFidelite(p)) {
    final.push(p);
    continue;
  }
  const k = keyOf(p);
  if (!fidelMap.has(k)) {
    fidelMap.set(k, p);
    final.push(p);
  } else {
    mergeProducts(fidelMap.get(k), p);
  }
}

fs.writeFileSync(OUT_FILE, JSON.stringify(final, null, 2), "utf8");
console.log(`OK -> ${OUT_FILE} (${final.length} productos)`);
