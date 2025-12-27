---
description: Automate the delivery (Test -> Commit -> Merge -> Deploy)
---

1. Final Validation
// turbo-all
npm test
npm run test:e2e

2. Commit Changes
// turbo-all
git add .
git commit -m "feat: complete {{feature_name}}"

3. Merge to Main
// turbo-all
git checkout main
git merge -

4. Deploy
// turbo-all
git push

> [!IMPORTANT]
> GitHub Actions will handle the actual deployment to Google Apps Script.
