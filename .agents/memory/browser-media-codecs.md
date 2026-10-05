---
name: Browser media codecs
description: Separate media delivery failures from missing codecs in the automated test browser.
---

The automated browser may lack H.264/AAC decoding even when MP4 uploads and HTTP range serving are correct.

**Why:** A genuine MP4 fetched successfully with byte-range responses while the video reported MEDIA_ERR_SRC_NOT_SUPPORTED and canPlayType returned empty for H.264/AAC. This was a decoder limitation, not an authentication or storage failure.

**How to apply:** Check the video error and actual resource response before changing serving or authorization. Use explicitly labeled VP8/Opus WebM fixtures for automated playback checks, and verify the owner's actual media and audible playback on target devices separately.
