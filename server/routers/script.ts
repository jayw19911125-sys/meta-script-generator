import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
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
  industry: z.string().min(1),
  productName: z.string().min(1),
  sellingPoints: z.string().min(1),
  targetAudience: z.string().min(1),
  funnel: z.string().min(1),
  duration: z.string().min(1),
  appearance: z.string().min(1),
  tone: z.string().min(1),
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

/** 預設引擎配置（頂配），供未傳入 config 時使用 */
const DEFAULT_CONFIG: EngineConfig = {
  scatterVendor: "gpt",
  scatterModel: "gpt-5",
  integrateVendor: "claude",
  integrateModel: "claude-opus-4-7",
  preset: "premium",
};

const engineModeSchema = z.enum(["dual", "claude_only", "gpt_only", "both"]);

// 存庫用的摘要欄位（前端已轉好中文 label）
const saveMetaSchema = z.object({
  productName: z.string().min(1),
  industry: z.string().min(1),
  funnel: z.string().min(1),
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
  generateDual: protectedProcedure
    .input(z.object({
      input: promptInputSchema,
      meta: saveMetaSchema,
      engineConfig: engineConfigSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const config = input.engineConfig ?? DEFAULT_CONFIG;
      const { gptOutput, finalOutput } = await runDualEngine(input.input, config);
      const historyId = await persist(
        ctx.user.id,
        input.meta,
        "dual",
        gptOutput,
        finalOutput,
        input.input
      );
      return { gptOutput, finalOutput, historyId };
    }),

  // ===== 只跑發散引擎 Hook（重新發散，不存庫） =====
  generateHooks: protectedProcedure
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
  integrate: protectedProcedure
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

  // ===== 歷史紀錄 =====
  history: protectedProcedure.query(({ ctx }) =>
    listScriptHistory(ctx.user.id)
  ),

  deleteHistory: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteScriptHistory(ctx.user.id, input.id);
      return { success: true } as const;
    }),
});
