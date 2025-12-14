# ? 標準 Git 開發工作流程 (Standard Git Workflow)

為了確保代碼品質與自動化部署的穩定性，本專案採用 **GitHub Flow** 搭配 **Conventional Commits**。
請遵循以下規範進行開發。

## 1. 分支策略 (Branching Strategy)

我們採用簡化的 GitHub Flow：

*   **`main` (主分支)**:
    *   ? **禁止直接 Commit**。
    *   這是「生產環境 (Production)」的代碼。
    *   任何推送到此分支的變更都會 **自動觸發部署** 到 Google Apps Script (Release Version)。
*   **`feat/*` (功能分支)**:
    *   開發新功能時使用。
    *   命名範例: `feat/add-login`, `feat/new-dashboard`。
*   **`fix/*` (修復分支)**:
    *   修復 Bug 時使用。
    *   命名範例: `fix/header-mobile-view`, `fix/calc-error`。
*   **`refactor/*` (重構分支)**:
    *   代碼重構、不影響功能時使用。
    *   命名範例: `refactor/vue-migration`。

## 2. 開發循環 (The Cycle)

### Step 1: 開發新功能
從 `main` 切出新分支：
```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```
*(Agent Tip: 可使用 `/new_feature` 指令自動執行)*

### Step 2: 提交變更 (Commits)
請使用 **Conventional Commits** 格式，這有助於未來自動生成 Changelog。

**格式:** `<type>(<scope>): <subject>`

*   **Types:**
    *   `feat`: 新增功能 (Feature)
    *   `fix`: 修復 Bug
    *   `docs`: 修改文件 (Documentation)
    *   `style`: 格式修改 (不影響代碼運行，如空白、分號)
    *   `refactor`: 重構 (既不是新增功能也不是修 Bug)
    *   `test`: 增加或修改測試
    *   `chore`: 建構過程或輔助工具的變動 (如 package.json, workflows)

**範例:**
*   `feat: add dark mode toggle`
*   `fix(logic): correct usd asset calculation`
*   `docs: update deployment guide`

*(Agent Tip: 可使用 `/git_commit` 指令，我會幫您檢查格式)*

### Step 3: 推送與合併 (Push & Merge)
1.  **推送分支:**
    ```bash
    git push -u origin feat/your-feature-name
    ```
2.  **建立 Pull Request (PR):**
    *   在 GitHub 網頁上發起 PR (from `feat/...` to `main`)。
    *   等待 CI/CD 測試通過 (GitHub Actions 會自動跑測試)。
3.  **合併 (Merge):**
    *   確認無誤後，將 PR 合併入 `main`。
    *   **此動作會自動觸發部署流程，更新線上的 GAS 專案。**

## 3. 緊急修復 (Hotfix)
如果在線上發現緊急 Bug：
1.  `git checkout main`
2.  `git checkout -b fix/critical-bug`
3.  修復並測試。
4.  Push -> PR -> Merge to `main` (觸發自動部署)。

---

## 4. 常見指令速查表

| 動作 | 指令 | 說明 |
| :--- | :--- | :--- |
| **開始工作** | `git checkout -b <branch>` | 建立並切換到新分支 |
| **暫存檔案** | `git add .` | 加入所有變更 |
| **提交** | `git commit -m "type: msg"` | 提交變更 |
| **同步** | `git pull origin main` | 將遠端最新進度拉回當前分支 (避免衝突) |
| **上傳** | `git push` | 推送當前分支到 GitHub |
| **狀態** | `git status` | 查看目前檔案狀態 |
