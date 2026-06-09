import "dotenv/config";
import { invokeLLM } from "./server/_core/llm";
import {
  CLAUDE_SYSTEM_PROMPT,
  buildClaudePrompt,
  GPT_SYSTEM_PROMPT,
  buildGptPrompt,
} from "./server/prompts";

const input = {
  industry: "美妝保養",
  productName: "診斷測試品",
  sellingPoints: "30 天有感、無香精",
  targetAudience: "25-40 歲上班族",
  funnel: "冷素材｜停滑層",
  duration: "20",
  appearance: "真人出鏡",
  tone: "親切",
};

async function probeGpt(label: string, maxTokens: number): Promise<string> {
  try {
    const r = await invokeLLM({
      model: "gpt-5",
      messages: [
        { role: "system", content: GPT_SYSTEM_PROMPT },
        { role: "user", content: buildGptPrompt(input) },
      ],
      max_tokens: maxTokens,
    });
    const c = r.choices?.[0]?.message?.content;
    const text = typeof c === "string" ? c : "";
    console.log(`[GPT ${label}] finish=${r.choices?.[0]?.finish_reason}, len=${text.length}`);
    return text;
  } catch (e) {
    console.log(`[GPT ${label}] ERROR: ${e instanceof Error ? e.message.slice(0, 140) : e}`);
    return "";
  }
}

async function probeClaude(label: string, model: string, maxTokens: number, hooks: string) {
  try {
    const r = await invokeLLM({
      model,
      messages: [
        { role: "system", content: CLAUDE_SYSTEM_PROMPT },
        { role: "user", content: buildClaudePrompt(input, hooks) },
      ],
      max_tokens: maxTokens,
    });
    const c = r.choices?.[0]?.message?.content;
    const text = typeof c === "string" ? c : "";
    console.log(`[Claude ${label}] OK finish=${r.choices?.[0]?.finish_reason}, len=${text.length}`);
  } catch (e) {
    console.log(`[Claude ${label}] ERROR: ${e instanceof Error ? e.message.slice(0, 140) : e}`);
  }
}

async function main() {
  const sysLen = CLAUDE_SYSTEM_PROMPT.length;
  console.log(`CLAUDE_SYSTEM_PROMPT chars=${sysLen}\n=== GPT 發散 ===`);
  const hooks = await probeGpt("16000", 16000);
  const useHooks = hooks || "Hook #1 痛點測試\nHook #2 好奇測試\nHook #3 數據測試";
  console.log(`\n=== Claude 整合（hooks len=${useHooks.length}）===`);
  await probeClaude("opus-4-7/8000", "claude-opus-4-7", 8000, useHooks);
  await probeClaude("opus-4-7/4096", "claude-opus-4-7", 4096, useHooks);
  await probeClaude("sonnet-4-6/8000", "claude-sonnet-4-6", 8000, useHooks);
  await probeClaude("opus-4-6/8000", "claude-opus-4-6", 8000, useHooks);
  process.exit(0);
}
main();
