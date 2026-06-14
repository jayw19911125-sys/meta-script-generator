/**
 * notion.ts — Notion 整合 router
 * 將腳本生成結果寫入好創庫房「01 腳本庫」的「META廣告短影音腳本庫」View
 *
 * 永久 ID（不可改用名稱）：
 *   data_source_id: ae097a06-fae5-836d-8c3b-87963f07aee3
 *   view:           view://37f97a06-fae5-81ff-b8bd-000cc529fb37
 */

import { z } from "zod";
import { execSync } from "child_process";
import { approvedProcedure, adminProcedure, router } from "../_core/trpc";
import { getCacheStatus, syncNotionKnowledge } from "../notionSyncService";

// ── 欄位對照表 ──────────────────────────────────────────────────────────────

/** 漏斗 → 腳本類型 */
const FUNNEL_TO_SCRIPT_TYPE: Record<string, string> = {
  TOFU: "揭秘式",
  MOFU: "痛點式",
  BOFU: "導購式",
};

/** duration 字串 → 影片長度 */
const DURATION_TO_LENGTH: Record<string, string> = {
  "15": "15秒以下",
  "30": "15-30秒",
  "60": "30-60秒",
  "90": "60秒以上",
  "15秒以下": "15秒以下",
  "15-30秒": "15-30秒",
  "30-60秒": "30-60秒",
  "60秒以上": "60秒以上",
};

/** 腳本架構：快速出稿預設 Hook-Value-CTA */
const DEFAULT_STRUCTURE = "Hook-Value-CTA";

// ── Notion MCP 呼叫 ─────────────────────────────────────────────────────────

