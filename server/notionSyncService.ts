// ========== Notion 知識快取層 v2.0 ==========
// 從 Notion 動態拉取腳本框架知識，建立本地快取供 prompts.ts 使用。
// 設計原則：Notion 是唯一真實來源（SSOT）。
// v2.0 新增：
//   - A3 開頭鉤子庫（108 筆 Hook 數據分析）
//   - H 系列框架（爆款方法論知識庫）
//   - 快取結構擴充：hookData + methodologyData
import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { EMBEDDED_NOTION_KNOWLEDGE } from "./notionKnowledge";
import { insertNotionSyncLog } from "./db";

// ========== 快取檔案路徑 ==========
const CACHE_DIR = path.join(process.cwd(), ".notion-cache");
const CACHE_FILE = path.join(CACHE_DIR, "knowledge.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小時後視為過期

// ========== Notion 頁面 ID 對照表 ==========
const NOTION_PAGE_IDS = {
  // L 系列：漏斗廣告腳本框架
  L01: "37997a06-fae5-81d6-9837-c8b6c1dd242d", // 冷受眾廣告腳本
  L02: "37997a06-fae5-8109-801f-d3835ed6fa6e", // 暖受眾再行銷腳本
  L03: "37997a06-fae5-8191-9536-e1f3aff7c48e", // 熱受眾轉換腳本

  // A3：108 筆開頭鉤子庫數據分析（腳本生成器核心數據）
  A3_HOOK_DATA: "37997a06-fae5-815d-b375-ef4353b4d362",

  // H 系列：爆款方法論知識庫
  H_METHODOLOGY: "37b97a06-fae5-819e-b37a-f3f13be3f8c4", // 33｜短影音爆款方法論知識庫
} as const;

// ========== 快取資料結構 ==========
export interface FunnelFramework {
  id: string;
  title: string;
  hookFormula: string;
  bodyStructure: string;
  ctaTemplate: string;
  aiPrompt: string;
  example: string;
  algorithmNote: string;
  funnelType: "cold" | "warm" | "hot";
}

export interface HookDataEntry {
  industry: string;
  bestHookType: string;
  retentionRate: string;
  secondChoice: string;
  secondRetentionRate: string;
}

export interface HookKnowledge {
  industryBestHooks: HookDataEntry[];
  top5Combinations: string[];
  avoidCombinations: string[];
  overallRanking: Array<{ rank: number; hookType: string; avgRetention: string }>;
  rawText: string; // 完整原始文字，供 Prompt 直接使用
}

export interface MethodologyKnowledge {
  title: string;
  rawText: string; // 完整原始文字，供 Prompt 直接使用
}

export interface NotionKnowledgeCache {
  lastSyncAt: string;
  source?: "api" | "disk" | "embedded";
  funnelFrameworks: Record<string, FunnelFramework>;
  hookKnowledge: HookKnowledge | null;
  methodologyKnowledge: MethodologyKnowledge | null;
}

// ========== 記憶體快取 ==========
let memoryCache: NotionKnowledgeCache | null = null;

// ========== 同步錯誤記錄 ==========
interface SyncAttemptRecord {
  attemptAt: string;
  failedPages: Array<{ pageId: string; label: string; error: string }>;
  usedFallback: boolean;
  partialSuccess: boolean; // 部分頁面成功
}
let lastSyncAttempt: SyncAttemptRecord | null = null;

// ========== 從 Notion 拉取單一頁面（指數退避重試，最多 2 次）==========
function sleep(ms: number): void {
  // 同步等待（利用 spawnSync sleep）
  spawnSync("sleep", [String(ms / 1000)]);
}

function fetchNotionPage(pageId: string, maxRetries = 2): { text: string; error: string | null } {
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt - 1) * 2000; // 2s, 4s
      console.log(`[NotionSync] 第 ${attempt} 次重試頁面 ${pageId}，等待 ${delay}ms...`);
      sleep(delay);
    }

    try {
      const tmpFile = path.join("/tmp", `notion_fetch_${Date.now()}.json`);
      fs.writeFileSync(tmpFile, JSON.stringify({ id: pageId }), "utf-8");
      const result = execSync(
        `manus-mcp-cli tool call notion-fetch --server notion --input "$(cat ${tmpFile})"`,
        { encoding: "utf-8", timeout: 40000, shell: "/bin/bash" }
      );
      try { fs.unlinkSync(tmpFile); } catch { /* 忽略清除失敗 */ }

      const match = result.match(/Tool execution result:\n([\s\S]+)/);
      if (!match) {
        lastError = "回應格式異常，無法解析 Tool execution result";
        continue; // 重試
      }
      const parsed = JSON.parse(match[1].trim());
      if (!parsed.text) {
        // 頁面未授權或不存在：不重試（重試也不會成功）
        return { text: "", error: "Notion 回傳內容為空（頁面未授權或不存在）" };
      }
      return { text: parsed.text, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = msg.split("\n")[0].slice(0, 120);
      console.warn(`[NotionSync] 頁面 ${pageId} 第 ${attempt + 1} 次失敗: ${lastError}`);
    }
  }

  console.error(`[NotionSync] 頁面 ${pageId} 重試 ${maxRetries} 次後仍失敗`);
  return { text: "", error: lastError ?? "未知錯誤" };
}

