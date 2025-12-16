# 系統功能詳解 (System Features Specification)

本文件詳細列出「資產管理系統 (Asset Manager)」目前的已完成功能與技術特點。

## 1. 核心資產管理 (Core Asset Management)

### A. 多資產支援 (Multi-Asset Support)
*   **股票 (Stock)**: 支援台股 (TWD) 與美股 (USD)。
*   **加密貨幣 (Crypto)**: 支援 BTC, ETH, USDT/USDC 等資產。
*   **現金 (Cash)**: 支援多幣別現金部位管理。

### B. 庫存與損益 (Inventory & PnL)
*   **即時庫存計算**: 透過 `Logic.getInventoryMap` 自動計算買賣後的剩餘庫存。
*   **損益分析**: 自動計算持有部位的市值 (Market Value)、未實現損益 (Unrealized PnL) 與報酬率 (ROI)。
*   **匯率換算**: 系統內建匯率轉換邏輯 (`Logic.processMarketData`)，可統一以 TWD 或 USD 檢視總資產。

---

## 2. 借貸與風險金庫 (Loan Vault & Risk Management)

### A. 多協議支援 (Multi-Protocol Loans)
系統支援三種不同類型的借貸協議，並針對每種協議實作了專屬的風險計算邏輯 (`RiskCalculator`):

| 協議類型 | 範例平台 | 風險指標 (Risk Indicator) | 狀態級距 (Status) |
| :--- | :--- | :--- | :--- |
| **股票質押** | 永豐 (Sinopac) | **維持率 (Maintenance Ratio)** | Safe (>140%), Warning (<140%), Danger (<130%) |
| **DeFi 借貸** | AAVE | **健康因子 (Health Factor)** | Safe (>1.1), Warning (<1.1), Danger (<1.0) |
| **信用貸款** | Line Bank | **還款進度 (Repayment)** | 僅顯示期數與餘額 (Info) |

### B. 視覺化儀表板 (Visual Vault)
*   **風險卡片 (Risk Cards)**: 每個貸款倉位顯示為獨立卡片，包含債務金額、抵押品價值與風險指標。
*   **健康條 (Health Bar)**: 依照風險數值動態顯示顏色 (綠/黃/紅) 與進度條，直觀呈現爆倉距離。
*   **操作中心**: 直接在卡片上執行「還款 (Repay)」、「補抵押 (Add Collateral)」或「增貸 (Increase Loan)」。

### C. 智慧申貸精靈 (Smart Loan Wizard)
*   提供逐步式 UI (Stepper) 引導使用者建立新貸款。
*   自動過濾可用庫存 (Available Inventory) 作為抵押品。

---

## 3. 使用者介面與體驗 (UI/UX)

### A. 現代化設計 (Modern Design)
*   **深色模式 (Dark Mode)**: 預設採用高對比深色主題 (Gold/Dark Gray)，符合金融操作情境。
*   **響應式佈局 (Responsive)**: 支援 Desktop 與 Mobile 瀏覽，Sidebar 自動適配。

### B. 個人化設定 (Personalization)
*   **幣別切換**: 頂部一鍵切換 `TWD` / `USD` 顯示模式，所有資產數值即時重算。
*   **國際化 (i18n)**: 完整支援 `繁體中文` 與 `English` 介面切換。

---

## 4. 資料持久化與儲存 (Data Persistence & Storage)

### A. 混合儲存策略 (Hybrid Storage Strategy)
*   **關聯式資料 (Relational Data)**: 使用 Google Sheets 作為核心資料庫，透過 `Repository.gs` 實現 Schema Mapping。
    *   `交易紀錄 (Log)`: 紀錄每一筆買賣歷史。
    *   `借貸流水帳 (LoanActions)`: 採用 Event Sourcing 模式紀錄借貸操作 (`OPEN`, `BORROW`, `REPAY`)，支援歷史回溯。
*   **鍵值快取 (Key-Value Store)**: 內建 `GasStore` 引擎 (Redis-like)。
    *   **L1/L2/L3 架構**: Memory -> CacheService -> Google Sheets (`_DB_STORE`)。
    *   **效能優化**: 支援 Batch Commit 與 Local Cache，大幅減少 Google Sheets API 呼叫次數。
    *   **安全性**: 實作簡單加密與 HMAC 簽章驗證，保護敏感配置。

### B. 自動化與排程 (Automation & Scheduling)
*   **GAS Triggers**: 使用 `Triggers.gs` 管理所有背景任務，取代傳統 Cron Job。
    *   **每日結算**: 每日 23:00 自動執行 `trigger_RecordDailyHistory`，紀錄淨值/總資產/總負債。
    *   **市價同步**: 每小時自動執行 `trigger_UpdateMarketData`，確保儀表板價格不過期。
*   **非同步架構潛力**: 雖無使用 MQ (Message Queue)，但已具備基礎的排程能力，足以應付單人使用的資產更新需求。

## 5. 技術架構與開發者體驗 (Tech & DX)

### A. 混合架構 (Hybrid Architecture)
*   **Frontend**: 純 HTML/CSS/JS (Vanilla)，無須編譯即可部署至 Google Apps Script。
*   **Backend**: Google Apps Script (GAS) 處理業務邏輯與試算表存取。
*   **Local Dev**: 透過 `tests/server.js` 模擬 GAS 環境，支援本地 `localhost` 開發與測試。

### B. 測試驅動 (Test-Driven)
*   **Unit Tests**: 使用 `Jest` 覆蓋 100% 核心邏輯 (`Logic.gs`) 與資料存取 (`Repository.gs`)。
*   **E2E Tests**: 使用 `Playwright` 模擬真實使用者操作，驗證 UI 流程 (Dashboard -> Loan -> Settings)。
*   **Strict Encoding**: 特別針對中文字串 (如「維持率」) 實施嚴格編碼檢查，杜絕亂碼問題。

### C. 自動化腳本 (Automation)
*   **一鍵啟動**: `npm start` (或 `start.ps1`) 可直接啟動本地伺服器與瀏覽器。
*   **品質閘門**: 嚴格的「測試同步協議」確保每次變更皆有測試保護。

---

**文件產生時間**: 2025-12-16
**版本**: v1.1.0-stable
