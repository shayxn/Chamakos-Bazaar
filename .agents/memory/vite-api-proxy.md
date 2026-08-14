---
name: Vite API proxy requirement
description: The chamak-street Vite dev server must proxy /api to port 8080 or API calls return HTML (SPA fallback), causing cryptic runtime crashes.
---

# Vite API Proxy

## Rule
The chamak-street Vite config (`artifacts/chamak-street/vite.config.ts`) must have a `server.proxy` entry routing `/api` to `http://localhost:8080`. Without it, any API call made from the direct Vite URL (`localhost:19768`) returns the index.html SPA fallback, parsed by customFetch as a text string — causing errors like "X.find is not a function".

**Why:** Replit's proxy at port 80 routes `/api` to the API server. The Vite server has no such routing by default. Direct Vite access (e.g. Playwright testing, curl from localhost) breaks all API calls without the proxy config.

**How to apply:** Any time vite.config.ts is modified or regenerated, ensure this block exists in `server`:
```ts
proxy: {
  "/api": {
    target: "http://localhost:8080",
    changeOrigin: true,
    secure: false,
  },
},
```