// ========== 工具：提取 ## 段落 ==========
function extractSection(text: string, sectionTitle: string): string {
  const regex = new RegExp(
    `##\\s*${sectionTitle}[\\s\\S]*?(?=\\n##|$)`,
    "i"
  );
  const match = text.match(regex);
  return match ? match[0].replace(/^##\s*[^\n]+\n/, "").trim() : "";
}

// ========== 解析 L 系列頁面 ==========
function parseLFramework(
  id: string,
  text: string,
  funnelType: "cold" | "warm" | "hot"
): FunnelFramework {
  const contentMatch = text.match(/<content>([\s\S]+?)<\/content>/);
  const content = contentMatch ? contentMatch[1] : text;

  const aiPromptSection = extractSection(content, "AI Prompt");
  const exampleSection = extractSection(content, "完整腳本範例");
  const algorithmSection = extractSection(content, "演算法原理");

  const hookMatch = content.match(/###\s*前3秒 Hook[\s\S]*?「([^」]+)」/);
  const hookFormula = hookMatch ? hookMatch[1] : "";

  const bodyMatch = content.match(/###\s*主體內容([\s\S]*?)(?=###|##|$)/);
  const bodyStructure = bodyMatch ? bodyMatch[1].trim() : "";

  const ctaMatch = content.match(/###\s*結尾 CTA[\s\S]*?「([^」]+)」/);
  const ctaTemplate = ctaMatch ? ctaMatch[1] : "";

  const aiPromptClean = aiPromptSection
    .replace(/\（複製給 AI 使用\）/g, "")
    .trim();

  const titleMap: Record<string, string> = {
    L01: "L01｜冷受眾廣告腳本",
    L02: "L02｜暖受眾再行銷腳本",
    L03: "L03｜熱受眾轉換腳本",
  };

  return {
    id,
    title: titleMap[id] || id,
    hookFormula,
    bodyStructure,
    ctaTemplate,
    aiPrompt: aiPromptClean,
    example: exampleSection,
    algorithmNote: algorithmSection,
    funnelType,
  };
}

// ========== 解析 A3 Hook 數據頁面 ==========
function parseHookKnowledge(text: string): HookKnowledge {
  const contentMatch = text.match(/<content>([\s\S]+?)<\/content>/);
  const content = contentMatch ? contentMatch[1] : text;

  // 解析各產業最佳鉤子配對表
  const industryBestHooks: HookDataEntry[] = [];
  const tableRows = Array.from(content.matchAll(/<tr>\n<td>([^<]+)<\/td>\n<td>([^<]+)<\/td>\n<td>([^<]+)<\/td>\n<td>([^<]+)<\/td>\n<td>([^<]+)<\/td>\n<\/tr>/g));
  for (const row of tableRows) {
    const [, industry, bestHookType, retentionRate, secondChoice, secondRetentionRate] = row;
    if (industry !== "產業") { // 跳過表頭
      industryBestHooks.push({ industry, bestHookType, retentionRate, secondChoice, secondRetentionRate });
    }
  }

  // 解析 Top 5 組合
  const top5Section = extractSection(content, "最強組合 Top 5");
  const top5Combinations = top5Section
    .split("\n")
    .filter(l => l.match(/^\d+\./))
    .map(l => l.replace(/^\d+\.\s*\*\*/, "").replace(/\*\*/, "").trim());

  // 解析需避免的組合
  const avoidSection = extractSection(content, "需避免的組合");
  const avoidCombinations = avoidSection
    .split("\n")
    .filter(l => l.match(/^\d+\./))
    .map(l => l.replace(/^\d+\.\s*\*\*/, "").replace(/\*\*/, "").trim());

  // 解析整體排名
  const overallRanking: Array<{ rank: number; hookType: string; avgRetention: string }> = [];
  const rankRows = Array.from(content.matchAll(/<tr>\n<td>(\d+)<\/td>\n<td>([^<]+)<\/td>\n<td>([^<]+)<\/td>/g));
  for (const row of rankRows) {
    const [, rank, hookType, avgRetention] = row;
    overallRanking.push({ rank: parseInt(rank), hookType, avgRetention });
  }

  return {
    industryBestHooks,
    top5Combinations,
    avoidCombinations,
    overallRanking,
    rawText: content,
  };
}

// ========== 解析 H 系列方法論頁面 ==========
function parseMethodologyKnowledge(text: string): MethodologyKnowledge {
  const contentMatch = text.match(/<content>([\s\S]+?)<\/content>/);
  const content = contentMatch ? contentMatch[1] : text;

  // 提取標題
  const titleMatch = text.match(/"title":"([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : "短影音爆款方法論知識庫";

  return {
    title,
    rawText: content,
  };
}

// ========== 主同步函數 ==========
export async function syncNotionKnowledge(force = false): Promise<NotionKnowledgeCache> {
  if (!force && memoryCache) {
    const age = Date.now() - new Date(memoryCache.lastSyncAt).getTime();
    if (age < CACHE_TTL_MS) return memoryCache;
  }

  if (!force && fs.existsSync(CACHE_FILE)) {
    try {
      const diskCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as NotionKnowledgeCache;
      const age = Date.now() - new Date(diskCache.lastSyncAt).getTime();
      if (age < CACHE_TTL_MS) {
        memoryCache = diskCache;
        return diskCache;
      }
    } catch { /* 快取損壞，繼續重新拉取 */ }
  }

  console.log("[NotionSync v2.0] 開始從 Notion 同步知識框架...");

  const attemptAt = new Date().toISOString();
  const failedPages: Array<{ pageId: string; label: string; error: string }> = [];

  // ===== 同步 L 系列 =====
  const funnelMap: Record<string, "cold" | "warm" | "hot"> = {
    L01: "cold", L02: "warm", L03: "hot",
  };
  const funnelFrameworks: Record<string, FunnelFramework> = {};
  for (const [id, pageId] of Object.entries({
    L01: NOTION_PAGE_IDS.L01,
    L02: NOTION_PAGE_IDS.L02,
    L03: NOTION_PAGE_IDS.L03,
  })) {
    console.log(`[NotionSync] 拉取 ${id}...`);
    const { text, error } = fetchNotionPage(pageId);
    if (text) {
      funnelFrameworks[id] = parseLFramework(id, text, funnelMap[id]);
      console.log(`[NotionSync] ✅ ${id} 同步完成`);
    } else {
      const errMsg = error ?? "未知錯誤";
      console.warn(`[NotionSync] ⚠️ ${id} 拉取失敗，跳過`);
      failedPages.push({ pageId, label: `${id} 漏斗框架`, error: errMsg });
    }
  }

  // ===== 同步 A3 Hook 數據 =====
  let hookKnowledge: HookKnowledge | null = null;
  console.log("[NotionSync] 拉取 A3 Hook 數據...");
  const { text: hookText, error: hookError } = fetchNotionPage(NOTION_PAGE_IDS.A3_HOOK_DATA);
  if (hookText) {
    hookKnowledge = parseHookKnowledge(hookText);
    console.log(`[NotionSync] ✅ A3 Hook 數據同步完成（${hookKnowledge.industryBestHooks.length} 筆產業配對）`);
  } else {
    const errMsg = hookError ?? "未知錯誤";
    console.warn("[NotionSync] ⚠️ A3 Hook 數據拉取失敗");
    failedPages.push({ pageId: NOTION_PAGE_IDS.A3_HOOK_DATA, label: "A3 Hook 數據庫", error: errMsg });
  }

  // ===== 同步 H 系列方法論 =====
  let methodologyKnowledge: MethodologyKnowledge | null = null;
  console.log("[NotionSync] 拉取 H 系列方法論...");
  const { text: methodologyText, error: methodologyError } = fetchNotionPage(NOTION_PAGE_IDS.H_METHODOLOGY);
  if (methodologyText) {
    methodologyKnowledge = parseMethodologyKnowledge(methodologyText);
    console.log("[NotionSync] ✅ H 系列方法論同步完成");
  } else {
    const errMsg = methodologyError ?? "未知錯誤";
    console.warn("[NotionSync] ⚠️ H 系列方法論拉取失敗");
    failedPages.push({ pageId: NOTION_PAGE_IDS.H_METHODOLOGY, label: "H 系列方法論知識庫", error: errMsg });
  }

  // 若 L 系列全部拉取失敗，使用內嵌快照作為 fallback
  const hasFunnels = Object.keys(funnelFrameworks).length > 0;
  const usedFallback = !hasFunnels;
  if (usedFallback) {
    console.warn("[NotionSync] ⚠️ L 系列全部失敗，使用內嵌知識庫 fallback");
  }

  // 記錄本次同步結果
  lastSyncAttempt = {
    attemptAt,
    failedPages,
    usedFallback,
    partialSuccess: hasFunnels && failedPages.length > 0,
  };

  const cache: NotionKnowledgeCache = {
    lastSyncAt: new Date().toISOString(),
    source: hasFunnels ? "api" : "embedded",
    funnelFrameworks: hasFunnels ? funnelFrameworks : EMBEDDED_NOTION_KNOWLEDGE.funnelFrameworks,
    hookKnowledge,
    methodologyKnowledge,
  };

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  memoryCache = cache;
  console.log(`[NotionSync v2.0] 同步完成，已更新快取（失敗 ${failedPages.length} 頁）`);

  // 將同步結果寫入 DB（非阻塞）
  const totalPages = 5; // L01+L02+L03+A3+H
  const successCount = totalPages - failedPages.length;
  insertNotionSyncLog({
    attemptAt: new Date(attemptAt),
    source: cache.source ?? "api",
    successCount,
    failCount: failedPages.length,
    usedFallback,
    partialSuccess: hasFunnels && failedPages.length > 0,
    failedPagesJson: failedPages.length > 0 ? JSON.stringify(failedPages) : null,
    triggeredBy: "system",
  }).catch(e => console.warn("[NotionSync] 寫入 sync log 失敗:", e));

  return cache;
}

// ========== 取得特定漏斗的框架 ==========
export function getFunnelFramework(
  cache: NotionKnowledgeCache,
  funnelValue: string
): FunnelFramework | null {
  const entry = Object.values(cache.funnelFrameworks).find(
    f => f.funnelType === funnelValue
  );
  return entry || null;
}

// ========== 取得 Hook 數據（供 Prompt 使用）==========
export function getHookKnowledgeText(
  cache: NotionKnowledgeCache,
  industry: string
): string {
  if (!cache.hookKnowledge) return "";

  const { industryBestHooks, top5Combinations, avoidCombinations, overallRanking } = cache.hookKnowledge;

  // 找到對應產業的最佳 Hook
  const industryData = industryBestHooks.find(
    h => h.industry === industry || industry.includes(h.industry) || h.industry.includes(industry)
  );

  let text = "【好創 108 筆 Hook 數據分析｜腳本生成器核心數據】\n\n";

  if (industryData) {
    text += `▌ ${industry} 最佳 Hook 配對\n`;
    text += `  第一選擇：${industryData.bestHookType}（留存率 ${industryData.retentionRate}）\n`;
    text += `  第二選擇：${industryData.secondChoice}（留存率 ${industryData.secondRetentionRate}）\n\n`;
  }

  text += "▌ 全產業 Hook 類型整體排名\n";
  overallRanking.slice(0, 4).forEach(r => {
    text += `  ${r.rank}. ${r.hookType}（平均留存率 ${r.avgRetention}）\n`;
  });

  if (avoidCombinations.length > 0) {
    text += "\n▌ 需避免的組合（低留存率警示）\n";
    avoidCombinations.forEach(c => { text += `  ✗ ${c}\n`; });
  }

  text += "\n▌ 最強組合 Top 5\n";
  top5Combinations.forEach((c, i) => { text += `  ${i + 1}. ${c}\n`; });

  return text;
}

// ========== 取得方法論摘要（供 Prompt 使用）==========
export function getMethodologySummary(
  cache: NotionKnowledgeCache
): string {
  if (!cache.methodologyKnowledge) return "";
  // 只取前 2000 字，避免 token 爆炸
  const raw = cache.methodologyKnowledge.rawText;
  return `【好創短影音爆款方法論知識庫摘要】\n${raw.slice(0, 2000)}${raw.length > 2000 ? "\n...(略)" : ""}`;
}

// ========== 快取狀態 ==========
export function getCacheStatus(): {
  lastSyncAt: string | null;
  isStale: boolean;
  source: string;
  hasHookData: boolean;
  hasMethodology: boolean;
  funnelCount: number;
  lastAttemptAt: string | null;
  failedPages: Array<{ pageId: string; label: string; error: string }>;
  usedFallback: boolean;
  partialSuccess: boolean;
} {
  const attempt = lastSyncAttempt;
  if (!memoryCache) {
    return {
      lastSyncAt: EMBEDDED_NOTION_KNOWLEDGE.lastSyncAt,
      isStale: true,
      source: "embedded",
      hasHookData: false,
      hasMethodology: false,
      funnelCount: Object.keys(EMBEDDED_NOTION_KNOWLEDGE.funnelFrameworks).length,
      lastAttemptAt: attempt?.attemptAt ?? null,
      failedPages: attempt?.failedPages ?? [],
      usedFallback: attempt?.usedFallback ?? false,
      partialSuccess: attempt?.partialSuccess ?? false,
    };
  }
  const age = Date.now() - new Date(memoryCache.lastSyncAt).getTime();
  return {
    lastSyncAt: memoryCache.lastSyncAt,
    isStale: age >= CACHE_TTL_MS,
    source: memoryCache.source || "api",
    hasHookData: !!memoryCache.hookKnowledge,
    hasMethodology: !!memoryCache.methodologyKnowledge,
    funnelCount: Object.keys(memoryCache.funnelFrameworks).length,
    lastAttemptAt: attempt?.attemptAt ?? null,
    failedPages: attempt?.failedPages ?? [],
    usedFallback: attempt?.usedFallback ?? false,
    partialSuccess: attempt?.partialSuccess ?? false,
  };
}

export function getCurrentCache(): NotionKnowledgeCache | null {
  return memoryCache;
}
