---
name: FirstPick Basics collection
description: How the Basics sub-collection is implemented — DB column, API filtering, admin page, customer page.
---

## Implementation

A `collection text` column was added to the `products` table (nullable).
- `collection = NULL` → main store products (existing inventory)
- `collection = 'basics'` → FirstPick Basics products

**DB migration:** `ALTER TABLE products ADD COLUMN IF NOT EXISTS collection text;` — already applied.

**API (`artifacts/api-server/src/routes/products.ts`):**
- GET `/products` always filters by collection:
  - If `?collection=basics` → `WHERE collection = 'basics'`
  - If no collection param → `WHERE collection IS NULL` (main store, both admin and non-admin)
- POST `/products` accepts `collection` from body (stored via `(body as any).collection ?? null`)
- PATCH `/products/:id` already passes through arbitrary body fields — `collection` comes through automatically.
- `collection` is included in SELECT for both list and detail routes.

**Why:** Keeps main store admin (no collection param) showing only main products; basics admin passes `?collection=basics`; existing products (collection=null) appear only in the main store.

**Admin page:** `artifacts/chamak-street/src/pages/admin/basics.tsx`
- Uses `useQuery(["admin", "basics", "all"])` with custom fetch to `/api/products?collection=basics`
- Always injects `collection: 'basics'` into create/update payloads
- "Delete All Basics" uses bulk-action (not DELETE /products/all) so it only deletes basics products

**Customer page:** `artifacts/chamak-street/src/pages/basics.tsx` at route `/basics`
- Uses `useQuery(["basics-products", search])` with custom fetch to `/api/products?collection=basics`
- Branded hero header; same card/grid/quick-view pattern as shop.tsx

**Navigation:**
- Admin sidebar: "FP Basics" link → `/admin/basics` (icon: Layers) in Store group
- Customer layout nav: "FP Basics" link → `/basics` (second item after "All Products")
