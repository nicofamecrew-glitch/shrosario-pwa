export type OrderItem = {
  productId: string;
  sku: string;
  qty: number;
  unitPrice: number;
  name: string;
  brand?: string;
  size?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  customer: {
    fullName: string;
    phone: string;
    city: string;
    address: string;
    cuit?: string;
    businessType?: string;
  };
  items: OrderItem[];
  total: number;
  priceMode: "minorista" | "mayorista";
   shipmentId?: string;
  notes?: string;
};

const ORDERS_KEY = "sh_orders_v1";
const PROFILE_KEY = "sh_profile_v1";

// =========================
// PROFILE
// =========================
export function loadProfile(): any | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// =========================
// ORDERS
// =========================
export async function updateOrderStatus(orderId: string, status: string) {
  console.log("Simulando persistencia:", { orderId, status });
  // Acá iría tu lógica real: Mongo, Prisma, Sheets, etc.
}


export function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

export function saveOrder(order: Order) {
  if (typeof window === "undefined") return;

  try {
    const prev = loadOrders();

    // ✅ Normalización a futuro (no rompe)
    const normalized: Order = {
      ...order,
      shipmentId: order.shipmentId ?? "",
    };

    prev.unshift(normalized);
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(prev));
  } catch {
    // silencio intencional: no romper UX
  }
}


