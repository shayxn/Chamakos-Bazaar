---
name: Development transform verification
description: The dev UI transformation pipeline can fail even when TypeScript and production builds pass.
---
For frontend changes, verify that the development server can actually serve affected modules; a successful production build alone does not prove the preview works.

**Why:** The development JSX transformation pipeline rejected an inline object type argument that the TypeScript check and production bundler accepted, blocking multiple Admin routes.

**How to apply:** Prefer inferred or named JSX type arguments in this workspace. If production builds pass but routes fail with a dynamic-import 500, inspect the development parser error before blaming authentication or the network.

Keep mounted inventory cards bounded through pagination or virtualization, and avoid staggered/layout animations across the full catalog on interactive Admin screens.

**Why:** QA encountered button timeouts and browser crashes while thousands of inventory cards were mounted, even though the API returned data and accessibility text was present.

**How to apply:** Preserve the full catalog and clear bulk-selection scope; limit rendering rather than deleting or truncating data. Actual clicks and saves matter more than a populated accessibility snapshot.
