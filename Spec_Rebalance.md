# Spec_Rebalance.md

## 施工規格書：智慧再平衡計算機 (Smart Rebalancing Calculator)

### 1. 核心目標 (Objective)
- 提供一個「封閉式」的資產配置調整工具。
- 協助使用者將選定的資產組合恢復到預設比例。

### 2. 使用者流程 (User Flow)
- **入口**：點擊底部導覽列新增的「再平衡」按鈕。
- **初始化**：首次進入為空，點擊「? 新增資產」 -> 彈出視窗勾選庫存標的（含「現金」選項） -> 確認。
- **設定權重**：在卡片上拖動滑桿或輸入數字設定 Target %。
- **查看建議**：系統即時計算並顯示「建議買賣金額」。
- **儲存**：點擊「儲存設定」，將目前的資產組合與權重存入 LocalStorage。

### 3. 介面設計 (UI/UX) - 待切版
- **導覽列**：新增第四個分頁 `<div id="rebalance">`。
- **資產卡片**：
  - 左側：代號 (Ticker) + 目前市值。
  - 中間：滑桿 (Slider) + 百分比輸入框。
  - 右側：建議交易金額 (綠色=買進, 紅色=賣出)。
  - 狀態：若 `|目前% - 目標%| > 閾值`，卡片邊框亮紅燈，否則綠燈。
- **底部統計列**：顯示「目前配置總市值」、「目標權重總和 (需等於 100%)」。

### 4. 資料與邏輯 (Data & Logic)
- **計算範圍**：僅計算「被選入清單」的資產總和 (Rebalancing Pool)。
- **公式**：
  - Pool Value = SUM(選定資產的當前市值)
  - Target Value (i) = Pool Value * Target % (i)
  - Action (i) = Target Value (i) - Current Value (i)
- **儲存結構** (LocalStorage):
  key: "asset_mgr_rebalance_v1"
  value: {
    "threshold": 0.05,
    "items": [
      { "ticker": "0050", "target": 50 },
      { "ticker": "CASH", "target": 10 }
    ]
  }

### 5. 技術限制 (Constraints)
- 浮點數運算需處理精度問題。
- 手機版滑桿需保留足夠觸控區域。

### 6. 驗收標準 (Acceptance Criteria)
- 權重總和不為 100% 時，禁止儲存並顯示警告。
- 新增/刪除資產後，計算邏輯需即時更新。
- 重新整理頁面後，上次設定的權重需自動載入。
