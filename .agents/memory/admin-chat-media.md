---
name: Admin chat media
description: Security and reliability rules for FirstPick admin photo and voice messages.
---

**Rule:** Store Admin chat photos and voice recordings in private object storage, but only persist a chat media reference after the server verifies a short-lived, one-time upload record against the uploaded object's actual MIME type and size.

**Why:** Browser-supplied file metadata and a presigned upload URL are not enforcement by themselves. WebM/Opus recordings include MIME parameters, and an issued upload path must not be reusable or become a broken media message.

**How to apply:** Normalize MIME values to their essence before validation. Bind an issued object path to its uploader, approved kind, size limit, expiry, and consumed state. HEAD-check the private object on send, then persist only verified metadata. Serve all chat media through an admin-authenticated endpoint.