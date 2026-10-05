---
name: Boot readiness events
description: Prevent missed readiness events when a cached or skipped loader completes before consumer effects mount.
---

Read the durable boot-readiness flag when subscribing, as well as listening for the completion event.

**Why:** On a repeat visit, an earlier sibling's loader effect can finish and dispatch before the launch listener mounts. The global flag becomes true while the component remains permanently unready, silently preventing launch at zero.

**How to apply:** Check readiness again inside the subscription effect. Use the event for future completion, not as the sole record of already-completed work; do not substitute an arbitrary delay.
