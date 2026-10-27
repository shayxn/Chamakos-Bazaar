---
name: Settings edit boundaries
description: Why Admin settings saves must be field-level patches rather than whole configuration replacements.
---

Save only fields actually edited in the settings form, and commit a bulk patch atomically.

**Why:** The settings screen merges database values with display defaults. Resubmitting that whole map exceeded the bulk limit and included protected settings unrelated to the edit, causing repeated production save failures. Whole-map writes can also overwrite another admin's changes.

**How to apply:** Keep an original snapshot for comparison; do not raise bulk limits or weaken credential/owner checks to make a whole-form submission pass. Preserve unsaved edits during background refetches.
