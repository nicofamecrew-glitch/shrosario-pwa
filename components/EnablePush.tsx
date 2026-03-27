"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function EnablePush() {
  async function subscribe() {
    try {
      if (!("serviceWorker" in navigator)) {
        alert("Este navegador no soporta service worker");
        return;
      }

      if (!("PushManager" in window)) {
        alert("Este navegador no soporta push");
        return;
      }

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

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        console.error("subscribe failed", data);
        alert("No se pudo activar push");
        return;
      }

      alert("Notificaciones activadas");
    } catch (e) {
      console.error("EnablePush error:", e);
      alert("Error activando notificaciones");
    }
  }

  return (
    <button onClick={subscribe}>
      Activar notificaciones
    </button>
  );
}