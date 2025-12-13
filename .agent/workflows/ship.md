---
description: Ship a feature (QA -> Commit -> Merge -> Deploy)
---

1. Pre-Flight Check (QA)
   - Recommend running `/qa` first.
   - Ask user: "Have you verified the Mobile Layout and Mock Data?"

2. Commit Changes
// turbo
git add .
git commit -m "feat: ship feature"

3. Merge to Main
// turbo
git checkout main
git merge -

4. Deploy
// turbo
clasp push
git push

> [!WARNING]
> This will deploy to Production. Ensure QA is PASSED.
