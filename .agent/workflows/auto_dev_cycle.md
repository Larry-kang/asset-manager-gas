---
description: End-to-End Automated Development Cycle (Req -> Dev -> QA -> Deploy)
---

# ?? Auto-Dev Cycle

This workflow enforces a strict quality-controlled development loop.

## 1. Requirement & Planning
1. User provides requirement.
2. Update `task.md` with new features/fixes.
3. Create/Update `implementation_plan.md`.
   - **Must** include "Test Plan" section.

## 2. Test-Driven Development (TDD)
1. **Write Tests First**: Create/Update Unit Tests (`tests/backend/*.test.js`) or E2E Tests (`tests/frontend/*.spec.js`).
2. Run tests to confirm failure (Red).
   ```powershell
   npm run test
   ```

## 3. Implementation
1. Write core logic (`.gs`, `js.html`).
2. Run tests again until pass (Green).

## 4. UI/UX Verification (Browser Agent)
1. If UI changes involved, launch `browser_subagent`.
2. Verify visual correctness.
3. Capture screenshot/recording.

## 5. QA & Deployment
1. Generate `QA_REPORT.md` summarizing tests passed and visual proofs.
2. If Green, Auto-Deploy:
   ```bash
   /deploy
   ```
   *(Assuming /deploy triggers git push -> CI/CD)*

> [!IMPORTANT]
> Do not ask for user permission between steps unless critical architecture decisions are needed.
> Assume "Go Ahead" for all Green-lit tests.
