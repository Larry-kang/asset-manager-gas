# CI/CD Setup Guide

## Requirements
You must configure the following **Secrets** in your GitHub Repository Settings > Secrets and variables > Actions.

### 1. `CLASP_CONFIG`
The content of your local `.clasp.json`.
```json
{"scriptId":"<YOUR_SCRIPT_ID>","rootDir":"<YOUR_ROOT_DIR>"}
```
*(Tip: `rootDir` should usually be `.` or the path in repo)*

### 2. `CLASP_SECRET`
The content of your local `.clasprc.json`.
This file contains your Google OAuth Refresh Token.
**How to get it:**
1. Run `npx clasp login` locally.
2. It will open a browser. Login to Google.
3. The file is saved at `~/.clasprc.json` (User Home Directory).
4. Copy the entire JSON content into the GitHub Secret.

## Workflow
Once secrets are set:
1. Push to `main` branch.
2. Check "Actions" tab in GitHub.
3. The workflow `Deploy to GAS` will run `clasp push -f` automatically.
