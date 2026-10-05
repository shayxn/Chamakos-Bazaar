---
name: SQL array interpolation
description: How Drizzle treats JavaScript arrays inside SQL templates in this workspace.
---
Do not assume an interpolated JavaScript array is bound as a single PostgreSQL array. In this workspace, it expands into a row of scalar placeholders, which cannot be cast to int[] or text[] for ANY.

**Why:** A cleanup transaction failed on an array cast before it could remove any fixtures. The database operation was safe to retry, but raw SQL with arrays is easy to misread.

**How to apply:** For dynamic membership tests, build an IN list with individually bound elements and make the empty case match nothing. Use a genuinely single array parameter only if its binding behavior has been confirmed.
