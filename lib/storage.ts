import type { LeadFormData } from "@/lib/types";

const STORAGE_KEY = "shrosario_leads";

export function saveLeadLocal(lead: LeadFormData & { createdAt: string; payload: unknown }) {
  if (typeof window === "undefined") return;
  const existing = localStorage.getItem(STORAGE_KEY);
  const parsed = existing ? JSON.parse(existing) : [];
  parsed.unshift(lead);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.slice(0, 50)));
}
