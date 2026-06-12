// ========== Notion 回寫服務 v1.1 ==========
// 負責將 AI 生成的腳本寫入 Notion B2 客戶腳本庫。
// 架構：
//   B2 客戶腳本庫（父頁面）
//     └── {客戶名稱} ｜ Meta 導購型腳本 × {支數}（客戶總頁）
//           ├── 👤 客戶版 — 策略確認 & 台詞腳本
//           └── ⚙️ 執行版 — 攝影師 & 剪輯師照表操課
//
// 依 AI 代理人必讀規則：落點為 B2 客戶腳本庫（頁面 ID: 37b97a06fae5818c91d1c2bd91baa373）

import { execSync } from "child_process";

// ========== 常數 ==========
// 注意：notion-create-pages 的 parent.page_id 必須使用帶連字號的格式
const B2_SCRIPT_LIBRARY_PAGE_ID = "37b97a06-fae5-818c-91d1-c2bd91baa373";

// ========== 型別 ==========
export interface NotionSaveInput {
  clientName: string;         // 客戶名稱，例如「天晴藝術諮商室」
  projectType: string;        // 專案類型，例如「Meta 導購型短影音廣告」
  industry: string;           // 產業（中文標籤）
  funnel: string;             // 漏斗層級（中文標籤）
  duration: string;           // 影片時長（秒）
  appearance: string;         // 出鏡方式（中文標籤）
  tone: string;               // 語氣（中文標籤）
  targetAudience: string;     // 目標受眾
  sellingPoints: string;      // 賣點
  scriptCount: number;        // 腳本支數
  finalOutput: string;        // AI 最終生成腳本（Markdown 格式）
  gptOutput?: string;         // GPT 發散引擎原始 Hook（可選）
  engineMode: string;         // 使用的引擎模式
  historyId?: number | null;  // DB 歷史紀錄 ID（可選，用於追蹤）
}

export interface NotionSaveResult {
  success: boolean;
  parentPageUrl?: string;     // 客戶總頁 URL
  clientPageUrl?: string;     // 客戶版 URL
  execPageUrl?: string;       // 執行版 URL
  error?: string;
}

