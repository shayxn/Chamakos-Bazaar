---
name: Owner Studio security
description: Permission and publishing rules for FirstPick Owner Studio pages.
---

Owner Studio is server-authorized: the first admin becomes the bootstrap owner only when no explicit owner is configured, and the owner can grant Studio access to other admins. A Studio grant is not a publishing grant.

**Why:** Visual editing must not let a normal admin make a public, private, or security-sensitive change simply by knowing an API URL.

**How to apply:** Enforce Studio access and page-level permissions on every page/version read and mutation. Only the owner may publish, delete, restore, change page URLs, or change page permissions. Draft saves use optimistic versions and cannot change a published page’s live content. Public elements may use same-site paths or HTTPS URLs only; reject script/data schemes. Treat custom code as non-executable unless a separate sandboxed capability model is deliberately built.