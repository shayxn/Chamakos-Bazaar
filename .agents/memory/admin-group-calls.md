---
name: Admin group calls
description: The FirstPick admin calling design, its scalability boundary, and required validation.
---

Admin group calls are implemented as authenticated, in-memory WebRTC mesh rooms for a small internal admin team. The server owns room membership and signaling authorization; browsers never choose a sender identity, and push notifications carry the room URL for subscribed devices whose tabs are closed.

**Why:** No suitable embedded SFU/media-room provider was connected in the workspace. A mesh lets the existing app provide real multi-admin audio/video without replatforming, but each additional participant adds peer connections and bandwidth load.

**How to apply:** Keep room invitations, joins, leaves, and signals server-authorized. Treat mesh as a small-team solution only; choose an SFU before expanding participation significantly. Do not claim group media or offline push behavior is production-verified until it has been tested with two real authenticated admins on separate devices.