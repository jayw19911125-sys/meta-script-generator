// ========== 後端腳本生成服務 ==========
// 封裝雙引擎（發散 + 整合）的 LLM 呼叫邏輯。
// 所有 API 金鑰與知識底層 prompts 都留在後端，用戶免填任何 Key。
// v3.0：支援 EngineConfig 動態模型切換（頂配/標準/輕量/自訂）。
//        整合 Notion 知識快取層，動態注入 L 系列漏斗框架。

import { invokeLLM } from "./_core/llm";
import {
  CLAUDE_SYSTEM_PROMPT,
  GPT_SYSTEM_PROMPT,
  buildGptPrompt,
  buildClaudePrompt,
  buildGptIntegratePrompt,
} from "./prompts";
import {
  syncNotionKnowledge,
  getFunnelFramework,
} from "./notionSyncService";
import type { PromptInput, EngineConfig } from "@shared/scriptTypes";
import { DEFAULT_ENGINE_CONFIG } from "@shared/scriptTypes";

// ========== 模型安全 max_tokens 設定 ==========
// gpt-5 為推理型模型，reasoning token 先消耗 max_tokens，需給足 16000。
// Claude 非推理型，16000 確保長腳本不被截斷。
const GPT_MAX_TOKENS = 16000;
const CLAUDE_MAX_TOKENS = 16000;

/** 根據廠商決定 max_tokens 安全值 */
function getMaxTokens(vendor: "gpt" | "claude"): number {
  return vendor === "gpt" ? GPT_MAX_TOKENS : CLAUDE_MAX_TOKENS;
}

/** 根據廠商決定要使用的 system prompt */
function getSystemPrompt(vendor: "gpt" | "claude"): string {
  return vendor === "gpt" ? GPT_SYSTEM_PROMPT : CLAUDE_SYSTEM_PROMPT;
}

/** 從 LLM 回應安全取出文字內容。 */
function extractText(result: Awaited<ReturnType<typeof invokeLLM>>): string {
  const content = result.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(part => (part.type === "text" ? part.text : ""))
      .join("");
  }
  return "";
}

/**
 * 取得 Notion L 系列框架（帶快取，失敗不中斷流程）。
 * 若 Notion 無法存取，回傳 null，prompt 自動降級到通用矩陣。
 */
async function getLFramework(funnelValue: string) {
  try {
    const cache = await syncNotionKnowledge();
    return getFunnelFramework(cache, funnelValue);
  } catch (e) {
    console.warn("[ScriptService] Notion 快取取得失敗，使用通用矩陣:", e);
    return null;
  }
}

/**
 * Step 1：發散引擎 — 產出 12 個不同概念的 Hook 草稿。
 * 支援任意廠商（GPT / Claude）與模型，由 EngineConfig 控制。
 * v3.0：動態注入 Notion L 系列漏斗框架。
 */
export async function generateHooks(
  input: PromptInput,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): Promise<string> {
  const lFramework = await getLFramework(input.funnel);
  const { scatterVendor, scatterModel } = config;

  const result = await invokeLLM({
    model: scatterModel,
    messages: [
      { role: "system", content: getSystemPrompt(scatterVendor) },
      { role: "user", content: buildGptPrompt(input, lFramework) },
    ],
    max_tokens: getMaxTokens(scatterVendor),
  });
  const text = extractText(result);
  if (!text.trim()) {
    throw new Error(`發散引擎（${scatterModel}）回傳空內容，請重試`);
  }
  return text;
}

/**
 * Step 2：Claude 整合引擎 — 篩選最強 3 個 Hook、補完指令、撰寫 Body/CTA、評分。
 * 輸入為發散引擎產出的 Hook 草稿（或用戶自訂 Hook）。
 * v3.0：支援動態模型，動態注入 Notion L 系列漏斗框架。
 */
export async function integrateWithClaude(
  input: PromptInput,
  hooks: string,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): Promise<string> {
  const lFramework = await getLFramework(input.funnel);
  const { integrateVendor, integrateModel } = config;

  const result = await invokeLLM({
    model: integrateModel,
    messages: [
      { role: "system", content: getSystemPrompt(integrateVendor) },
      { role: "user", content: buildClaudePrompt(input, hooks, lFramework) },
    ],
    max_tokens: getMaxTokens(integrateVendor),
  });
  const text = extractText(result);
  if (!text.trim()) {
    throw new Error(`整合引擎（${integrateModel}）回傳空內容，請重試`);
  }
  return text;
}

/**
 * 替代整合引擎：用 GPT 整合 Hook 成完整模組化矩陣。
 * 供「送 GPT 整合」與「兩個都跑比較」使用。
 * v3.0：支援動態模型，動態注入 Notion L 系列漏斗框架。
 */
export async function integrateWithGpt(
  input: PromptInput,
  hooks: string,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): Promise<string> {
  const lFramework = await getLFramework(input.funnel);
  // integrateWithGpt 固定使用整合引擎設定（integrateVendor/integrateModel）
  const { integrateVendor, integrateModel } = config;

  const result = await invokeLLM({
    model: integrateModel,
    messages: [
      { role: "system", content: getSystemPrompt(integrateVendor) },
      { role: "user", content: buildGptIntegratePrompt(input, hooks, lFramework) },
    ],
    max_tokens: getMaxTokens(integrateVendor),
  });
  const text = extractText(result);
  if (!text.trim()) {
    throw new Error(`整合引擎（${integrateModel}）回傳空內容，請重試`);
  }
  return text;
}

/**
 * 完整雙引擎流程：發散引擎 → 整合引擎。
 * 回傳 hook 草稿與最終整合腳本，供前端顯示與存庫。
 * v3.0：支援 EngineConfig 動態配置，兩個引擎共用同一次 Notion 快取。
 */
export async function runDualEngine(
  input: PromptInput,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
): Promise<{ gptOutput: string; finalOutput: string }> {
  const { scatterVendor, scatterModel, integrateVendor, integrateModel } = config;

  // 預先取得 L 系列框架，兩個引擎共用，避免重複呼叫 Notion
  const lFramework = await getLFramework(input.funnel);

  // Step 1：發散引擎
  const scatterResult = await invokeLLM({
    model: scatterModel,
    messages: [
      { role: "system", content: getSystemPrompt(scatterVendor) },
      { role: "user", content: buildGptPrompt(input, lFramework) },
    ],
    max_tokens: getMaxTokens(scatterVendor),
  });
  const gptOutput = extractText(scatterResult);
  if (!gptOutput.trim()) {
    throw new Error(`發散引擎（${scatterModel}）回傳空內容，請重試`);
  }

  // Step 2：整合引擎
  const integrateResult = await invokeLLM({
    model: integrateModel,
    messages: [
      { role: "system", content: getSystemPrompt(integrateVendor) },
      { role: "user", content: buildClaudePrompt(input, gptOutput, lFramework) },
    ],
    max_tokens: getMaxTokens(integrateVendor),
  });
  const finalOutput = extractText(integrateResult);
  if (!finalOutput.trim()) {
    throw new Error(`整合引擎（${integrateModel}）回傳空內容，請重試`);
  }

  return { gptOutput, finalOutput };
}
