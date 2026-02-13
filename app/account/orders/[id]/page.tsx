"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { formatPrice } from "@/lib/pricing";
import { loadOrders } from "@/lib/orders";

type OrderItem = {
  productId: string;
  sku: string;
  qty: number;
  unitPrice: number;
  name?: string;
  brand?: string;
  size?: string;
};

type Order = {
  id: string;
  createdAt: string;
  total: number;
  priceMode?: "mayorista" | "minorista";
  customer?: any;
  items?: OrderItem[];
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [order, setOrder] = useState<Order | null>(null);
const [loading, setLoading] = useState(true);
if (!id) {
  return (
    <main className="px-4 pt-16 pb-24">
      <p className="text-sm text-white/60">Pedido inválido.</p>
      <button
        onClick={() => router.push("/account/orders")}
        className="mt-6 w-full rounded-full bg-white px-4 py-3 font-bold text-black"
      >
        Volver a Mis pedidos
      </button>
    </main>
  );
}

useEffect(() => {
  const list: Order[] = loadOrders?.() ?? [];
  const found = list.find((o) => o.id === id) ?? null;
  setOrder(found);
  setLoading(false);
}, [id]);
if (loading) {
  return (
    <main className="px-4 pt-16 pb-24">
      <p className="text-sm text-white/60">Cargando pedido…</p>
    </main>
  );
}

  if (!order) {
    return (
      <main className="px-4 pt-16 pb-24">
        <h1 className="text-xl font-bold">Pedido no encontrado</h1>
        <p className="mt-2 text-sm text-white/60">
          Este pedido no existe o fue borrado del dispositivo.
        </p>

        <button
          onClick={() => router.push("/account/orders")}
          className="mt-6 w-full rounded-full bg-white px-4 py-3 font-bold text-black"
        >
          Volver a Mis pedidos
        </button>
      </main>
    );
  }

  const items = order.items ?? [];
  const customer = order.customer ?? {};

  return (
    <main className="px-4 pt-10 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Detalle del pedido</h1>

        <button
          onClick={() => router.push("/account/orders")}
          className="text-sm text-white/70"
        >
          Volver
        </button>
      </div>

      {/* Header */}
      <div className="mt-4 rounded-2xl border border-panel bg-panel p-4">
        <p className="text-sm font-semibold">{order.id}</p>
        <p className="mt-1 text-xs text-white/60">
          {formatDate(order.createdAt)}
          {order.priceMode ? ` · ${order.priceMode}` : ""}
          {" · "}Estado: Pendiente
        </p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-white/60">Total</span>
          <span className="text-lg font-bold">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Items */}
      <h2 className="mt-6 text-sm font-semibold text-white/80">Productos</h2>

      <div className="mt-3 space-y-3">
        {items.map((it, idx) => (
          <div
            key={`${it.productId}-${it.sku}-${idx}`}
            className="rounded-2xl border border-panel bg-panel p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {it.brand ? `${it.brand} ` : ""}
                  {it.name ?? it.productId}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {it.size ? `${it.size} · ` : ""}
                  SKU: {it.sku}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold">
                  {formatPrice(it.unitPrice * it.qty)}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {it.qty} × {formatPrice(it.unitPrice)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cliente */}
      <h2 className="mt-6 text-sm font-semibold text-white/80">Datos del cliente</h2>

      <div className="mt-3 rounded-2xl border border-panel bg-panel p-4 text-sm">
        <p className="font-semibold">{customer.fullName || "—"}</p>
        <p className="mt-1 text-white/70">{customer.phone || "—"}</p>
        <p className="mt-1 text-white/70">
          {customer.city || "—"} {customer.address ? `· ${customer.address}` : ""}
        </p>
        {customer.cuit ? (
          <p className="mt-1 text-white/70">CUIT: {customer.cuit}</p>
        ) : null}
        {customer.businessType ? (
          <p className="mt-1 text-white/70">
            Tipo: {customer.businessType}
          </p>
        ) : null}
      </div>

      {/* Nota */}
      <div className="mt-6 text-xs text-white/40">
        Este pedido está “Pendiente” hasta que confirmemos stock, precios y envío.
      </div>
    </main>
  );
}
