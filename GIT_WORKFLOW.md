# ? 標準 Git 開發工作流程 (Standard Git Workflow)

為了確保代碼品質與自動化部署的穩定性，本專案採用 **GitHub Flow** 搭配 **Conventional Commits**。
請遵循以下規範進行開發。

## 1. 分支策略 (Branching Strategy)

我們採用簡化的 GitHub Flow：

*   **`main` (主分支)**:
    *   ? **禁止直接 Commit**。
    *   這是「生產環境 (Production)」的代碼。
    *   **唯一** 會觸發自動部署的分支。
*   **`feat/*` (功能分支)**:
    *   開發新功能時使用。
    *   推送此分支 **不會** 觸發線上部署 (CI 僅執行測試)。
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

## 5. Agent 協作協議 (Agent Protocol)

為確保多代理 (Multi-Agent) 環境下的協作順暢，所有 Agent 必須遵守：

1.  **嚴禁直接 Commit 到 Main**:
    *   所有修改 **必須** 在 `feat/...` 或 `fix/...` 分支進行。
    *   使用 `/new_feature` 或 `/new_fix` 確保從最新的 `main` 同步。
2.  **原子化提交 (Atomic Commits)**:
    *   每個 Commit 應只解決一個問題。
    *   嚴格遵守 Conventional Commits。
3.  **自動化驗證**:
    *   Commit 前 **必須** 通過 `npm test` (使用 `/git_commit` 流程)。
4.  **Pull Before Push**:
    *   在推送前，確認與遠端沒有衝突。

---

## 6. 常見指令速查表

| 動作 | 指令 | 說明 |
| :--- | :--- | :--- |
| **開始新功能** | `/new_feature` | 建立 `feat/...` 分支 (自動同步 main) |
| **開始修復** | `/new_fix` | 建立 `fix/...` 分支 (自動同步 main) |
| **提交檢查** | `/git_commit` | 執行測試並提交 (含 Branch 檢查) |
| **部署** | `/deploy` | 推送至 GitHub 觸發自動部署 |

