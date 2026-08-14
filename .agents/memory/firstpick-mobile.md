---
name: FirstPick Mobile app
description: Architecture decisions and key facts about the artifacts/firstpick-mobile Expo app
---

# FirstPick Mobile

## App structure
- 5 tabs: index (Shop), search, cart, orders, account
- Stack screens: product/[id], checkout, order/[id], track
- NativeTabs (iOS 26 liquid glass) with ClassicTabs fallback

## State
- CartContext (contexts/CartContext.tsx): AsyncStorage-persisted local cart
- OrderContext (contexts/OrderContext.tsx): AsyncStorage-persisted order history
- Server state: @workspace/api-client-react generated hooks with setBaseUrl called in _layout.tsx

## API integration
- setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`) called outside component in _layout.tsx
- Uses generated hooks (useListProducts, useGetProduct, useListCategories, useTrackOrder, useGetOrder)
- Checkout: adds cart items to server cart via direct fetch, then POST /api/orders (server reads session cart)
- Session cookies handled automatically by React Native HTTP layer

## Design tokens
- Pure black (#000), orange primary (#ff6600), gold accent (#ffc200)
- Font: Space Grotesk (400/500/600/700) via @expo-google-fonts/space-grotesk
- Always dark mode — both light and dark keys set to same dark palette in constants/colors.ts

## Dynamic Island + Widget (compile-time only)
- Swift source: ios/FirstPickLiveActivity/ and ios/FirstPickWidget/
- Config plugins: plugins/withLiveActivity.js and plugins/withWidget.js
- App Group: group.com.firstpick.mobile (for UserDefaults sharing with widget)
- NOT functional in Expo Go — only activates after Expo Launch (App Store) build
- Widget reads from UserDefaults(suiteName: "group.com.firstpick.mobile") — app doesn't write yet (Task #16)
- Bundle ID: com.firstpick.mobile

**Why:** Live Activities and WidgetKit require compiled native extensions — can't run in Expo Go sandbox.

## Known gaps (proposed as tasks)
- Task #16: JS→Swift bridge to actually start/update Live Activity when order placed
- Task #17: Push notifications when order status changes
- Task #18: Customer login/accounts
