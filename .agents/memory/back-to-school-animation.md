---
name: Back to School animation
description: Automatic school-page backpack reveal behavior and accessibility fallback.
---

The Back to School backpack reveal starts automatically after the initial boot screen; it is not a customer-triggered button. Its overlay must render above route-transition stacking contexts.

**Why:** Route transitions can trap fixed children below page content, and the global reduced-motion rule collapses ordinary animations to their final frame. Both failures make an animation exist in the DOM without being visibly useful.

**How to apply:** Render the page-level reveal at the document root. Preserve the normal slide, shake, and fade sequence for motion-enabled visitors; in reduced-motion mode, show a bright static centered backpack briefly before dismissal.