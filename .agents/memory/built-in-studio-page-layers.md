---
name: Built-in Studio page layers
description: Safe way Owner Studio adds content to existing FirstPick routes without replacing protected application logic.
---

Core FirstPick routes are represented in Owner Studio as page layers: Studio content may be added, edited, published, removed, or restored alongside the route, but it does not replace the route's existing implementation.

**Why:** Checkout, authentication, orders, admin operations, and other established screens contain critical logic that must not be overwritten by visual-builder content.

**How to apply:** When adding an editable built-in route, store its route marker in Studio content and render only its published layer in the appropriate Store or Admin shell. Keep route internals and security decisions in the normal application code.