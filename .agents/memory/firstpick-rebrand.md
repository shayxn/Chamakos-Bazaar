---
name: FirstPick rebrand
description: Chamak Street renamed to FirstPick — covers changed files, session keys, removed features.
---

## Summary
Brand renamed "Chamak Street" → "FirstPick" (Aug 2026).

## Key changes
- Logo: chamak-logo.tsx renders FIRST(white)+PICK(orange) SVG wordmark
- public/firstpick-logo.svg: new default header/footer logo; layout + mobile-layout fall back to this
- Session keys: loading-screen=firstpick_loaded, welcome-popup=firstpick_welcome_v1, admin-notif=firstpick_notif_asked
- Loading screen: "Authentic · Premium · Dubai" tagline
- Welcome popup: slim bottom notification bar (slides up, no big modal)
- index.html/manifest.json: all meta tags updated to FirstPick
- Trust section: "Replicas" removed → "Authentic Products Only"
- Shop page: REP/Original badge → "✓ Authentic" badge
- login.tsx: Chamak logo → inline FirstPick wordmark
- admin-layout.tsx: "Chamak Admin" → "FirstPick Admin"
- Footer: "Chamak Street" → "FirstPick"
- TikTok handle: @chamakstreet → @firstpick; section redesigned as scroll-triggered vertical video

## Removed admin pages
- /admin/import, /admin/stock-alerts, /admin/abandoned-carts, /admin/sales-reports

**Why:** User switched to authentic products, no longer wants rep/fake/import tooling.
