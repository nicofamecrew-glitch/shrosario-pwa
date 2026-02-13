// scripts/syncProducts.js
// CARGAR ENV LOCAL EXPLÍCITO
require("dotenv").config({ path: ".env.local" });

const { google } = require("googleapis");
const products = require("../data/products.json");

// =========================
// HELPERS
// =========================
function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeKey(raw) {
  if (!raw) return "";
  let k = String(raw);

  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1);
  }

  k = k.replace(/\\n/g, "\n");
  return k.trim();
}

function toStr(v) {
  return String(v ?? "").trim();
}

function toNum(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function tagsToCsv(tags) {
  if (Array.isArray(tags)) return tags.map(String).map(s => s.trim()).filter(Boolean).join(",");
  return toStr(tags);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// =========================
// GOOGLE SHEETS CLIENT
// =========================
async function getSheets() {
  const email = mustEnv("GOOGLE_SHEETS_CLIENT_EMAIL");
  const key = normalizeKey(mustEnv("GOOGLE_SHEETS_PRIVATE_KEY"));

  if (!key || key.length < 100) {
    throw new Error(`Private key inválida (len=${key ? key.length : 0}).`);
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  await auth.authorize();

  return google.sheets({ version: "v4", auth });
}

// Lee hoja completa A:Z
async function readAll(sheets, spreadsheetId, sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
  return res.data.values || [];
}

// Header index map
function headerMap(rows) {
  const headers = (rows[0] || []).map((h) => String(h).trim());
  const map = new Map();
  headers.forEach((h, i) => {
    if (h) map.set(h, i);
  });
  return map;
}

function getCell(row, hmap, key) {
  const idx = hmap.get(key);
  if (idx === undefined) return "";
  return row[idx] ?? "";
}

// =========================
// MAIN
// =========================
async function main() {
  if (!Array.isArray(products)) {
    throw new Error("products.json must be an array");
  }
  // =========================
  // VALIDACIONES ANTES DE SHEETS (anti-carteles rojos)
  // =========================
  const ids = new Set();
  const skus = new Set();

  for (const p of products) {
    const id = toStr(p.id);
    if (!id) throw new Error("Producto sin id");
    if (ids.has(id)) throw new Error(`ID duplicado en products.json: ${id}`);
    ids.add(id);

const imgs = Array.isArray(p.images) ? p.images : [];
const hasVariantImages = Array.isArray(p.variants) && p.variants.some(v => Array.isArray(v.images) && v.images[0]);

if ((!imgs.length || !toStr(imgs[0])) && !hasVariantImages) {
  console.warn(`⚠️ Producto ${id} sin imagen, se asigna placeholder`);
  p.images = ["/product/placeholder.png"];
}

if ((!imgs.length || !toStr(imgs[0])) && !hasVariantImages) {
  console.warn(`⚠️ Producto ${id} sin imagen en padre ni variantes, se salta`);
  continue; // sigue con el próximo producto en vez de cortar todo
}

    const vars = Array.isArray(p.variants) ? p.variants : [];
    if (!vars.length) throw new Error(`Producto ${id} sin variants[]`);

    for (const v of vars) {
      const sku = toStr(v.sku);
      if (!sku) throw new Error(`Producto ${id} tiene variant sin sku`);
      if (skus.has(sku)) throw new Error(`SKU duplicado en products.json: ${sku}`);
      skus.add(sku);

      if (!toStr(v.size)) throw new Error(`SKU ${sku} sin size`);
    }
  }

  const sheets = await getSheets();

  const PRODUCTS_SHEET_ID = mustEnv("PRODUCTS_SHEET_ID");
  const PRODUCTS_SHEET_NAME = mustEnv("PRODUCTS_SHEET_NAME");

  const VARIANTS_SHEET_ID = mustEnv("VARIANTS_SHEET_ID");
  const VARIANTS_SHEET_NAME = mustEnv("VARIANTS_SHEET_NAME");

  // 1) Leer estado actual de Sheets (para upsert)
  const [pRows, vRows] = await Promise.all([
    readAll(sheets, PRODUCTS_SHEET_ID, PRODUCTS_SHEET_NAME),
    readAll(sheets, VARIANTS_SHEET_ID, VARIANTS_SHEET_NAME),
  ]);

  if (!pRows.length) throw new Error("Products sheet vacío (faltan headers?)");
  if (!vRows.length) throw new Error("Variants sheet vacío (faltan headers?)");

  const pH = headerMap(pRows);
  const vH = headerMap(vRows);

  // 2) Indexar filas existentes
  const productRowById = new Map(); // id -> rowIndex (1-based)
  for (let i = 1; i < pRows.length; i++) {
    const id = toStr(getCell(pRows[i], pH, "id"));
    if (id) productRowById.set(id, i + 1);
  }

  const variantRowBySku = new Map(); // sku -> rowIndex
  for (let i = 1; i < vRows.length; i++) {
    const sku = toStr(getCell(vRows[i], vH, "sku"));
    if (sku) variantRowBySku.set(sku, i + 1);
  }

  // 3) Preparar operaciones
  const dataUpdatesProducts = []; // batchUpdate data[]
  const appendProducts = [];      // values.append
  const dataUpdatesVariants = [];
  const appendVariants = [];

  // columnas de products que vamos a tocar (A:H) sin reescribir headers
  // id, brand, line, name, category, tags, image, sort
  for (const p of products) {
    const id = toStr(p.id);
    if (!id) continue;

    const image = (p.images && p.images[0]) || p.image || "";
    const prodRow = [
      id,
      toStr(p.brand),
      toStr(p.line),
      toStr(p.name),
      toStr(p.category),
      tagsToCsv(p.tags),
      toStr(image),
      Number(p.sort ?? 0),
    ];

    const rowIndex = productRowById.get(id);
    if (rowIndex) {
      // update solo A:H de esa fila
      dataUpdatesProducts.push({
        range: `${PRODUCTS_SHEET_NAME}!A${rowIndex}:H${rowIndex}`,
        values: [prodRow],
      });
    } else {
      appendProducts.push(prodRow);
    }

    // Variants: upsert por SKU
    const vars = Array.isArray(p.variants) ? p.variants : [];
    for (const v of vars) {
      const sku = toStr(v.sku);
      if (!sku) continue;

      const vRowIndex = variantRowBySku.get(sku);

      if (vRowIndex) {
        // 👇 CLAVE: NO pisar precios/stock/status si ya existe.
        // Solo aseguramos product_id y size (datos “descriptivos”)
        const existingPriceRetail = getCell(vRows[vRowIndex - 1], vH, "priceRetail");
        const existingPriceWholesale = getCell(vRows[vRowIndex - 1], vH, "priceWholesale");
        const existingStock = getCell(vRows[vRowIndex - 1], vH, "stock");
        const existingStatus = getCell(vRows[vRowIndex - 1], vH, "status");

        dataUpdatesVariants.push({
          range: `${VARIANTS_SHEET_NAME}!A${vRowIndex}:G${vRowIndex}`,
          values: [[
            id,                 // product_id (lo mantiene consistente)
            toStr(v.size),      // size (lo actualiza si cambió)
            sku,                // sku
            existingPriceRetail,
            existingPriceWholesale,
            existingStock,
            existingStatus || "active",
          ]],
        });
      } else {
        // SKU nuevo: acá sí ponemos precios del JSON
        appendVariants.push([
          id,
          toStr(v.size),
          sku,
          toNum(v.priceRetail),
          toNum(v.priceWholesale),
          toStr(v.stock ?? ""),           // si viene, lo respeta
          toStr(v.status ?? "active"),
        ]);
      }
    }
  }

  // 4) Ejecutar batchUpdate en chunks (evita cuota y payload enorme)
  const CHUNK = 200;

  // Products batchUpdate
  for (const ch of chunk(dataUpdatesProducts, CHUNK)) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: PRODUCTS_SHEET_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: ch,
      },
    });
  }

  // Variants batchUpdate
  for (const ch of chunk(dataUpdatesVariants, CHUNK)) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: VARIANTS_SHEET_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: ch,
      },
    });
  }

  // 5) Append nuevos (products + variants)
  if (appendProducts.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: PRODUCTS_SHEET_ID,
      range: `${PRODUCTS_SHEET_NAME}!A:H`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: appendProducts },
    });
  }

  if (appendVariants.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: VARIANTS_SHEET_ID,
      range: `${VARIANTS_SHEET_NAME}!A:G`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: appendVariants },
    });
  }

  console.log("✅ Sync OK (UPSERT, sin pisar operación)");
  console.log(`Products updates: ${dataUpdatesProducts.length}, appended: ${appendProducts.length}`);
  console.log(`Variants updates: ${dataUpdatesVariants.length}, appended: ${appendVariants.length}`);
}

main().catch((err) => {
  console.error("❌ syncProducts error:", err.message);
  process.exit(1);
});
