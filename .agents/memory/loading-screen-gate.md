---
name: Loading screen gate
description: The first-visit boot overlay and how follow-on page effects synchronize with it.
---

The boot-complete signal means the visual loading overlay has released, not that every store service succeeded. Normal completion should use actual readiness; failures must remain visible and must not trap visitors indefinitely behind the logo.

The owner requests a three-second normal loading sequence, including the exit animation.

**Why:** The owner explicitly asked to shorten the loading screen to three seconds.

**How to apply:** Do not restore a five-second artificial hold. Keep bounded recovery and truthful failure/retry messages when services fail; never bypass server-enforced operational safety.

**Why:** Page-level visual effects can mount before the boot overlay disappears, while a fixed loader duration can either mask an unready page or add needless delay.

**How to apply:** Check the durable readiness flag when subscribing, then listen for the completion event. Preserve normal readiness-based completion and the failure escape. Follow-on effects must still validate their own required services.