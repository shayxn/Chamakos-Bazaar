---
name: Product feed data integrity
description: Rules for the admin discovery feed and saved imported-product workflow.
---

The Product Feed is a short-video surface: it must display only persisted approved-source products that have both a real stored product video and an explicit verified-UAE-delivery signal. FashionCage is legacy catalog data and must never appear. Saved, added, and comments are server-owned per-admin workflow data; never overload merchandising flags to represent them.

**Why:** FirstPick must not fabricate supplier stock, prices, delivery details, popularity, shipping availability, video content, or product data. Product flags already control live storefront behavior and should not be repurposed for private admin workflow state.

**How to apply:** Build feed filters, active-media playback, comments, pagination, saved lists, added-product reviews, and source review from stored import/catalog fields. A source link is valid only when captured from the supplier; an image-only or delivery-unverified product stays out of Product Feed. Keep save/add/comment data non-destructive and separate from supplier imports, product visibility, and deletion.