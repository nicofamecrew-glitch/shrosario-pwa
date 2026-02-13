import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const IMG_DIR = path.join(ROOT, "public", "product");
const OUT_FILE = path.join(ROOT, "products.coalix.generated.json");

const BRAND = "Coalix";
const VALID_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function titleCase(s) {
  return norm(s)
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function tokenize(nameNoExt) {
  return norm(nameNoExt).split(/[-_]+/).filter(Boolean);
}

function isCoalixFile(filename) {
  return norm(filename).includes("coalix");
}

function parseCoalix(tokens) {
  // tokens normalizados
  let t = tokens.map(norm).filter(Boolean);

  // mover "coalix" al inicio
  t = t.filter((x) => x !== "coalix");
  t.unshift("coalix");

  const vToken = t.find((x) => /^[0-9]+v$/.test(x)) || "";
  const mlToken = t.find((x) => /(ml|gr|g|kg|l|lt)$/.test(x)) || "";

  // La variante técnica (para SKU): solo 10v/20v/...
  const variantKey = vToken ? vToken : "";

  // Size humano (para UI)
  const displaySize =
    vToken && mlToken ? `${vToken} ${mlToken}` :
    vToken ? vToken :
    mlToken ? mlToken :
    "Único";

  // productId: sacamos SOLO el vToken (el ml queda para diferenciar tamaños de envase)
  if (vToken) t = t.filter((x) => x !== vToken);

  const productId = t.join("-");

  return { productId, variantKey, displaySize };
}

function buildSku(productId, variantKey) {
  const pid = ("COA-" + productId)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const v = String(variantKey || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!v) return pid;
  if (pid.endsWith("-" + v)) return pid; // evita duplicación tipo ...-30ML-30ML

  return `${pid}-${v}`;
}

function sortVariant(a, b) {
  const an = parseInt(String(a.size), 10);
  const bn = parseInt(String(b.size), 10);
  const aIsNum = Number.isFinite(an);
  const bIsNum = Number.isFinite(bn);

  if (aIsNum && bIsNum) return an - bn;
  if (aIsNum && !bIsNum) return -1;
  if (!aIsNum && bIsNum) return 1;
  return String(a.size).localeCompare(String(b.size));
}

function main() {
  if (!fs.existsSync(IMG_DIR)) {
    console.error("No existe la carpeta:", IMG_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(IMG_DIR)
    .filter((f) => VALID_EXT.has(path.extname(f).toLowerCase()));

  const coalixFiles = files.filter((f) => isCoalixFile(f));

  if (coalixFiles.length === 0) {
    console.error("No encontré imágenes Coalix en:", IMG_DIR);
    process.exit(1);
  }

  const products = new Map();

  for (const file of coalixFiles) {
    const base = path.basename(file, path.extname(file));
    const tokens = tokenize(base);

    const { productId, variantKey, displaySize } = parseCoalix(tokens);

    const niceName = titleCase(productId.replace(/^coalix-/, ""));
    const name = niceName ? `Coalix ${niceName}` : "Coalix";

    const sku = buildSku(productId, variantKey);

    const variantObj = {
      size: displaySize,
      sku,
      priceRetail: 0,
      priceWholesale: 0,
      images: [`/product/${file}`],
    };

    if (!products.has(productId)) {
      products.set(productId, {
        id: productId,
        brand: BRAND,
        line: "",
        name,
        category: "",
        variants: [],
        tags: ["coalix"],
      });
    }

    products.get(productId).variants.push(variantObj);
  }

  const out = Array.from(products.values());

  out.forEach((p) => p.variants.sort(sortVariant));
  out.sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf-8");

  console.log("OK → Generado:", OUT_FILE);
  console.log("Imágenes Coalix detectadas:", coalixFiles.length);
  console.log("Productos creados:", out.length);
}

main();
