// scripts/generateOssonoColoracionVariantsCsv.js
const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "ossono-coloracion-60gr.variants.csv");

// CONFIG
const PRODUCT_ID = "ossono-coloracion-60gr";
const SKU_PREFIX = "OSS-OSSONO-COLORACION-60GR-";

// Si querés setear defaults:
const PRICE_RETAIL = "";     // ej: 4250 o "" para dejar vacío
const PRICE_WHOLESALE = "";  // ej: 3187.5 o "" para dejar vacío
const STOCK = "";            // ej: 0 o 50 o ""
const STATUS = "active";

// Lista de tonos (size)
const SIZES = [
  // Naturales
  "1","3","4","5","6","7","8","9","10",

  // Naturales cálidos
  "6nc","7nc","8nc","9nc",

  // Cenizas
  "6.1","7.1","8.1","9.1","10.1",

  // Cenizas profundos
  "6.11","7.11","8.11",

  // Irisados
  "8.12","9.21","9.2","10.21",

  // Dorados
  "5.3","6.3","7.3","8.3","9.3",

  // Ámbar
  "6.34","8.34","7.32","8.32","8.30",

  // Beiges
  "7.31","8.13","9.13",

  // Cobres
  "6.4","7.44",

  // Bronces
  "5.74","7.74",

  // Caoba
  "6.5",

  // Rojos
  "4.26","5.62",

  // Marrones cool
  "5.7","6.77","7.77","6.23","8.23",

  // Marrones mogano
  "5.35","6.35","7.53","6.41","7.14",

  // Rojos intensos
  "6.66","7.60",

  // Super aclarantes
  "11.0","11.1","11.2","11rn",

  // Auxiliares
  "rojo","amarillo","azul",

  // Metálicos
  ".12",".22",".24",
];

function skuFromSize(size) {
  const s = String(size).trim();

  // Caso metálicos: ".12" => "12"
  if (s.startsWith(".")) {
    const n = s.slice(1);
    return SKU_PREFIX + n;
  }

  // Letras: NC / RN / ROJO / etc
  // Para números con punto: 6.1 => 6-1
  const normalized = s
    .toUpperCase()
    .replace(".", "-");

  return SKU_PREFIX + normalized;
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function main() {
  const header = ["product_id","size","sku","priceRetail","priceWholesale","stock","status"];
  const lines = [header.join(",")];

  for (const size of SIZES) {
    const row = [
      PRODUCT_ID,
      size,
      skuFromSize(size),
      PRICE_RETAIL,
      PRICE_WHOLESALE,
      STOCK,
      STATUS,
    ];
    lines.push(row.map(csvEscape).join(","));
  }

  fs.writeFileSync(OUT, lines.join("\n"), "utf-8");
  console.log("OK →", OUT);
  console.log("Rows:", SIZES.length);
}

main();
