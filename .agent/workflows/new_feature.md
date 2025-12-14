---
description: Start a new feature development cycle (Git Flow)
---

1. Update and switch to a new feature branch
// turbo-all
git checkout main
git pull origin main
git checkout -b feat/{{feature_name}}

> [!NOTE]
> - Ensure you are on `main` before running this if starting fresh.
> - Replace `{{feature_name}}` with a descriptive name (e.g., `user-auth`, `api-refactor`).
> - This aligns with Rule #1: **Git-Driven Development**.
