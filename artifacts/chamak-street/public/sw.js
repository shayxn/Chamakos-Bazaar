// FirstPick — Push Notification Service Worker v3
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: "FirstPick", body: event.data.text(), type: "GENERIC" }; }

  const { title, body, type, data } = payload;

  // Determine icon/badge/tag/url per notification type
  let tag = `notif-${Date.now()}`;
  let url = "/admin";
  let requireInteraction = false;

  if (type === "NEW_ORDER") {
    tag = `order-${data?.orderNumber || Date.now()}`;
    url = data?.url || "/admin/orders";
    requireInteraction = true;
  } else if (type === "CUSTOMER_SEARCH") {
    tag = "search-notif";
    url = data?.url || "/admin/visitors";
  } else if (type === "NEW_VISITOR") {
    tag = "visitor-notif";
    url = "/admin/visitors";
  } else if (type === "CART_ADD") {
    tag = "cart-notif";
    url = "/admin/visitors";
  } else if (type === "CHECKOUT_STARTED") {
    tag = "checkout-notif";
    url = "/admin/visitors";
    requireInteraction = true;
  } else if (type === "NEW_ACCOUNT") {
    tag = "account-notif";
    url = "/admin/visitors";
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Notify any open admin tab so it can play a sound / update state
      clients.forEach((client) => client.postMessage({ type, data }));

      return self.registration.showNotification(title || "FirstPick", {
        body: body || "",
        icon: "/chamak-logo.png",
        badge: "/chamak-logo.png",
        tag,
        requireInteraction,
        vibrate: type === "NEW_ORDER" ? [200, 100, 200, 100, 200] : [100, 50, 100],
        data: { ...(data || {}), url },
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate?.(targetUrl);
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
