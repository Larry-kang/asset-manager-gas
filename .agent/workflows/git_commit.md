---
description: Validate changes and commit to git (Quality Control)
---

1. Run automated tests first (Rule #2: Automated Verification)
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
