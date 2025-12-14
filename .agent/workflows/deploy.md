---
description: Deploy changes to GitHub (Triggers Remote GAS Deploy)
---

1. Validate Changes (Optional but Recommended)
   - Run tests: `npm test`

2. Commit & Push
// turbo-all
git add .
git commit -m "chore: deploy updates"
git push

> [!IMPORTANT]
> **DO NOT RUN CLASP PUSH MANUALLY.**
> The CI/CD pipeline in GitHub Actions will handle the deployment.
> Check `DEPLOYMENT.md` for setup details.
