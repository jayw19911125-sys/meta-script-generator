> ⚠️ 本文件已過時（2026-07-02 稽核）：多數問題已修復，僅供歷史參考。

# Meta 腳本生成器 — 全面診斷報告

## 診斷日期：2026-06-09

---

## 🔴 嚴重問題（必須修復）

### 1. 前端 Prompt 與 760 行知識底層嚴重脫節
- **現狀**：`buildClaudePrompt()` 只有 92 行，`buildGptPrompt()` 只有 35 行
- **問題**：760 行教學紀錄中的核心知識（Andromeda 信號系統、Lattice 去重、CPS 值、BPM 設計、情緒曲線、廣告疲勞機制）完全沒有注入前端 Prompt
- **影響**：AI 產出品質遠低於知識底層的能力上限

### 2. Claude Prompt 缺少 System Prompt
- **現狀**：直接把所有內容塞在 user message 裡
- **問題**：Claude API 支援 system prompt，應該把角色定義和知識底層放在 system，把動態輸入放在 user
- **影響**：Claude 無法穩定維持角色一致性，每次都要重新理解自己是誰

### 3. 沒有 Notion 回寫功能
- **現狀**：ScriptOutput 只有「一鍵複製」和「匯出 TXT」
- **問題**：用戶要求「一鍵存入庫房」，目前完全沒有實作
- **影響**：每次生成都要手動複製貼到 Notion，違反自動化原則

### 4. 沒有後端 API 層
- **現狀**：前端直接呼叫 OpenAI/Anthropic API（CORS header 暴露 key）
- **問題**：API Key 存在 localStorage，任何人打開 DevTools 都能看到
- **影響**：安全風險（雖然是內部工具，但仍不理想）

---

## 🟡 中等問題（應該修復）

### 5. GPT temperature 不一致
- `handleGenerate()` 用 temperature 1.1
- `handleRegenerateHooks()` 用 temperature 1.2
- 應統一為 1.2（重新發散時更大膽是對的，但首次也應該大膽）

### 6. Claude model 版本
- 使用 `claude-sonnet-4-20250514`
- 應確認這是否為最新可用版本，或是否應使用 opus 以獲得更高品質

### 7. 輸出排版問題
- `max-h-[600px]` 限制了輸出區域高度
- 長篇模組化矩陣（27 組合）會被截斷，用戶需要大量滾動
- 應改為自適應高度或提供展開/收合

### 8. 缺少錯誤重試機制
- API 呼叫失敗後只顯示錯誤訊息
- 沒有自動重試或「重試」按鈕
- 網路不穩時用戶體驗差

### 9. 進度條是假的
- `animateProgress()` 用固定時間模擬進度
- 實際 API 回應時間不可預測
- 可能出現進度條到 85% 後卡住等很久，或 API 已回但進度條還沒到 100%

### 10. 歷史紀錄缺少搜尋/篩選
- 50 筆紀錄全部平鋪
- 沒有按產業/漏斗/日期篩選
- 紀錄多了之後難以找到特定腳本

---

## 🟢 小問題 / 優化空間

### 11. DialogContent 缺少 aria-describedby
- 控制台有 Warning：Missing `Description` or `aria-describedby={undefined}` for {DialogContent}
- 無障礙合規問題

### 12. 表單驗證不夠嚴格
- 「核心賣點」沒有最小字數限制
- 用戶可能只輸入一個字就送出，導致 AI 產出品質差

### 13. 沒有 loading skeleton
- 等待 AI 回應時，輸出區域是空白
- 應該有 skeleton 佔位提示

### 14. 缺少「匯出 Markdown」選項
- 只有 TXT 匯出
- Markdown 格式更適合直接貼入 Notion

---

## 修復優先順序

| 優先級 | 問題 | 預計影響 |
|--------|------|----------|
| P0 | #1 Prompt 品質升級 | 直接影響產出品質（核心價值） |
| P0 | #2 Claude System Prompt | 穩定性和品質 |
| P1 | #3 Notion 回寫 | 用戶核心需求（需要 token） |
| P1 | #7 輸出排版 | 使用體驗 |
| P1 | #8 錯誤重試 | 穩定性 |
| P2 | #5 temperature 統一 | 一致性 |
| P2 | #9 進度條改善 | UX 誠實度 |
| P2 | #14 Markdown 匯出 | 便利性 |
| P3 | #10 歷史搜尋 | 長期使用 |
| P3 | #11 aria 修復 | 合規 |
