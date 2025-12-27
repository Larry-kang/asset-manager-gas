---
description: Start a new feature development cycle (Git Flow)
---

1. Sync and Create Branch
// turbo-all
git checkout main
git pull origin main
git checkout -b feat/{{feature_name}}

2. Create Test (TDD)
> [!IMPORTANT]
> Create a new test file in `tests/` outlining the expected behavior.
> Run `npm test` to confirm it fails (Red).

3. Create Implementation Plan
> [!NOTE]
> Create `docs/design/{{feature_name}}.md` if complex.
