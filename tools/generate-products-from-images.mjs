import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const LIST_FILE = path.join(ROOT, "_tmp_images.txt");
const OUT_FILE = path.join(ROOT, "product.generated.json");

if (!fs.existsSync(LIST_FILE)) {
  console.error("No existe _tmp_images.txt. Generarlo con el comando de PowerShell.");
  process.exit(1);
}

const lines = fs
  .readFileSync(LIST_FILE, "utf8")
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

// ---------- helpers ----------
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[_]+/g, "-")
    .replace(/[^\w\-\.]+/g, "")
    .replace(/-+/g, "-")
    .trim();

function guessBrand(file) {
  const f = file.toLowerCase();
  const brands = ["vexa", "ossono", "coalix", "fidelite", "lisse-extreme", "docta", "influencia"];
  // match por prefijo mas común
  for (const b of brands) {
    if (f.startsWith(b + "-") || f.startsWith(b + "_")) return b;
  }
  // casos especiales vistos en tus nombres
  if (f.startsWith("fidelité-") || f.startsWith("fidelite_")) return "fidelite";
  return "misc";
}

function titleBrand(b) {
  if (b === "fidelite") return "Fidelité";
  if (b === "lisse-extreme") return "Lisse Extreme";
  return b.charAt(0).toUpperCase() + b.slice(1);
}

// size patterns
function extractSize(file) {
  const f = file.toLowerCase();

  // 12u-15ml
  const mPack = f.match(/(\d+u)-(\d+ml)/);
  if (mPack) return `${mPack[1]}-${mPack[2]}`;

  // 1kg / 1000ml / 900ml / 700gr / 500gr / 250gr / 270ml / 260ml / 230ml / 200ml / 180ml / 120ml / 60gr / 10v 20v 30v 40v
  const m =
    f.match(/(\d{3,4})ml/) ||
    f.match(/(\d{2,4})gr/) ||
    f.match(/(\d)kg/) ||
    f.match(/(\d{1,2})v/);

  if (m) {
    // normalizamos
    if (m[0].endsWith("ml")) return `${m[1]}ml`;
    if (m[0].endsWith("gr")) return `${m[1]}gr`;
    if (m[0].endsWith("kg")) return `${m[1]}kg`;
    if (m[0].endsWith("v")) return `${m[1]}v`;
  }

  // 1l / 1L
  if (f.match(/(^|-)1l(\.png)?$/) || f.includes("-1l.")) return "1000ml";

  // si no encontramos
  return "std";
}

function removeSizeToken(base, size) {
  let b = base;

  // borrar tokens de tamaño de forma robusta
  const tokens = [
    size,
    size.replace("1000ml", "1l"),
    size.replace("1000ml", "1L"),
    "1l",
    "1000ml",
    "900ml",
    "700gr",
    "500gr",
    "270ml",
    "260ml",
    "250gr",
    "230ml",
    "200ml",
    "180ml",
    "120ml",
    "60gr",
    "1kg",
    "10v",
    "20v",
    "30v",
    "40v",
  ].map(norm);

  const parts = norm(b).replace(/\.png$/i, "").split("-");
  const filtered = parts.filter((p) => !tokens.includes(p));
  return filtered.join("-");
}

function guessCategoryFromName(name) {
  const n = name.toLowerCase();
  const rules = [
    ["shampoo", "Shampoo"],
    ["acondicionador", "Acondicionador"],
    ["mascara", "Máscara"],
    ["ampoll", "Ampollas"],
    ["serum", "Serum"],
    ["gel", "Gel"],
    ["cera", "Cera"],
    ["laca", "Laca"],
    ["oxidante", "Oxidante"],
    ["activador", "Oxidante/Activador"],
    ["polvo-decolorante", "Decoloración"],
    ["decolorante", "Decoloración"],
    ["protector-termico", "Protector térmico"],
    ["crema-de-peinar", "Crema de peinar"],
    ["crema-de-rulos", "Crema de rulos"],
    ["coloracion", "Coloración"],
    ["carta-de-colores", "Carta de colores"],
    ["plex", "Plex"],
  ];
  for (const [k, cat] of rules) if (n.includes(k)) return cat;
  return "Otros";
}

function toTitleName(slug) {
  // convierte "shampoo-revitalize-keratina" -> "Shampoo Revitalize Keratina"
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------- build ----------
const byProductKey = new Map();

for (const file of lines) {
  const brandKey = guessBrand(file);
  const brand = titleBrand(brandKey);

  const size = extractSize(file);
  const baseSlug = norm(file).replace(/\.png$/i, "");
  const baseNoSize = removeSizeToken(baseSlug, size);

  // productKey: marca + nombre sin tamaño
  const productKey = `${brandKey}::${baseNoSize}`;

  const imagePath = `/product/${file}`;

  if (!byProductKey.has(productKey)) {
    const prettyName = toTitleName(
      baseNoSize.replace(new RegExp("^" + norm(brandKey) + "[-_]?"), "")
    );

    byProductKey.set(productKey, {
      id: `${brandKey}-${baseNoSize}`
        .replace(new RegExp("^" + brandKey + "-"), brandKey + "-")
        .replace(/[^a-z0-9\-]/g, "-")
        .replace(/-+/g, "-"),
      brand,
      name: prettyName,
      category: guessCategoryFromName(baseNoSize),
      variants: [],
      tags: [],
    });
  }

  const prod = byProductKey.get(productKey);

  // variante por size
  let v = prod.variants.find((x) => x.size === size);
  if (!v) {
    v = {
      size,
      sku: "", // lo completamos en fase 2 (o lo autogeneramos si querés)
      priceRetail: 0,
      priceWholesale: 0,
      images: [],
    };
    prod.variants.push(v);
  }
  if (!v.images.includes(imagePath)) v.images.push(imagePath);
}

// ordenar
const products = Array.from(byProductKey.values()).sort((a, b) =>
  (a.brand + a.name).localeCompare(b.brand + b.name)
);

fs.writeFileSync(OUT_FILE, JSON.stringify(products, null, 2), "utf8");
console.log(`OK -> ${OUT_FILE} (${products.length} productos)`);
