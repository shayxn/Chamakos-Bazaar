---
name: Admin invitation safety
description: Why invitations use explicit signup, private link fragments, and existing admin authentication.
---

Keep invitation redemption an explicit account-creation action, not a side effect of opening a link. Extend the existing admin login rather than adding another authentication system.

**Why:** Messaging services automatically fetch links to generate previews; fetching an invitation must neither expose its capability nor consume it. Normal sign-in also retains the existing admin device limits.

**How to apply:** Keep the capability out of server-visible URLs and preview metadata. Provide generic branded previews, grant only the owner's selected permissions, and never let redemption grant owner access or promote an existing account.

A taken username is a recoverable signup error, not evidence that an invitation was consumed.

**Why:** The username-conflict message can mention both “already” and “invitation”; classifying lifecycle state by these words incorrectly blocks a still-pending invitation.

**How to apply:** Use the response status or a structured error code to distinguish username conflicts from expired, revoked, or used invitations.
