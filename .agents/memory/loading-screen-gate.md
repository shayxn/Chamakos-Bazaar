---
name: Loading screen gate
description: The first-visit boot overlay and how follow-on page effects synchronize with it.
---

The first-visit loading overlay is session-gated with `firstpick_loaded` and announces completion through the `firstpick:boot-complete` browser event. It completes only after store settings, operational settings, browser/fonts, and the initial mounted route are ready; it has a retry state rather than a fake completion timer.

The owner requests a three-second normal loading sequence, including the exit animation.

**Why:** The owner explicitly asked to shorten the loading screen to three seconds.

**How to apply:** Do not restore a five-second artificial hold. Keep readiness and failure/retry safeguards when the store cannot load normally.

**Why:** Page-level visual effects can mount before the boot overlay disappears, while a fixed loader duration can either mask an unready page or add needless delay.

**How to apply:** Start an important first-visit visual effect from the completion event, with a guarded fallback only if needed. Preserve readiness-based completion and its retry escape; on later visits, use a short local delay because the boot screen is skipped.