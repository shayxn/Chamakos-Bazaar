---
name: Built-in Studio page layers
description: Safe way Owner Studio adds content to existing FirstPick routes without replacing protected application logic.
---

Core FirstPick routes are represented in Owner Studio as page layers: Studio content may be added, edited, published, removed, or restored alongside the route, but it does not replace the route's existing implementation.

**Why:** Checkout, authentication, orders, admin operations, and other established screens contain critical logic that must not be overwritten by visual-builder content.

**How to apply:** When adding an editable built-in route, store its route marker in Studio content and render only its published layer in the appropriate Store or Admin shell. Keep route internals and security decisions in the normal application code.

The editor has two distinct preview modes: **Live page** displays the current route as it is presently rendered, while **Edit draft** shows the selected Studio layer and its unpublished changes.

**Why:** A visual builder must let the Owner inspect the existing page without accidentally treating the original transactional UI as editable Studio content.

**How to apply:** Keep the live view read-only and use the draft view for Toolbox changes, FirstPick text, and animation edits; publishing remains the explicit boundary that places a layer on the real route.