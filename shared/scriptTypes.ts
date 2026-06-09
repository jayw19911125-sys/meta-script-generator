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
