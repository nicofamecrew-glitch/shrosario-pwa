import fs from "node:fs";
import path from "node:path";

function readEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("No existe .env.local en la raíz del proyecto");
    process.exit(1);
  }

  const txt = fs.readFileSync(envPath, "utf8");
  const lines = txt.split(/\r?\n/);

  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();

    // saca comillas si existen
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    env[key] = val;
  }
  return env;
}

const env = readEnvLocal();
const b64 = env.GOOGLE_SHEETS_SA_B64;

if (!b64) {
  console.error("Falta GOOGLE_SHEETS_SA_B64 en .env.local");
  process.exit(1);
}

const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
console.log("client_email:", json.client_email);
