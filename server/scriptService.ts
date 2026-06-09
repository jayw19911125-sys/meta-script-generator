// ========== 後端腳本生成服務 ==========
// 封裝雙引擎（GPT 發散 + Claude 整合）的 LLM 呼叫邏輯。
// 所有 API 金鑰與知識底層 prompts 都留在後端，用戶免填任何 Key。

import { invokeLLM } from "./_core/llm";
import {
  CLAUDE_SYSTEM_PROMPT,
  GPT_SYSTEM_PROMPT,
  buildGptPrompt,
  buildClaudePrompt,
  buildGptIntegratePrompt,
} from "./prompts";
import type { PromptInput } from "@shared/scriptTypes";

// 平台可用模型（2026-06 經 /v1/models 實測確認）。
// GPT 引擎：負責高創意發散，用 gpt-5。
// Claude 引擎：負責嚴謹整合與評分，用 claude-opus-4-7（最強整合能力）。
const GPT_MODEL = "gpt-5";
const CLAUDE_MODEL = "claude-opus-4-7";

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
 * Step 1：GPT 發散引擎 — 產出 12 個不同概念的 Hook 草稿。
 * gpt-5 為推理型模型，不接受 temperature 自訂，以預設參數運作。
 */
export async function generateHooks(input: PromptInput): Promise<string> {
  const result = await invokeLLM({
    model: GPT_MODEL,
    messages: [
      { role: "system", content: GPT_SYSTEM_PROMPT },
      { role: "user", content: buildGptPrompt(input) },
    ],
    max_tokens: 4000,
  });
  const text = extractText(result);
  if (!text.trim()) {
    throw new Error("GPT 發散引擎回傳空內容，請重試");
  }
  return text;
}

/**
 * Step 2：Claude 整合引擎 — 篩選最強 3 個 Hook、補完指令、撰寫 Body/CTA、評分。
 * 輸入為 GPT 產出的 Hook 草稿（或用戶自訂 Hook）。
 */
export async function integrateWithClaude(
  input: PromptInput,
  hooks: string
): Promise<string> {
  const result = await invokeLLM({
    model: CLAUDE_MODEL,
    messages: [
      { role: "system", content: CLAUDE_SYSTEM_PROMPT },
      { role: "user", content: buildClaudePrompt(input, hooks) },
    ],
    max_tokens: 8000,
  });
  const text = extractText(result);
  if (!text.trim()) {
    throw new Error("Claude 整合引擎回傳空內容，請重試");
  }
  return text;
}

/**
 * 替代整合引擎：用 GPT 整合 Hook 成完整模組化矩陣。
 * 供「送 GPT 整合」與「兩個都跑比較」使用。
 */
export async function integrateWithGpt(
  input: PromptInput,
  hooks: string
): Promise<string> {
  const result = await invokeLLM({
    model: GPT_MODEL,
    messages: [
      { role: "system", content: GPT_SYSTEM_PROMPT },
      { role: "user", content: buildGptIntegratePrompt(input, hooks) },
    ],
    max_tokens: 8000,
  });
  const text = extractText(result);
  if (!text.trim()) {
    throw new Error("GPT 整合引擎回傳空內容，請重試");
  }
  return text;
}

/**
 * 完整雙引擎流程：GPT 發散 → Claude 整合。
 * 回傳 hook 草稿與最終整合腳本，供前端顯示與存庫。
 */
export async function runDualEngine(
  input: PromptInput
): Promise<{ gptOutput: string; finalOutput: string }> {
  const gptOutput = await generateHooks(input);
  const finalOutput = await integrateWithClaude(input, gptOutput);
  return { gptOutput, finalOutput };
}
