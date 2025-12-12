---
description: Deploy changes to GitHub and Google Apps Script (Fully Automated)
---

1. Push to Google Apps Script
// turbo-all
clasp push

2. Push to GitHub
// turbo-all
git push

> [!WARNING]
> This workflow pushes directly to `main` and GAS Production.
> Ensure tests satisfy (`/run_tests`) before executing.
