# ROADMAP.md

## 資產管理程式 (Asset Manager) - 專案發展藍圖

本文件記錄了專案的未來開發計畫、功能構想與技術優化目標。

---

# ? 功能規格撰寫流程 (Feature Specification Process)

在開發任何新功能前，請依循以下規格範本，以確保架構完整並符合需求：

1.  **核心目標 (Objective)**
    *   這項功能解決了什麼問題？
    *   期望的成效是什麼？(例如：節省時間、降低錯誤、提升決策品質)

2.  **使用者流程 (User Flow)**
    *   使用者如何進入此功能？
    *   操作步驟為何？(Step-by-step)
    *   輸入是什麼？輸出是什麼？

3.  **介面設計 (UI/UX)**
    *   需要新增哪些 UI 元件？(按鈕、輸入框、圖表)
    *   版面如何配置？(Desktop vs Mobile)
    *   互動回饋是什麼？(Loading 狀態、錯誤提示、成功訊息)

4.  **資料與邏輯 (Data & Logic)**
    *   資料來源為何？(現有庫存、外部 API、使用者輸入)
    *   需要儲存哪些資料？存去哪裡？(Properties Service, Spreadsheet, LocalStorage)
    *   核心演算法或計算邏輯為何？

5.  **技術限制 (Constraints)**
    *   GAS 環境限制 (執行時間、Quota、觸發器頻率)
    *   前端相容性 (瀏覽器支援度、RWD)
    *   是否涉及外部 API 頻率限制？

6.  **驗收標準 (Acceptance Criteria)**
    *   功能完成的定義是什麼？
    *   哪些邊界情境 (Edge Cases) 需要測試？

7.  **效能與重構 (Performance & Refactoring)**
    *   邏輯是否可讀、可擴展？(變數命名、函式拆分)
    *   是否造成效能瓶頸？(大量迴圈 API 呼叫、過多 DOM 操作)
    *   是否需要重構舊有代碼以支援新功能？

---

# ? 專案發展藍圖 (Roadmap)

## ? 核心功能擴充 (Core Features)

### 1. 智慧再平衡計算機 (Smart Rebalancing Calculator) ? **(Priority: High)**
*   **1. 核心目標 (Objective)**
    *   協助用戶將投資組合比例自動校正回預設目標比例。
    *   降低使用者手動計算配置的複雜度，直觀顯示操作建議。
*   **2. 使用者流程 (User Flow)**
    *   進入「資產」頁面 -> 點擊「再平衡計算」 -> 設定目標權重 (Target %) -> 系統計算差額 -> 顯示買賣建議。
*   **3. 介面設計 (UI/UX)**
    *   **權重設定**: 每個資產一張卡片，包含滑桿 (Slider) 與輸入框。
    *   **直覺回饋**: 當權重總和不等於 100% 時，顯示紅字警告。
    *   **買賣清單**: 清單顯示「建議買入/賣出」的股數與金額。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **來源**: `getInventoryMap` 取得現有庫存。
    *   **邏輯**: `目標金額 = 總資產 * 目標%`，`建議金額 = 目標金額 - 現有金額`。
    *   **儲存**: 使用 `localStorage` 儲存使用者的目標配置設定 (`rebalance_cfg`)。
*   **5. 技術限制 (Constraints)**
    *   資金不足時，暫不考慮借貸買入。
    *   需處理零股/整股交易限制。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   權重總和非 100% 時禁止計算。
    *   買賣建議金額加總正確 (淨資金投入/產出)。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   前端即時計算 (Client-side calculation)，無須回傳後端，確保流暢度。

### 2. 股息與現金流儀表板 (Dividend Dashboard)
*   **1. 核心目標 (Objective)**
    *   具體呈現被動收入狀況，提升存股動力。
    *   計算投入資產的「殖利率 (Yield on Cost)」。
*   **2. 使用者流程 (User Flow)**
    *   看版首頁 -> 切換「現金流分析」 -> 檢視月/年平均股息分配。
*   **3. 介面設計 (UI/UX)**
    *   **長條圖**: 顯示每月/每季股息收入。
    *   **KPI 卡片**: 顯示「預估年殖利率」、「已領取總股息」。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **來源**: 篩選交易紀錄中 `Type = 'Dividend'` 的資料。
    *   **邏輯**: `Yield on Cost = 總配息金額 / 總投入成本`。
*   **5. 技術限制 (Constraints)**
    *   需確認 Chart.js 是否支援所需的圖表類型。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   配息統計與 Log 紀錄完全一致。
    *   不同幣別 (USD/TWD) 需正確換算總計。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   若資料量過大，需在後端預先聚合運算 (Aggregation) 再回傳前端。

### 3. 自選觀察清單 (Watchlist)
*   **1. 核心目標 (Objective)**
    *   隨時關注有興趣的標的。
    *   快速查看標的與現有部位的比較。
*   **2. 使用者流程 (User Flow)**
    *   點選「新增觀察」 -> 輸入代號 -> 列表顯示即時價格與漲跌幅。
*   **3. 介面設計 (UI/UX)**
    *   簡潔列表，包含：名稱、現價、漲跌幅、到價提醒。
    *   支援拖拉排序。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **來源**: 與現有市價來源共用 (Binance/Yahoo/Cnyes)。
    *   **儲存**: `UserProperties` 或 `localStorage` 儲存觀察清單代號。
*   **5. 技術限制 (Constraints)**
    *   外部 API 呼叫速率限制 (Rate Limiting)。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   新增無效代碼時需有錯誤提示。
    *   清單更新延遲需在可接受範圍 (<10s)。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   需做批次查詢優化 (Batch Fetching) 以節省 API 呼叫次數。

