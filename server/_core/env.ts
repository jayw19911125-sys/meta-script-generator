// Load .env before anything else (handles ESM import hoisting issue)
import { config as loadDotenv } from "dotenv";
loadDotenv({ override: true });

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // ===== 外部服務基礎設施 ID（可用環境變數覆蓋；預設值 = 目前線上使用值，行為不變）=====
  // Slack：#影音製作 頻道
  slackChannelId: process.env.SLACK_CHANNEL_ID ?? "C0AUR4QJ07Q",
  // Monday.com：客戶看板與「現況」欄位
  mondayBoardId: Number(process.env.MONDAY_BOARD_ID ?? 5027852889),
  mondayStatusColumnId: process.env.MONDAY_STATUS_COLUMN_ID ?? "color_mm2gg7qh",
  mondayStatusLabelId: Number(process.env.MONDAY_STATUS_LABEL_ID ?? 12), // 「腳本確認中」
  // Notion：B2 客戶腳本庫（notion-create-pages 的 parent.page_id，需帶連字號格式）
  notionB2ScriptLibraryPageId:
    process.env.NOTION_B2_SCRIPT_LIBRARY_PAGE_ID ?? "37b97a06-fae5-818c-91d1-c2bd91baa373",
  // Notion：知識框架頁面（L 系列 / A3 Hook 數據 / H 系列方法論）
  notionPageIdL01: process.env.NOTION_PAGE_ID_L01 ?? "37997a06-fae5-81d6-9837-c8b6c1dd242d",
  notionPageIdL02: process.env.NOTION_PAGE_ID_L02 ?? "37997a06-fae5-8109-801f-d3835ed6fa6e",
  notionPageIdL03: process.env.NOTION_PAGE_ID_L03 ?? "37997a06-fae5-8191-9536-e1f3aff7c48e",
  notionPageIdA3HookData:
    process.env.NOTION_PAGE_ID_A3_HOOK_DATA ?? "37997a06-fae5-815d-b375-ef4353b4d362",
  notionPageIdHMethodology:
    process.env.NOTION_PAGE_ID_H_METHODOLOGY ?? "37b97a06-fae5-819e-b37a-f3f13be3f8c4",
};
