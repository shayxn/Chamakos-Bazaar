---
name: Coming Soon product feature
description: How coming-soon products work — DB column, API, push notification, frontend badge
---

# Coming Soon Products

## Rule
`coming_soon BOOLEAN DEFAULT FALSE` on the products table (added to Drizzle schema at `lib/db/src/schema/products.ts` AND as SQL migration in `ensureBadgeColumns()` in `routes/products.ts`).

**Coming-soon products are NOT hidden** — they appear in the shop with a purple "Coming Soon" badge + overlay. Customers cannot add them to cart (overlay blocks it), but they CAN heart/wishlist them.

**Why:** Products marketed before launch drive anticipation. Keeping them visible (not hidden) lets customers discover and wishlist them. The push notification on release closes the loop.

## How to apply
- Admin toggles "Coming Soon" PillToggle in Admin → Products → Badges & Flags section
- When admin sets `comingSoon: false` via PATCH (releases the product), the PATCH handler in `routes/products.ts` detects the transition, then calls `sendComingSoonReleasePush(productId, productName, imageUrl)` from `lib/push.ts` in the background
- `sendComingSoonReleasePush` does a JOIN between `wishlists` and `customer_push_subscriptions` (on `session_id`) — single query, no N+1

## Push subscription linkage
- `customer_push_subscriptions` has a `session_id TEXT` column (added via `ensureWishlistSubColumn()` migration)
- When a customer wishlists a coming-soon product, the shop shows `ComingSoonNotifyPrompt` (component at `artifacts/chamak-street/src/components/coming-soon-notify-prompt.tsx`)
- The prompt calls `POST /api/push/wishlist-notify-subscribe` which reads `req.session.wishlistId` server-side — no need to send session_id from client
- Currently only implemented on shop.tsx; product detail page still missing the overlay + prompt

## Files
- Schema: `lib/db/src/schema/products.ts`
- Migration + PATCH release logic: `artifacts/api-server/src/routes/products.ts`
- Push functions: `artifacts/api-server/src/lib/push.ts` (saveWishlistSubscription, sendComingSoonReleasePush)
- Push endpoint: `artifacts/api-server/src/routes/push-notifications.ts` (POST /push/wishlist-notify-subscribe)
- Wishlist GET (includes comingSoon field): `artifacts/api-server/src/routes/wishlist.ts`
- Frontend notify prompt: `artifacts/chamak-street/src/components/coming-soon-notify-prompt.tsx`
- Shop badge + prompt trigger: `artifacts/chamak-street/src/pages/shop.tsx`
- Admin toggle: `artifacts/chamak-street/src/pages/admin/products.tsx`
