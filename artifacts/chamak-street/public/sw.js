// Chamak Street — Push Notification Service Worker v2
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "New Order", body: event.data.text(), type: "NEW_ORDER" };
  }

  const { title, body, type, data } = payload;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Tell any open tab to play the cash register sound
      clients.forEach((client) => client.postMessage({ type: type || "NEW_ORDER", data }));

      return self.registration.showNotification(title || "New Order — Chamak Street", {
        body: body || "A new order has been placed.",
        icon: "/chamak-logo.png",
        badge: "/chamak-logo.png",
        tag: `order-${data?.orderNumber || Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: data || {},
        actions: [
          { action: "view-order", title: "📦 View Order" },
          { action: "dismiss",    title: "Dismiss" },
        ],
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  // Navigate to the specific admin orders page
  const targetUrl = event.notification.data?.url || "/admin/orders";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If there's already a window open on this origin, focus + navigate it
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate?.(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(targetUrl);
      })
  );
});
