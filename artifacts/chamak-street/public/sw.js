// IMAGINATE — Push Notification Service Worker v5
// Derive base path from this file's own URL so click-through URLs work in both
// dev (/<artifact-base>/sw.js → base=/<artifact-base>) and prod (/sw.js → base=)
const BASE_PATH = self.location.pathname.replace(/\/sw\.js$/, "");

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("imaginate-brand-assets-provided-logo").then(cache=>cache.addAll([
    `${BASE_PATH}/imaginate-logo.png`,`${BASE_PATH}/imaginate-icon-192.png?v=provided-logo`
  ])).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => event.waitUntil(Promise.all([
  caches.delete("imaginate-brand-assets"),
  self.clients.claim()
])));
self.addEventListener("fetch", (event) => {
  if(event.request.mode!=="navigate"||new URL(event.request.url).pathname.includes("/api/"))return;
  event.respondWith(fetch(event.request).catch(()=>new Response(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | IMAGINATE</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font-family:Arial}main{max-width:420px;text-align:center;padding:24px}button{background:#b79cff;color:#000;border:0;padding:14px 28px;border-radius:24px;font-weight:bold}p{color:#aaa;line-height:1.6}</style></head><body><main><h1>IMAGINATE</h1><h2>You are offline</h2><p>Reconnect to load current products, stock, and your account. Orders and payments are never submitted offline.</p><button onclick="location.reload()">Try again</button></main></body></html>',
    {headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}}
  )));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: "IMAGINATE", body: event.data.text(), type: "GENERIC" }; }

  const { title, body, type, data } = payload;
  const baseSafeUrl = (candidate) => {
    if (!candidate) return `${BASE_PATH}/admin`;
    if (/^https?:\/\//.test(candidate) || candidate.startsWith(BASE_PATH + "/")) return candidate;
    return `${BASE_PATH}${candidate.startsWith("/") ? candidate : `/${candidate}`}`;
  };

  // Determine icon/badge/tag/url per notification type
  let tag = `notif-${Date.now()}`;
  let url = `${BASE_PATH}/admin`;
  let requireInteraction = false;

  if (type === "NEW_ORDER") {
    tag = `order-${data?.orderNumber || Date.now()}`;
    url = baseSafeUrl(data?.url || "/admin/orders");
    requireInteraction = true;
  } else if (type === "CUSTOMER_SEARCH") {
    tag = "search-notif";
    url = baseSafeUrl(data?.url || "/admin/visitors");
  } else if (type === "NEW_VISITOR") {
    tag = "visitor-notif";
    url = `${BASE_PATH}/admin/visitors`;
  } else if (type === "CART_ADD") {
    tag = "cart-notif";
    url = `${BASE_PATH}/admin/visitors`;
  } else if (type === "CHECKOUT_STARTED") {
    tag = "checkout-notif";
    url = `${BASE_PATH}/admin/visitors`;
    requireInteraction = true;
  } else if (type === "NEW_ACCOUNT") {
    tag = "account-notif";
    url = `${BASE_PATH}/admin/visitors`;
  } else if (type === "ADMIN_CALL") {
    tag = `admin-call-${data?.roomId || "incoming"}`;
    url = baseSafeUrl(data?.url || "/admin/chat");
    requireInteraction = true;
  }
  if (data?.url) url = baseSafeUrl(data.url);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Notify any open admin tab so it can play a sound / update state
      clients.forEach((client) => client.postMessage({ type, data }));

      return self.registration.showNotification(title || "IMAGINATE", {
        body: body || "",
        icon: `${BASE_PATH}/imaginate-icon-192.png`,
        badge: `${BASE_PATH}/imaginate-icon-192.png`,
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
  const nd = event.notification.data || {};
  const customerType = nd.type === "CUSTOMER_MARKETING" || nd.type === "CUSTOMER_ORDER_STATUS";
  let targetUrl = nd.url || (customerType ? `${BASE_PATH}/` : `${BASE_PATH}/admin`);
  if (customerType) {
    // Customer notifications may only open same-origin, non-admin pages.
    try {
      const u = new URL(targetUrl, self.location.origin);
      if (u.origin !== self.location.origin || /\/admin(\/|$)/.test(u.pathname)) targetUrl = `${BASE_PATH}/`;
    } catch (e) { targetUrl = `${BASE_PATH}/`; }
  }

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
