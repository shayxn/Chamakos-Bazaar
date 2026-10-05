---
name: Chat delivery truth
description: Uncertain network failures are not proof that a private message was never saved.
---
Do not rely on a live chat event as the sender's only confirmation. A disconnected stream can miss a message that the server saved successfully. Confirm from the send response and reconcile live/history copies by the saved message identity.

**Why:** The previous sender depended on SSE to display its own message and cleared the draft before the network request completed. That could hide successful sends or lose drafts on network failure.

**How to apply:** Preserve the draft until a saved response is confirmed, and reuse the original client message ID when retrying an uncertain delivery. The ID belongs to the sender and the original conversation; never reuse it to deliver a saved message into another thread. After reconnecting, recover saved history rather than assuming SSE replays missed events.
