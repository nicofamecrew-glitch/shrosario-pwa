"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatPrice } from "@/lib/pricing";

type OrderItem = {
  productId?: string;
  sku: string;
  qty: number;
  unitPrice: number;
  name?: string;
  brand?: string;
  size?: string;
};

type Order = {
  id: string;
  createdAt?: string;
  total: number;
  status?: string;
  priceMode?: "mayorista" | "minorista";
  shipmentId?: string;
  customer?: {
    fullName?: string;
    phone?: string;
    city?: string;
    address?: string;
    cuit?: string;
    businessType?: string;
  };
  items?: OrderItem[];
};

function formatDate(iso?: string) {
  if (!iso) return "—";
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

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = safeStr(params?.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [shipStatus, setShipStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState("");

  const page =
    "min-h-[100svh] px-4 pt-10 pb-24 bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))]";
  const muted = "text-[hsl(var(--app-muted))]";
  const mutedSoft = "text-[hsl(var(--app-muted-2))]";
  const card =
    "rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] p-4 shadow-sm";
  const primaryButton =
    "mt-6 w-full rounded-full bg-[hsl(var(--app-fg))] px-4 py-3 font-bold text-[hsl(var(--app-bg))] transition hover:opacity-90";

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setDebug("");

        if (!id) {
          setDebug("Falta id");
          return;
        }

        const res = await fetch(`/api/orders/detail?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!alive) return;

        if (!res.ok || !data?.ok) {
          setOrder(null);
          setDebug(
            `Fallo /api/orders/detail (status ${res.status}) → ${safeStr(data?.error)}`
          );
          return;
        }

        const found = data?.order ?? null;
        setOrder(found);

        const sid = safeStr(found?.shipmentId);
        if (sid) {
          try {
            const sr = await fetch(
              `/api/zipnova/status?shipment_id=${encodeURIComponent(sid)}`,
              { cache: "no-store" }
            );
            const sj = await sr.json().catch(() => null);
            if (!alive) return;
            setShipStatus(safeStr(sj?.status_internal) || "pending");
          } catch {
            if (!alive) return;
            setShipStatus("pending");
          }
        } else {
          setShipStatus("pending");
        }
      } catch (e: any) {
        if (!alive) return;
        setOrder(null);
        setDebug(`Error inesperado: ${safeStr(e?.message)}`);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  if (!id) {
    return (
      <main className={page}>
        <p className={`text-sm ${muted}`}>Pedido inválido.</p>
        <button
          onClick={() => router.push("/account/orders")}
          className={primaryButton}
        >
          Volver a Mis pedidos
        </button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className={page}>
        <p className={`text-sm ${muted}`}>Cargando pedido…</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className={page}>
        <h1 className="text-xl font-bold">Pedido no encontrado</h1>
        <p className={`mt-2 text-sm ${muted}`}>
          Este pedido no existe, no tiene ítems cargados o no pudo leerse desde Sheets.
        </p>

        {debug ? (
          <p className={`mt-2 break-words text-xs ${mutedSoft}`}>
            Debug: {debug}
          </p>
        ) : null}

        <button
          onClick={() => router.push("/account/orders")}
          className={primaryButton}
        >
          Volver a Mis pedidos
        </button>
      </main>
    );
  }

  const items = order.items ?? [];
  const customer = order.customer ?? {};
  const pay = safeStr(order.status) || "Pendiente";

  return (
    <main className={page}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Detalle del pedido</h1>

        <button
          onClick={() => router.push("/account/orders")}
          className={`text-sm font-medium ${muted} hover:opacity-80`}
        >
          Volver
        </button>
      </div>

      {/* Header */}
      <div className={`mt-4 ${card}`}>
        <p className="text-sm font-semibold">{order.id}</p>
        <p className={`mt-1 text-xs ${muted}`}>
          {formatDate(order.createdAt)}
          {order.priceMode ? ` · ${order.priceMode}` : ""}
          {" · "}Pago: {pay}
          {" · "}Envío: {shipStatus}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <span className={`text-sm ${muted}`}>Total</span>
          <span className="text-lg font-bold">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Items */}
      <h2 className={`mt-6 text-sm font-semibold ${muted}`}>Productos</h2>

      <div className="mt-3 space-y-3">
        {items.length ? (
          items.map((it, idx) => (
            <div
              key={`${it.productId || "item"}-${it.sku}-${idx}`}
              className={card}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {it.brand ? `${it.brand} ` : ""}
                    {it.name ?? it.productId ?? it.sku}
                  </p>
                  <p className={`mt-1 text-xs ${muted}`}>
                    {it.size ? `${it.size} · ` : ""}
                    SKU: {it.sku}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">
                    {formatPrice(it.unitPrice * it.qty)}
                  </p>
                  <p className={`mt-1 text-xs ${muted}`}>
                    {it.qty} × {formatPrice(it.unitPrice)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={card}>
            <p className={`text-sm ${muted}`}>No hay productos cargados para este pedido.</p>
          </div>
        )}
      </div>

      {/* Cliente */}
      <h2 className={`mt-6 text-sm font-semibold ${muted}`}>Datos del cliente</h2>

      <div className={`mt-3 ${card} text-sm`}>
        <p className="font-semibold">{customer.fullName || "—"}</p>
        <p className={`mt-1 ${muted}`}>{customer.phone || "—"}</p>
        <p className={`mt-1 ${muted}`}>
          {customer.city || "—"}
          {customer.address ? ` · ${customer.address}` : ""}
        </p>
        {customer.cuit ? (
          <p className={`mt-1 ${muted}`}>CUIT: {customer.cuit}</p>
        ) : null}
        {customer.businessType ? (
          <p className={`mt-1 ${muted}`}>Tipo: {customer.businessType}</p>
        ) : null}
      </div>

      {/* Nota */}
      <div className={`mt-6 text-xs ${mutedSoft}`}>
        Este pedido queda sujeto a confirmación de stock, precios y envío.
      </div>
    </main>
  );
}