// ========== 工具函數：呼叫 Notion MCP ==========
// 使用 stdin 傳遞 JSON，避免 shell 引號逸出問題
function callNotionMcp(tool: string, input: Record<string, unknown>): unknown {
  const inputJson = JSON.stringify(input);
  // 將 JSON 寫入暫存檔，再用 --input-file 讀取，避免 shell 特殊字元問題
  const tmpFile = `/tmp/notion_mcp_input_${Date.now()}.json`;
  require("fs").writeFileSync(tmpFile, inputJson, "utf-8");
  try {
    const cmd = `manus-mcp-cli tool call ${tool} --server notion --input "$(cat ${tmpFile})"`;
    const result = execSync(cmd, { encoding: "utf-8", timeout: 60000, shell: "/bin/bash" });
    const match = result.match(/Tool execution result:\n([\s\S]+)/);
    if (!match) throw new Error(`Notion MCP ${tool} 回傳格式異常：${result.slice(0, 300)}`);
    const parsed = JSON.parse(match[1].trim());
    if (parsed?.error) throw new Error(`Notion MCP ${tool} 回傳錯誤：${JSON.stringify(parsed.error)}`);
    return parsed;
  } finally {
    try { require("fs").unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

// ========== 工具函數：建立單一 Notion 頁面，回傳 {id, url} ==========
function createNotionPage(
  parentPageId: string,
  title: string,
  content: string,
  icon: string
): { id: string; url: string } {
  const result = callNotionMcp("notion-create-pages", {
    parent: { page_id: parentPageId },
    pages: [{
      properties: { title },
      content,
      icon,
    }],
  }) as { pages?: Array<{ id: string; url: string }> };

  const page = result?.pages?.[0];
  if (!page?.id) {
    throw new Error(`建立頁面「${title}」失敗：Notion 未回傳 ID（回傳：${JSON.stringify(result)}）`);
  }
  return { id: page.id, url: page.url };
}

// ========== 建立客戶總頁 ==========
async function createClientParentPage(input: NotionSaveInput): Promise<{ id: string; url: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const pageTitle = `${input.clientName} ｜ ${input.projectType} × ${input.scriptCount}`;

  const content = `## 專案資訊

<table header-row="true">
<tr>
<td>項目</td>
<td>內容</td>
</tr>
<tr>
<td>客戶名稱</td>
<td>${input.clientName}</td>
</tr>
<tr>
<td>專案類型</td>
<td>${input.projectType}</td>
</tr>
<tr>
<td>產業</td>
<td>${input.industry}</td>
</tr>
<tr>
<td>漏斗層級</td>
<td>${input.funnel}</td>
</tr>
<tr>
<td>目標受眾</td>
<td>${input.targetAudience}</td>
</tr>
<tr>
<td>影片規格</td>
<td>直式 9:16，單支 ${input.duration} 秒</td>
</tr>
<tr>
<td>出鏡方式</td>
<td>${input.appearance}</td>
</tr>
<tr>
<td>語氣風格</td>
<td>${input.tone}</td>
</tr>
<tr>
<td>腳本支數</td>
<td>${input.scriptCount} 支</td>
</tr>
<tr>
<td>AI 引擎</td>
<td>${input.engineMode}</td>
</tr>
<tr>
<td>建立日期</td>
<td>${today}</td>
</tr>
</table>

---

## 核心賣點

${input.sellingPoints}

---

## 子頁面導覽

此頁面下有兩個子頁面，請依需求進入：

**👤 客戶版**：提供給涵勻與客戶確認策略、台詞邏輯與業主準備清單。

**⚙️ 執行版**：提供給攝影師與阿韋（剪輯師），含拍攝排程、剪映專業版指令與分鏡表格。`;

  return createNotionPage(B2_SCRIPT_LIBRARY_PAGE_ID, pageTitle, content, "🎬");
}

// ========== 建立客戶版子頁 ==========
async function createClientVersionPage(
  parentId: string,
  input: NotionSaveInput
): Promise<{ id: string; url: string }> {
  const cleanedScript = extractClientFriendlyScript(input.finalOutput);

  const content = `> 📌 **本頁面用途**：提供給涵勻與客戶確認策略方向、台詞邏輯，以及業主需準備的道具/服裝清單。

---

## 腳本內容

${cleanedScript}

---

## 業主準備清單

請業主在拍攝前確認以下項目：

- 道具、服裝、化妝（如有需要）
- 拍攝場地確認
- 口播台詞熟悉度（建議提前練習 2-3 次）
- 任何品牌視覺素材（Logo、產品圖等）

---

## 確認紀錄

<table header-row="true">
<tr>
<td>確認項目</td>
<td>狀態</td>
<td>備註</td>
</tr>
<tr>
<td>策略方向確認</td>
<td>待確認</td>
<td></td>
</tr>
<tr>
<td>台詞修改</td>
<td>待確認</td>
<td></td>
</tr>
<tr>
<td>拍攝時間確認</td>
<td>待確認</td>
<td></td>
</tr>
</table>

---

> ⚠️ 此版本**不含**拍攝技術細節（分鏡、剪輯指令），如需查看請至「執行版」。`;

  return createNotionPage(parentId, "👤 客戶版 — 策略確認 & 台詞腳本", content, "👤");
}

// ========== 建立執行版子頁 ==========
async function createExecVersionPage(
  parentId: string,
  input: NotionSaveInput
): Promise<{ id: string; url: string }> {
  const gptSection = input.gptOutput
    ? `## GPT 發散引擎原始 Hook（備用素材）

> 以下為 GPT 發散引擎產出的原始 Hook 草稿，可作為備用素材或 A/B 測試使用。

${input.gptOutput}

---

`
    : "";

  const content = `> 📌 **本頁面用途**：提供給攝影師與阿韋（剪輯師）照表操課。含完整分鏡、剪映指令、音效建議。

---

## 拍攝規格

<table header-row="true">
<tr>
<td>項目</td>
<td>規格</td>
</tr>
<tr>
<td>拍攝設備</td>
<td>iPhone 17 Pro + Pocket 3</td>
</tr>
<tr>
<td>收音設備</td>
<td>DJI 2 無線麥克風</td>
</tr>
<tr>
<td>補光設備</td>
<td>補光燈</td>
</tr>
<tr>
<td>拍攝時間</td>
<td>3 小時內完成</td>
</tr>
<tr>
<td>影片規格</td>
<td>直式 9:16，${input.duration} 秒</td>
</tr>
<tr>
<td>出鏡方式</td>
<td>${input.appearance}</td>
</tr>
</table>

---

## 完整腳本（含執行指令）

${input.finalOutput}

---

${gptSection}## 剪映專業版指令

<table header-row="true">
<tr>
<td>步驟</td>
<td>操作</td>
<td>備註</td>
</tr>
<tr>
<td>1</td>
<td>匯入素材，建立 9:16 序列</td>
<td></td>
</tr>
<tr>
<td>2</td>
<td>依腳本分鏡剪輯</td>
<td>注意節奏感</td>
</tr>
<tr>
<td>3</td>
<td>加入字卡（依腳本文字疊層）</td>
<td>字體建議：黑體/圓體</td>
</tr>
<tr>
<td>4</td>
<td>音效處理（依腳本音效建議）</td>
<td></td>
</tr>
<tr>
<td>5</td>
<td>調色（依品牌色調）</td>
<td></td>
</tr>
<tr>
<td>6</td>
<td>輸出 1080×1920，30fps</td>
<td></td>
</tr>
</table>

---

## 成效追蹤

投廣後請回填以下數據：

<table header-row="true">
<tr>
<td>指標</td>
<td>數值</td>
<td>備註</td>
</tr>
<tr>
<td>觀看完成率</td>
<td></td>
<td></td>
</tr>
<tr>
<td>點擊率 (CTR)</td>
<td></td>
<td></td>
</tr>
<tr>
<td>轉換率</td>
<td></td>
<td></td>
</tr>
<tr>
<td>CPA</td>
<td></td>
<td></td>
</tr>
<tr>
<td>達標狀態</td>
<td>待評估</td>
<td>達標後入庫 A1 腳本庫</td>
</tr>
</table>`;

  return createNotionPage(parentId, "⚙️ 執行版 — 攝影師 & 剪輯師照表操課", content, "⚙️");
}

// ========== 解析腳本，提取客戶友好版本 ==========
function extractClientFriendlyScript(rawScript: string): string {
  const lines = rawScript.split("\n");
  const filtered: string[] = [];
  let skipNext = false;

  for (const line of lines) {
    if (
      line.match(/^[>\s]*🎥\s*畫面/) ||
      line.match(/^[>\s]*🎬\s*分鏡/) ||
      line.match(/^[>\s]*🔧\s*剪映/) ||
      line.match(/^[>\s]*📸\s*拍攝/)
    ) {
      skipNext = true;
      continue;
    }
    if (skipNext && line.trim() === "") {
      skipNext = false;
      continue;
    }
    if (!skipNext) {
      filtered.push(line);
    }
  }

  return filtered.join("\n").trim() || rawScript;
}

// ========== 主函數：一鍵存入 B2 ==========
export async function saveScriptToNotion(
  input: NotionSaveInput
): Promise<NotionSaveResult> {
  try {
    console.log(`[NotionWrite] 開始建立客戶腳本頁面：${input.clientName}`);

    // Step 1: 建立客戶總頁
    const parentPage = await createClientParentPage(input);
    console.log(`[NotionWrite] 客戶總頁建立完成：${parentPage.id}`);

    // Step 2: 建立客戶版子頁
    const clientPage = await createClientVersionPage(parentPage.id, input);
    console.log(`[NotionWrite] 客戶版建立完成：${clientPage.id}`);

    // Step 3: 建立執行版子頁
    const execPage = await createExecVersionPage(parentPage.id, input);
    console.log(`[NotionWrite] 執行版建立完成：${execPage.id}`);

    // 使用 Notion 直接回傳的 URL（已包含正確格式）
    const parentPageUrl = parentPage.url || `https://app.notion.com/p/${parentPage.id.replace(/-/g, "")}`;
    const clientPageUrl = clientPage.url || `https://app.notion.com/p/${clientPage.id.replace(/-/g, "")}`;
    const execPageUrl = execPage.url || `https://app.notion.com/p/${execPage.id.replace(/-/g, "")}`;

    console.log(`[NotionWrite] ✅ 全部完成！客戶總頁：${parentPageUrl}`);

    return {
      success: true,
      parentPageUrl,
      clientPageUrl,
      execPageUrl,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[NotionWrite] ❌ 失敗：${errMsg}`);
    return {
      success: false,
      error: errMsg,
    };
  }
}
