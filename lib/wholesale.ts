import { VIP_CODES, WHOLESALE_CODE } from "@/lib/constants";

export function validateWholesaleCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  if (normalized === WHOLESALE_CODE.toUpperCase()) return true;
  return VIP_CODES.map((entry) => entry.toUpperCase()).includes(normalized);
}
