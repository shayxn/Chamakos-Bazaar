---
name: GitHub push setup
description: Distinguish GitHub connection status from actual workspace push authorization.
---

An active/healthy GitHub source-control connection is not proof that workspace Git can push. Public fetches can succeed without authenticated write access.

**Why:** The source-control connection reported healthy OAuth and repository scope, but HTTPS push rejected authentication and the GitHub CLI had no logged-in host. The normal integration reconnect form did not support this special source-control connection.

**How to apply:** Prefer the authorized source-control connection and a normal, non-force push. If authentication fails, keep verified commits local and state that they are not live. Official Replit guidance points to reconnecting GitHub in account settings → Connected Services. Never expose tokens or use the historical force-push helper merely to work around missing authentication.
