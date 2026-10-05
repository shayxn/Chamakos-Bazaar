---
name: Server clock and query caches
description: Why a countdown clock must retain its response-time anchor across route remounts.
---

Anchor each server-clock response to a shared monotonic timestamp, not to each component's mount time. A cached response is already old when a component remounts.

**Why:** Resetting the anchor when reusing cached data makes the countdown pause or jump backward and can wrongly arm a launch sequence for late visitors. Using the device wall clock also permits clock changes to jump the countdown.

**How to apply:** Preserve the anchor for the lifetime of the cached response, refresh on focus/resume, and confirm the currently enabled deadline with the server at zero before launching.