function callNotionMCP(tool: string, input: Record<string, unknown>): Record<string, unknown> {
  // 安全地序列化 JSON，避免單引號問題
  const inputJson = JSON.stringify(input);
  const escaped = inputJson.replace(/'/g, "'\\''");
  const cmd = `manus-mcp-cli tool call ${tool} --server notion --input '${escaped}'`;

  let raw: string;
  try {
    raw = execSync(cmd, { encoding: "utf-8", timeout: 30000 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Notion MCP 呼叫失敗：${msg}`);
  }

  // 解析 CLI 輸出中的 JSON 結果
  const match = raw.match(/Tool execution result:\n([\s\S]+)/);
  if (!match) throw new Error("Notion MCP：無法解析回應");

  const resultText = match[1].trim();
  try {
    return JSON.parse(resultText) as Record<string, unknown>;
  } catch {
    // 若不是 JSON（例如 Error: ...），直接拋出
    throw new Error(`Notion MCP 錯誤：${resultText.slice(0, 200)}`);
  }
}

// ── Router ──────────────────────────────────────────────────────────────────

export const notionRouter = router({

  /**
   * 快速出稿：存入 Notion 01 腳本庫
   * 欄位來自表單（精準），腳本完整文字存入頁面 body
   */
  saveQuickScript: approvedProcedure
    .input(z.object({
      // 表單欄位（用於填 Notion 屬性欄）
      productName:    z.string().min(1),
      funnel:         z.string(),
      duration:       z.string(),
      platform:       z.string().optional().default("多平台"),
      industry:       z.string().optional().default(""),
      // 腳本完整文字（存入頁面 body）
      scriptContent:  z.string().min(1),
      // 引擎資訊（存備註）
      engineConfig:   z.string().optional(),
      // 預覽視窗可自訂標題與備註
      scriptTitle:    z.string().optional(),
      notes:          z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const {
        productName, funnel, duration, platform, industry,
        scriptContent, engineConfig, notes,
      } = input;

      const generatedBy = ctx.user?.name ?? "系統";
      const today = new Date().toLocaleDateString("zh-TW");
      const scriptTitle = input.scriptTitle?.trim() || `[META快速出稿] ${productName} · ${funnel} · ${today}`;

      // 頁面 body：完整腳本文字 + 元資訊
      const pageContent = `## 📋 生成資訊

| 欄位 | 內容 |
|------|------|
| 產品/服務 | ${productName} |
| 產業 | ${industry || "未填"} |
| 漏斗階段 | ${funnel} |
| 影片長度 | ${DURATION_TO_LENGTH[duration] ?? duration} |
| 平台 | ${platform} |
| 生成引擎 | ${engineConfig ?? "雙引擎"} |
| 生成者 | ${generatedBy} |
| 生成日期 | ${today} |

---

${scriptContent}

---

*由 Meta 腳本生成器自動存入 · ${today}*`;

      const nowISO = new Date().toISOString();
      const result = callNotionMCP("notion-create-page", {
        data_source_id: "ae097a06-fae5-836d-8c3b-87963f07aee3",
        properties: {
          腳本標題:     scriptTitle,
          腳本類型:     FUNNEL_TO_SCRIPT_TYPE[funnel] ?? "導購式",
          腳本架構:     DEFAULT_STRUCTURE,
          影片長度:     DURATION_TO_LENGTH[duration] ?? "30-60秒",
          平台:         platform,
          成效標籤:     "待評估",
          來源工具:     "Meta腳本生成器",
          備註:         [
            engineConfig ? `引擎：${engineConfig}` : null,
            notes || null,
          ].filter(Boolean).join(" ｜ "),
          建立者:     generatedBy,
          "date:生成時間:start": nowISO,
          "date:生成時間:is_datetime": 1,
        },
        content: pageContent,
      });

      const notionUrl = (result as { url?: string })?.url ?? null;
      return { success: true, notionUrl };
    }),

  /**
   * 矩陣推薦組合：存入 Notion 01 腳本庫
   * 欄位來自表單 + 矩陣卡片資料
   */
  saveMatrixScript: approvedProcedure
    .input(z.object({
      // 表單欄位
      productName:    z.string().min(1),
      funnel:         z.string(),
      duration:       z.string(),
      platform:       z.string().optional().default("多平台"),
      industry:       z.string().optional().default(""),
      // 推薦組合資訊
      rankLabel:      z.string().optional(),   // e.g. "推薦組合 #1"
      score:          z.number().optional(),
      checklistNotes: z.string().optional(),
      // 三個模組
      hook: z.object({
        text:            z.string(),
        shotDirection:   z.string(),
        soundEffect:     z.string(),
        performanceNote: z.string(),
        notes:           z.string().optional(),
      }),
      body: z.object({
        text:            z.string(),
        shotDirection:   z.string(),
        soundEffect:     z.string(),
        performanceNote: z.string(),
        notes:           z.string().optional(),
      }),
      cta: z.object({
        text:            z.string(),
        shotDirection:   z.string(),
        soundEffect:     z.string(),
        performanceNote: z.string(),
        notes:           z.string().optional(),
      }),
      engineConfig:   z.string().optional(),
      // 預覽視窗可自訂標題與備註
      scriptTitle:    z.string().optional(),
      notes:          z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const {
        productName, funnel, duration, platform, industry,
        rankLabel, score, checklistNotes,
        hook, body, cta, engineConfig, notes,
      } = input;

      const generatedBy = ctx.user?.name ?? "系統";
      const today = new Date().toLocaleDateString("zh-TW");
      const label = rankLabel ? ` · ${rankLabel}` : "";
      const scriptTitle = input.scriptTitle?.trim() || `[META矩陣] ${productName} · ${funnel}${label} · ${today}`;

      const pageContent = `## 📋 生成資訊

| 欄位 | 內容 |
|------|------|
| 產品/服務 | ${productName} |
| 產業 | ${industry || "未填"} |
| 漏斗階段 | ${funnel} |
| 推薦組合 | ${rankLabel ?? "自選"} |
${score !== undefined ? `| AI 評分 | ${score} 分 |` : ""}
| 影片長度 | ${DURATION_TO_LENGTH[duration] ?? duration} |
| 平台 | ${platform} |
| 生成引擎 | ${engineConfig ?? "雙引擎"} |
| 生成者 | ${generatedBy} |
| 生成日期 | ${today} |

---

## 🎣 Hook（開場鉤子）

**口播文案**
${hook.text}

**畫面建議**
${hook.shotDirection}

**音效建議**
${hook.soundEffect}

**人物動向指令**
${hook.performanceNote}
${hook.notes ? `\n**備註**\n${hook.notes}` : ""}

---

## 📖 Body（主體內容）

**口播文案**
${body.text}

**畫面建議**
${body.shotDirection}

**音效建議**
${body.soundEffect}

**人物動向指令**
${body.performanceNote}
${body.notes ? `\n**備註**\n${body.notes}` : ""}

---

## 📣 CTA（行動呼籲）

**口播文案**
${cta.text}

**畫面建議**
${cta.shotDirection}

**音效建議**
${cta.soundEffect}

**人物動向指令**
${cta.performanceNote}
${cta.notes ? `\n**備註**\n${cta.notes}` : ""}

${checklistNotes ? `---\n\n## 🤖 AI 評分備註\n\n${checklistNotes}` : ""}

---

*由 Meta 腳本生成器自動存入 · ${today}*`;

      const nowISO2 = new Date().toISOString();
      const result = callNotionMCP("notion-create-page", {
        data_source_id: "ae097a06-fae5-836d-8c3b-87963f07aee3",
        properties: {
          腳本標題:     scriptTitle,
          腳本類型:     FUNNEL_TO_SCRIPT_TYPE[funnel] ?? "導購式",
          腳本架構:     DEFAULT_STRUCTURE,
          影片長度:     DURATION_TO_LENGTH[duration] ?? "30-60秒",
          平台:         platform,
          成效標籤:     "待評估",
          來源工具:     "Meta腳本生成器",
          備註:         [
            engineConfig ? `引擎：${engineConfig}` : null,
            notes || null,
          ].filter(Boolean).join(" ｜ "),
          建立者:     generatedBy,
          "date:生成時間:start": nowISO2,
          "date:生成時間:is_datetime": 1,
        },
        content: pageContent,
      });

      const notionUrl = (result as { url?: string })?.url ?? null;
      return { success: true, notionUrl };
    }),

  // ── 知識庫狀態查詢 (所有已審核用戶可讀) ──────────────────────────────────────────
  status: approvedProcedure
    .query(async () => {
      const cacheStatus = getCacheStatus();
      const hasToken = !!process.env.NOTION_API_TOKEN;
      const cache = await import("../notionSyncService").then(m => m.getCurrentCache());
      const frameworks = cache
        ? Object.values(cache.funnelFrameworks).map(f => ({ id: f.id, title: f.title, funnelType: f.funnelType }))
        : Object.values((await import("../notionKnowledge")).EMBEDDED_NOTION_KNOWLEDGE.funnelFrameworks)
            .map(f => ({ id: f.id, title: f.title, funnelType: f.funnelType }));
      return {
        lastSyncAt: cacheStatus.lastSyncAt,
        isStale: cacheStatus.isStale,
        source: cacheStatus.source,
        hasToken,
        hasHookData: cacheStatus.hasHookData,
        hasMethodology: cacheStatus.hasMethodology,
        frameworkCount: cacheStatus.funnelCount,
        frameworks,
        lastAttemptAt: cacheStatus.lastAttemptAt,
        failedPages: cacheStatus.failedPages,
        usedFallback: cacheStatus.usedFallback,
        partialSuccess: cacheStatus.partialSuccess,
      };
    }),

  // 手動強制同步 (admin only) ──────────────────────────────────────────────────
  sync: adminProcedure
    .mutation(async () => {
      try {
        const cache = await syncNotionKnowledge(true);
        const count = Object.keys(cache.funnelFrameworks).length;
        const afterStatus = getCacheStatus();
        return {
          success: true,
          message: `已同步 ${count} 個漏斗框架，來源：${cache.source ?? "api"}`,
          failedPages: afterStatus.failedPages,
          usedFallback: afterStatus.usedFallback,
          partialSuccess: afterStatus.partialSuccess,
        };
      } catch (e) {
        return {
          success: false,
          message: `同步失敗：${e instanceof Error ? e.message : "未知錯誤"}`,
          failedPages: [] as Array<{ pageId: string; label: string; error: string }>,
          usedFallback: false,
          partialSuccess: false,
        };
      }
    }),
});
