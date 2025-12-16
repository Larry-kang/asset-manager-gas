# ? 開發者指南 (Developer Guide)

本文件將引導您建立 CI/CD 流程、Git 工作流與環境設置，讓您能順利參與開發。

---

## 1. 環境設置 (Setup)

### A. 本地開發環境
本專案使用 `clasp` 進行 Google Apps Script 的版控與部署，並使用 `Node.js` 進行本地測試。

1.  **安裝 Node.js**: 建議使用 v18 LTS 以上版本。
2.  **安裝倚賴套件**:
    ```bash
    npm install
    ```
    這會安裝 `jest`, `playwright`, `fs` 等測試與開發工具。
3.  **登入 Clasp**:
    ```bash
    npx clasp login
    ```
    跟隨瀏覽器指示登入，這會產生 `~/.clasprc.json`。

### B. 測試與模擬
*   **單元測試 (Unit Test)**:
    ```bash
    npm test
    ```
    測試 `Logic.gs` 與其他純函數邏輯。
*   **端對端測試 (E2E)**:
    ```bash
    npm run test:e2e
    ```
    啟動 `tests/server.js` (模擬 GAS Server) 並使用 Playwright 執行 UI 自動化操作。
    *   **除錯模式**: 使用 `npm run test:e2e -- --debug` 可觀看瀏覽器操作過程。

---

## 2. 測試同步協議 (Test Synchronization Protocol)

為確保專案品質，**所有邏輯或 UI 變更都必須伴隨測試更新**。這是一條鐵律。

1.  **邏輯變更 (Logic Change)**:
    *   若修改了 `Logic.gs` (例如計算公式調整)，必須同步更新 `tests/logic.test.js` 與 `tests/aggregation.test.js`。
    *   **嚴格禁止**只改邏輯不改測試，這會導致未來的回歸錯誤 (Regression)。
2.  **E2E 對齊 (UI Alignment)**:
    *   當 UI 結構改變 (例如按鈕 ID 變更、新增功能) 時，請務必立即修訂 `tests/e2e` 內的 Selector 與流程。
    *   E2E 測試必須反映該功能「真實使用者的操作路徑」。
3.  **完成定義 (Definition of Done)**:
    *   PR 送出前，必須確認 `npm test` 與 `npm run test:e2e` 全數通過。
    *   新功能需包含應有的測試覆蓋。

---

## 3. 分支策略 (Git Branching)

我們採用簡化版的 **GitHub Flow** 搭配 **Conventional Commits**。

### A. 主分支保護
*   **`main`**: 隨時可部署的穩定版本 (Production)。**禁止直接 Commit**，必須透過 PR 合併。

### B. Commit 規範
訊息格式：`type(scope): description`

*   **`feat`**: 新功能 (Feature)
*   **`fix`**: 修復 Bug
*   **`docs`**: 文件修改
*   **`style`**: 格式調整 (不影響邏輯)
*   **`refactor`**: 重構 (無新功能或 Bug 修復)
*   **`test`**: 增加或修改測試
*   **`chore`**: 建置過程或輔助工具變更 (如 npm, clasp)

範例：
`feat(loan): 新增信貸試算精靈`
`fix(logic): 修正空字串導致的計算錯誤`

---

## 4. 自動化部署 (CI/CD)

專案包含 GitHub Actions (`.github/workflows/deploy.yml`)。
當 `main` 分支有更新時，會自動觸發 `clasp push` 部署至 GAS。

**設定需求**:
需至 GitHub Repository 的 **Settings > Secrets** 設定以下變數：
*   `CLASP_SECRET`: 您的 `~/.clasprc.json` 內容 (JSON String)。

---

## 5. 專案潔癖與清理協議 (Project Hygiene Protocol)

維持專案乾淨是工程師的職責。每次開發週期結束 (或切換任務前)，請執行以下動作：

**「離場淨空 (Clean Exit) 原則」**：任何修改、調試或重構後，必須還原現場：

1.  **刪除暫存檔案**: 移除所有 `*.log`, `crash_report.txt`, `temp_*` 等運行過程中產生的垃圾檔案。
2.  **清理已註解代碼**: 嚴格移除 Dead Code、除錯用的 `console.log` (除非必要) 及廢棄的變數與 Import。
3.  **文件一致性**: 確認根目錄說明檔 (`README.md`, `DEVELOPMENT.md`) 與實際程式行為保持一致。
4.  **目錄整潔**: 確保根目錄僅保留必要的設定檔，垃圾請進 `archive/` 或直接刪除。

---
**文件維護者**: Ops Agent
**最後更新**: 2025-12-16
