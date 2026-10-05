---
name: Customer marketing consent
description: Consent, quota, and delivery-truth requirements for customer push notifications.
---

Five marketing messages per customer per week is a maximum, never a sending target. Use a rolling seven-day window, including concurrent pending sends, across a known customer's devices. Genuine order, shipping, and delivery events are exempt.

**Why:** The user explicitly requested a server-enforced maximum of five marketing messages weekly and separated transactional notifications from marketing.

**How to apply:** Every marketing path, including wishlist releases, must respect consent and the shared quota. Do not automatically send messages just to fill the allowance.

Marketing consent is separate from order-update consent. Anonymous consent is session-bound; editable contact details are not ownership proof. Customers and Admin notification subscriptions must remain separate.

**Why:** A shopping browser must not be silently enrolled in marketing or receive private Admin work notifications.

**How to apply:** Request browser permission only after the customer's action, preserve existing preferences in legacy actions, and re-check opt-out before dispatch.

Push-provider acceptance does not prove delivery or display on a phone. Missing configuration must block sending explicitly, without fake success.

**Why:** Browser permissions and external push delivery cannot be guaranteed by the application.

**How to apply:** Keep reports specific to provider acceptance; do not claim physical-device delivery without observing it.
