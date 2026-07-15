---
name: GitHub push setup
description: How to push Chamak Street to GitHub from Replit
---

## Setup
- Remote: `https://github.com/shayxn/Chamakos-Bazaar` (HTTPS, no SSH keys)
- git user: aboodie040 / aboodie040@gmail.com
- Branch: main (90+ commits ahead of origin/main; 2 behind)

## Pushing
A helper script `push-to-github.sh` exists in the repo root. Run:
```bash
bash push-to-github.sh
```

The user needs `GITHUB_TOKEN` set as a Replit Secret with `repo` scope. The script:
1. Sets remote URL with embedded token
2. Fetches latest
3. Force-pushes with `--force-with-lease`
4. Restores clean remote URL (no token stored in config)

**Why:** HTTPS push requires a GitHub PAT. The token is never stored in git config — it's only used for the push command then reverted.
