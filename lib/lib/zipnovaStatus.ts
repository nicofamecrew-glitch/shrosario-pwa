export type InternalShipmentStatus =
  | "pending"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "error";

export function mapZipnovaStatus(raw: unknown): InternalShipmentStatus {
  const s = String(raw ?? "").trim().toLowerCase();

  // pending
  if (
    s === "pending" ||
    s === "created" ||
    s === "new" ||
    s === "processing"
  ) return "pending";

  // shipped / in transit
  if (
    s === "shipped" ||
    s === "in_transit" ||
    s === "in-transit" ||
    s === "in transit" ||
    s === "picked_up" ||
    s === "picked-up" ||
    s === "dispatched" ||
    s === "out_for_delivery" ||
    s === "out-for-delivery"
  ) return "shipped";

  // delivered
  if (
    s === "delivered" ||
    s === "completed"
  ) return "delivered";

  // cancelled
  if (
    s === "cancelled" ||
    s === "canceled" ||
    s === "failed" ||
    s === "returned"
  ) return "cancelled";

  return "error";
}
