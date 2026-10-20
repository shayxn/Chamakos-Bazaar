---
name: Admin device sign-ins
description: Product rule for concurrent Admin device sessions.
---

Admins may sign in on any number of devices at once. Keep per-device session tracking and the ability to revoke individual sessions, but do not enforce a maximum concurrent-device count.

**Why:** The owner explicitly requested that device limits not prevent any Admin from signing in.

**How to apply:** Keep login authentication and Admin-role checks intact while allowing unlimited concurrent Admin device sessions.
