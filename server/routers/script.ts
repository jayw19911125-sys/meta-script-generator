import { z } from "zod";
import { approvedProcedure, router } from "../_core/trpc";
import { saveScriptToNotion } from "../notionWriteService";
import type { NotionSaveInput } from "../notionWriteService";
import { runPostSaveNotifications } from "../notifyService";
import {
  deleteScriptHistory,
  insertScriptHistory,
  listScriptHistory,
} from "../db";
import {
  generateHooks,
  integrateWithClaude,
  integrateWithGpt,
  runDualEngine,
} from "../scriptService";
import type { EngineConfig } from "@shared/scriptTypes";

// ========== 輸入驗證 schema ==========
const promptInputSchema = z.object({
  industry: z.string().min(1).max(100),
  productName: z.string().min(1).max(200),
  sellingPoints: z.string().min(1).max(2000),
  targetAudience: z.string().min(1).max(1000),
  funnel: z.string().min(1).max(100),
  duration: z.string().min(1).max(50),
  appearance: z.string().min(1).max(100),
  tone: z.string().min(1).max(100),
});

/**
 * 引擎配置 schema（前後端共用 EngineConfig 型別的 zod 版本）
 * 發散引擎與整合引擎各自獨立，可選任意廠商與模型。
 */
const engineConfigSchema = z.object({
  scatterVendor: z.enum(["gpt", "claude"]),
  scatterModel: z.string().min(1),
  integrateVendor: z.enum(["gpt", "claude"]),
  integrateModel: z.string().min(1),
  preset: z.enum(["premium", "standard", "lite", "custom"]),
});

/** 預設引擎配置（頂配），供未傳入 config 時使用。
 * 注意：此處特意保留頂配預設（premium）而非共用的 standard，
 * 因為從後端直接呼叫的情境（如測試、排程任務）應使用最高品質。
 */
const DEFAULT_CONFIG: EngineConfig = {
  scatterVendor: "gpt",
  scatterModel: "gpt-5",
  integrateVendor: "claude",
  integrateModel: "claude-opus-4-6",  // 對齊 shared scriptTypes CLAUDE_MODELS
  preset: "premium",
};

const engineModeSchema = z.enum(["dual", "claude_only", "gpt_only", "both"]);

// 存庫用的摘要欄位（前端已轉好中文 label）
const saveMetaSchema = z.object({
  productName: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  funnel: z.string().min(1).max(100),
});

/** 統一的存庫邏輯：把一次生成結果寫入 DB。 */
async function persist(
  userId: number,
  meta: z.infer<typeof saveMetaSchema>,
  engine: z.infer<typeof engineModeSchema>,
  gptOutput: string | null,
  finalOutput: string,
  inputSnapshot: unknown
): Promise<number | null> {
  return insertScriptHistory({
    userId,
    productName: meta.productName,
    industry: meta.industry,
    funnel: meta.funnel,
    engine,
    gptOutput,
    finalOutput,
    inputSnapshot: JSON.stringify(inputSnapshot),
  });
}

