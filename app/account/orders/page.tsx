"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/pricing";

type Order = {
  id: string;
  createdAt: string;
  total: number;
  status?: string; // "Pendiente" | "Pagado" | etc
  priceMode?: "mayorista" | "minorista";
  shipmentId?: string;
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

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [shipStatus, setShipStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState<string>("");

  const phone = useMemo(() => {
    try {
      const raw = localStorage.getItem("sh_profile_v1");
      const prof = raw ? JSON.parse(raw) : null;
      return safeStr(prof?.phone);
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setDebug("");

        // 0) si no hay phone, no hay forma de filtrar pedidos
        if (!phone) {
          setOrders([]);
          setDebug("No hay phone en sh_profile_v1");
          return;
        }

        // 1) Traer pedidos reales desde Sheets
        const res = await fetch(
          `/api/orders/list?phone=${encodeURIComponent(phone)}`,
          { cache: "no-store" }
        );

        const data = await res.json().catch(() => null);

        if (!alive) return;

        if (!res.ok || !data?.ok) {
          setOrders([]);
          setDebug(
            `Fallo /api/orders/list (status ${res.status}) → ${safeStr(data?.error)}`
          );
          return;
        }

        const list: Order[] = Array.isArray(data.orders) ? data.orders : [];
        setOrders(list);

        // 2) Traer estados de envío (Zipnova) si hay shipmentId
        const unique = Array.from(
          new Set(list.map((o) => safeStr(o.shipmentId)).filter(Boolean))
        );

        if (!unique.length) return;

        const entries = await Promise.all(
          unique.map(async (sid) => {
            try {
              const r = await fetch(
                `/api/zipnova/status?shipment_id=${encodeURIComponent(sid)}`,
                { cache: "no-store" }
              );
              if (!r.ok) return [sid, "pending"] as const;
              const j = await r.json().catch(() => null);
              return [sid, safeStr(j?.status_internal) || "pending"] as const;
            } catch {
              return [sid, "pending"] as const;
            }
          })
        );

        if (!alive) return;

        const map: Record<string, string> = {};
        for (const [sid, st] of entries) map[sid] = st;
        setShipStatus(map);
      } catch (e: any) {
        if (!alive) return;
        setOrders([]);
        setDebug(`Error inesperado: ${safeStr(e?.message)}`);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [phone]);

  if (loading) {
    return (
      <main className="px-4 pt-16 pb-24">
        <h1 className="text-xl font-bold">Mis pedidos</h1>
        <p className="mt-2 text-sm text-white/60">Cargando…</p>
      </main>
    );
  }

  if (!orders.length) {
    return (
      <main className="px-4 pt-16 pb-24">
        <h1 className="text-xl font-bold">Mis pedidos</h1>

        <p className="mt-2 text-sm text-white/60">
          Todavía no tenés pedidos registrados.
        </p>

        {/* Debug útil (no rompe UX) */}
        {debug ? (
          <p className="mt-2 text-xs text-white/40 break-words">Debug: {debug}</p>
        ) : null}

        <button
          onClick={() => router.push("/catalog")}
          className="mt-6 w-full rounded-full bg-white px-4 py-3 font-bold text-black"
        >
          Ir a Categorías
        </button>
      </main>
    );
  }

  return (
    <main className="px-4 pt-12 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mis pedidos</h1>
        <button
          onClick={() => router.push("/catalog")}
          className="text-sm text-white/70"
        >
          Seguir comprando
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {orders
          .slice()
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .map((o) => {
            const pay = safeStr(o.status) || "Pendiente";
            const ship = o.shipmentId
              ? shipStatus[safeStr(o.shipmentId)] || "pending"
              : "pending";

            return (
              <button
                key={o.id}
                onClick={() => router.push(`/account/orders/${o.id}`)}
                className="w-full rounded-2xl border border-panel bg-panel p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{o.id}</p>
                    <p className="mt-1 text-xs text-white/60">
                      {formatDate(o.createdAt)}
                      {o.priceMode ? ` · ${o.priceMode}` : ""}
                      {" · "}
                      Pago: {pay}
                      {" · "}
                      Envío: {ship}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold">{formatPrice(o.total)}</p>
                    <p className="mt-1 text-xs text-white/60">Ver detalle</p>
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </main>
  );
}
