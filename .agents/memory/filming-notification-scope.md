---
name: Filming notification scope
description: The owner's explicit filming consent, real-push limits, and separation from business data.
---

Movie Setup is a filming simulation. The owner explicitly superseded the in-app-only version with real OS/Web Push to selected, opted-in Owner/Admin devices.

**Why:** The user wants real notifications for filming, but forbids effects on customers, orders, revenue, analytics, inventory, email, payments, or fulfillment.

**How to apply:** Keep the 3,200-event visual simulation separate from a burst of up to 50 real push requests total, not 50 per recipient. The test sends up to 10 real requests. Use the exact notification text “Well done! You got an order!” Never route simulations through normal order creation or order notification fan-out.

Explicit consent must remain bound to an active admin login, not just a browser PushManager endpoint.

**Why:** A push subscription can survive logout and be reused by another account in the same browser. A previously opted-in endpoint alone is not proof that the current recipient is an admin.

**How to apply:** Recheck device consent and active admin access before each real send. Stop remaining sends immediately on STOP. Never retry provider throttling or bypass OS grouping/protections. Provider acceptance is not proof of OS display or sound.
