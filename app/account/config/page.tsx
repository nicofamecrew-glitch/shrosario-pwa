"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function getDeviceId() {
  const KEY = "sh_device_id_v1";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function AccountConfigPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>("default");
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const page =
    "min-h-[100svh] bg-[hsl(var(--app-bg))] text-[hsl(var(--app-fg))] px-4 pt-16 pb-24";
  const muted = "text-[hsl(var(--app-muted))]";
  const muted2 = "text-[hsl(var(--app-muted-2))]";

  const card =
    "rounded-2xl border border-[hsl(var(--app-border))] bg-[hsl(var(--app-surface))] shadow-sm";

  const row =
    "flex items-center justify-between rounded-2xl border border-[hsl(var(--app-border))] " +
    "bg-[hsl(var(--app-surface))] p-4 shadow-sm hover:brightness-[1.03] transition";

  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.dataset.theme === "dark";
    setTheme(isDark ? "dark" : "light");

    if ("Notification" in window) {
      setNotifStatus(Notification.permission);
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);

    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle("dark", next === "dark");

    localStorage.setItem("theme", next);
  }

  async function enableNotifications() {
    try {
      setLoadingNotif(true);

      if (!("Notification" in window)) {
        alert("Este dispositivo no soporta notificaciones.");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        alert("Este navegador no soporta service worker.");
        return;
      }

      if (!("PushManager" in window)) {
        alert("Este navegador no soporta notificaciones push.");
        return;
      }

      const permission = await Notification.requestPermission();
      setNotifStatus(permission);

      if (permission !== "granted") {
        alert("No se otorgó permiso para notificaciones.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const currentSub = await registration.pushManager.getSubscription();

      const subscription =
        currentSub ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        }));

      const deviceId = getDeviceId();

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          deviceId,
          phone: null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo activar notificaciones.");
      }

      alert("Notificaciones activadas correctamente.");
    } catch (error: any) {
      console.error("enableNotifications error:", error);
      alert(error?.message || "Error al activar notificaciones.");
    } finally {
      setLoadingNotif(false);
    }
  }

  async function handleInstall() {
    try {
      if (!installPrompt) {
        alert("La instalación no está disponible en este momento.");
        return;
      }

      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (error) {
      console.error("handleInstall error:", error);
      alert("No se pudo iniciar la instalación.");
    }
  }

  return (
    <main className={page}>
      <h1 className="text-xl font-bold">Configuración</h1>
      <p className={`mt-1 text-sm ${muted}`}>Tema, notificaciones e instalación.</p>

      <div className="mt-8 space-y-4">
        <div className={card}>
          <div className="p-4">
            <div className="font-semibold">Tema</div>
            <div className={`mt-1 text-sm ${muted}`}>
              Elegí cómo querés ver la app.
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="mt-4 rounded-2xl border border-[hsl(var(--app-border))] px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              Cambiar a modo {theme === "dark" ? "claro" : "oscuro"}
            </button>
          </div>
        </div>

        <div className={card}>
          <div className="p-4">
            <div className="font-semibold">Notificaciones</div>
            <div className={`mt-1 text-sm ${muted}`}>
              Recibí avisos de pago aprobado, pedidos y novedades.
            </div>

            <div className={`mt-2 text-xs ${muted2}`}>
              Estado actual: {notifStatus}
            </div>

            <button
              type="button"
              onClick={enableNotifications}
              disabled={loadingNotif || notifStatus === "granted"}
              className="mt-4 rounded-2xl border border-[hsl(var(--app-border))] px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {notifStatus === "granted"
                ? "Notificaciones activadas"
                : loadingNotif
                ? "Activando..."
                : "Activar notificaciones"}
            </button>
          </div>
        </div>

        <div className={card}>
          <div className="p-4">
            <div className="font-semibold">Instalar app</div>
            <div className={`mt-1 text-sm ${muted}`}>
              Instalá SH Rosario para acceder más rápido desde tu pantalla de inicio.
            </div>

            <button
              type="button"
              onClick={handleInstall}
              className="mt-4 rounded-2xl border border-[hsl(var(--app-border))] px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              Instalar
            </button>
          </div>
        </div>

        <div className={row}>
          <div>
            <div className="font-semibold">Device ID</div>
            <div className={`text-sm ${muted}`}>
              Se usa para vincular este dispositivo con las notificaciones.
            </div>
          </div>
          <div className={`text-xs ${muted2}`}>automático</div>
        </div>
      </div>
    </main>
  );
}