import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildGptPrompt,
  buildClaudePrompt,
  buildGptIntegratePrompt,
  GPT_SYSTEM_PROMPT,
  CLAUDE_SYSTEM_PROMPT,
} from "./prompts";
import type { PromptInput } from "@shared/scriptTypes";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const sampleInput: PromptInput = {
  industry: "美妝保養",
  productName: "好創水光精華",
  sellingPoints: "30 天有感、一瓶抵三瓶、無香精",
  targetAudience: "25-40 歲熬夜上班族",
  funnel: "冷素材｜停滑層（降低防禦、停下滑動）",
  duration: "20",
  appearance: "真人出鏡",
  tone: "親切",
};

// ========== Prompt 組裝測試 ==========
describe("prompts 組裝", () => {
  it("GPT 發散 prompt 包含所有關鍵輸入欄位", () => {
    const p = buildGptPrompt(sampleInput);
    expect(p).toContain(sampleInput.productName);
    expect(p).toContain(sampleInput.sellingPoints);
    expect(p).toContain(sampleInput.targetAudience);
    expect(p).toContain(sampleInput.industry);
    expect(p.length).toBeGreaterThan(50);
  });

  it("Claude 整合 prompt 同時包含輸入與 Hook 草稿", () => {
    const hooks = "1. 你的肌膚在求救\n2. 別再亂買保養品";
    const p = buildClaudePrompt(sampleInput, hooks);
    expect(p).toContain(sampleInput.productName);
    expect(p).toContain(hooks);
  });

  it("GPT 整合 prompt 同時包含輸入與 Hook 草稿", () => {
    const hooks = "自訂 Hook 測試文字";
    const p = buildGptIntegratePrompt(sampleInput, hooks);
    expect(p).toContain(hooks);
    expect(p).toContain(sampleInput.productName);
  });

  it("System prompts 為非空知識底層", () => {
    expect(GPT_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(CLAUDE_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });
});

// ========== Router 行為測試（mock 掉 LLM 與 DB） ==========
vi.mock("./scriptService", () => ({
  runDualEngine: vi.fn(async () => ({
    gptOutput: "MOCK_HOOKS",
    finalOutput: "MOCK_FINAL_SCRIPT",
  })),
  generateHooks: vi.fn(async () => "MOCK_HOOKS_ONLY"),
  integrateWithClaude: vi.fn(async () => "MOCK_CLAUDE"),
  integrateWithGpt: vi.fn(async () => "MOCK_GPT"),
}));

const insertSpy = vi.fn(async () => 123);
const listSpy = vi.fn(async () => [] as unknown[]);
const deleteSpy = vi.fn(async () => undefined);

vi.mock("./db", () => ({
  insertScriptHistory: (...args: unknown[]) => insertSpy(...args),
  listScriptHistory: (...args: unknown[]) => listSpy(...args),
  deleteScriptHistory: (...args: unknown[]) => deleteSpy(...args),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "u-7",
      email: "u7@example.com",
      name: "Tester",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const meta = { productName: "好創水光精華", industry: "美妝保養", funnel: "冷素材" };

describe("script router", () => {
  beforeEach(() => {
    insertSpy.mockClear();
    listSpy.mockClear();
    deleteSpy.mockClear();
  });

  it("generateDual 回傳雙引擎結果並以 dual 寫入歷史", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const res = await caller.script.generateDual({ input: sampleInput, meta });
    expect(res.finalOutput).toBe("MOCK_FINAL_SCRIPT");
    expect(res.gptOutput).toBe("MOCK_HOOKS");
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const record = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.userId).toBe(7);
    expect(record.engine).toBe("dual");
    expect(record.finalOutput).toBe("MOCK_FINAL_SCRIPT");
  });

  it("integrate engine=both 合併兩版且標記為 both", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const res = await caller.script.integrate({
      input: sampleInput,
      hooks: "自訂 Hook",
      engine: "both",
      meta,
    });
    expect(res.finalOutput).toContain("MOCK_CLAUDE");
    expect(res.finalOutput).toContain("MOCK_GPT");
    const record = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.engine).toBe("both");
  });

  it("integrate engine=claude 只回 Claude 版並標記 claude_only", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const res = await caller.script.integrate({
      input: sampleInput,
      hooks: "自訂 Hook",
      engine: "claude",
      meta,
    });
    expect(res.finalOutput).toBe("MOCK_CLAUDE");
    const record = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.engine).toBe("claude_only");
  });

  it("generateHooks 不寫入歷史", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const res = await caller.script.generateHooks({ input: sampleInput });
    expect(res.gptOutput).toBe("MOCK_HOOKS_ONLY");
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("deleteHistory 以當前用戶 id 為條件刪除", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const res = await caller.script.deleteHistory({ id: 55 });
    expect(res.success).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith(7, 55);
  });

  it("未登入呼叫 protected procedure 應拋錯", async () => {
    const anonCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(anonCtx);
    await expect(
      caller.script.history()
    ).rejects.toThrow();
  });
});
