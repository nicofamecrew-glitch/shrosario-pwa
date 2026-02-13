import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PRODUCTS_PATH = path.join(ROOT, "data","products.json");

// Ajustá estos 3 si querés
const PRODUCT_ID = "coalix-color";
const BRAND = "Coalix";
const LINE = "Color";
const NAME = "Color Permanente";
const CATEGORY = "Coloración";

// Imagen “base” (la misma para todas las variantes, como hicimos ayer)
// Si después tenés imágenes por tono, lo mejoramos.
const DEFAULT_IMAGE = "/product/coalix-coloracion-120gr.png";

// Tonos según carta (en tu formato preferido).
// Nota: si tu sistema usa "7/33", dejalos con "/". Si usa "7_33", también sirve y lo normalizamos.
const TONES = [
  // Naturales
  "1","3","4","5","6","7","8","9","10",

  // Naturales suaves
  "7/0","8/0","9/0",

  // Dorados
  "5/3","6/3","7/3","8/3","9/3","9/33",

  // Cenizas
  "1/1","4/1","5/1","6/1","7/1","8/1","10/1",
  "5/11","7/11","8/11","9/11",
  "8/01","9/01",

  // Nacarados
  "6/2","8/2","10/2","9/22",
  "6/26","7/26","6/23","7/23",
  "7/62",

  // Cobrizos
  "5/4","7/4","8/40","6/64",

  // Rojizos
  "5/66","6/66",

  // Rojizos intensos
  "4/66i","5/66i","6/66i",

  // Marrones neutralizadores
  "5/7A","6/7A","7/7A","8/7A",

  // Marrones nogal
  "5/14","6/14","7/14","8/14",

  // Beige / especiales (familias de moda)
  "3/52","5/52","5/41","6/35","6/31","7/32","8/32","9/31",
  "7/13","8/13","10/13",
  "6/12","7/12","10/12","8/21","9/21",

  // Super aclarantes
  "100/0","100/01","100/1",

  // Anexos (si querés tenerlos como variantes; si no, borrarlos)
  "12","Az_Pl","C_Acl",
];

function normTone(t) {
  // Acepta "7_33" o "7/33" y lo guarda como "7/33"
  return String(t).trim().replace("_", "/");
}

function skuFromTone(tone) {
  // SKU estable: COA-COL-7-33 / COA-COL-100-01 / COA-COL-AZ_PL
  const t = normTone(tone).toUpperCase().replace("/", "-").replace(/\s+/g, "");
  return `COA-COL-${t}`;
}

function loadProducts() {
  if (!fs.existsSync(PRODUCTS_PATH)) {
    throw new Error(`No encuentro products.json en: ${PRODUCTS_PATH}`);
  }
  const raw = fs.readFileSync(PRODUCTS_PATH, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("products.json debe ser un array []");
  return data;
}

function saveProducts(products) {
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2) + "\n", "utf-8");
}

function upsertProduct(products, product) {
  const idx = products.findIndex((p) => p?.id === product.id);
  if (idx >= 0) products[idx] = product;
  else products.push(product);
  return products;
}

function main() {
  const products = loadProducts();

  const variants = TONES.map((t) => {
    const tone = normTone(t);
    return {
      size: tone,
      sku: skuFromTone(tone),
      priceRetail: 0,
      priceWholesale: 0,
      images: [DEFAULT_IMAGE],
    };
  });

  // Validación básica: SKUs únicos
  const skus = new Set();
  for (const v of variants) {
    if (skus.has(v.sku)) throw new Error(`SKU duplicado: ${v.sku}`);
    skus.add(v.sku);
  }

  const product = {
    id: PRODUCT_ID,
    brand: BRAND,
    line: LINE,
    name: NAME,
    category: CATEGORY,
    variants,
    tags: ["color", "coalix", "tonos"],
  };

  upsertProduct(products, product);
  saveProducts(products);

  console.log(`✅ Coalix generado y upserteado: ${PRODUCT_ID}`);
  console.log(`   Variantes: ${variants.length}`);
}

main();
