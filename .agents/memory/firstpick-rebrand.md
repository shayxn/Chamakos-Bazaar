---
name: FirstPick rebrand
description: Chamak Street renamed to FirstPick — covers changed files, session keys, removed features, logo approach.
---

## Summary
Brand renamed "Chamak Street" → "FirstPick" (Aug 2026).

## Logo approach (important)
- `chamak-logo.tsx` uses CSS gradient approach — FIRST as white span, PICK with WebkitBackgroundClip gradient span. NO SVG gradients. NO dot. NO underline.
- Font: 'Arial Black','Impact','Franklin Gothic Heavy',sans-serif, weight 900
- Gradient: linear-gradient(180deg, #ff5200 0%, #ffb300 100%)
- `layout.tsx` and `mobile-layout.tsx` use `<ChamakLogo>` when logoUrl === "/firstpick-logo.svg" (default), otherwise show custom logo <img>
- `firstpick-logo.svg` in public is a fallback SVG (used only if ChamakLogo component is unavailable)

## Session keys
- Loading screen: `firstpick_loaded`
- Welcome popup: `firstpick_welcome_v1`
- Admin notif: `firstpick_notif_asked`

## Loading screen
- Corner film-reel brackets, scan lines (forward + reverse), orange glow background, grid pattern
- Percentage counter bottom-right, "DUBAI · UAE" tag bottom-left
- "Authentic · Premium · Dubai" tagline, 3 animated dots
- Orange gradient progress bar at bottom

## Video section
- `/firstpick-video.mov` in public folder (664K screen recording)
- Added between ReviewsSection and TiktokSection in home.tsx
- Full-bleed, cinematic bars top/bottom, side vignettes, orange glow beneath, muted+loop+autoplay

## Removed from home
- `BrandsSection` (Shop by Brand + Shop by Category) — deleted from import and JSX
- All "Chamak Street" references → "FirstPick"
- "Rep Nation" → "Authentic Drops"
- "100% Authentic Rep" stat → "100% Authentic"
- "The Chamak Mantra" → "The FirstPick Promise"
- "— Chamak Street, Dubai" → "— FirstPick, Dubai"

## Removed admin pages (routes + sidebar links)
- /admin/import, /admin/stock-alerts, /admin/abandoned-carts, /admin/sales-reports

## Glass system (index.css)
- All glass classes upgraded to iOS 26 liquid glass (blur 40-60px, saturate 200-220%, brightness 1.08)
- New: glass-card (product cards), glass-badge, glass-drawer
- glass-card has hover state: orange border glow

## Animation improvements
- page-transition.tsx: reveals now include scale(0.975), blur + spring easing
- scroll-reveal: willChange on all motion divs
- Buttons: spring cubic-bezier(0.34,1.56,0.64,1) with overshot bounce
- CSS: smooth scroll, overflow-x hidden, hardware-accelerated with will-change
