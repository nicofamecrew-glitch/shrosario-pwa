export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WA_PHONE || "+5493410000000";
export const WHOLESALE_CODE = process.env.NEXT_PUBLIC_WHOLESALE_CODE || "MAYORISTA2024";
export const VIP_CODES = (process.env.NEXT_PUBLIC_VIP_CODES || "VIPROSARIO,VIPB2B,VIPSH").split(",").map((code) => code.trim()).filter(Boolean);
export const SHEETS_WEBHOOK = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK || "";
