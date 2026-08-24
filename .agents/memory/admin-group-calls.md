---
name: Admin group calls
description: The FirstPick admin calling design, its scalability boundary, and required validation.
---

Admin group calls are implemented as authenticated, in-memory WebRTC mesh rooms for a small internal admin team. The server owns room membership and signaling authorization; browsers never choose a sender identity, and push notifications carry the room URL for subscribed devices whose tabs are closed.

**Why:** No suitable embedded SFU/media-room provider was connected in the workspace. A mesh lets the existing app provide real multi-admin audio/video without replatforming, but each additional participant adds peer connections and bandwidth load.

**How to apply:** Keep room invitations, joins, leaves, and signals server-authorized. Treat mesh as a small-team solution only; choose an SFU before expanding participation significantly. Do not claim group media or offline push behavior is production-verified until it has been tested with two real authenticated admins on separate devices.

**Lifecycle rule:** Keep the active room ID in a ref and make call teardown stable and unmount-only; never let an effect cleanup depend on a callback recreated from room state.

**Why:** React runs an effect cleanup before a dependency transition. A room-dependent cleanup can therefore interpret a normal join or invite state update as a leave, immediately closing newly acquired media and signaling the server to remove the participant.

**How to apply:** Set the ref before updating room state on every entry path (deep link, invite, and join). Explicit leave and component unmount should be the only paths that stop tracks, close peer connections, and notify the server.