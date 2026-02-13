import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const IN_FILE = path.join(ROOT, "data", "products.json");
const OUT_FILE = path.join(ROOT, "data", "products.dedup.json");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf-8");
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const k = String(x);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function pickStr(a, b) {
  // elegí el más “útil”: no vacío y más largo
  const sa = String(a || "").trim();
  const sb = String(b || "").trim();
  if (!sa && sb) return sb;
  if (!sb && sa) return sa;
  if (sa.length >= sb.length) return sa;
  return sb;
}

function mergeVariants(vsA = [], vsB = []) {
  const out = [];
  const bySku = new Map();

  function addOne(v) {
    if (!v) return;
    const sku = String(v.sku || "").trim();
    const size = String(v.size || "").trim();
    const key = sku ? `sku:${sku}` : size ? `size:${size}` : null;

    if (!key) {
      out.push(v);
      return;
    }

    const prev = bySku.get(key);
    if (!prev) {
      bySku.set(key, v);
      return;
    }

    // merge suave: mantenemos precios si alguno los tiene, e imágenes
    const merged = {
      ...prev,
      ...v,
      size: pickStr(prev.size, v.size),
      sku: pickStr(prev.sku, v.sku),
      priceRetail: prev.priceRetail || v.priceRetail || 0,
      priceWholesale: prev.priceWholesale || v.priceWholesale || 0,
      images: uniq([...(prev.images || []), ...(v.images || [])]),
    };

    bySku.set(key, merged);
  }

  [...vsA, ...vsB].forEach(addOne);

  // reconstruir en orden estable
  for (const v of bySku.values()) out.push(v);

  return out;
}

function mergeProduct(a, b) {
  const merged = {
    ...a,
    ...b,
    id: a.id, // mismo id
    brand: pickStr(a.brand, b.brand),
    name: pickStr(a.name, b.name),
    category: pickStr(a.category, b.category),
    line: pickStr(a.line, b.line),
    tags: uniq([...(a.tags || []), ...(b.tags || [])]),
    images: uniq([...(a.images || []), ...(b.images || [])]),
    variants: mergeVariants(a.variants || [], b.variants || []),
  };

  return merged;
}

function main() {
  const products = readJson(IN_FILE);

  const map = new Map();
  const dups = new Map();

  for (const p of products) {
    const id = String(p?.id || "").trim();
    if (!id) continue;

    if (!map.has(id)) {
      map.set(id, p);
    } else {
      const prev = map.get(id);
      const merged = mergeProduct(prev, p);
      map.set(id, merged);

      dups.set(id, (dups.get(id) || 1) + 1);
    }
  }

  const out = Array.from(map.values());

  writeJson(OUT_FILE, out);

  console.log("OK ->", OUT_FILE);
  console.log("Antes:", products.length, "Después:", out.length);
  console.log("IDs duplicados resueltos:", dups.size);
  if (dups.size) console.log([...dups.entries()]);
}

main();
