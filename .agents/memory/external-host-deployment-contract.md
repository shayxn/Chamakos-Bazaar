---
name: External host deployment contract
description: Avoid frontend/backend version drift during workspace changes on the existing Vercel/Render hosting setup.
---

Preserve external hosting build and start contracts during monorepo restructuring. Validate frontend and backend releases separately; a successful Vercel deployment does not prove the Render API updated.

**Why:** The live storefront loaded new frontend code while the backend lacked required boot/countdown routes. A saved Render build contract had disappeared from the repository, while Vercel still built successfully.

**How to apply:** Verify the configured production API route responses and external backend deployment logs before declaring the live site fixed. Keep the existing database and hosting targets; never route production to a temporary development preview just to remove the loading error.

Production hosting repairs must preserve the existing database, secrets, and data. Do not create a replacement database, reset/delete the database, or remove existing records.

**Why:** The owner explicitly requires preservation of all existing production data and secrets.

**How to apply:** Restore repository-side hosting compatibility without swapping storage or credentials. Any legacy schema compatibility must be additive and idempotent; never use a force-push schema command that can drop existing structures.
