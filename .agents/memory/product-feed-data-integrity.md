---
name: Product feed data integrity
description: Rules for the admin discovery feed and saved imported-product workflow.
---

The Product Feed must display only persisted imported catalog records from approved sources and clearly label unknown source fields as unavailable. FashionCage is legacy catalog data and must never appear in the Product Feed. Saved and added items are server-owned, per-admin lists; never overload product merchandising flags to represent workflow state.

**Why:** FirstPick must not fabricate supplier stock, prices, delivery details, popularity, shipping availability, or product data. Product flags already control live storefront behavior and should not be repurposed for private admin workflow state.

**How to apply:** Build feed filters, pagination, saved lists, added-product reviews, and source review from stored import/catalog fields. A source link is valid only when it is captured from the supplier record; delivery remains “needs confirmation” unless real delivery data is imported. Keep save/add non-destructive and separate from supplier imports, product visibility, and deletion.