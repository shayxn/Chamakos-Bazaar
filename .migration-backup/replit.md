# Chamak Street

A bold urban streetwear e-commerce site featuring the camel mascot Chamako — with a full shop, cart, checkout, and admin panel.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/chamak-street run dev` — run the frontend (port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing secret
- Product media uploads use Cloudinary in production for images and videos. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`; optionally set `CLOUDINARY_UPLOAD_FOLDER` to override the default `chamakos-bazaar/products` folder.
- Ziina checkout requires `ZIINA_ACCESS_TOKEN`. Optional settings: `ZIINA_TEST_MODE=true` for test payment intents, `ZIINA_CURRENCY_CODE` to override `AED`, and `PUBLIC_SITE_URL` or `SITE_URL` for payment return URLs.

## Admin Credentials

- Username: `admin`
- Password: `chamak2024`
- Admin panel: `/admin`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + framer-motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Sessions: cookie-session
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — DB schema (users, categories, products, cart_items, orders, order_items)
- `artifacts/api-server/src/routes/` — API route handlers
- `artifacts/chamak-street/src/` — React frontend

## Architecture decisions

- Session-based auth via cookie-session (no JWT)
- Cart is session-scoped — tied to cookie session ID, no login required
- Admin check: `isAdmin` field on user record
- All prices stored as numeric strings in DB, returned as numbers in API
- Product media is optional — "No Image" placeholder shown when null
- Admin product media uploads return Cloudinary `secure_url` values when Cloudinary env vars are configured. Without those env vars, the API falls back to local `/uploads` storage for development only.
- Ziina payments are created server-side via payment intents. The checkout page redirects customers to Ziina's hosted payment page using the returned payment `redirect_url`.

## Product

- **Shop**: Browse all products with category filters and search
- **Product detail**: View product, pick size, add to cart
- **Cart**: Manage items, update quantities, proceed to checkout
- **Checkout**: Enter customer info, place order
- **Admin dashboard**: Store stats, revenue, recent orders, low stock alerts
- **Admin products**: Create, edit, delete products
- **Admin orders**: View all orders, update status

## User preferences

- Bold dark streetwear aesthetic — dark backgrounds, fire orange (#ff6600) and yellow (#ffcc00) gradients
- Chamako the camel is the brand mascot — featured on the homepage hero

## Gotchas

- Always run codegen after changing `lib/api-spec/openapi.yaml`
- Sessions use `cookie-session` — the SESSION_SECRET env var must be set in production
- Price is stored as numeric string in DB but returned as number from API
