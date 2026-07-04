---
name: Event badge fetch flood
description: Prevents concurrent API storms from EventProductBadge calling useActiveEvents() simultaneously
---

# Event badge fetch flood

`event-banner.tsx` uses module-level singletons (`_events`, `_listeners`) for the shared events cache.

**Problem:** When many `EventProductBadge` components mount at the same time (e.g. a product grid with 20+ cards), they all call `useActiveEvents()` → all check `_events.length === 0` → all fire `refreshActiveEvents()` simultaneously → hundreds of parallel `GET /api/events/active` requests in one second.

Also triggered by HMR: each hot module reload resets the module-level `let _events = []` to empty, causing all mounted components to re-fetch.

**Fix applied:** Added `_fetching: boolean` in-flight guard and `_lastFetch: number` + `CACHE_MS = 30_000` timestamp check inside `refreshActiveEvents()`. The function returns early if already fetching or if last fetch was < 30s ago.

**How to apply:** Any future module-level singleton fetch pattern in this codebase should use the same guard pair: `_fetching` + `_lastFetch`.