export const scriptRouter = router({
  // ===== 完整雙引擎：發散引擎 → 整合引擎，並自動存庫 =====
  generateDual: approvedProcedure
    .input(z.object({
      input: promptInputSchema,
      meta: saveMetaSchema,
      engineConfig: engineConfigSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const config = input.engineConfig ?? DEFAULT_CONFIG;
      const { gptOutput, finalOutput, knowledgeHit, quality } = await runDualEngine(input.input, config);
      const historyId = await persist(
        ctx.user.id,
        input.meta,
        "dual",
        gptOutput,
        finalOutput,
        input.input
      );
      return { gptOutput, finalOutput, historyId, knowledgeHit, quality };
    }),

  // ===== 只跑發散引擎 Hook（重新發散，不存庫） =====
  generateHooks: approvedProcedure
    .input(z.object({
      input: promptInputSchema,
      engineConfig: engineConfigSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const config = input.engineConfig ?? DEFAULT_CONFIG;
      const gptOutput = await generateHooks(input.input, config);
      return { gptOutput };
    }),

  // ===== 用既有 Hook 整合（claude / gpt / both），並自動存庫 =====
  integrate: approvedProcedure
    .input(
      z.object({
        input: promptInputSchema,
        hooks: z.string().min(1),
        engine: z.enum(["claude", "gpt", "both"]),
        meta: saveMetaSchema,
        engineConfig: engineConfigSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const config = input.engineConfig ?? DEFAULT_CONFIG;
      const needClaude = input.engine === "claude" || input.engine === "both";
      const needGpt = input.engine === "gpt" || input.engine === "both";

      let claudeResult = "";
      let gptResult = "";

      if (needClaude) {
        claudeResult = await integrateWithClaude(input.input, input.hooks, config);
      }
      if (needGpt) {
        gptResult = await integrateWithGpt(input.input, input.hooks, config);
      }

      let finalOutput = "";
      if (needClaude && needGpt) {
        finalOutput = `# 🟢 整合引擎 A（${config.integrateModel}）\n\n${claudeResult}\n\n---\n\n# 🟡 整合引擎 B（${config.integrateModel}）\n\n${gptResult}`;
      } else if (needClaude) {
        finalOutput = claudeResult;
      } else {
        finalOutput = gptResult;
      }

      const engineMode =
        input.engine === "both"
          ? ("both" as const)
          : input.engine === "claude"
            ? ("claude_only" as const)
            : ("gpt_only" as const);

      const historyId = await persist(
        ctx.user.id,
        input.meta,
        engineMode,
        input.hooks,
        finalOutput,
        input.input
      );

      return { finalOutput, historyId };
    }),

  // ===== 一鍵存入 Notion B2 客戶腳本庫 =====
  saveToNotion: approvedProcedure
    .input(z.object({
      clientName: z.string().min(1, "客戶名稱不能為空"),
      projectType: z.string().min(1),
      industry: z.string().min(1),
      funnel: z.string().min(1),
      duration: z.string().min(1),
      appearance: z.string().min(1),
      tone: z.string().min(1),
      targetAudience: z.string().min(1),
      sellingPoints: z.string().min(1),
      scriptCount: z.number().int().min(1).max(20).default(1),
      finalOutput: z.string().min(1, "腳本內容不能為空"),
      gptOutput: z.string().optional(),
      engineMode: z.string().min(1),
      historyId: z.number().int().positive().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const saveInput: NotionSaveInput = {
        clientName: input.clientName,
        projectType: input.projectType,
        industry: input.industry,
        funnel: input.funnel,
        duration: input.duration,
        appearance: input.appearance,
        tone: input.tone,
        targetAudience: input.targetAudience,
        sellingPoints: input.sellingPoints,
        scriptCount: input.scriptCount,
        finalOutput: input.finalOutput,
        gptOutput: input.gptOutput,
        engineMode: input.engineMode,
        historyId: input.historyId,
      };
      const result = await saveScriptToNotion(saveInput);
      if (!result.success) {
        throw new Error(result.error ?? "存入 Notion 失敗，請稍後再試");
      }

      // 後置通知：非同步執行，不阻塞回應（失敗不影響主流程）
      const notifyResult = await runPostSaveNotifications({
        clientName: input.clientName,
        scriptCount: input.scriptCount,
        projectType: input.projectType,
        parentPageUrl: result.parentPageUrl!,
        clientPageUrl: result.clientPageUrl!,
        execPageUrl: result.execPageUrl!,
      });

      return {
        success: true,
        parentPageUrl: result.parentPageUrl!,
        clientPageUrl: result.clientPageUrl!,
        execPageUrl: result.execPageUrl!,
        // 通知狀態（供前端顯示）
        slackSent: notifyResult.slackSent,
        mondayUpdated: notifyResult.mondayUpdated,
        mondayItemName: notifyResult.mondayItemName,
      };
    }),

  // ===== 歷史紀錄 =====
  history: approvedProcedure
    .input(z.object({
      keyword: z.string().max(200).optional(),
      funnel: z.string().max(100).optional(),
      dateFrom: z.string().max(20).optional(),
      dateTo: z.string().max(20).optional(),
    }).optional())
    .query(({ ctx, input }) =>
      listScriptHistory(ctx.user.id, 50, input ?? {})
    ),

  deleteHistory: approvedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteScriptHistory(ctx.user.id, input.id);
      return { success: true } as const;
    }),
});

// ========== 3-3-3 矩陣生成系統 API (Phase 5) ==========
import {
  generateMatrixHooks,
  generateMatrixBodies,
  generateMatrixCtas,
  generateMatrixRecommendations,
  rerunSingleCard,
} from "../scriptService";

export const matrixRouter = router({
  // Step 1: 產出 3 個 Hook
  generateHooks: approvedProcedure
    .input(z.object({
      input: promptInputSchema,
      engineConfig: engineConfigSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const config = input.engineConfig ?? DEFAULT_CONFIG;
      return await generateMatrixHooks(input.input, config);
    }),

  // Step 2: 產出 3 個 Body
  generateBodies: approvedProcedure
    .input(z.object({
      input: promptInputSchema,
      hooksJson: z.string(),
      engineConfig: engineConfigSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const config = input.engineConfig ?? DEFAULT_CONFIG;
      return await generateMatrixBodies(input.input, input.hooksJson, config);
    }),

  // Step 3: 產出 3 個 CTA
  generateCtas: approvedProcedure
    .input(z.object({
      input: promptInputSchema,
      bodiesJson: z.string(),
      engineConfig: engineConfigSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const config = input.engineConfig ?? DEFAULT_CONFIG;
      return await generateMatrixCtas(input.input, input.bodiesJson, config);
    }),

  // Step 4: AI 推薦與評分
  generateRecommendations: approvedProcedure
    .input(z.object({
      input: promptInputSchema,
      matrixJson: z.string(),
      engineConfig: engineConfigSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const config = input.engineConfig ?? DEFAULT_CONFIG;
      return await generateMatrixRecommendations(input.input, input.matrixJson, config);
    }),

  // 局部重跑：只重新生成指定卡片，回傳單一 ScriptModule
  rerunCard: approvedProcedure
    .input(z.object({
      step: z.enum(["hook", "body", "cta"]),
      targetIndex: z.number().int().min(1).max(3),
      input: promptInputSchema,
      contextJson: z.string().default(""),
      engineConfig: engineConfigSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const config = input.engineConfig ?? DEFAULT_CONFIG;
      return await rerunSingleCard(
        input.step,
        input.targetIndex,
        input.input,
        input.contextJson,
        config
      );
    }),
});
