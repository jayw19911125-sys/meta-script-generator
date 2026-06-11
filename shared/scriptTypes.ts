// ========== 前後端共用：腳本生成型別與選項常數 ==========
// 單一真實來源（SSOT）：產業/漏斗/時長/出鏡/語氣 的選項，前後端共用，避免不一致。

export interface PromptInput {
  industry: string;
  productName: string;
  sellingPoints: string;
  targetAudience: string;
  funnel: string;
  duration: string;
  appearance: string;
  tone: string;
}

/** 引擎模式：雙引擎 / 只跑 Claude / 只跑 GPT / 兩個都跑比較 */
export type EngineMode = "dual" | "claude_only" | "gpt_only" | "both";

/** 整合引擎選擇（自訂 Hook 或重新整合時用） */
export type IntegrateEngine = "claude" | "gpt" | "both";

// ========== 雙引擎自由切換：模型清單 ==========

/** GPT 系列可選模型 */
export const GPT_MODELS = [
  { value: "gpt-5",       label: "GPT-5",       tier: "頂配", costHint: "高" },
  { value: "gpt-4o",      label: "GPT-4o",      tier: "標準", costHint: "中" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "輕量", costHint: "低" },
] as const;

/** Claude 系列可選模型 */
export const CLAUDE_MODELS = [
  { value: "claude-opus-4-7",   label: "Claude Opus",   tier: "頂配", costHint: "高" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet", tier: "標準", costHint: "中" },
  { value: "claude-haiku-3-5",  label: "Claude Haiku",  tier: "輕量", costHint: "低" },
] as const;

export type GptModelValue = typeof GPT_MODELS[number]["value"];
export type ClaudeModelValue = typeof CLAUDE_MODELS[number]["value"];

/** 引擎廠商 */
export type EngineVendor = "gpt" | "claude";

/**
 * 引擎配置物件（前後端共用 SSOT）
 * - scatterVendor / scatterModel：發散引擎（Hook 生成）
 * - integrateVendor / integrateModel：整合引擎（Body + CTA + 評分）
 * - preset：使用哪個預設包，custom 代表進階自訂
 */
export interface EngineConfig {
  scatterVendor: EngineVendor;
  scatterModel: string;
  integrateVendor: EngineVendor;
  integrateModel: string;
  preset: "premium" | "standard" | "lite" | "custom";
}

/** 三個預設配置包 */
export const ENGINE_PRESETS = {
  premium: {
    label: "頂配",
    desc: "最強品質，正式廣告素材",
    costHint: "NT$15～17 / 次",
    config: {
      scatterVendor: "gpt" as EngineVendor,
      scatterModel: "gpt-5",
      integrateVendor: "claude" as EngineVendor,
      integrateModel: "claude-opus-4-7",
      preset: "premium" as const,
    },
  },
  standard: {
    label: "標準",
    desc: "品質與速度平衡，日常使用",
    costHint: "NT$2～3 / 次",
    config: {
      scatterVendor: "gpt" as EngineVendor,
      scatterModel: "gpt-4o",
      integrateVendor: "claude" as EngineVendor,
      integrateModel: "claude-sonnet-4-5",
      preset: "standard" as const,
    },
  },
  lite: {
    label: "輕量",
    desc: "快速草稿，大量批次測試",
    costHint: "NT$0.3～0.5 / 次",
    config: {
      scatterVendor: "gpt" as EngineVendor,
      scatterModel: "gpt-4o-mini",
      integrateVendor: "claude" as EngineVendor,
      integrateModel: "claude-haiku-3-5",
      preset: "lite" as const,
    },
  },
} as const;

/** 預設配置包的 key 型別 */
export type PresetKey = keyof typeof ENGINE_PRESETS;

/** 預設引擎配置（頂配） */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = ENGINE_PRESETS.premium.config;

// ========== 產業 / 漏斗 / 時長 / 出鏡 / 語氣 ==========

export const INDUSTRIES = [
  { value: "ecommerce", label: "電商（服飾/配件）" },
  { value: "beauty", label: "美妝保養" },
  { value: "food", label: "餐飲" },
  { value: "fitness", label: "健身/保健" },
  { value: "education", label: "教育/課程" },
  { value: "realestate", label: "房地產/室內設計" },
  { value: "saas", label: "SaaS/工具" },
  { value: "local", label: "本地服務" },
] as const;

export const FUNNELS = [
  { value: "cold", label: "冷素材｜停滑層（降低防禦、停下滑動）" },
  { value: "warm", label: "暖素材｜信任層（痛點共鳴、建立信任）" },
  { value: "hot", label: "熱素材｜行動層（消除猶豫、觸發行動）" },
] as const;

export const DURATIONS = [
  { value: "15", label: "15 秒" },
  { value: "20", label: "20 秒" },
  { value: "25", label: "25 秒" },
  { value: "30", label: "30 秒" },
  { value: "45", label: "45 秒" },
] as const;

export const APPEARANCES = [
  { value: "person", label: "真人出鏡" },
  { value: "hands", label: "只露手" },
  { value: "voiceover", label: "不露臉旁白" },
  { value: "multi", label: "多人" },
] as const;

export const TONES = [
  { value: "professional", label: "專業" },
  { value: "friendly", label: "親切" },
  { value: "humorous", label: "幽默" },
  { value: "urgent", label: "急迫" },
  { value: "storytelling", label: "故事感" },
] as const;

/** 把 value 轉成中文 label 的小工具（找不到就回傳原值） */
export function toLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string
): string {
  return options.find(o => o.value === value)?.label ?? value;
}
