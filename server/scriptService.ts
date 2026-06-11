// ========== 後端腳本生成服務 ==========
// 封裝雙引擎（GPT 發散 + Claude 整合）的 LLM 呼叫邏輯。
// 所有 API 金鑰與知識底層 prompts 都留在後端，用戶免填任何 Key。
// v2.1：整合 Notion 知識快取層，動態注入 L 系列漏斗框架。

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
import type { PromptInput } from "@shared/scriptTypes";

// ========== 模型常數 ==========
// 預設使用頂配（gpt-5 + claude-opus-4-7），未來可透過 PromptInput 動態切換。
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
 * Step 1：GPT 發散引擎 — 產出 12 個不同概念的 Hook 草稿。
 * gpt-5 為推理型模型，不接受 temperature 自訂，以預設參數運作。
 * v2.1：動態注入 Notion L 系列漏斗框架。
 */
export async function generateHooks(input: PromptInput): Promise<string> {
  const lFramework = await getLFramework(input.funnel);

  const result = await invokeLLM({
    model: GPT_MODEL,
    messages: [
      { role: "system", content: GPT_SYSTEM_PROMPT },
      { role: "user", content: buildGptPrompt(input, lFramework) },
    ],
    // gpt-5 為推理型模型，reasoning token 先消耗 max_tokens；
    // 需給足總額（推理 + 輸出），否則 content 回傳空字串。
    max_tokens: 16000,
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
 * v2.1：動態注入 Notion L 系列漏斗框架。
 */
export async function integrateWithClaude(
  input: PromptInput,
  hooks: string
): Promise<string> {
  const lFramework = await getLFramework(input.funnel);

  const result = await invokeLLM({
    model: CLAUDE_MODEL,
    messages: [
      { role: "system", content: CLAUDE_SYSTEM_PROMPT },
      { role: "user", content: buildClaudePrompt(input, hooks, lFramework) },
    ],
    max_tokens: 16000,
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
 * v2.1：動態注入 Notion L 系列漏斗框架。
 */
export async function integrateWithGpt(
  input: PromptInput,
  hooks: string
): Promise<string> {
  const lFramework = await getLFramework(input.funnel);

  const result = await invokeLLM({
    model: GPT_MODEL,
    messages: [
      { role: "system", content: GPT_SYSTEM_PROMPT },
      { role: "user", content: buildGptIntegratePrompt(input, hooks, lFramework) },
    ],
    max_tokens: 16000,
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
 * v2.1：兩個引擎共用同一次 Notion 快取，避免重複拉取。
 */
export async function runDualEngine(
  input: PromptInput
): Promise<{ gptOutput: string; finalOutput: string }> {
  // 預先取得 L 系列框架，兩個引擎共用，避免重複呼叫 Notion
  const lFramework = await getLFramework(input.funnel);

  // Step 1：GPT 發散
  const gptResult = await invokeLLM({
    model: GPT_MODEL,
    messages: [
      { role: "system", content: GPT_SYSTEM_PROMPT },
      { role: "user", content: buildGptPrompt(input, lFramework) },
    ],
    max_tokens: 16000,
  });
  const gptOutput = extractText(gptResult);
  if (!gptOutput.trim()) {
    throw new Error("GPT 發散引擎回傳空內容，請重試");
  }

  // Step 2：Claude 整合
  const claudeResult = await invokeLLM({
    model: CLAUDE_MODEL,
    messages: [
      { role: "system", content: CLAUDE_SYSTEM_PROMPT },
      { role: "user", content: buildClaudePrompt(input, gptOutput, lFramework) },
    ],
    max_tokens: 16000,
  });
  const finalOutput = extractText(claudeResult);
  if (!finalOutput.trim()) {
    throw new Error("Claude 整合引擎回傳空內容，請重試");
  }

  return { gptOutput, finalOutput };
}
