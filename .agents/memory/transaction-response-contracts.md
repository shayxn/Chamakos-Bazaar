---
name: Transaction response contracts
description: Receipt fields written with raw SQL must also survive ORM selection and API serialization.
---
When a transaction writes customer-visible receipt fields using raw SQL, keep the ORM mapping and response contract aligned, and test the displayed breakdown independently of the grand total.

**Why:** A correct discounted total was returned without its discount/code breakdown because the SQL columns were not mapped for ORM reads. Type checks and order creation alone did not catch that.

**How to apply:** Validate item prices, delivery, tips, discounts and total together. Do not treat a successful transaction or correct total as evidence that every receipt field reaches the client.

ORM writes also require mapped columns: unknown keys in an update object can be ignored even while other fields save successfully.

**Why:** Cancellation returned success and changed status while the supplied reason was silently lost, because only raw SQL knew about that column.

**How to apply:** Check persisted values after multi-field updates and keep raw migrations, ORM mappings, request allowlists, and response contracts aligned.
