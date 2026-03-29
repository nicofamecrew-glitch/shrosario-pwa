"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatPrice } from "@/lib/pricing";

type Order = {
  id: string;
  createdAt: string;
  total: number;
  status?: string;
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

function getDeviceId() {
  try {
    return safeStr(localStorage.getItem("sh_device_id_v1"));
  } catch {
    return "";
  }
}

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [orders, setOrders] = useState<Order[]>([]);
  const [shipStatus, setShipStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState("");

  const page =
    "min-h-[100svh] px-4 pt-12 pb-24 bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))]";
  const muted = "text-[hsl(var(--app-muted))]";
  const mutedSoft = "text-[hsl(var(--app-muted-2))]";
  const card =
    "w-full rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] p-4 text-left shadow-sm transition hover:opacity-95";
  const primaryButton =
    "mt-6 w-full rounded-full bg-[hsl(var(--app-fg))] px-4 py-3 font-bold text-[hsl(var(--app-bg))] transition hover:opacity-90";

     const deviceId = useMemo(() => {
    const id = getDeviceId();
    console.log("DEVICE_ID ACTUAL:", id);
    return id;
  }, []);

  const phone = useMemo(() => {
    try {
      const raw = localStorage.getItem("sh_checkout_profile_v1");
      const prof = raw ? JSON.parse(raw) : null;
      const currentPhone = safeStr(prof?.phone);
      console.log("PHONE ACTUAL:", currentPhone);
      return currentPhone;
    } catch {
      return "";
    }
  }, []);

  const email = safeStr(session?.user?.email);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setDebug("");

               if (!deviceId && !email && !phone) {
          setOrders([]);
          setDebug(
            "No hay device_id, email de sesión ni phone en sh_checkout_profile_v1"
          );
          return;
        }

        const qs = new URLSearchParams();
        if (deviceId) qs.set("device_id", deviceId);
        if (email) qs.set("email", email);
        if (phone) qs.set("phone", phone);

        const res = await fetch(`/api/orders/list?${qs.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        setDebug(JSON.stringify(data?.debug || {}, null, 2));
                console.log("[orders/list] response", data);

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
   }, [deviceId, email, phone, sessionStatus]);

  if (loading || sessionStatus === "loading") {
    return (
      <main className={page}>
        <h1 className="text-xl font-bold">Mis pedidos</h1>
        <p className={`mt-2 text-sm ${muted}`}>Cargando…</p>
      </main>
    );
  }

  if (!orders.length) {
    return (
      <main className={page}>
        <h1 className="text-xl font-bold">Mis pedidos</h1>

        <p className={`mt-2 text-sm ${muted}`}>
          Todavía no tenés pedidos registrados.
        </p>

        {debug ? (
          <p className={`mt-2 break-words text-xs ${mutedSoft}`}>
            Debug: {debug}
          </p>
        ) : null}

        <button
          onClick={() => router.push("/catalog")}
          className={primaryButton}
        >
          Ir a Categorías
        </button>
      </main>
    );
  }

  return (
    <main className={page}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Mis pedidos</h1>
        <button
          onClick={() => router.push("/catalog")}
          className={`text-sm font-medium ${muted} hover:opacity-80`}
        >
          Seguir comprando
        </button>
      </div>
     
            {debug ? (
        <pre className={`mt-3 break-words whitespace-pre-wrap text-[10px] ${mutedSoft}`}>
          {debug}
        </pre>
      ) : null}

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
                className={card}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{o.id}</p>
                    <p className={`mt-1 text-xs ${muted}`}>
                      {formatDate(o.createdAt)}
                      {o.priceMode ? ` · ${o.priceMode}` : ""}
                      {" · "}
                      Pago: {pay}
                      {" · "}
                      Envío: {ship}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold">{formatPrice(o.total)}</p>
                    <p className={`mt-1 text-xs ${muted}`}>Ver detalle</p>
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </main>
  );
}