/**
 * Spec_Current_v3.1.1.gs
 * 
 * 系統規格書：資產管家 (Asset Manager) v3.1.1
 * 
 * 本文件詳細記錄了目前系統的架構、介面樣式、資料邏輯與互動流程。
 * 可用於 AI 輔助開發或系統復刻。
 * 
 * ======================================================================================
 * 
 * 1. 系統架構 (System Architecture)
 *    - [平台]：Google Apps Script (GAS) Web App
 *    - [前端]：HTML5, CSS3 (Flex/Grid), Vanilla JS (ES6+)
 *    - [後端]：GAS (.gs), Google Sheets (Database)
 *    - [外部庫]：Chart.js (CDN)
 * 
 * 2. 介面設計 (UI Design)
 * 
 *    2.1 色彩系統 (Color System) - CSS Variables
 *        - [Light Theme]:
 *          --primary: #2c3e50 (深藍灰)
 *          --bg: #f4f7f6 (淺灰背景)
 *          --card-bg: #ffffff (白卡片)
 *          --text-main: #333333
 *          --text-sub: #666666
 *          --border: #eeeeee
 *          --metric-bg: #f8f9fa
 *          --green: #27ae60, --red: #e74c3c, --blue: #3498db, --yellow: #f1c40f
 *        - [Dark Theme]:
 *          --primary: #34495e
 *          --bg: #121212
 *          --card-bg: #1e1e1e
 *          --text-main: #e0e0e0
 * 
 *    2.2 佈局結構 (Layout)
 *        - [Container]: max-width: 800px, centered.
 *        - [Navigation]: 頂部橫向捲動選單 (資產看板, 交易登錄, 負債管理).
 *        - [Views]: 單頁應用 (SPA) 切換，隱藏/顯示 `<div class="view">`.
 *        - [Cards]: 圓角 16px, 陰影, padding 20px.
 *        - [Grid]: 2欄佈局 (grid-template-columns: 1fr 1fr).
 * 
 * 3. 功能模組 (Modules)
 * 
 *    3.1 資產看板 (Dashboard) - #dash
 *        - [Header]: 強制更新按鈕, 幣別切換 (TWD/USD).
 *        - [Metrics]: 淨資產, 總資產 (大字體顯示).
 *        - [Charts]: 圓餅圖 (Pie), 折線圖 (Line) - 使用 Chart.js.
 *        - [Holdings]: 持倉明細列表 (代號, 數量, 現價, 損益).
 *          - 損益顏色: TWD模式(紅漲綠跌), USD模式(綠漲紅跌).
 * 
 *    3.2 交易登錄 (Transaction) - #tx
 *        - [Form]: 日期, 動作(買入/賣出/配息), 類別(股票/加密/現金), 代號, 數量, 單價, 幣別.
 *        - [Input]: 代號欄位支援 Datalist (`tickerList`) 自動完成.
 *        - [Recent List]: 顯示最近 10 筆交易，支援「修改」與「刪除」.
 * 
 *    3.3 負債管理 (Loan Manager) - #loan
 *        - [Form]: 建立借貸合約 (股票質押/加密借貸/信貸).
 *        - [Collateral]: 抵押品選單 (`<select>`) 自動帶入庫存數量.
 *        - [Contract List]: 顯示合約卡片，包含維持率/LTV 計算.
 *        - [Actions]: 補繳保證金, 贖回/還款 (彈出 Modal).
 * 
 *    3.4 互動視窗 (Modals)
 *        - [Action Modal]: 處理合約操作 (金額, 數量).
 *        - [Message Modal]: 顯示 成功/失敗 訊息 (Icon + Title + Body).
 *        - [Confirm Modal]: 危險操作確認 (如刪除).
 * 
 * 4. 資料邏輯 (Data Logic)
 * 
 *    4.1 前端狀態 (Store)
 *        - currency: 'TWD' | 'USD'
 *        - fx: 匯率 (預設 32.5)
 *        - inventory: { Ticker: Qty } 對照表
 *        - theme: 'light' | 'dark'
 * 
 *    4.2 關鍵函式 (Key Functions)
 *        - `render(payload)`: 接收後端資料並更新所有 UI.
 *        - `updateInventorySelects(type)`: 根據庫存動態產生 `<select>` 選項 (過濾掉數量<=0).
 *        - `formatMoney(val)`: 根據 Store.currency 格式化金額.
 * 
 *    4.3 後端資料結構 (Backend)
 *        - [Sheet: 交易紀錄]: Date, Type, Ticker, Qty, Price, Currency...
 *        - [Sheet: MarketData]: 儲存報價快照.
 *        - [API]: `getDashboardData(force)` 回傳完整 JSON.
 * 
 * 5. 特殊處理 (Special Handling)
 *    - [Mobile Support]: 使用 Native `<select>` 取代 `<input list>` 以優化手機體驗.
 *    - [Error Handling]: `try-catch` 包裹渲染邏輯，錯誤時顯示 Modal + Console Log.
 *    - [Logging]: 前端虛擬 Console (`#devConsole`) 顯示系統日誌.
 * 
 * ======================================================================================
 */

function getSpecCurrent() {
  return "請查看此檔案的原始碼註解以閱讀完整規格。";
}
