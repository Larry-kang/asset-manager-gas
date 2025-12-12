# 專案藍圖 (Project Roadmap)

本文件追蹤 **資產管理程式 (Asset Manager)** 的開發進程與未來規劃。
所有開發流程採 **全自動代理模式 (Agentic Workflow)** 執行。

---

## ? Phase 1: 現代化基礎建設 (Modernization) - Completed
已於 2025/12 完成，建立穩固的開發地基。

- [x] **前端架構重構 (Architecture Refactor)**
    - 遷移至 **Vue 3 (Composition API)**。
    - 建立組件化架構 (Dashboard, Vault, Holdings)。
    - 實現響應式設計 (RWD) 與深色模式 (Dark Mode)。
- [x] **DevOps 自動化 (CI/CD)**
    - 建立 **GitHub Actions** 部署流程。
    - 解決敏感資料 (`.clasprc.json`) 安全注入與格式標準化問題。
    - 實現 Push-to-Deploy (一鍵上線)。
- [x] **品質保證 (Quality Assurance)**
    - **後端測試**: Jest 測試 GAS 商業邏輯 (`Logic.gs`)。
    - **前端測試**: Playwright 整合測試 (E2E)。
    - 建立 `mock_api.js` 與本地開發環境。

---

## ? Phase 2: 核心帳務功能 (Core Financials) - Next Priority
目標：完善資金流向紀錄，從「靜態資產快照」進化為「動態帳本」。

- [ ] **交易紀錄與現金流 (Transaction Management)**
    - **入金 (Deposit)**: 紀錄外部資金流入 (薪資、儲蓄)。
    - **出金 (Withdraw)**: 紀錄資金流出 (生活費、大額消費)。
    - **配息 (Dividend)**: 紀錄現金股利收入。
    - **資料庫更新**: 擴充 Google Sheets 欄位以支援現金流標記。

---

## ? Phase 3: 進階資產管理 (Portfolio Management)
目標：提供投資決策輔助與風險控管。

- [ ] **投資組合再平衡 (Rebalancing)**
    - **目標設定**: 設定理想資產配置 (例如: 股票 60% / 債券 40%)。
    - **偏差監控**: 計算當前配置與目標的乖離率。
    - **交易建議**: 自動計算需買賣的股數/金額。
- [ ] **績效分析報表 (Analytics)**
    - **每日損益 (Daily P&L)**: 追蹤每日資產變化。
    - **淨值走勢圖**: 視覺化資產成長曲線 (Chart.js)。

---

## ?? 開發協議 (Development Protocol)
1.  **Requirement**: 用戶提出需求 (Option A/B)。
2.  **Execution**: Agent 全自動執行 (Code -> Test -> Deploy)。
3.  **Report**: Agent 交付結案報告與測試證明。
