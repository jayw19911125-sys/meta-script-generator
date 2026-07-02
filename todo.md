> ⚠️ 本文件已過時（2026-07-02 稽核）：多數問題已修復，僅供歷史參考。

# Meta 腳本生成器 — 架構升級 TODO

## 核心架構升級（前端直連 → 後端 tRPC + 內建 LLM）
- [x] 修復 Home.tsx 缺失的 useAuth import（升級合併遺漏，會致命白屏）
- [x] 後端建立 scriptService.ts 封裝雙引擎 LLM 呼叫（gpt-5 發散 + claude-opus-4-7 整合）
- [x] 知識底層 prompts 從前端搬到後端 server/prompts.ts（防 F12 外洩）
- [x] 建立 shared/scriptTypes.ts 放前後端共用型別與選項常數
- [x] 建立 script tRPC router：generateDual / generateHooks / integrate / history / deleteHistory
- [x] 將 scriptRouter 註冊進 appRouter
- [x] 刪除前端 client/src/lib/prompts.ts（已移後端，前端無引用）

## 資料庫持久化（localStorage → 後端 DB）
- [x] drizzle schema 新增 scriptHistory 表
- [x] db.ts 新增 scriptHistory CRUD 助手
- [x] pnpm db:push 推送，script_history 表建立成功（11 欄）
- [x] 前端歷史紀錄改走 trpc.script.history（含樂觀更新刪除）

## 前端改造
- [x] 完整重寫 Home.tsx：移除所有 fetch 直連 OpenAI/Anthropic
- [x] 移除 API Key 設定彈窗與 localStorage Key 邏輯
- [x] 5 個生成呼叫點全改 trpc mutation
- [x] 體感進度條改前端模擬（後端為單次回傳）
- [x] 未登入導引頁
- [x] 移除 ScriptOutput 假的「存入庫房」按鈕（語意已由自動存庫取代）

## 模型驗證
- [x] 驗證 gpt-5、claude-opus-4-7 為平台真實可用模型
- [x] 端對端煙霧測試：雙引擎真實產出（27 秒、品質達標）

## 測試與除錯
- [x] 撰寫 server/script.test.ts（11 個測試：prompt 組裝 + router 各模式 + 未登入防護）
- [x] pnpm test 全數通過（11 passed）
- [x] 清理臨時檔（_check_models.mjs / _smoke_test.mjs）
- [x] 重啟伺服器清除 vite 舊快取 Duplicate 殘留錯誤
- [x] TypeScript / LSP 0 錯誤、伺服器健康、首頁 HTTP 200
- [ ] 使用者本人登入後做最終 UI 點測（需帳號授權，由使用者執行）
