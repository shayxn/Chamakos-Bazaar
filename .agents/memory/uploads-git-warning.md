---
name: Legacy media durability
description: Preserve the owner's real media and saved URLs when replacing local-only upload storage.
---

Do not mask missing upload bytes by replacing the owner's selected hero or logo with a generic asset. Preserve original media and stable references when moving legacy uploads to durable storage.

**Why:** Local upload directories are not reliably carried into a fresh clone or deployment, while the user explicitly requires preserving real settings and supplied branding.

**How to apply:** Copy and verify the original bytes, retain compatible serving URLs and existing files, and leave unknown legacy uploader attribution unknown rather than inventing an owner.
