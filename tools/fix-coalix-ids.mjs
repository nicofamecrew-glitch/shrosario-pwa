// tools/fix-coalix-ids.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const IN_FILE = path.join(ROOT, "data", "products.json");
const OUT_FILE = path.join(ROOT, "data", "products.fixed.json");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf-8");
}

function isCoalix(prod) {
  return String(prod?.brand || "").toLowerCase().includes("coalix");
}

function fixId(id) {
  let x = String(id || "").trim().toLowerCase();

  // 1) typo "acondiccionador" -> "acondicionador"
  x = x.replace(/acondiccionador/g, "acondicionador");

  // 2) crema-peinar-23-0gr -> crema-peinar-230gr
  x = x.replace(/-23-0gr\b/g, "-230gr");

  // 3) coalix al inicio si aparece al final (serum-sellador-coalix-30ml)
  //    regla: si contiene "-coalix-" o termina con "-coalix" lo movemos al inicio
  if (!x.startsWith("coalix-")) {
    if (x.includes("-coalix-")) {
      x = x.replace("-coalix-", "-");
      x = `coalix-${x}`;
    } else if (x.endsWith("-coalix")) {
      x = x.replace(/-coalix\b/, "");
      x = `coalix-${x}`;
    } else if (x.includes("coalix")) {
      // fallback conservador
      x = x.replace(/coalix/g, "").replace(/--+/g, "-").replace(/^-|-$/g, "");
      x = `coalix-${x}`;
    }
  }

  // limpieza final
  x = x.replace(/--+/g, "-").replace(/^-|-$/g, "");
  return x;
}

function main() {
  const products = readJson(IN_FILE);

  const idSet = new Set(products.map((p) => String(p.id)));
  const changes = [];
  const out = [];

  for (const p of products) {
    if (!isCoalix(p)) {
      out.push(p);
      continue;
    }

    const oldId = String(p.id);
    const newId = fixId(oldId);

    if (newId !== oldId) {
      changes.push({ oldId, newId });
    }

    out.push({ ...p, id: newId });
  }

  // Detectar colisiones (dos productos terminaron con el mismo id)
  const seen = new Map();
  for (const p of out) {
    const id = String(p.id);
    seen.set(id, (seen.get(id) || 0) + 1);
  }
  const collisions = [...seen.entries()].filter(([, n]) => n > 1);

  writeJson(OUT_FILE, out);

  console.log("OK ->", OUT_FILE);
  console.log("Cambios:", changes.length);
  if (changes.length) console.log(changes);

  console.log("Colisiones:", collisions.length);
  if (collisions.length) console.log(collisions);

  if (collisions.length) {
    console.log(
      "No apliques el reemplazo automático: hay IDs duplicados después del fix."
    );
    process.exit(2);
  }
}

main();
