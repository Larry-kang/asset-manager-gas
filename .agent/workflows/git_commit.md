---
description: Validate changes and commit to git (Quality Control)
---

1. Check Branch (Safety First)
// turbo-all
git branch --show-current

> [!CAUTION]
> **STOP if you are on `main` or `master`!**
> You must create a new branch (`/new_feature` or `/new_fix`) before committing.
> Direct commits to main are PROHIBITED.

2. Run automated tests (Rule #2: Automated Verification)
// turbo-all
npm test

2. Add all changes to staging
// turbo-all
git add .

3. Commit changes with Conventional Commits
// turbo-all
git commit -m "{{type}}: {{message}}"

> [!IMPORTANT]
> - **Type**: `feat`, `fix`, `refactor`, `test`, `chore`
> - **Message**: Short description of the change
> - If tests fail, the commit process should generally be halted.
> - **Deployment**: Run `git push` or the `/deploy` workflow to trigger the CI/CD pipeline.
