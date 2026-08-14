---
name: Notification & Real-Time Tracking System
description: Architecture for FirstPick push notifications, live customer tracking, and SSE real-time updates.
---

## Push Notifications
- **Library**: `web-push` (VAPID keys auto-generated and stored in `site_settings`)
- **Subscriptions table**: `push_subscriptions` (created by `lib/push.ts` on first use)
- **Service worker**: `artifacts/chamak-street/public/sw.js` — handles all notification types
- **Admin hook**: `use-admin-notifications.ts` — manages permission + subscribe/unsubscribe/test
- **sendOrderPush()**: called from `routes/orders.ts` after confirmed order
- **sendActivityPush(type, data)**: handles NEW_VISITOR, CUSTOMER_SEARCH, CART_ADD, CHECKOUT_STARTED, NEW_ACCOUNT

## Notification Settings
- Stored in `site_settings` with keys: `notif_new_orders`, `notif_searches`, `notif_new_visitors`, `notif_cart_adds`, `notif_checkout`, `notif_new_accounts`
- API: `GET/POST /api/visitor-sessions/notif-settings` (admin only)
- Admin UI: `/admin/notifications` → `pages/admin/notification-settings.tsx`
- Admin sidebar: "Notifications" link under Analytics group

## Visitor Session Tracking (Enhanced)
- **Extra DB columns** (added via migration on first request):
  `current_page`, `search_terms` (JSON array), `cart_count`, `cart_value`, `is_logged_in`, `customer_email`, `checkout_started`, `order_completed`, `activity_log` (JSON timeline), `notif_flags` (dedup timestamps)
- **Tracking endpoint**: `POST /api/visitor-sessions/track` — accepts `eventType` ('visit'|'page'|'search'|'cart_add'|'checkout'|'order') to trigger push notifications
- **SSE endpoint**: `GET /api/visitor-sessions/stream` (admin only) — broadcasts `session_update` and `session_delete` events

## Frontend Tracking Functions
- **Module**: `lib/use-visitor-tracking.ts`
- `useVisitorTracking()` hook — call at app root; patches `history.pushState` for SPA page tracking
- Exported: `trackSearch(query)`, `trackCartUpdate(count, value)`, `trackCheckout()`, `trackOrder(orderNumber)`, `setCustomerLogin(email|null)`
- Called from: `smart-search.tsx` (debounced 1.5s), `checkout.tsx` (on mount + order success), `product-detail.tsx` (after add to cart), `customer-accounts.ts` (new account registration)

## Admin Live Customers Page
- Route: `/admin/visitors` → `pages/admin/visitors.tsx`
- SSE auto-connect with 5s auto-reconnect; shows LIVE badge when connected
- Sessions show: online status, current page, last searches, cart count/value, login status, checkout/order badges
- Click session → detail panel with activity timeline, info grid, search history

**Why:** Real-time admin visibility requires SSE broadcast on every track event; dedup flags prevent notification spam per session per event type.
