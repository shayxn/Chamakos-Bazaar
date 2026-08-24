---
name: Delivery price configuration
description: Current standard checkout delivery rule and its UAE scope.
---

Standard delivery is AED 25 at checkout. Back to School products are available for UAE shipping and use that same standard checkout charge.

**Why:** The storefront must present one clear delivery amount that matches both the Back to School collection messaging and the server-side order total.

**How to apply:** Keep the frontend default, server fallback, and `delivery_standard_price` site setting aligned at AED 25. Do not describe the Back to School collection as free delivery unless the checkout rule is explicitly changed too.