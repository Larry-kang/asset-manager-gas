/**
 * ROADMAP.md
 * 
 * 資產管家 (Asset Manager) - 未來發展藍圖
 * 
 * 本文件記錄了專案的未來開發方向、功能構想與技術優化目標。
 * 
 * ======================================================================================
 * 
# ? 功能規格思考流程 (Feature Specification Process)

在開發任何新功能之前，請依序思考以下六個維度，以確保規格完整且可行：

1.  **核心目標 (Objective)**
    *   這個功能解決了什麼問題？
    *   預期的效益是什麼？（例如：節省時間、減少錯誤、提供決策依據）

2.  **使用者流程 (User Flow)**
    *   使用者如何進入此功能？
    *   操作步驟為何？（Step-by-step）
    *   輸入是什麼？輸出是什麼？

3.  **介面設計 (UI/UX)**
    *   需要哪些 UI 元件？（按鈕、輸入框、圖表、列表）
    *   版面如何配置？（Desktop vs Mobile）
    *   互動回饋是什麼？（Loading 狀態、錯誤訊息、成功提示）

4.  **資料與邏輯 (Data & Logic)**
    *   資料來源為何？（現有庫存、外部 API、使用者輸入）
    *   需要儲存哪些資料？存去哪裡？（Properties Service, Spreadsheet, LocalStorage）
    *   核心演算法或計算邏輯為何？

5.  **技術限制 (Constraints)**
    *   GAS 的限制（執行時間、配額、觸發限制）？
    *   前端限制（瀏覽器相容性、RWD）？
    *   是否有外部依賴風險？

6.  **驗收標準 (Acceptance Criteria)**
    *   功能完成的定義是什麼？
    *   有哪些邊界情況 (Edge Cases) 需要測試？

7.  **效能與重構 (Performance & Refactoring)**
    *   程式碼是否可讀、模組化？（變數命名、函式拆分）
    *   是否有潛在的效能瓶頸？（例如：迴圈內的 API 呼叫、大量 DOM 操作）
    *   是否需要重構既有程式碼以支援新功能？

---

# ? 未來發展藍圖 (Roadmap)

## ? 核心功能擴充 (Core Features)

### 1. 智慧再平衡計算機 (Smart Rebalancing Calculator) ? **(Priority: High)**
*   **1. 核心目標 (Objective)**
    *   將系統從「被動記帳」升級為「主動決策」工具。
    *   協助使用者維持資產配置紀律，減少情緒操作。
*   **2. 使用者流程 (User Flow)**
    *   進入「再平衡」頁籤 -> 勾選參與再平衡的資產 -> 設定目標權重 (Target %) -> 系統計算偏差 -> 顯示建議買賣金額。
*   **3. 介面設計 (UI/UX)**
    *   **卡片式介面**：每個資產一張卡片，包含滑桿 (Slider) 與輸入框。
    *   **視覺告警**：偏離度超過閾值時，卡片邊框變色 (黃/紅)。
    *   **總和檢核**：底部顯示目前權重總和，若非 100% 顯示警告。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **來源**：`getInventoryMap` 取得現有市值。
    *   **邏輯**：`目標金額 = 總資產 * 目標%`，`建議交易額 = 目標金額 - 現有市值`。
    *   **儲存**：使用 `localStorage` 儲存使用者的目標配置設定 (`rebalance_cfg`)。
*   **5. 技術限制 (Constraints)**
    *   手機版面空間有限，滑桿需易於觸控。
    *   需處理浮點數運算誤差。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   權重總和必須為 100% 才能儲存。
    *   建議買賣金額計算正確（正數買入、負數賣出）。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   前端即時計算 (Client-side calculation)，不需回傳後端，確保流暢度。

### 2. 配息與被動收入儀表板 (Dividend Dashboard)
*   **1. 核心目標 (Objective)**
    *   視覺化現金流成長，提升存股動力。
    *   分析各資產的真實殖利率 (Yield on Cost)。
*   **2. 使用者流程 (User Flow)**
    *   看板頁面 -> 切換「配息視圖」 -> 查看月度/年度圖表與明細。
*   **3. 介面設計 (UI/UX)**
    *   **柱狀圖**：顯示每月/每季配息金額堆疊。
    *   **KPI 卡片**：顯示「預估年化股息」、「平均殖利率」。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **來源**：篩選交易紀錄中 `Type = 'Dividend'` 的資料。
    *   **邏輯**：`Yield on Cost = 累積股息 / 總投入成本`。
*   **5. 技術限制 (Constraints)**
    *   需確認 Chart.js 是否支援所需的圖表類型。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   股息統計需與券商對帳單一致。
    *   不同幣別 (USD/TWD) 需正確換算匯總。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   若交易紀錄過多，需在後端預先做聚合運算 (Aggregation) 再傳回前端。

### 3. 觀察清單 (Watchlist)
*   **1. 核心目標 (Objective)**
    *   追蹤感興趣但尚未持有的標的。
    *   快速比較潛在標的與現有持倉的表現。
*   **2. 使用者流程 (User Flow)**
    *   點擊「新增觀察」 -> 輸入代號 -> 列表顯示即時報價與漲跌幅。
*   **3. 介面設計 (UI/UX)**
    *   簡潔列表，包含：代號、現價、漲跌幅、距高點跌幅。
    *   支援拖拉排序。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **來源**：共用現有的報價爬蟲 (Binance/Yahoo/Cnyes)。
    *   **儲存**：`UserProperties` 或 `localStorage` 儲存觀察清單代號。
*   **5. 技術限制 (Constraints)**
    *   外部 API 呼叫頻率限制 (Rate Limiting)。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   新增無效代號時需有錯誤提示。
    *   報價更新延遲需在可接受範圍 (<10s)。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   需實作批次報價查詢 (Batch Fetching) 以減少 API 呼叫次數。

### 4. 批次匯入功能 (CSV Import)
*   **1. 核心目標 (Objective)**
    *   大幅降低初始建檔與定期維護的時間成本。
    *   減少手動輸入錯誤。
*   **2. 使用者流程 (User Flow)**
    *   交易頁面 -> 點擊「匯入」 -> 貼上 CSV 文字 -> 預覽解析結果 -> 確認匯入。
*   **3. 介面設計 (UI/UX)**
    *   大範圍文字輸入框 (Textarea)。
    *   解析結果預覽表格 (包含狀態：成功/失敗/重複)。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **解析器**：針對常見券商 (e.g., Firstrade, 永豐) 撰寫 Regex 解析規則。
    *   **防重**：依據 (日期+代號+金額) 判斷是否為重複交易。
*   **5. 技術限制 (Constraints)**
    *   不同券商格式差異大，需保留擴充彈性。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   能正確解析標準 CSV 格式。
    *   遇到格式錯誤時不會讓程式崩潰，並提示錯誤行數。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   寫入 Spreadsheet 時必須使用 `setValues` 進行批次寫入，禁止迴圈內 `appendRow`。

### 5. 現金流/預算管理 (Simple Expense Tracking)
*   **1. 核心目標 (Objective)**
    *   區分「本金投入」與「資本利得」。
    *   計算精確的投資報酬率 (MWRR/TWRR)。
*   **2. 使用者流程 (User Flow)**
    *   新增交易 -> 類別選擇「入金(Deposit)」或「出金(Withdraw)」。
*   **3. 介面設計 (UI/UX)**
    *   在交易表單的「動作」下拉選單增加選項。
    *   看板增加「淨投入本金」指標。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **邏輯**：`淨資產 = 本金 + 損益` -> `損益 = 淨資產 - 本金`。
*   **5. 技術限制 (Constraints)**
    *   需處理幣別換算問題 (入金 USD vs TWD)。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   入金後，總資產增加但損益不變。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   調整 `getInventoryMap` 邏輯以包含現金流計算。

---

## ?? 技術優化方向 (Technical Improvements)

### 1. 效能優化：快照機制 (Snapshotting)
*   **1. 核心目標 (Objective)**
    *   解決交易紀錄隨時間增長導致計算變慢的問題。
    *   將載入時間維持在 3 秒內。
*   **2. 使用者流程 (User Flow)**
    *   (背景執行) 每月 1 號自動觸發 Trigger 執行快照。
    *   使用者無感，但開啟速度變快。
*   **3. 介面設計 (UI/UX)**
    *   無前端介面，僅需在後台 Log 顯示執行結果。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **儲存**：建立隱藏 Sheet `_Snapshot`，欄位：`Date, Ticker, Qty, Cost`。
    *   **邏輯**：`Current Inventory = Snapshot + Transactions(after snapshot date)`。
*   **5. 技術限制 (Constraints)**
    *   GAS Trigger 執行時間限制 (6 min)。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   快照後計算結果需與全量計算完全一致。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   大幅減少 `getInventoryMap` 需遍歷的列數。

### 2. 歷史匯率精確化
*   **1. 核心目標 (Objective)**
    *   提供更精確的台幣本位損益計算。
*   **2. 使用者流程 (User Flow)**
    *   輸入交易時，自動帶入當日匯率（若有 API），或允許手動修正。
*   **3. 介面設計 (UI/UX)**
    *   交易表單增加「匯率」欄位 (預設隱藏，進階展開)。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **來源**：記錄每筆交易當下的 `USD/TWD`。
    *   **邏輯**：`Realized PnL (TWD) = (Sell Price * Sell FX) - (Buy Price * Buy FX)`。
*   **5. 技術限制 (Constraints)**
    *   歷史匯率 API 取得不易或需付費。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   已實現損益不再受當前匯率波動影響。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   需對舊資料進行一次性清洗或標記預設匯率。

### 3. 錯誤處理邊界 (Fallback Mechanism)
*   **1. 核心目標 (Objective)**
    *   提升系統穩定性，避免單一資料源掛點導致全站癱瘓。
*   **2. 使用者流程 (User Flow)**
    *   當主來源失敗時，系統自動切換備援，使用者僅看到「資料來源：備援」的提示。
*   **3. 介面設計 (UI/UX)**
    *   報價旁顯示小圖示標示來源狀態 (綠燈/黃燈)。
*   **4. 資料與邏輯 (Data & Logic)**
    *   **邏輯**：`Try Source A -> Catch Error -> Try Source B -> Catch Error -> Return Last Known Price`。
*   **5. 技術限制 (Constraints)**
    *   會增加 API 請求的延遲時間。
*   **6. 驗收標準 (Acceptance Criteria)**
    *   模擬斷網或 API 錯誤時，系統仍能顯示報價。
*   **7. 效能與重構 (Performance & Refactoring)**
    *   封裝統一的 `PriceService` 類別來處理所有報價請求。

 * 
 * ======================================================================================
 */

function getRoadmap() {
  return "請查看此檔案的原始碼註解以閱讀完整文件。";
}
