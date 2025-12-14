# Google Apps Script 自動化部署流程 (CI/CD)

本文件概述了使用 GitHub Actions 部署 Google Apps Script (GAS) 專案的標準化流程。
**核心原則：** 永遠不要手動部署。Git 是唯一的真理來源 (Source of Truth)。

## 1. 前置準備 (一次性設定)

### A. 本地環境 (Local Environment)
1.  **安裝 Clasp:** 全域安裝：`npm i -g @google/clasp`。
2.  **登入:** 執行 `clasp login`，這將產生 `~/.clasprc.json` 憑證檔案。
3.  **專案設定:** 執行 `clasp clone <scriptId>` 或 `clasp create`。
4.  **忽略檔案:** 建立 `.claspignore` 以排除開發檔案 (如 node_modules, tests, .git)。

### B. GitHub Repository Secrets 設定
為了讓 GitHub Action 能代表您執行部署，您需要設定 Repository Secrets：

1.  **取得您的憑證:**
    *   開啟本地的 `~/.clasprc.json` (位於您的使用者根目錄，登入後產生)。
    *   複製其完整的 JSON 內容。
2.  **設定 Secret:**
    *   進入 GitHub Repo > **Settings** > **Secrets and variables** > **Actions**。
    *   點擊 **New Repository Secret**。
    *   Name: `CLASP_SECRET`
    *   Value: 貼上剛剛複製的 `~/.clasprc.json` 內容。
3.  **設定 Config Secret (選用但推薦):**
    *   複製專案中 `.clasp.json` 的內容 (包含 scriptId)。
    *   建立新的 Repository Secret：`CLASP_CONFIG`。
    *   *註：雖然 Workflow 支援從 Repo 讀取 `.clasp.json`，但透過 Secrets 管理較為安全。*

## 2. Workflow 設定檔 (`.github/workflows/deploy.yml`)

請在您的 Repo 中建立此檔案。此標準配置處理以下事項：
*   Node.js 環境設定
*   安裝 Clasp
*   Token 格式標準化 (解決 Clasp 2.4+ 版本 Token 格式混亂的問題)
*   執行部署 (`clasp push -f`)

```yaml
name: Deploy to GAS (部署到 GAS)

on:
  push:
    branches: [ "main", "master", "feat/*", "fix/*", "refactor/*" ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js (設定 Node 環境)
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Clasp (安裝 Clasp)
        run: npm install -g @google/clasp

      - name: Authenticate Clasp (驗證 Clasp)
        run: |
          # 寫入 Project ID 配置
          echo "$CLASP_CONFIG" > .clasp.json
          
          # 寫入憑證 (包含複雜的 JSON 解析與格式修正邏輯)
          node -e "
            const fs = require('fs');
            const os = require('os');
            const path = require('path');
            const secret = process.env.CLASP_SECRET;
            if(!secret) process.exit(1);
            
            // 邏輯：標準化 token 格式 (部分版本會包在 'tokens.default' 中)
            let json = JSON.parse(secret);
            let token = json.token || (json.tokens && json.tokens.default ? (json.tokens.default.token || json.tokens.default) : null);
            
            if(token) {
               // 重建成 Clasp 偏好的舊版簡化格式
               const rc = { token: token };
               fs.writeFileSync(path.join(os.homedir(), '.clasprc.json'), JSON.stringify(rc));
            } else {
               console.error('無效的 Token 結構 (Invalid Token Structure)');
               process.exit(1);
            }
          "
        env:
          CLASP_CONFIG: ${{ secrets.CLASP_CONFIG }}
          CLASP_SECRET: ${{ secrets.CLASP_SECRET }}

      - name: Deploy (執行部署)
        run: clasp push --force
```

## 3. 日常開發流程 (Daily Usage)

**唯一準則：只使用 Git 指令。**

1.  **開發 (Develop):** 使用 VS Code 在本地編輯程式碼。
2.  **提交 (Commit):**
    *   `git add .`
    *   `git commit -m "feat: 新增功能描述"`
3.  **部署 (Deploy):**
    *   `git push`

GitHub Action 將會自動觸發，並在約 30-60 秒內將更新部署至 Google Apps Script。

## 4. 故障排除 (Troubleshooting)

*   **錯誤: "Precondition Failed" / "Token Expired":**
    *   原因：`CLASP_SECRET` 中的 Refresh Token 可能已過期 (通常每 7 天需更新，或太久未使用)。
    *   **解法:** 在本地再次執行 `clasp login`，取得新的 `~/.clasprc.json` 內容，並更新 GitHub Secret。
*   **錯誤: "Files to push were not found":**
    *   原因：檔案可能被忽略了。
    *   **解法:** 檢查 `.claspignore`，確保 `.gs` 和 `.html` 檔案 **沒有** 被列入忽略清單。
