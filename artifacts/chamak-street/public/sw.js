// Chamak Street — Push Notification Service Worker
const CACHE_NAME = "chamak-sw-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "New Order", body: event.data.text(), type: "NEW_ORDER" };
  }

  const { title, body, type, data } = payload;

  // Notify all open tabs so they can play the cash sound
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: type || "NEW_ORDER", data });
      });

      return self.registration.showNotification(title || "New Order — Chamak Street", {
        body: body || "A new order has been placed.",
        icon: "/chamak-logo.png",
        badge: "/favicon.svg",
        tag: `order-${data?.orderNumber || Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: data || {},
        actions: [{ action: "view", title: "View Orders" }],
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = "/admin/orders";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
