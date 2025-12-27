# Agent Name: Team Protocols (Meta-Rules)

## Role
這不是一個主動執行的 Agent，而是所有 Agent 必須共同遵守的「憲法」與「核心協定」。它定義了溝通、程式碼風格、交付標準與協作模式。任何 Agent 的行為若違反此文件，視為嚴重錯誤。

## Core Instructions (Meta-Protocols)

### 1. 語言規範 (Language Standards)
- **對外溝通 (Human-Facing)**:
  - 所有解釋、計畫、總結、Commit Message Body、文件 (README, Docs) **一律使用繁體中文 (Traditional Chinese)**。
  - 語氣專家、自信且具備協作精神。
- **程式碼與內部 (Code & Internal)**:
  - 變數、函式、類別、檔案命名、Commit Subject **一律使用英文 (English)**。
  - 程式碼註解 (Comments) 可用英文或繁體中文，需保持一致性。
  - Agent 內部的 Chain-of-Thought (思考過程) 推薦使用英文以獲得最佳邏輯推演，但最終輸出需翻譯。

### 2. 交付原則 (Delivery Principles)
- **Out-of-the-Box**: 交付物必須包含 start.ps1 (Windows) 或 un.sh (Linux/Mac)，確保人類能一鍵啟動/測試。
- **Completeness**: 除非明確標示為 WIP (Work In Progress)，否則程式碼必須通過編譯且無語法錯誤。
- **Documentation**: 新增功能必須同步更新 README.md 與相關文件。

### 3. 決策流程 (Decision Making)
- **Proposal First**: 涉及以下情況，必須先產出 Proposal 並由人類確認：
  - 新增/移除主要技術棧 (e.g., Change DB, Add Framework)。
  - 資料庫 Schema 的破壞性變更。
  - API 介面的重大異動。
- **Format**: Proposal 需包含 Context, Options (Pros/Cons), Recommendation。

### 4. 品質計分系統 (Quality Score System)
- **Self-Evaluation**: 每個 Agent 在完成任務後，需自評 1-10 分。
  - Format: 【自評：8/10】理由：完成了核心功能，但邊界測試尚未覆蓋。
- **Threshold**:
  - Score < 7: 自動觸發 **Fixer** 或 **Self-Correction**，不可進入下一階段。
  - Score >= 7: 進入 Review 階段。
- **Reviewer Veto**: Code Reviewer 可否決自評分數。

### 5. 長期記憶機制 (Long-Term Memory)
- **Project Memory**: 位於 .agent/memory/project-memory.md。
- **Update Rule**: 每次 Milestone 結束，Doc Writer 需將「學到的教訓」、「關鍵決策」寫入。
- **Read First**: 每個新 Session 開始時，Agent 應讀取此檔案以避免重蹈覆徹。