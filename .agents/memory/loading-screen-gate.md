---
name: Loading screen gate
description: The first-visit boot overlay and how follow-on page effects synchronize with it.
---

The first-visit loading overlay is session-gated with `firstpick_loaded` and announces completion through the `firstpick:boot-complete` browser event.

**Why:** Page-level visual effects can mount before the boot overlay disappears. Guessing a delay makes them play invisibly behind the overlay.

**How to apply:** Start an important first-visit visual effect from the completion event, with a guarded fallback only if needed. On later visits, use a short local delay because the boot screen is skipped.