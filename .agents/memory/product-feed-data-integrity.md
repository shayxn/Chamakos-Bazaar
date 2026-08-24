---
name: Product feed data integrity
description: Rules for the admin discovery feed and saved imported-product workflow.
---

The Product Feed must display only persisted imported catalog records and clearly label unknown source fields as unavailable. Saved items are a server-owned, per-admin list; never overload product merchandising flags to represent a saved state.

**Why:** FirstPick must not fabricate supplier stock, prices, delivery details, popularity, or product data. Product flags already control live storefront behavior and should not be repurposed for private admin workflow state.

**How to apply:** Build feed filters, pagination, saved lists, and source review from stored import/catalog fields. When a source detail is absent, show “Not provided” rather than calculating or guessing it. Keep “save” non-destructive and separate from supplier imports, product visibility, and deletion.