# Chamak Street

A bold urban streetwear e-commerce site featuring the camel mascot Chamako — with a full shop, cart, checkout, and admin panel.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/chamak-street run dev` — run the frontend (port 19768)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing secret
- Product media uploads use Cloudinary in production. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`; optionally `CLOUDINARY_UPLOAD_FOLDER`.
- Ziina checkout requires `ZIINA_ACCESS_TOKEN`. Optional: `ZIINA_TEST_MODE=true`, `ZIINA_CURRENCY_CODE`, `PUBLIC_SITE_URL`.

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
- `lib/db/src/schema/` — DB schema (users, categories, products, cart_items, orders, order_items, content_pages)
- `artifacts/api-server/src/routes/` — API route handlers
- `artifacts/chamak-street/src/` — React frontend

## Architecture decisions

- Session-based auth via cookie-session (no JWT)
- Cart is session-scoped — tied to cookie session ID, no login required
- Admin check: `isAdmin` field on user record
- All prices stored as numeric strings in DB, returned as numbers in API
- Product media is optional — "No Image" placeholder shown when null
- Ziina payments are created server-side via payment intents; customer redirected to hosted payment page

## Product

- Public store with home, shop, product detail, cart, and checkout pages
- Ziina payment gateway integration for UAE market (AED currency)
- Admin panel at `/admin` with product, order, and content management
- Category-based product filtering and search

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Password hashing: `sha256(password + "chamak_salt_2024")`
- The Clerk proxy middleware is present but Clerk keys are optional — app works without them
- Run `pnpm --filter @workspace/db run push` after any schema changes before testing routes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
