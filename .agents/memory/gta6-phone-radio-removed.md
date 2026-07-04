---
name: GTA6 phone and radio removal
description: gta6-phone.tsx and gta6-radio.tsx are permanently deleted; do not re-add them.
---

# GTA6 Phone and Radio Removal

Both features have been permanently removed:

- `gta6-phone.tsx` — deleted (was a fake floating phone UI in gta6.tsx)
- `gta6-radio.tsx` — deleted (was a floating music player in gta6.tsx)

All imports, state variables (isPhoneOpen, isRadioOpen, showPhone, etc.), JSX references, and timer cleanup were removed from `gta6.tsx`.

**What stays:**
- `X` icon from lucide-react — still used in gta6.tsx for gallery close, trailer close, and other close buttons
- `Music2` in `admin/site-settings.tsx` — used for TikTok button section header icon, unrelated to radio
- WhatsApp floating button — still in layout.tsx (fixed bottom-right) for all pages
- Back-to-top button in gta6.tsx — still at fixed bottom-right

**How to apply:** If asked to add phone/radio back, note they were intentionally removed. Do not re-create them.
