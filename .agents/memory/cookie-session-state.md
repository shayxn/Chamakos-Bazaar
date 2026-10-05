---
name: Cookie session state
description: Runtime session contracts and concurrent customer preference changes.
---

Verify the actual session middleware contract before using a lifecycle method; permissive request-session typings are not runtime proof.

**Why:** Country selection passed TypeScript but failed in the browser because a server-session lifecycle method was assumed on signed cookie sessions.

**How to apply:** Cookie sessions commit with the response. Change preferences only after successful work, keep reads non-mutating, and resolve removed/disabled countries against current store policy rather than stranding a stale browser session.

Keep slowly updated public preferences separate from authentication/cart/order-access state.

**Why:** A delayed FX response carrying an older signed-session snapshot could otherwise overwrite a guest checkout's newer order-access grant or a simultaneous sign-in.

**How to apply:** A country preference is not authentication proof; validate it against current store policy, without replacing the auth session when updating the preference.
