---
description: [定期自我進化工作流]: 定期對系統進行「深度診斷 -> 效能優化 -> 資料修復」的循環。
---

這個工作流程用於執行定期的系統維護與核心進化。

1. **Step 1: 讀取?化洞察 (Audit Insights)**
   - 呼叫 `getEvolutionInsights()` 獲取 backend 產出的資料異常與穩定性報告。
   - 檢查 GitHub Actions 的 `evolution_report.md` (若存在)。

2. **Step 2: 自動修復與正規化 [Agent: Fixer]**
   - 針對 `DATA_SMELL` 進行資料清洗 (例如：修正錯誤的 Ticker 格式)。
   - 針對 `PERFORMANCE` 洞察進行代碼優化 (例如：簡化過於複雜的 Logic.gs 函式)。

3. **Step 3: 技術棧稽核 [Agent: Auditor]**
   - 檢查 `package.json` 中的依賴版本。
   - 掃描 `GasStore.gs` 與 `Actions.gs` 的寫入性能是否有下降趨勢。

4. **Step 4: 執行全量驗證 (Full Verification)**
   - // turbo-all
   - 執行 `npm test` 與 `npm run test:e2e`。
   - 確保進化後的版本優於前一版本。

5. **Step 5: 更新進化日誌與交付**
   - 更新 `walkthrough.md` 紀錄本次進化的重點。
   - // turbo
   - 使用 `notify_user` 報告系統已完成一次「週期性進化」。

// turbo-all
此流程旨在實現「無人值守」的系統穩定性提升。
