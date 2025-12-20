---
description: [產品迭代優化工作流]: 執行 稽核 -> 計畫 -> 實作 -> 驗證 的自動循環。
---

這個工作流程用於對專案進行持續的 UI/UX 優化與 Bug 修復。

1. **Phase 0: 探索與稽核 [Agent: Auditor]**
   - 掃描主要顯示文件 (`index.html`, `css.html`, `js.html`)。
   - 分析當前 UI/UX 壞味道與邏輯 Bug。
   - 產出「現況分析報告」於思維鏈中。

2. **Phase 1: 對焦與戰略 [Agent: Architect]**
   - 根據稽核結果更新或建立 `implementation_plan.md`。
   - 定義驗收標準與 E2E 測試場景。
   - // turbo
   - 使用 `notify_user` 請求 CEO 核准。

3. **Phase 2: 黑箱執行與模擬 [Agent: Dev Swarm]**
   - **Backend/Frontend Dev**: 實作優化代碼。
   - **Fixer**: 監控編譯與初步執行狀態。
   - // turbo
   - 執行 `npm test` 確保核心邏輯穩定。

4. **Phase 3: 自動化驗證 [Agent: Browser Bot]**
   - // turbo
   - 執行 `npm run test:e2e` 進行視覺與功能回歸測試。
   - 若失敗，由 **Fixer** 自動修復直到通過。

5. **Phase 4: 完美交付 [Agent: Doc]**
   - 更新 `README.md` 與 `walkthrough.md`。
   - 使用 `notify_user` 交付成果。

// turbo-all
6. 反覆執行此流程直到達到卓越品質。
