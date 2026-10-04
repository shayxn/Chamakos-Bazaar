---
name: Emergency shutdown
description: Rules for the customer pause control and its immediate, reversible propagation.
---

Emergency ShutDown is a distinct operational setting from standard maintenance mode. It leaves Admin and authentication available, shows customers a blocking return-soon overlay, and rejects non-admin customer write requests at the API layer.

**Why:** A client-only overlay is bypassable, while a cached operational flag can leave different customers or API instances in contradictory states during an urgent pause.

**How to apply:** Read operational controls directly from the shared database with no stale response caching. Keep seasonal visibility and product-detail access server-enforced, and make seasonal product responses `no-store` so hiding is immediate and reversible.