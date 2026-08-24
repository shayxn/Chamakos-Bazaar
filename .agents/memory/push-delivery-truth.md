---
name: Push delivery truth
description: Rules for accurate admin notification test feedback.
---

**Rule:** A push-test success state must be tied to the requesting browser's saved subscription and at least one provider-accepted delivery, not merely a completed server request.

**Why:** General event push flows can intentionally swallow individual provider failures so one stale subscription does not break an order. Reusing that behavior for a manual test falsely tells an admin that notifications work when no usable subscription exists or every delivery was rejected.

**How to apply:** The browser sends its current PushManager subscription endpoint with a test request. The server targets that exact stored subscription and returns an error for a missing record or zero accepted deliveries. Keep ordinary fan-out notifications fault-tolerant independently.