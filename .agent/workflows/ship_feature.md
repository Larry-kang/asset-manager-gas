---
description: Automate the entire feature delivery (Test -> Commit -> Merge -> Deploy)
---

1. Validate System
// turbo-all
npm test

2. Commit Changes (Feature Branch)
// turbo-all
git add .
git commit -m "feat: complete feature implementation"

3. Merge to Main
// turbo-all
git checkout main
git merge -

4. Deploy to Production
// turbo-all
clasp push
git push

> [!IMPORTANT]
> - Run this ONLY when you are on a **Feature Branch** and ready to ship.
> - It assumes the previous branch (`-`) is the feature branch you want to merge.
