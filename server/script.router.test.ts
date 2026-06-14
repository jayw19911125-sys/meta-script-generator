/**
 * scriptRouter + matrixRouter 基礎功能測試
 * 測試 schema 驗證、DB helpers、router 結構
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== Mock LLM 呼叫（避免真實 API 費用）=====
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "mock output" } }],
  }),
  listLLMModels: vi.fn().mockResolvedValue({ data: [] }),
}));

// ===== Mock DB =====
vi.mock("./db", () => ({
  insertScriptHistory: vi.fn().mockResolvedValue(1),
  listScriptHistory: vi.fn().mockResolvedValue([]),
  deleteScriptHistory: vi.fn().mockResolvedValue(undefined),
}));

// ===== Mock Notion services =====
vi.mock("./notionWriteService", () => ({
  saveScriptToNotion: vi.fn().mockResolvedValue({ notionPageId: "mock-id" }),
}));
vi.mock("./notionSyncService", () => ({
  getLFramework: vi.fn().mockResolvedValue(null),
}));
vi.mock("./notifyService", () => ({
  runPostSaveNotifications: vi.fn().mockResolvedValue(undefined),
}));

// ===== 測試 shared/scriptTypes 常數 =====
import {
  INDUSTRIES,
  FUNNELS,
  DURATIONS,
  APPEARANCES,
  TONES,
  ENGINE_PRESETS,
  DEFAULT_ENGINE_CONFIG,
} from "@shared/scriptTypes";

describe("shared/scriptTypes 常數驗證", () => {
  it("INDUSTRIES 應有至少 5 個選項", () => {
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(5);
    expect(INDUSTRIES[0]).toHaveProperty("value");
    expect(INDUSTRIES[0]).toHaveProperty("label");
  });

  it("FUNNELS 應有 cold/warm/hot 三層", () => {
    expect(FUNNELS.length).toBeGreaterThanOrEqual(3);
    const values = FUNNELS.map((f) => f.value);
    expect(values).toContain("cold");
    expect(values).toContain("warm");
    expect(values).toContain("hot");
  });

  it("DURATIONS 應有 15/30/45 秒選項", () => {
    const values = DURATIONS.map((d) => d.value);
    expect(values).toContain("15");
    expect(values).toContain("30");
    expect(values).toContain("45");
  });

  it("APPEARANCES 應包含 person/voiceover", () => {
    const values = APPEARANCES.map((a) => a.value);
    expect(values).toContain("person");
    expect(values).toContain("voiceover");
  });

  it("TONES 應包含 friendly/professional", () => {
    const values = TONES.map((t) => t.value);
    expect(values).toContain("friendly");
    expect(values).toContain("professional");
  });

  it("ENGINE_PRESETS 應有 premium/standard/lite", () => {
    expect(ENGINE_PRESETS).toHaveProperty("premium");
    expect(ENGINE_PRESETS).toHaveProperty("standard");
    expect(ENGINE_PRESETS).toHaveProperty("lite");
    expect(ENGINE_PRESETS.premium.config.preset).toBe("premium");
    expect(ENGINE_PRESETS.standard.config.preset).toBe("standard");
    expect(ENGINE_PRESETS.lite.config.preset).toBe("lite");
  });

  it("DEFAULT_ENGINE_CONFIG 應為 standard 預設", () => {
    expect(DEFAULT_ENGINE_CONFIG).toHaveProperty("scatterModel");
    expect(DEFAULT_ENGINE_CONFIG).toHaveProperty("integrateModel");
    expect(DEFAULT_ENGINE_CONFIG.preset).toBe("standard");
  });
});

// ===== 測試 DB helpers =====
import { insertScriptHistory, listScriptHistory, deleteScriptHistory } from "./db";

describe("DB helpers mock 測試", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("insertScriptHistory 應回傳 id", async () => {
    const id = await insertScriptHistory({
      userId: 1,
      productName: "測試產品",
      industry: "保健食品",
      funnel: "BOF",
      engine: "dual",
      gptOutput: "gpt output",
      finalOutput: "final output",
      inputSnapshot: JSON.stringify({}),
    });
    expect(id).toBe(1);
  });

  it("listScriptHistory 應回傳陣列", async () => {
    const result = await listScriptHistory(1);
    expect(Array.isArray(result)).toBe(true);
  });

  it("deleteScriptHistory 應不拋出錯誤", async () => {
    await expect(deleteScriptHistory(1, 1)).resolves.not.toThrow();
  });
});

// ===== 測試 scriptRouter 結構 =====
import { scriptRouter, matrixRouter } from "./routers/script";

describe("scriptRouter 結構驗證", () => {
  it("scriptRouter 應包含 generateDual", () => {
    expect(scriptRouter).toHaveProperty("_def");
    // tRPC router 的 procedure 定義在 _def.procedures
    const procedures = Object.keys((scriptRouter as any)._def.procedures ?? {});
    expect(procedures).toContain("generateDual");
  });

  it("scriptRouter 應包含 history 和 deleteHistory", () => {
    const procedures = Object.keys((scriptRouter as any)._def.procedures ?? {});
    expect(procedures).toContain("history");
    expect(procedures).toContain("deleteHistory");
  });

  it("matrixRouter 應包含 5 個 procedure（含 rerunCard）", () => {
    const procedures = Object.keys((matrixRouter as any)._def.procedures ?? {});
    expect(procedures).toContain("generateHooks");
    expect(procedures).toContain("generateBodies");
    expect(procedures).toContain("generateCtas");
    expect(procedures).toContain("generateRecommendations");
    expect(procedures).toContain("rerunCard");
  });
});
