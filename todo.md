# Meta Script Generator V2 - TODO

## Phase 1: 程式碼複製與後端
- [x] 從 GitHub clone 原始 repo 並讀取核心程式碼
- [x] 複製 shared/scriptTypes.ts（含矩陣型別）
- [x] 更新 drizzle/schema.ts（新增 scriptMatrix、scriptHistory 表）
- [x] 更新 server/db.ts（新增矩陣 CRUD）
- [x] 複製 server/prompts.ts（4 步 prompt builder）
- [x] 複製 server/scriptService.ts（分步生成邏輯）
- [x] 複製 server/notionSyncService.ts（Notion 知識整合）
- [x] 複製 server/routers/（script、matrix、notion、history）
- [x] 整合 routers 到 server/routers.ts
- [x] 執行 db:push 同步 schema

## Phase 2: 前端主介面
- [x] 設計系統（顏色、字型、主題）
- [x] DashboardLayout 整合（sidebar + 手機 navbar）
- [x] Home.tsx 主介面（雙引擎切換 + 3 步表單）
- [x] 引擎選擇器（GPT/Claude + 3 個預設包）
- [x] 進階自訂模式

## Phase 3: 矩陣生成 UI
- [x] MatrixMode.tsx（3-3-3 卡片組）
- [x] 分步進度條（Hook → Body → CTA → 推薦評分）
- [x] 每張卡片：口播/畫面/音效/人物動向/備註
- [x] 局部重跑（單一卡片重新生成）

## Phase 4: 推薦評分與出稿
- [x] AI 推薦最強 3 組（0-100 分 + 原因）
- [x] 點擊推薦 → 自動切換快速出稿 Tab
- [x] 快速出稿：最高分腳本 + 一鍵複製
- [x] 匯出：CSV、Markdown、複製文字

## Phase 5: 歷史紀錄與 RWD
- [x] 歷史紀錄頁面（scriptMatrix 查詢）
- [x] 手機端：頂部 navbar + overlay drawer（DashboardLayout 內建）
- [x] 電腦端：左側 sidebar（DashboardLayout 內建）
- [x] TypeScript 零錯誤驗證

## Phase 6: 發布
- [x] 存 checkpoint
- [x] 發布為永久網站
