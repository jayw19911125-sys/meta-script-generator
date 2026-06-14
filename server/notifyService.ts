// ========== 通知服務 v1.0 ==========
// 腳本存入 Notion 後，自動執行：
//   1. 發送 Slack 通知到 #影音製作 頻道（C0AUR4QJ07Q）
//   2. 搜尋 Monday.com 對應客戶項目，更新「現況」為「腳本確認中」
//
// 設計原則：通知失敗不中斷主流程（soft failure），僅記錄 console.warn

import { execSync } from "child_process";

// ========== 常數 ==========
const SLACK_CHANNEL_ID = "C0AUR4QJ07Q"; // #影音製作
const MONDAY_BOARD_ID = 5027852889;
const MONDAY_STATUS_COLUMN_ID = "color_mm2gg7qh"; // 現況欄位
const MONDAY_STATUS_LABEL_ID = 12; // 「腳本確認中」

// ========== 工具函數：呼叫 MCP ==========
function callMcp(server: string, tool: string, input: Record<string, unknown>): unknown {
  const inputJson = JSON.stringify(input);
  const tmpFile = `/tmp/notify_mcp_${Date.now()}_${Math.random().toString(36).slice(2)}.json`;
  require("fs").writeFileSync(tmpFile, inputJson, "utf-8");
  try {
    const cmd = `manus-mcp-cli tool call ${tool} --server ${server} --input "$(cat ${tmpFile})"`;
    const result = execSync(cmd, { encoding: "utf-8", timeout: 30000, shell: "/bin/bash" });
    const match = result.match(/Tool execution result:\n([\s\S]+)/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return match[1].trim(); }
  } finally {
    try { require("fs").unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

// ========== Slack 通知 ==========
export async function notifySlackScriptCreated(params: {
  clientName: string;
  scriptCount: number;
  projectType: string;
  parentPageUrl: string;
  clientPageUrl: string;
  execPageUrl: string;
}): Promise<void> {
  try {
    const { clientName, scriptCount, projectType, parentPageUrl, clientPageUrl, execPageUrl } = params;
    const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });

    const message = `🎬 *腳本已生成完成*

*客戶：* ${clientName}
*專案類型：* ${projectType} × ${scriptCount} 支
*生成時間：* ${now}

*Notion 連結：*
• 📋 <${parentPageUrl}|客戶總頁（含專案資訊）>
• 👤 <${clientPageUrl}|客戶版（策略確認 & 台詞）>
• ⚙️ <${execPageUrl}|執行版（攝影師 & 剪輯師）>

_請涵勻確認客戶版內容，確認後更新 Monday 狀態為「對稿中」_`;

    callMcp("slack", "slack_send_message", {
      channel_id: SLACK_CHANNEL_ID,
      text: message,
    });

    console.log(`[NotifyService] ✅ Slack 通知已發送：${clientName}`);
  } catch (e) {
    console.warn(`[NotifyService] ⚠️ Slack 通知失敗（不影響主流程）：`, e);
  }
}

// ========== Monday.com：搜尋客戶項目並更新狀態 ==========
export async function updateMondayScriptStatus(params: {
  clientName: string;
  notionUrl: string;
}): Promise<{ found: boolean; itemId?: string; itemName?: string }> {
  try {
    const { clientName, notionUrl } = params;

    // Step 1: 搜尋 Monday 看板中包含客戶名稱的項目
    const boardData = callMcp("monday-com", "get_board_items_page", {
      boardId: MONDAY_BOARD_ID,
      limit: 100,
    }) as { items?: Array<{ id: string; name: string }> } | null;

    if (!boardData?.items?.length) {
      console.warn(`[NotifyService] Monday 看板無法取得項目列表`);
      return { found: false };
    }

    // 模糊比對客戶名稱（去掉常見後綴詞再比對）
    const cleanName = clientName
      .replace(/（.*?）/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/專案|客戶|有限公司|股份有限公司/g, "")
      .trim();

    const matchedItem = boardData.items.find(item => {
      const itemName = item.name;
      return (
        itemName.includes(clientName) ||
        itemName.includes(cleanName) ||
        clientName.includes(itemName.replace(/專案|客戶/g, "").trim())
      );
    });

    if (!matchedItem) {
      console.warn(`[NotifyService] Monday 找不到「${clientName}」相關項目，跳過狀態更新`);
      return { found: false };
    }

    // Step 2: 更新現況欄位為「腳本確認中」
    callMcp("monday-com", "change_item_column_values", {
      boardId: MONDAY_BOARD_ID,
      itemId: parseInt(matchedItem.id),
      columnValues: {
        [MONDAY_STATUS_COLUMN_ID]: { label: "腳本確認中" },
      },
    });

    // Step 3: 新增更新留言，附上 Notion 連結
    callMcp("monday-com", "create_update", {
      itemId: parseInt(matchedItem.id),
      body: `📝 **腳本已生成完成**\n\nAI 腳本生成器已為此專案產出腳本，請至 Notion 確認：\n${notionUrl}\n\n現況已自動更新為「腳本確認中」，請涵勻確認客戶版內容後手動更新為「對稿中」。`,
    });

    console.log(`[NotifyService] ✅ Monday 已更新：${matchedItem.name}（ID: ${matchedItem.id}）`);
    return { found: true, itemId: matchedItem.id, itemName: matchedItem.name };
  } catch (e) {
    console.warn(`[NotifyService] ⚠️ Monday 更新失敗（不影響主流程）：`, e);
    return { found: false };
  }
}

// ========== 主函數：腳本存入後執行所有通知 ==========
export async function runPostSaveNotifications(params: {
  clientName: string;
  scriptCount: number;
  projectType: string;
  parentPageUrl: string;
  clientPageUrl: string;
  execPageUrl: string;
}): Promise<{
  slackSent: boolean;
  mondayUpdated: boolean;
  mondayItemName?: string;
}> {
  const [slackResult, mondayResult] = await Promise.allSettled([
    notifySlackScriptCreated(params),
    updateMondayScriptStatus({
      clientName: params.clientName,
      notionUrl: params.parentPageUrl,
    }),
  ]);

  const slackSent = slackResult.status === "fulfilled";
  const mondayResult2 = mondayResult.status === "fulfilled"
    ? mondayResult.value
    : { found: false };

  return {
    slackSent,
    mondayUpdated: mondayResult2.found,
    mondayItemName: mondayResult2.itemName,
  };
}
