const fs = require("fs");

const file = "data/products.json";

try {
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("products.json no es un array");
  }

  const ids = new Set();
  const skus = new Set();

  data.forEach((p, i) => {
    if (!p.id) throw new Error(`Producto sin id en index ${i}`);
    if (ids.has(p.id)) throw new Error(`ID duplicado: ${p.id}`);
    ids.add(p.id);

    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      throw new Error(`Producto sin variants: ${p.id}`);
    }

    p.variants.forEach((v) => {
      if (!v.sku) throw new Error(`Variant sin sku en ${p.id}`);
      if (skus.has(v.sku)) throw new Error(`SKU duplicado: ${v.sku}`);
      skus.add(v.sku);
    });
  });

  console.log("✅ products.json OK");
  console.log(`Productos: ${data.length}`);
  console.log(`SKUs únicos: ${skus.size}`);
} catch (e) {
  console.error("❌ ERROR");
  console.error(e.message);
  process.exit(1);
}
