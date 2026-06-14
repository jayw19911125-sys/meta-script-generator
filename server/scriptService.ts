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
  getHookKnowledgeText,
  getMethodologySummary,
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
 * 取得 Notion L 系列框架 + A3 Hook 數據（帶快取，失敗不中斷流程）。
 * 若 Notion 無法存取，回傳 null，prompt 自動降級到通用矩陣。
 */
async function getNotionKnowledge(funnelValue: string, industry: string) {
  try {
    const cache = await syncNotionKnowledge();
    const lFramework = getFunnelFramework(cache, funnelValue);
    const hookKnowledgeText = getHookKnowledgeText(cache, industry);
    const methodologySummary = getMethodologySummary(cache);
    return { lFramework, hookKnowledgeText, methodologySummary };
  } catch (e) {
    console.warn("[ScriptService] Notion 快取取得失敗，使用通用矩陣:", e);
    return { lFramework: null, hookKnowledgeText: "", methodologySummary: "" };
  }
}

/** 小工具：只取 lFramework（向下相容） */
async function getLFramework(funnelValue: string) {
  const { lFramework } = await getNotionKnowledge(funnelValue, "");
  return lFramework;
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
  // v3.1：同時注入 L 系列框架 + A3 Hook 數據
  const { lFramework, hookKnowledgeText } = await getNotionKnowledge(input.funnel, input.industry);
  const { scatterVendor, scatterModel } = config;

  const result = await invokeLLM({
    model: scatterModel,
    messages: [
      { role: "system", content: getSystemPrompt(scatterVendor) },
      { role: "user", content: buildGptPrompt(input, lFramework, hookKnowledgeText) },
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
  // v3.1：同時注入 L 系列框架 + H 系列方法論
  const { lFramework, methodologySummary } = await getNotionKnowledge(input.funnel, input.industry);
  const { integrateVendor, integrateModel } = config;

  const result = await invokeLLM({
    model: integrateModel,
    messages: [
      { role: "system", content: getSystemPrompt(integrateVendor) },
      { role: "user", content: buildClaudePrompt(input, hooks, lFramework, methodologySummary) },
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

  // v3.1：預先取得 L 系列框架 + A3 Hook 數據 + H 系列方法論，兩個引擎共用，避免重複呼叫 Notion
  const { lFramework, hookKnowledgeText, methodologySummary } = await getNotionKnowledge(input.funnel, input.industry);

  // Step 1：發散引擎（注入 L 系列 + A3 Hook 數據）
  const scatterResult = await invokeLLM({
    model: scatterModel,
    messages: [
      { role: "system", content: getSystemPrompt(scatterVendor) },
      { role: "user", content: buildGptPrompt(input, lFramework, hookKnowledgeText) },
    ],
    max_tokens: getMaxTokens(scatterVendor),
  });
  const gptOutput = extractText(scatterResult);
  if (!gptOutput.trim()) {
    throw new Error(`發散引擎（${scatterModel}）回傳空內容，請重試`);
  }

  // Step 2：整合引擎（注入 L 系列 + H 系列方法論）
  const integrateResult = await invokeLLM({
    model: integrateModel,
    messages: [
      { role: "system", content: getSystemPrompt(integrateVendor) },
      { role: "user", content: buildClaudePrompt(input, gptOutput, lFramework, methodologySummary) },
    ],
    max_tokens: getMaxTokens(integrateVendor),
  });
  const finalOutput = extractText(integrateResult);
  if (!finalOutput.trim()) {
    throw new Error(`整合引擎（${integrateModel}）回傳空內容，請重試`);
  }

  return { gptOutput, finalOutput };
}

// ========== 3-3-3 矩陣分步生成系統 (Phase 4) ==========
import {
  buildMatrixHookPrompt,
  buildMatrixBodyPrompt,
  buildMatrixCtaPrompt,
  buildMatrixRecommendationPrompt
} from "./prompts";

/**
 * 嘗試將 LLM 輸出的文字解析為 JSON 陣列。
 * 如果 LLM 包了 Markdown 標記，嘗試移除它。
 */
function parseJsonArray<T>(text: string): T[] {
  try {
    let cleanText = text.trim();
    // 移除可能存在的 ```json ... ``` 標記
    if (cleanText.startsWith("\`\`\`json")) {
      cleanText = cleanText.replace(/^\`\`\`json\n/, "").replace(/\n\`\`\`$/, "");
    } else if (cleanText.startsWith("\`\`\`")) {
      cleanText = cleanText.replace(/^\`\`\`\n/, "").replace(/\n\`\`\`$/, "");
    }
    const result = JSON.parse(cleanText);
    if (!Array.isArray(result)) {
      throw new Error("Parsed JSON is not an array");
    }
    return result;
  } catch (e) {
    console.error("[JSON Parse Error] Failed to parse LLM output:", text);
    throw new Error("LLM 未能輸出有效的 JSON 陣列格式，請重試");
  }
}

/**
 * 矩陣生成 Step 1: 產出 3 個 Hook (發散引擎)
 */
export async function generateMatrixHooks(
  input: PromptInput,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
) {
  const lFramework = await getLFramework(input.funnel);
  const { scatterVendor, scatterModel } = config;

  const result = await invokeLLM({
    model: scatterModel,
    messages: [
      { role: "system", content: getSystemPrompt(scatterVendor) },
      { role: "user", content: buildMatrixHookPrompt(input, lFramework) },
    ],
    max_tokens: getMaxTokens(scatterVendor),
  });
  
  const text = extractText(result);
  return parseJsonArray(text);
}

/**
 * 矩陣生成 Step 2: 產出 3 個 Body (整合引擎)
 */
export async function generateMatrixBodies(
  input: PromptInput,
  hooksJson: string,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
) {
  const lFramework = await getLFramework(input.funnel);
  const { integrateVendor, integrateModel } = config;

  const result = await invokeLLM({
    model: integrateModel,
    messages: [
      { role: "system", content: getSystemPrompt(integrateVendor) },
      { role: "user", content: buildMatrixBodyPrompt(input, hooksJson, lFramework) },
    ],
    max_tokens: getMaxTokens(integrateVendor),
  });
  
  const text = extractText(result);
  return parseJsonArray(text);
}

/**
 * 矩陣生成 Step 3: 產出 3 個 CTA (整合引擎)
 */
export async function generateMatrixCtas(
  input: PromptInput,
  bodiesJson: string,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
) {
  const lFramework = await getLFramework(input.funnel);
  const { integrateVendor, integrateModel } = config;

  const result = await invokeLLM({
    model: integrateModel,
    messages: [
      { role: "system", content: getSystemPrompt(integrateVendor) },
      { role: "user", content: buildMatrixCtaPrompt(input, bodiesJson, lFramework) },
    ],
    max_tokens: getMaxTokens(integrateVendor),
  });
  
  const text = extractText(result);
  return parseJsonArray(text);
}

/**
 * 矩陣局部重跑：只重新生成指定 step 的第 targetIndex 張卡片
 * 回傳單一 ScriptModule，不影響其他卡片
 */
export async function rerunSingleCard(
  step: "hook" | "body" | "cta",
  targetIndex: number,
  input: PromptInput,
  contextJson: string, // hooks/bodies JSON for body/cta context
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
) {
  const lFramework = await getLFramework(input.funnel);
  const { scatterVendor, scatterModel, integrateVendor, integrateModel } = config;

  let promptText: string;
  let vendor: "gpt" | "claude";
  let model: string;

  if (step === "hook") {
    vendor = scatterVendor;
    model = scatterModel;
    promptText = `## 任務：只重新生成 Hook ${targetIndex}，其他 Hook 保持不變

### 產品資訊
- 產業：${input.industry}
- 產品：${input.productName}
- 賣點：${input.sellingPoints}
- 受眾：${input.targetAudience}
- 漏斗：${input.funnel}
- 時長：${input.duration} 秒
- 出鏡：${input.appearance}
- 語氣：${input.tone}

### 要求
請只輸出 1 個 Hook 物件（index 固定為 ${targetIndex}），使用與原版完全不同的心理切入角度。

### 輸出格式（只輸出 1 個物件，不是陣列）
{
  "id": "h${targetIndex}",
  "type": "hook",
  "index": ${targetIndex},
  "text": "口白（≤15字）",
  "shotDirection": "畫面建議",
  "soundEffect": "音效與 BGM",
  "performanceNote": "人物動向指令"
}

台灣用語、正體中文、直接輸出純 JSON 物件，不要 Markdown！`;
  } else if (step === "body") {
    vendor = integrateVendor;
    model = integrateModel;
    promptText = `## 任務：只重新生成 Body ${targetIndex}，其他 Body 保持不變

### 產品資訊
- 產業：${input.industry}
- 產品：${input.productName}
- 賣點：${input.sellingPoints}
- 受眾：${input.targetAudience}
- 漏斗：${input.funnel}
- 時長：${input.duration} 秒

### 已有的 Hook 列表（參考用）
${contextJson}

### 要求
請只輸出 1 個 Body 物件（index 固定為 ${targetIndex}），使用與原版完全不同的角度。

### 輸出格式（只輸出 1 個物件，不是陣列）
{
  "id": "b${targetIndex}",
  "type": "body",
  "index": ${targetIndex},
  "text": "口白（≤30字）",
  "shotDirection": "畫面建議",
  "soundEffect": "音效與 BGM",
  "performanceNote": "人物動向指令"
}

台灣用語、正體中文、直接輸出純 JSON 物件，不要 Markdown！`;
  } else {
    vendor = integrateVendor;
    model = integrateModel;
    promptText = `## 任務：只重新生成 CTA ${targetIndex}，其他 CTA 保持不變

### 產品資訊
- 產業：${input.industry}
- 產品：${input.productName}
- 賣點：${input.sellingPoints}
- 受眾：${input.targetAudience}
- 漏斗：${input.funnel}
- 時長：${input.duration} 秒

### 已有的 Body 列表（參考用）
${contextJson}

### 要求
請只輸出 1 個 CTA 物件（index 固定為 ${targetIndex}），使用與原版完全不同的行動呼籲角度。

### 輸出格式（只輸出 1 個物件，不是陣列）
{
  "id": "c${targetIndex}",
  "type": "cta",
  "index": ${targetIndex},
  "text": "口白（≤10字）",
  "shotDirection": "畫面建議",
  "soundEffect": "音效與 BGM",
  "performanceNote": "人物動向指令"
}

台灣用語、正體中文、直接輸出純 JSON 物件，不要 Markdown！`;
  }

  const result = await invokeLLM({
    model,
    messages: [
      { role: "system", content: getSystemPrompt(vendor) },
      { role: "user", content: promptText },
    ],
    max_tokens: getMaxTokens(vendor),
  });

  const text = extractText(result);
  // 嘗試解析單一物件
  try {
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    // fallback: 嘗試從陣列取第一個
    const arr = parseJsonArray(text);
    return arr[0] ?? null;
  }
}

/**
 * 矩陣生成 Step 4: AI 推薦與評分 (整合引擎)
 */
export async function generateMatrixRecommendations(
  input: PromptInput,
  matrixJson: string,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG
) {
  const lFramework = await getLFramework(input.funnel);
  const { integrateVendor, integrateModel } = config;

  const result = await invokeLLM({
    model: integrateModel,
    messages: [
      { role: "system", content: getSystemPrompt(integrateVendor) },
      { role: "user", content: buildMatrixRecommendationPrompt(input, matrixJson, lFramework) },
    ],
    max_tokens: getMaxTokens(integrateVendor),
  });
  
  const text = extractText(result);
  return parseJsonArray(text);
}