### 4. 批次匯入功能 (CSV Import)
*   **1. 核心目標 (Objective)**
    *   大幅減少初次建檔或定期整理的時間成本。
    *   降低手動輸入錯誤。
*   **2. 使用者流程 (User Flow)**
    *   設定頁面 -> 點選「匯入」 -> 貼上 CSV 文字 -> 預覽解析結果 -> 確認匯入。
*   **3. 介面設計 (UI/UX)**
    *   大區塊文字輸入框 (Textarea)。
    *   解析結果預覽表 (包含狀態：成功/失敗/警告)。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **解析器**: 針對常見券商 (e.g., Firstrade, 永豐) 撰寫 Regex 解析規則。
    *   **驗證**: 欄位 (日期+代號+金額) 判斷是否為有效數據。
*   **5. 技術限制 (Constraints)**
    *   各券商格式不一，需保留擴充彈性。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   能正確解析標準 CSV 格式。
    *   匯入格式錯誤時不會崩潰，並標示錯誤行數。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   寫入 Spreadsheet 時應使用 `setValues` 進行批次寫入，取代迴圈 `appendRow`。

### 5. 簡易收支/現金流管理 (Simple Expense Tracking)
*   **1. 核心目標 (Objective)**
    *   區分「本業收入」與「資本利得」。
    *   計算真實的投資報酬率 (MWRR/TWRR)。
*   **2. 使用者流程 (User Flow)**
    *   新增交易 -> 類別選「入金(Deposit)」或「出金(Withdraw)」。
*   **3. 介面設計 (UI/UX)**
    *   在交易紀錄的「動作」下拉選單增加選項。
    *   看版增加「淨入金」顯示。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **邏輯**: `淨資產 = 成本 + 損益` -> `損益 = 淨資產 - 成本`。
*   **5. 技術限制 (Constraints)**
    *   需處理多幣別問題 (入金 USD vs TWD)。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   入金後，總資產增加但損益顯示不變。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   調整 `getInventoryMap` 邏輯以包含現金流計算。

---

## ?? 技術優化與重構 (Technical Improvements)

### 1. 資產歷史快照 (Snapshotting)
*   **1. 核心目標 (Objective)**
    *   解決交易紀錄隨時間增加導致計算變慢的問題。
    *   將歷史計算結果鎖定。
*   **2. 使用者流程 (User Flow)**
    *   (背景執行) 每月 1 號自動觸發 Trigger 建立快照。
    *   使用者無感，僅感受到速度變快。
*   **3. 介面設計 (UI/UX)**
    *   無前端介面，視需在後台 Log 顯示執行結果。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **儲存**: 建立專屬 Sheet `_Snapshot`，格式：`Date, Ticker, Qty, Cost`。
    *   **邏輯**: `Current Inventory = Snapshot + Transactions(after snapshot date)`。
*   **5. 技術限制 (Constraints)**
    *   GAS Trigger 執行時間限制 (6 min)。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   快照後計算結果需與全量計算完全一致。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   大幅簡化 `getInventoryMap` 需遍歷的資料量。

### 2. 已實現損益精確化
*   **1. 核心目標 (Objective)**
    *   精確計算賣出當下的已實現損益。
*   **2. 使用者流程 (User Flow)**
    *   賣出股票時，自動帶入庫存「平均成本」做為參考，或允許手動修正。
*   **3. 介面設計 (UI/UX)**
    *   賣出視窗增加「成本」欄位 (預設隱藏，可展開)。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **匯率**: 需紀錄買入與賣出當下的 `USD/TWD`。
    *   **邏輯**: `Realized PnL (TWD) = (Sell Price * Sell FX) - (Buy Price * Buy FX)`。
*   **5. 技術限制 (Constraints)**
    *   歷史匯率 API 取得可能需付費。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   賣出後剩餘庫存成本不變，已實現損益可被追溯。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   需對資料進行先進先出 (FIFO) 或平均成本法 (Avg Cost) 運算。

### 3. 容錯與備援機制 (Fallback Mechanism)
*   **1. 核心目標 (Objective)**
    *   當某個報價來源失效時，避免整個儀表板崩潰或顯示零值。
*   **2. 使用者流程 (User Flow)**
    *   主來源無回應時，系統自動切換備援，使用者僅看到「資料來源：備援」提示。
*   **3. 介面設計 (UI/UX)**
    *   價格欄位顯示小黃點或提示來源 (一般/舊資料)。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **邏輯**: `Try Source A -> Catch Error -> Try Source B -> Catch Error -> Return Last Known Price`。
*   **5. 技術限制 (Constraints)**
    *   會增加 API 請求等待時間。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   斷開主要 API 連線時，系統仍能顯示數據。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   封裝統一的 `PriceService` 來集中處理所有報價請求。

### 4. 寫入後快取機制 (Write-Behind Caching)
*   **1. 核心目標 (Objective)**
    *   解決 GAS Serverless 環境下資料持久化造成的 1.5s 延遲體感。
    *   實現「秒級回應、非同步存檔」。
*   **2. 使用者流程 (User Flow)**
    *   使用者按下儲存 -> 介面立即顯示成功 (0.1s) -> 背景 Trigger 默默將資料寫入 Sheet。
*   **3. 技術實作 (Tech Spec)**
    *   **L2 Cache**: 先寫入 `CacheService` (TTL 10 mins)。
    *   **Worker**: 設置每分鐘 Trigger 檢查 Cache 是否有 Dirty Data，若有則批次寫入 Sheet。
*   **4. 風險評估 (Risk)**
    *   若 CacheService 在 Trigger 啟動前失效，資料將遺失。需評估此風險與 UX 的權衡。
