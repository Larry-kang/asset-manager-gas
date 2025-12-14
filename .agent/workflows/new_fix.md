---
description: Start a new bug fix branch (Standard Git Flow)
---

1. Sync with main to ensure fresh start
// turbo-all
git checkout main
git pull origin main

2. Create and switch to the fix branch
// turbo-all
git checkout -b fix/{{fix_name}}

> [!IMPORTANT]
> - **Naming**: Use descriptive names like `fix/login-error` or `fix/mobile-css`.
> - **Rule**: Always start fixes from the latest `main`.
