---
name: Order ownership boundaries
description: Why profile phone numbers must not authorize order access or notification subscriptions.
---
Do not treat an editable account phone number as proof of ownership of historical guest orders or as authorization for push updates.

**Why:** An account could set somebody else's phone number and otherwise gain access to their orders. New authenticated orders must carry the account identity; guest access must come from the signed session or the separate order-tracking proof.

**How to apply:** Preserve stored orders and real order numbers. Do not restore phone-based matching to fix account-history visibility; older guest orders can use the tracking flow. Associate new notification subscriptions with the authenticated account or the signed guest order, not client-supplied contact details.
