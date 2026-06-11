// ========== Notion 知識快取層 ==========
// 從 Notion 動態拉取腳本框架知識，建立本地快取供 prompts.ts 使用。
// 設計原則：Notion 是唯一真實來源（SSOT）。
// 快取機制：伺服器啟動時自動同步一次；提供手動強制同步 API。
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ========== 快取檔案路徑 ==========
const CACHE_DIR = path.join(process.cwd(), ".notion-cache");
const CACHE_FILE = path.join(CACHE_DIR, "knowledge.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小時後視為過期（可手動強制更新）

// ========== Notion 頁面 ID 對照表 ==========
const NOTION_PAGE_IDS = {
  // L 系列：漏斗廣告腳本框架（直接對應 Meta 廣告漏斗）
  L01: "37997a06-fae5-81d6-9837-c8b6c1dd242d", // 冷受眾廣告腳本
  L02: "37997a06-fae5-8109-801f-d3835ed6fa6e", // 暖受眾再行銷腳本
  L03: "37997a06-fae5-8191-9536-e1f3aff7c48e", // 熱受眾轉換腳本
} as const;

// ========== 快取資料結構 ==========
export interface FunnelFramework {
  id: string;           // L01 / L02 / L03
  title: string;        // 頁面標題
  hookFormula: string;  // 前 3 秒 Hook 公式
  bodyStructure: string; // 主體結構
  ctaTemplate: string;  // CTA 模板
  aiPrompt: string;     // Notion 中定義的 AI Prompt（核心骨架）
  example: string;      // 完整腳本範例
  algorithmNote: string; // 演算法原理
  funnelType: "cold" | "warm" | "hot"; // 對應前端 FUNNELS 的 value
}

export interface NotionKnowledgeCache {
  lastSyncAt: string;
  funnelFrameworks: Record<string, FunnelFramework>;
}

// ========== 記憶體快取（避免每次讀磁碟）==========
let memoryCache: NotionKnowledgeCache | null = null;

// ========== 從 Notion 拉取單一頁面 ==========
function fetchNotionPage(pageId: string): string {
  try {
    const result = execSync(
      `manus-mcp-cli tool call notion-fetch --server notion --input '{"id": "${pageId}"}'`,
      { encoding: "utf-8", timeout: 30000 }
    );
    // 解析 JSON 結果
    const match = result.match(/Tool execution result:\n([\s\S]+)/);
    if (!match) return "";
    const parsed = JSON.parse(match[1].trim());
    return parsed.text || "";
  } catch (e) {
    console.error(`[NotionSync] 拉取頁面 ${pageId} 失敗:`, e);
    return "";
  }
}

// ========== 解析 Notion 頁面文字，提取各段落 ==========
function extractSection(text: string, sectionTitle: string): string {
  // 尋找 ## 標題後的內容，直到下一個 ## 標題
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
  // 從 <content> 標籤內提取
  const contentMatch = text.match(/<content>([\s\S]+?)<\/content>/);
  const content = contentMatch ? contentMatch[1] : text;

  const hookSection = extractSection(content, "腳本結構");
  const aiPromptSection = extractSection(content, "AI Prompt");
  const exampleSection = extractSection(content, "完整腳本範例");
  const algorithmSection = extractSection(content, "演算法原理");

  // 從腳本結構中提取各部分
  const hookMatch = content.match(/###\s*前3秒 Hook[\s\S]*?「([^」]+)」/);
  const hookFormula = hookMatch ? hookMatch[1] : "";

  const bodyMatch = content.match(/###\s*主體內容([\s\S]*?)(?=###|##|$)/);
  const bodyStructure = bodyMatch ? bodyMatch[1].trim() : "";

  const ctaMatch = content.match(/###\s*結尾 CTA[\s\S]*?「([^」]+)」/);
  const ctaTemplate = ctaMatch ? ctaMatch[1] : "";

  // 提取 AI Prompt（去掉標題行）
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

// ========== 主同步函數 ==========
export async function syncNotionKnowledge(force = false): Promise<NotionKnowledgeCache> {
  // 如果記憶體快取還新鮮，直接回傳
  if (!force && memoryCache) {
    const age = Date.now() - new Date(memoryCache.lastSyncAt).getTime();
    if (age < CACHE_TTL_MS) {
      return memoryCache;
    }
  }

  // 嘗試讀取磁碟快取
  if (!force && fs.existsSync(CACHE_FILE)) {
    try {
      const diskCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as NotionKnowledgeCache;
      const age = Date.now() - new Date(diskCache.lastSyncAt).getTime();
      if (age < CACHE_TTL_MS) {
        memoryCache = diskCache;
        return diskCache;
      }
    } catch {
      // 快取損壞，繼續重新拉取
    }
  }

  console.log("[NotionSync] 開始從 Notion 同步知識框架...");

  const funnelMap: Record<string, "cold" | "warm" | "hot"> = {
    L01: "cold",
    L02: "warm",
    L03: "hot",
  };

  const funnelFrameworks: Record<string, FunnelFramework> = {};

  for (const [id, pageId] of Object.entries(NOTION_PAGE_IDS)) {
    console.log(`[NotionSync] 拉取 ${id}...`);
    const text = fetchNotionPage(pageId);
    if (text) {
      funnelFrameworks[id] = parseLFramework(id, text, funnelMap[id]);
      console.log(`[NotionSync] ${id} 同步完成`);
    } else {
      console.warn(`[NotionSync] ${id} 拉取失敗，跳過`);
    }
  }

  const cache: NotionKnowledgeCache = {
    lastSyncAt: new Date().toISOString(),
    funnelFrameworks,
  };

  // 寫入磁碟快取
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");

  memoryCache = cache;
  console.log("[NotionSync] 同步完成，已更新快取");
  return cache;
}

// ========== 取得特定漏斗的框架 ==========
export function getFunnelFramework(
  cache: NotionKnowledgeCache,
  funnelValue: string
): FunnelFramework | null {
  // funnelValue: "cold" | "warm" | "hot"（對應 scriptTypes.ts 的 FUNNELS）
  const entry = Object.values(cache.funnelFrameworks).find(
    f => f.funnelType === funnelValue
  );
  return entry || null;
}

// ========== 取得快取狀態（供前端顯示）==========
export function getCacheStatus(): { lastSyncAt: string | null; isStale: boolean } {
  if (!memoryCache) {
    return { lastSyncAt: null, isStale: true };
  }
  const age = Date.now() - new Date(memoryCache.lastSyncAt).getTime();
  return {
    lastSyncAt: memoryCache.lastSyncAt,
    isStale: age >= CACHE_TTL_MS,
  };
}

// ========== 取得目前快取（不觸發同步）==========
export function getCurrentCache(): NotionKnowledgeCache | null {
  return memoryCache;
}
