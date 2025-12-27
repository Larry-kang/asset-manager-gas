# Project Memory (長期記憶)

> [!NOTE]
> 此文件由 Doc Writer 維護，記錄專案的關鍵決策、技術與業務教訓。
> 每次新任務開始前，所有 Agent 務必閱讀此文件。

## 基本資訊
- **專案名稱**: Asset Manager (GAS)
- **核心技術**: Google Apps Script (Backend), HTML/CSS/JS (Frontend), Playwright (E2E Test)
- **架構模式**: Server-Side MVC (Code.gs 路由 + HTML Template)
- **資料儲存**: GasStore (可能基於 Google Sheets 或 PropertiesService 的自製存儲方案)

## 記憶條目

### #001 - Agent Team Onboarding (2025-12-27)
- **決策**: 引入 Agent Team Architecture，建立 `.agent/` 目錄結構。
- **規範**: 嚴格遵守 `team-protocols.md`，包含繁體中文輸出、Quality Score 與 Proposal 機制。
- **現狀**: 專案已具備 `start.ps1` 與 E2E 測試，符合「交付即用」原則。

### #002 - 開發環境
- **Clasp**: 使用 Google Clasp 進行代碼同步。
- **Testing**: 使用 Playwright 進行 E2E 測試。
- **Portability**: 需確保 `start.ps1` 能在 Windows 環境下順利執行測試與部署流程。
