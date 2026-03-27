self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: { url: data.url || "/" },
  };

  // 👇 solo agrega image si viene del backend
  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || "SH Rosario",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification?.data?.url || "/")
  );
});