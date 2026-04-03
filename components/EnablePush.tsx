"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function EnablePush() {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window
    );

    const pushEnabled = localStorage.getItem("push_enabled_v1") === "true";
    const pushDismissed = localStorage.getItem("push_dismissed_v1") === "true";

    if (pushEnabled) setEnabled(true);
    if (pushDismissed) setDismissed(true);

    async function checkExisting() {
      if (!("serviceWorker" in navigator)) {
        setReady(true);
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setEnabled(true);
          localStorage.setItem("push_enabled_v1", "true");
        }
      } catch (e) {
        console.error("[push] checkExisting error:", e);
      } finally {
        setReady(true);
      }
    }

    checkExisting();
  }, []);

  async function subscribe() {
    try {
      setLoading(true);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("No se concedió permiso para notificaciones");
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        }));

      const profile = JSON.parse(
        localStorage.getItem("sh_checkout_profile_v1") || "{}"
      );

      const payload = {
        subscription: sub,
        phone: profile.phone || "",
      };

      console.log("[push payload]", payload);

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("[push response]", res.status, data);

      if (!res.ok || !data?.ok) {
        alert(data?.error || "No se pudo activar notificaciones");
        return;
      }

      setEnabled(true);
      localStorage.setItem("push_enabled_v1", "true");
      localStorage.removeItem("push_dismissed_v1");

      alert("Avisos activados");
    } catch (e) {
      console.error("[push] error:", e);
      alert("Error activando notificaciones");
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("push_dismissed_v1", "true");
  }

  if (!ready || !supported || enabled || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-6 md:w-[340px]">
      <div className="relative rounded-2xl border border-white/10 bg-black/75 p-4 text-white shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="mt-0.5 rounded-xl bg-white/10 p-2">
            <Bell className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Recibí novedades y promociones
            </p>
            <p className="mt-1 text-xs text-white/70">
              Activá las notificaciones para enterarte de lanzamientos, promos y
              reposiciones.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={subscribe}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-[#ee078e] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Activando..." : "Activar notificaciones"}
        </button>
      </div>
    </div>
  );
}