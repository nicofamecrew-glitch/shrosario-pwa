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
      console.log("[push] click");

      if (!("serviceWorker" in navigator)) {
        alert("Este navegador no soporta service worker");
        return;
      }

      if (!("PushManager" in window)) {
        alert("Este navegador no soporta push");
        return;
      }

      const permission = await Notification.requestPermission();
      console.log("[push] permission:", permission);

      if (permission !== "granted") {
        alert("No se concedió permiso para notificaciones");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      console.log("[push] sw ready:", reg);

      const existing = await reg.pushManager.getSubscription();
      console.log("[push] existing:", existing);

      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        }));

      console.log("[push] sub:", sub);

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sub),
      });

      const data = await res.json();
      console.log("[push] subscribe response:", res.status, data);

      if (!res.ok || !data?.ok) {
        alert("No se pudo activar push");
        return;
      }

      alert("Notificaciones activadas");
    } catch (e) {
      console.error("[push] error:", e);
      alert("Error activando notificaciones");
    }
  }

  return <button onClick={subscribe}>Activar notificaciones</button>;
}