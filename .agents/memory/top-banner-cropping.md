---
name: Top banner cropping
description: The owner's fixed banner crop must be the same on every screen, without requiring a pre-cropped upload.
---
The Top Banner's visible area stays 12:1 on desktop, iPad and mobile. Accept ordinary source-image aspect ratios; preserve the original upload so Admin can reposition and zoom it again. The editor and public banner should show the same selected crop, not independently choose a different mobile crop.

**Why:** The user explicitly asked for a fixed frame representing exactly what customers see, and for the saved position to survive refreshes and redeployments. A permanently cropped replacement would lose the rest of the source image.

**How to apply:** Keep the original persistent asset and saved positioning together. Size the viewport, not the source image, to 12:1. Maintain cover coverage without distortion. OFF or no image means no banner element or reserved space. Do not change the ratio or add device-specific reframing without asking.
