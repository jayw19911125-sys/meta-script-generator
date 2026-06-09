import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Zap, Target, Film, Sparkles, ChevronRight, CheckCircle2, Settings, History, RefreshCw, Trash2, PenLine, Send, BookOpen } from "lucide-react";
import ScriptOutput from "@/components/ScriptOutput";

const INDUSTRIES = [
  { value: "ecommerce", label: "電商（服飾/配件）" },
  { value: "beauty", label: "美妝保養" },
  { value: "food", label: "餐飲" },
  { value: "fitness", label: "健身/保健" },
  { value: "education", label: "教育/課程" },
  { value: "realestate", label: "房地產/室內設計" },
  { value: "saas", label: "SaaS/工具" },
  { value: "local", label: "本地服務" },
];

const FUNNELS = [
  { value: "tofu", label: "TOFU（冷受眾 - 喚醒問題）" },
  { value: "mofu", label: "MOFU（溫受眾 - 差異化）" },
  { value: "bofu", label: "BOFU（熱受眾 - 臨門一腳）" },
];

const DURATIONS = [
  { value: "15", label: "15 秒" },
  { value: "20", label: "20 秒" },
  { value: "25", label: "25 秒" },
  { value: "30", label: "30 秒" },
  { value: "45", label: "45 秒" },
];

const APPEARANCES = [
  { value: "person", label: "真人出鏡" },
  { value: "hands", label: "只露手" },
  { value: "voiceover", label: "不露臉旁白" },
  { value: "multi", label: "多人" },
];

const TONES = [
  { value: "professional", label: "專業" },
  { value: "friendly", label: "親切" },
  { value: "humorous", label: "幽默" },
  { value: "urgent", label: "急迫" },
  { value: "storytelling", label: "故事感" },
];

interface FormData {
  industry: string;
  productName: string;
  sellingPoints: string;
  targetAudience: string;
  funnel: string;
  duration: string;
  appearance: string;
  tone: string;
}

interface EngineStatus {
  phase: "idle" | "gpt_generating" | "gpt_done" | "claude_generating" | "claude_done" | "error";
  gptOutput: string | null;
  claudeOutput: string | null;
  error: string | null;
  progress: number; // 0-100
  progressLabel: string;
}

interface HistoryRecord {
  id: string;
  timestamp: string;
  productName: string;
  industry: string;
  funnel: string;
  gptOutput: string;
  claudeOutput: string;
  engine: string; // "dual" | "claude_only" | "gpt_only" | "both"
}

// ========== History Helpers ==========
const HISTORY_KEY = "meta_script_history";

function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(records: HistoryRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 50)));
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem("openai_api_key") || "");
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem("claude_api_key") || "");
  const [history, setHistory] = useState<HistoryRecord[]>(loadHistory);
  const [viewingHistory, setViewingHistory] = useState<HistoryRecord | null>(null);

  // Custom Hook Mode
  const [customHookMode, setCustomHookMode] = useState(false);
  const [customHooks, setCustomHooks] = useState("");
  const [customHookEngine, setCustomHookEngine] = useState<"claude" | "gpt" | "both">("claude");

  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    phase: "idle",
    gptOutput: null,
    claudeOutput: null,
    error: null,
    progress: 0,
    progressLabel: "",
  });
  const [formData, setFormData] = useState<FormData>({
    industry: "",
    productName: "",
    sellingPoints: "",
    targetAudience: "",
    funnel: "",
    duration: "",
    appearance: "",
    tone: "",
  });

  // Save keys to localStorage
  useEffect(() => {
    if (openaiKey) localStorage.setItem("openai_api_key", openaiKey);
  }, [openaiKey]);
  useEffect(() => {
    if (claudeKey) localStorage.setItem("claude_api_key", claudeKey);
  }, [claudeKey]);

  const updateForm = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isStep1Valid = formData.industry && formData.productName && formData.sellingPoints;
  const isStep2Valid = formData.targetAudience && formData.funnel && formData.duration;
  const isStep3Valid = formData.appearance && formData.tone;
  const hasKeys = openaiKey && claudeKey;

  // ========== Save to history ==========
  const saveToHistory = (gptOutput: string, claudeOutput: string, engine: string) => {
    const record: HistoryRecord = {
      id: Date.now().toString(36),
      timestamp: new Date().toLocaleString("zh-TW"),
      productName: formData.productName,
      industry: INDUSTRIES.find(i => i.value === formData.industry)?.label || formData.industry,
      funnel: FUNNELS.find(f => f.value === formData.funnel)?.label?.split("（")[0] || formData.funnel,
      gptOutput,
      claudeOutput,
      engine,
    };
    const updated = [record, ...history];
    setHistory(updated);
    saveHistory(updated);
  };

  const deleteHistoryRecord = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    saveHistory(updated);
  };

  // ========== Progress Animation ==========
  const animateProgress = (from: number, to: number, duration: number, label: string) => {
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      const current = from + (to - from) * ratio;
      setEngineStatus(prev => ({ ...prev, progress: Math.round(current), progressLabel: label }));
      if (ratio < 1) requestAnimationFrame(tick);
    };
    tick();
  };

  // ========== GPT Only - 重新發散 Hook ==========
  const handleRegenerateHooks = async () => {
    if (!openaiKey) { setShowSettings(true); return; }

    setEngineStatus(prev => ({ ...prev, phase: "gpt_generating", gptOutput: null, error: null, progress: 0, progressLabel: "GPT-4o 正在發散新的 Hook 概念..." }));
    animateProgress(0, 85, 12000, "GPT-4o 正在發散新的 Hook 概念...");

    try {
      const gptPrompt = buildGptPrompt(formData);
      const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 4000,
          temperature: 1.2,
          messages: [
            { role: "system", content: "你是一位台灣頂尖的短影音廣告創意總監，專精 Meta 投放素材的 Hook 設計。你的任務是瘋狂發散，產出大量不同概念的 Hook。用台灣用語、正體中文。這次要比上一次更大膽、更反直覺。" },
            { role: "user", content: gptPrompt },
          ],
        }),
      });

      if (!gptResponse.ok) {
        const err = await gptResponse.text();
        setEngineStatus(prev => ({ ...prev, phase: "error", error: `GPT 引擎錯誤 (${gptResponse.status}): ${err}`, progress: 0, progressLabel: "" }));
        return;
      }

      const gptData = await gptResponse.json();
      const gptText = gptData.choices?.[0]?.message?.content || "";
      setEngineStatus(prev => ({ ...prev, phase: "gpt_done", gptOutput: gptText, progress: 100, progressLabel: "GPT 發散完成 — 可選擇整合引擎" }));

    } catch (error: any) {
      setEngineStatus(prev => ({ ...prev, phase: "error", error: `GPT 重新發散失敗：${error.message}`, progress: 0, progressLabel: "" }));
    }
  };

  // ========== 自訂 Hook → 選擇引擎整合 ==========
  const handleCustomHookGenerate = async () => {
    if (!customHooks.trim()) return;

    const needClaude = customHookEngine === "claude" || customHookEngine === "both";
    const needGpt = customHookEngine === "gpt" || customHookEngine === "both";

    setViewingHistory(null);
    setEngineStatus({ phase: "claude_generating", gptOutput: customHooks, claudeOutput: null, error: null, progress: 0, progressLabel: "" });

    let claudeResult = "";
    let gptResult = "";

    // Claude 整合
    if (needClaude) {
      if (!claudeKey) { setShowSettings(true); return; }
      setEngineStatus(prev => ({ ...prev, phase: "claude_generating", progress: 0, progressLabel: "Claude 正在整合你的自訂 Hook..." }));
      animateProgress(0, 85, 20000, "Claude 正在整合你的自訂 Hook...");

      try {
        const claudePrompt = buildClaudePrompt(formData, customHooks);
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, messages: [{ role: "user", content: claudePrompt }] }),
        });

        if (!claudeResponse.ok) {
          const err = await claudeResponse.text();
          setEngineStatus(prev => ({ ...prev, phase: "error", error: `Claude 引擎錯誤 (${claudeResponse.status}): ${err}`, progress: 0, progressLabel: "" }));
          return;
        }

        const claudeData = await claudeResponse.json();
        claudeResult = claudeData.content?.[0]?.text || "";
      } catch (error: any) {
        setEngineStatus(prev => ({ ...prev, phase: "error", error: `Claude 整合失敗：${error.message}`, progress: 0, progressLabel: "" }));
        return;
      }
    }

    // GPT 整合
    if (needGpt) {
      if (!openaiKey) { setShowSettings(true); return; }
      setEngineStatus(prev => ({ ...prev, phase: "gpt_generating", progress: needClaude ? 50 : 0, progressLabel: "GPT-4o 正在整合你的自訂 Hook..." }));
      animateProgress(needClaude ? 50 : 0, needClaude ? 95 : 85, 15000, "GPT-4o 正在整合你的自訂 Hook...");

      try {
        const gptIntegratePrompt = buildGptIntegratePrompt(formData, customHooks);
        const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o",
            max_tokens: 8000,
            temperature: 0.7,
            messages: [
              { role: "system", content: "你是一位台灣頂尖的短影音廣告腳本整合專家。你的任務是將用戶提供的 Hook 整合成完整的模組化腳本矩陣。用台灣用語、正體中文。" },
              { role: "user", content: gptIntegratePrompt },
            ],
          }),
        });

        if (!gptResponse.ok) {
          const err = await gptResponse.text();
          setEngineStatus(prev => ({ ...prev, phase: "error", error: `GPT 整合錯誤 (${gptResponse.status}): ${err}`, progress: 0, progressLabel: "" }));
          return;
        }

        const gptData = await gptResponse.json();
        gptResult = gptData.choices?.[0]?.message?.content || "";
      } catch (error: any) {
        setEngineStatus(prev => ({ ...prev, phase: "error", error: `GPT 整合失敗：${error.message}`, progress: 0, progressLabel: "" }));
        return;
      }
    }

    // 組合結果
    let finalOutput = "";
    if (needClaude && needGpt) {
      finalOutput = `# 🟢 Claude 整合版\n\n${claudeResult}\n\n---\n\n# 🟡 GPT 整合版\n\n${gptResult}`;
    } else if (needClaude) {
      finalOutput = claudeResult;
    } else {
      finalOutput = gptResult;
    }

    setEngineStatus({ phase: "claude_done", gptOutput: customHooks, claudeOutput: finalOutput, error: null, progress: 100, progressLabel: "整合完成" });
    saveToHistory(customHooks, finalOutput, customHookEngine === "both" ? "both" : customHookEngine + "_only");
  };

  // ========== 雙引擎核心邏輯 ==========
  const handleGenerate = async () => {
    if (!openaiKey || !claudeKey) { setShowSettings(true); return; }

    setViewingHistory(null);
    setCustomHookMode(false);
    setEngineStatus({ phase: "gpt_generating", gptOutput: null, claudeOutput: null, error: null, progress: 0, progressLabel: "GPT-4o 正在發散 12 個 Hook 概念..." });
    animateProgress(0, 40, 12000, "GPT-4o 正在發散 12 個 Hook 概念...");

    try {
      // ===== STEP 1: GPT 發散引擎 =====
      const gptPrompt = buildGptPrompt(formData);
      const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 4000,
          temperature: 1.1,
          messages: [
            { role: "system", content: "你是一位台灣頂尖的短影音廣告創意總監，專精 Meta 投放素材的 Hook 設計。你的任務是瘋狂發散，產出大量不同概念的 Hook。用台灣用語、正體中文。" },
            { role: "user", content: gptPrompt },
          ],
        }),
      });

      if (!gptResponse.ok) {
        const err = await gptResponse.text();
        setEngineStatus(prev => ({ ...prev, phase: "error", error: `GPT 引擎錯誤 (${gptResponse.status}): ${err}`, progress: 0, progressLabel: "" }));
        return;
      }

      const gptData = await gptResponse.json();
      const gptText = gptData.choices?.[0]?.message?.content || "";
      setEngineStatus(prev => ({ ...prev, phase: "gpt_done", gptOutput: gptText, progress: 45, progressLabel: "GPT 發散完成 ✓ 正在啟動 Claude 整合..." }));

      await new Promise(r => setTimeout(r, 800));

      // ===== STEP 2: Claude 整合引擎 =====
      setEngineStatus(prev => ({ ...prev, phase: "claude_generating", progress: 50, progressLabel: "Claude 正在篩選最強 Hook + 撰寫完整腳本..." }));
      animateProgress(50, 95, 25000, "Claude 正在篩選最強 Hook + 撰寫完整腳本...");

      const claudePrompt = buildClaudePrompt(formData, gptText);
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, messages: [{ role: "user", content: claudePrompt }] }),
      });

      if (!claudeResponse.ok) {
        const err = await claudeResponse.text();
        setEngineStatus(prev => ({ ...prev, phase: "error", error: `Claude 引擎錯誤 (${claudeResponse.status}): ${err}`, progress: 0, progressLabel: "" }));
        return;
      }

      const claudeData = await claudeResponse.json();
      const claudeText = claudeData.content?.[0]?.text || "";
      setEngineStatus(prev => ({ ...prev, phase: "claude_done", claudeOutput: claudeText, progress: 100, progressLabel: "雙引擎生成完成 ✓" }));
      saveToHistory(gptText, claudeText, "dual");

    } catch (error: any) {
      setEngineStatus(prev => ({ ...prev, phase: "error", error: `請求失敗：${error.message}`, progress: 0, progressLabel: "" }));
    }
  };

  // ========== 用現有 GPT Hook 重新整合（Claude only） ==========
  const handleReintegrateWithClaude = async () => {
    if (!claudeKey || !engineStatus.gptOutput) return;

    setEngineStatus(prev => ({ ...prev, phase: "claude_generating", claudeOutput: null, error: null, progress: 0, progressLabel: "Claude 正在用新 Hook 重新整合腳本..." }));
    animateProgress(0, 90, 20000, "Claude 正在用新 Hook 重新整合腳本...");

    try {
      const claudePrompt = buildClaudePrompt(formData, engineStatus.gptOutput);
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, messages: [{ role: "user", content: claudePrompt }] }),
      });

      if (!claudeResponse.ok) {
        const err = await claudeResponse.text();
        setEngineStatus(prev => ({ ...prev, phase: "error", error: `Claude 引擎錯誤 (${claudeResponse.status}): ${err}`, progress: 0, progressLabel: "" }));
        return;
      }

      const claudeData = await claudeResponse.json();
      const claudeText = claudeData.content?.[0]?.text || "";
      setEngineStatus(prev => ({ ...prev, phase: "claude_done", claudeOutput: claudeText, progress: 100, progressLabel: "整合完成 ✓" }));
      saveToHistory(engineStatus.gptOutput!, claudeText, "claude_only");

    } catch (error: any) {
      setEngineStatus(prev => ({ ...prev, phase: "error", error: `Claude 整合失敗：${error.message}`, progress: 0, progressLabel: "" }));
    }
  };

  // ========== 用現有 GPT Hook 重新整合（GPT only） ==========
  const handleReintegrateWithGpt = async () => {
    if (!openaiKey || !engineStatus.gptOutput) return;

    setEngineStatus(prev => ({ ...prev, phase: "gpt_generating", claudeOutput: null, error: null, progress: 0, progressLabel: "GPT-4o 正在用新 Hook 重新整合腳本..." }));
    animateProgress(0, 85, 15000, "GPT-4o 正在用新 Hook 重新整合腳本...");

    try {
      const gptIntegratePrompt = buildGptIntegratePrompt(formData, engineStatus.gptOutput);
      const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 8000,
          temperature: 0.7,
          messages: [
            { role: "system", content: "你是一位台灣頂尖的短影音廣告腳本整合專家。你的任務是將 Hook 整合成完整的模組化腳本矩陣。用台灣用語、正體中文。" },
            { role: "user", content: gptIntegratePrompt },
          ],
        }),
      });

      if (!gptResponse.ok) {
        const err = await gptResponse.text();
        setEngineStatus(prev => ({ ...prev, phase: "error", error: `GPT 整合錯誤 (${gptResponse.status}): ${err}`, progress: 0, progressLabel: "" }));
        return;
      }

      const gptData = await gptResponse.json();
      const gptText = gptData.choices?.[0]?.message?.content || "";
      setEngineStatus(prev => ({ ...prev, phase: "claude_done", claudeOutput: gptText, progress: 100, progressLabel: "GPT 整合完成 ✓" }));
      saveToHistory(engineStatus.gptOutput!, gptText, "gpt_only");

    } catch (error: any) {
      setEngineStatus(prev => ({ ...prev, phase: "error", error: `GPT 整合失敗：${error.message}`, progress: 0, progressLabel: "" }));
    }
  };

  const isGenerating = engineStatus.phase === "gpt_generating" || engineStatus.phase === "claude_generating";

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-bold text-primary glow-text">
            META 腳本生成器
          </h1>
          <p className="text-xs text-muted-foreground mt-1">好創整合行銷 | 雙引擎 v3.0</p>
        </div>

        <nav className="flex-1 space-y-2">
          <StepItem num={1} label="產品資訊" active={step === 1} done={!!isStep1Valid} onClick={() => setStep(1)} />
          <StepItem num={2} label="受眾與漏斗" active={step === 2} done={!!isStep2Valid} onClick={() => setStep(2)} />
          <StepItem num={3} label="風格設定" active={step === 3} done={!!isStep3Valid} onClick={() => setStep(3)} />
          <StepItem num={4} label="生成腳本" active={step === 4} done={engineStatus.phase === "claude_done"} onClick={() => setStep(4)} />
        </nav>

        {/* History Button */}
        <div className="pt-4 border-t border-border mb-3">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full px-1 py-1.5">
                <History className="w-3.5 h-3.5" />
                歷史紀錄
                {history.length > 0 && (
                  <span className="ml-auto text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{history.length}</span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle className="font-[family-name:var(--font-display)]">歷史紀錄</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">尚無紀錄</p>
                ) : (
                  history.map((record) => (
                    <div
                      key={record.id}
                      className="border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer group"
                      onClick={() => { setViewingHistory(record); setStep(4); }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{record.productName}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteHistoryRecord(record.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{record.industry}</span>
                        <span>•</span>
                        <span>{record.funnel}</span>
                        <span>•</span>
                        <span>{record.timestamp}</span>
                      </div>
                      {record.engine && (
                        <Badge variant="secondary" className="mt-1.5 text-[10px]">
                          {record.engine === "dual" ? "雙引擎" : record.engine === "both" ? "雙引擎比較" : record.engine === "claude_only" ? "Claude" : "GPT"}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Settings */}
        <div className="border-t border-border pt-3">
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full px-1 py-1.5">
                <Settings className="w-3.5 h-3.5" /> API 設定
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>API 設定</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>OpenAI API Key</Label>
                  <Input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-..." className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>Anthropic API Key</Label>
                  <Input type="password" value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)} placeholder="sk-ant-..." className="font-mono text-xs" />
                </div>
                <p className="text-xs text-muted-foreground">Key 僅存在你的瀏覽器 localStorage 中，不會傳到任何伺服器。</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/30 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
              雙引擎 AI
            </Badge>
            <span className="text-xs text-muted-foreground">
              GPT-4o → Hook 發散（12個）｜Claude → 篩選整合（3×3×3）
            </span>
          </div>
          <EngineIndicator status={engineStatus} />
        </div>

        <div className="space-y-8">
          {step === 1 && (
            <StepPanel title="Step 1：產品資訊" subtitle="告訴我你要賣什麼" icon={<Target className="w-5 h-5" />}>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>產業類別 *</Label>
                  <Select value={formData.industry} onValueChange={(v) => updateForm("industry", v)}>
                    <SelectTrigger className="bg-input"><SelectValue placeholder="選擇產業" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (<SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>產品名稱 *</Label>
                  <Input value={formData.productName} onChange={(e) => updateForm("productName", e.target.value)} placeholder="例：好創短影音代操方案" className="bg-input" />
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <Label>核心賣點（1-3 個）*</Label>
                <Textarea value={formData.sellingPoints} onChange={(e) => updateForm("sellingPoints", e.target.value)} placeholder="例：30 天內產出 27 支變體素材，模組化拍攝一次搞定，專業投手即時優化" className="bg-input min-h-[100px]" />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!isStep1Valid}>下一步 <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </StepPanel>
          )}

          {step === 2 && (
            <StepPanel title="Step 2：受眾與漏斗" subtitle="你要對誰說、在哪個階段" icon={<Film className="w-5 h-5" />}>
              <div className="space-y-2 mb-6">
                <Label>目標受眾 *</Label>
                <Textarea value={formData.targetAudience} onChange={(e) => updateForm("targetAudience", e.target.value)} placeholder="例：25-45 歲中小企業主，有投放經驗但素材產能不足" className="bg-input min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>漏斗層級 *</Label>
                  <Select value={formData.funnel} onValueChange={(v) => updateForm("funnel", v)}>
                    <SelectTrigger className="bg-input"><SelectValue placeholder="選擇漏斗" /></SelectTrigger>
                    <SelectContent>
                      {FUNNELS.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>影片時長 *</Label>
                  <Select value={formData.duration} onValueChange={(v) => updateForm("duration", v)}>
                    <SelectTrigger className="bg-input"><SelectValue placeholder="選擇時長" /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>上一步</Button>
                <Button onClick={() => setStep(3)} disabled={!isStep2Valid}>下一步 <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </StepPanel>
          )}

          {step === 3 && (
            <StepPanel title="Step 3：風格設定" subtitle="決定影片的調性" icon={<Sparkles className="w-5 h-5" />}>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>出鏡方式 *</Label>
                  <Select value={formData.appearance} onValueChange={(v) => updateForm("appearance", v)}>
                    <SelectTrigger className="bg-input"><SelectValue placeholder="選擇出鏡方式" /></SelectTrigger>
                    <SelectContent>
                      {APPEARANCES.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>語氣風格 *</Label>
                  <Select value={formData.tone} onValueChange={(v) => updateForm("tone", v)}>
                    <SelectTrigger className="bg-input"><SelectValue placeholder="選擇語氣" /></SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep(2)}>上一步</Button>
                <Button onClick={() => setStep(4)} disabled={!isStep3Valid}>前往生成 <Zap className="w-4 h-4 ml-1" /></Button>
              </div>
            </StepPanel>
          )}

          {step === 4 && (
            <StepPanel title="Step 4：雙引擎生成" subtitle="GPT 發散 → Claude 整合" icon={<Zap className="w-5 h-5" />}>
              {/* Viewing History Mode */}
              {viewingHistory && (
                <div className="mb-6 p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-400">正在查看歷史紀錄</p>
                      <p className="text-xs text-muted-foreground">{viewingHistory.productName} • {viewingHistory.timestamp}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setViewingHistory(null)} className="text-xs">
                      返回當前
                    </Button>
                  </div>
                </div>
              )}

              {/* Summary + Actions (only show when not viewing history) */}
              {!viewingHistory && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <SummaryCard label="產業" value={INDUSTRIES.find(i => i.value === formData.industry)?.label || "-"} />
                    <SummaryCard label="產品" value={formData.productName || "-"} />
                    <SummaryCard label="漏斗" value={FUNNELS.find(f => f.value === formData.funnel)?.label?.split("（")[0] || "-"} />
                    <SummaryCard label="時長" value={formData.duration ? `${formData.duration} 秒` : "-"} />
                    <SummaryCard label="出鏡" value={APPEARANCES.find(a => a.value === formData.appearance)?.label || "-"} />
                    <SummaryCard label="語氣" value={TONES.find(t => t.value === formData.tone)?.label || "-"} />
                  </div>

                  {/* Custom Hook Mode Toggle */}
                  <div className="mb-6 p-4 border border-border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <PenLine className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">自訂 Hook 模式</span>
                      </div>
                      <Switch checked={customHookMode} onCheckedChange={setCustomHookMode} />
                    </div>

                    {customHookMode && (
                      <div className="space-y-4 pt-3 border-t border-border">
                        <Textarea
                          value={customHooks}
                          onChange={(e) => setCustomHooks(e.target.value)}
                          placeholder="輸入你自己想的 Hook（一行一個，或自由格式皆可）..."
                          className="bg-input min-h-[120px] text-sm"
                        />
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">選擇整合引擎</Label>
                          <div className="flex gap-3">
                            <Button
                              variant={customHookEngine === "claude" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCustomHookEngine("claude")}
                              className="text-xs"
                            >
                              送 Claude 整合
                            </Button>
                            <Button
                              variant={customHookEngine === "gpt" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCustomHookEngine("gpt")}
                              className="text-xs"
                            >
                              送 GPT 整合
                            </Button>
                            <Button
                              variant={customHookEngine === "both" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCustomHookEngine("both")}
                              className="text-xs"
                            >
                              兩個都跑（比較）
                            </Button>
                          </div>
                        </div>
                        <Button
                          onClick={handleCustomHookGenerate}
                          disabled={!customHooks.trim() || isGenerating}
                          className="w-full"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {isGenerating ? "生成中..." : `用自訂 Hook → ${customHookEngine === "both" ? "Claude + GPT 比較" : customHookEngine === "claude" ? "Claude 整合" : "GPT 整合"}`}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Standard Action Buttons */}
                  {!customHookMode && (
                    <div className="flex items-center gap-3 mb-6 flex-wrap">
                      <Button
                        size="lg"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
                      >
                        {isGenerating ? (
                          <><span className="animate-spin mr-2">⚡</span> 生成中...</>
                        ) : (
                          <><Zap className="w-4 h-4 mr-2" /> 啟動雙引擎生成</>
                        )}
                      </Button>

                      {/* 重新發散 Hook 按鈕 */}
                      {(engineStatus.gptOutput || engineStatus.claudeOutput) && !isGenerating && (
                        <Button
                          variant="outline"
                          onClick={handleRegenerateHooks}
                          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" /> 重新發散 Hook
                        </Button>
                      )}

                      {/* 用新 Hook 重新整合 - 選擇引擎 */}
                      {engineStatus.phase === "gpt_done" && engineStatus.gptOutput && !engineStatus.claudeOutput && (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleReintegrateWithClaude}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Zap className="w-4 h-4 mr-2" /> 送 Claude 整合
                          </Button>
                          <Button
                            onClick={handleReintegrateWithGpt}
                            variant="outline"
                            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          >
                            <Zap className="w-4 h-4 mr-2" /> 送 GPT 整合
                          </Button>
                        </div>
                      )}

                      {!hasKeys && (
                        <p className="text-xs text-destructive">⚠️ 請先在左下角「API 設定」填入兩組 Key</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Progress Bar */}
              {!viewingHistory && engineStatus.phase !== "idle" && engineStatus.progress > 0 && (
                <div className="mb-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{engineStatus.progressLabel}</span>
                    <span className="text-xs font-mono text-primary">{engineStatus.progress}%</span>
                  </div>
                  <Progress value={engineStatus.progress} className="h-2" />
                </div>
              )}

              {/* Engine Steps */}
              {!viewingHistory && engineStatus.phase !== "idle" && !customHookMode && (
                <div className="mb-6 space-y-3">
                  <EngineStep
                    label="引擎 1：GPT-4o Hook 發散"
                    description="產出 12 個不同概念的 Hook 草稿"
                    status={
                      engineStatus.phase === "gpt_generating" ? "running" :
                      engineStatus.gptOutput ? "done" : "pending"
                    }
                  />
                  <EngineStep
                    label="引擎 2：Claude 篩選整合"
                    description="篩選最強 3 個 Hook → 撰寫 Body/CTA → 評分"
                    status={
                      engineStatus.phase === "claude_generating" ? "running" :
                      engineStatus.claudeOutput ? "done" : "pending"
                    }
                  />
                </div>
              )}

              {/* Error */}
              {engineStatus.error && !viewingHistory && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-mono">{engineStatus.error}</p>
                </div>
              )}

              {/* GPT Raw Output */}
              {!viewingHistory && engineStatus.gptOutput && (
                <details className="mb-4 border border-border rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                    📋 查看 {customHookMode ? "自訂 Hook 原文" : "GPT 原始 Hook 草稿（12 個）"}
                  </summary>
                  <div className="px-4 pb-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {engineStatus.gptOutput}
                  </div>
                </details>
              )}

              {/* Final Output - current or history */}
              {viewingHistory ? (
                <>
                  <details className="mb-4 border border-border rounded-lg">
                    <summary className="px-4 py-3 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                      📋 查看原始 Hook 草稿
                    </summary>
                    <div className="px-4 pb-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {viewingHistory.gptOutput}
                    </div>
                  </details>
                  <ScriptOutput content={viewingHistory.claudeOutput} />
                </>
              ) : (
                engineStatus.claudeOutput && <ScriptOutput content={engineStatus.claudeOutput} />
              )}
            </StepPanel>
          )}
        </div>
      </main>
    </div>
  );
}

// ========== Sub Components ==========

function EngineIndicator({ status }: { status: EngineStatus }) {
  if (status.phase === "idle") return <Badge variant="secondary">待命</Badge>;
  if (status.phase === "gpt_generating") return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse">GPT 運算中</Badge>;
  if (status.phase === "gpt_done") return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">GPT ✓ → 可選擇整合引擎</Badge>;
  if (status.phase === "claude_generating") return <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">Claude 運算中</Badge>;
  if (status.phase === "claude_done") return <Badge className="bg-primary/20 text-primary border-primary/30">✓ 生成完成</Badge>;
  if (status.phase === "error") return <Badge variant="destructive">錯誤</Badge>;
  return null;
}

function EngineStep({ label, description, status }: { label: string; description: string; status: "pending" | "running" | "done" }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
      status === "running" ? "border-primary/50 bg-primary/5" :
      status === "done" ? "border-primary/30 bg-primary/5" :
      "border-border bg-card"
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        status === "running" ? "bg-primary/20" :
        status === "done" ? "bg-primary/20" :
        "bg-muted"
      }`}>
        {status === "running" && <span className="animate-spin text-primary">⚡</span>}
        {status === "done" && <CheckCircle2 className="w-4 h-4 text-primary" />}
        {status === "pending" && <span className="w-2 h-2 rounded-full bg-muted-foreground" />}
      </div>
      <div>
        <p className={`text-sm font-medium ${status === "running" ? "text-primary" : status === "done" ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StepItem({ num, label, active, done, onClick }: { num: number; label: string; active: boolean; done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-150 ${
        active ? "bg-primary/10 border border-primary/30 text-primary" :
        done ? "text-foreground hover:bg-secondary" :
        "text-muted-foreground hover:bg-secondary"
      }`}
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        active ? "bg-primary text-primary-foreground" :
        done ? "bg-primary/20 text-primary" :
        "bg-muted text-muted-foreground"
      }`}>
        {done && !active ? <CheckCircle2 className="w-3.5 h-3.5" /> : num}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function StepPanel({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

// ========== Prompt Builders ==========

function buildGptPrompt(data: FormData): string {
  const industryLabel = INDUSTRIES.find(i => i.value === data.industry)?.label || data.industry;
  const funnelLabel = FUNNELS.find(f => f.value === data.funnel)?.label || data.funnel;
  const appearanceLabel = APPEARANCES.find(a => a.value === data.appearance)?.label || data.appearance;
  const toneLabel = TONES.find(t => t.value === data.tone)?.label || data.tone;

  return `## 任務：為以下產品發散產出 12 個完全不同概念的 Hook

### 產品資訊
- 產業：${industryLabel}
- 產品：${data.productName}
- 賣點：${data.sellingPoints}
- 受眾：${data.targetAudience}
- 漏斗：${funnelLabel}
- 時長：${data.duration} 秒
- 出鏡：${appearanceLabel}
- 語氣：${toneLabel}

### 規則
1. 產出 12 個 Hook，每個必須是完全不同的「概念」（不是改措辭）
2. 每個 Hook 的口白不超過 15 字（3 秒內講完）
3. 必須涵蓋以下 6 種公式，每種至少 2 個：
   - 痛點直擊型
   - 結果先行型
   - 反常識型
   - 提問型
   - 視覺衝擊型
   - 故事開場型
4. 台灣用語、正體中文、口語化
5. 禁止：品牌名開場、「嗨大家好」、泛泛讚美、慢熱鋪陳

### 輸出格式（每個 Hook）
\`\`\`
Hook #N【公式類型】
口白：（≤15字）
文字疊層：（螢幕上顯示的文字）
視覺動作：（畫面描述）
情緒張力：（1-10 分）
\`\`\`

請直接輸出 12 個 Hook，不要前言後語。`;
}

function buildGptIntegratePrompt(data: FormData, hooks: string): string {
  const industryLabel = INDUSTRIES.find(i => i.value === data.industry)?.label || data.industry;
  const funnelLabel = FUNNELS.find(f => f.value === data.funnel)?.label || data.funnel;
  const appearanceLabel = APPEARANCES.find(a => a.value === data.appearance)?.label || data.appearance;
  const toneLabel = TONES.find(t => t.value === data.tone)?.label || data.tone;

  return `## 任務：將以下 Hook 整合成完整的模組化腳本矩陣

### 產品資訊
- 產業：${industryLabel}
- 產品：${data.productName}
- 賣點：${data.sellingPoints}
- 受眾：${data.targetAudience}
- 漏斗：${funnelLabel}
- 時長：${data.duration} 秒
- 出鏡：${appearanceLabel}
- 語氣：${toneLabel}

### 用戶提供的 Hook
${hooks}

---

## 輸出要求

### 第一部分：策略判斷
- 產業矩陣匹配結果
- 漏斗層級對應策略

### 第二部分：完整模組化矩陣

#### Hook 模組（從提供的 Hook 中選最強 3 個，補完指令）
每個 Hook 包含：
- 被選中原因
- 口白文字（≤15字）
- 文字疊層
- 聲音設計（BGM 風格 + 音效）
- 人物動向指令（眼神/手勢/身體/表情）
- 拍攝指令：景別 / 鏡頭運動 / 燈光

#### Body 模組（3 個，角度不同）
每個 Body 包含：
- 結構類型
- 口白文字
- 文字疊層
- 聲音設計
- 人物動向指令
- 拍攝指令
- 剪輯節奏

#### CTA 模組（3 個，風格不同）
每個 CTA 包含：
- 風格（急迫型 / 利益型 / 社交證明型）
- 口白文字
- 文字疊層
- 人物動向指令
- 行動理由

### 第三部分：組合建議 Top 5
用表格呈現：Hook # + Body # + CTA # + 預期效果 + 適用情境

### 第四部分：Checklist 預測評分（100 分制）

### 第五部分：拍攝執行指南

## 品質鐵則
1. Body 只講好處不講功能規格
2. CTA 必須有「為什麼現在」的行動理由
3. 靜音狀態下也要能看懂
4. 台灣用語、正體中文
5. 漏斗層級嚴格對應`;
}

function buildClaudePrompt(data: FormData, gptHooks: string): string {
  const industryLabel = INDUSTRIES.find(i => i.value === data.industry)?.label || data.industry;
  const funnelLabel = FUNNELS.find(f => f.value === data.funnel)?.label || data.funnel;
  const appearanceLabel = APPEARANCES.find(a => a.value === data.appearance)?.label || data.appearance;
  const toneLabel = TONES.find(t => t.value === data.tone)?.label || data.tone;

  return `你是好創整合行銷的「Meta 導購型短影音廣告腳本整合引擎」。

## 你的任務

GPT 發散引擎已經產出了 Hook 草稿（見下方）。你的工作是：
1. 從中篩選出最強的 3 個（概念必須不同）
2. 為每個 Hook 補上完整的人物動向指令和拍攝指令
3. 撰寫 3 個 Body 模組（角度不同）
4. 撰寫 3 個 CTA 模組（風格不同）
5. 給出 Top 5 組合建議
6. 用 Checklist 評分

## 產品資訊

- 產業：${industryLabel}
- 產品：${data.productName}
- 賣點：${data.sellingPoints}
- 受眾：${data.targetAudience}
- 漏斗：${funnelLabel}
- 時長：${data.duration} 秒
- 出鏡：${appearanceLabel}
- 語氣：${toneLabel}

## Hook 草稿

${gptHooks}

---

## 輸出格式

### 第一部分：策略判斷
- 產業矩陣匹配結果
- 漏斗層級對應策略
- Andromeda 演算法信號優化建議

### 第二部分：篩選結果 + 完整模組化矩陣

#### Hook 模組（從中篩選最強 3 個，補完指令）
每個 Hook 包含：
- 原始編號 + 被選中原因
- 公式類型
- 口白文字（≤15字）
- 文字疊層
- 聲音設計（BGM 風格 + 音效）
- 人物動向指令：
  - 眼神（ED-1 直視鏡頭 / ED-2 看產品 / ED-3 看遠方 / ED-4 眼神掃過鏡頭）
  - 手勢（HG-1 指向鏡頭 / HG-2 展示產品 / HG-3 比數字 / HG-4 攤手）
  - 身體（BM-1 前傾 / BM-2 轉身 / BM-3 走入畫面 / BM-4 坐定）
  - 表情（FE-1 驚訝 / FE-2 微笑 / FE-3 皺眉 / FE-4 得意）
- 拍攝指令：景別 / 鏡頭運動 / 燈光

#### Body 模組（3 個，角度不同）
每個 Body 包含：
- 結構類型（問題→方案→證據 / 場景→痛點→解法 / 對比→轉折→好處）
- 口白文字
- 文字疊層
- 聲音設計
- 人物動向指令
- 拍攝指令
- 剪輯節奏（CPS 值：每秒切換次數）

#### CTA 模組（3 個，風格不同）
每個 CTA 包含：
- 風格（急迫型 / 利益型 / 社交證明型）
- 口白文字
- 文字疊層
- 人物動向指令
- 行動理由（為什麼現在要行動）

### 第三部分：組合建議 Top 5
用表格呈現：Hook # + Body # + CTA # + 預期效果 + 適用情境

### 第四部分：Checklist 預測評分（100 分制）
用表格列出 19 個檢查項：
| # | 檢查項 | 通過？ | 分數 |
包含：Hook ≤3秒 / 概念不同 / 靜音可懂 / 有文字疊層 / Body 講好處 / CTA 有理由 / 人物指令完整 / 漏斗對應 / 台灣用語 / 無致命錯誤...等

### 第五部分：拍攝執行指南
- 設備建議（手機/相機/收音）
- 場景設定
- 服裝建議
- 拍攝順序（先拍什麼後拍什麼）
- 剪輯注意事項

## 品質鐵則
1. 每個被選中的 Hook 必須概念完全不同
2. Body 只講好處不講功能規格
3. CTA 必須有「為什麼現在」的行動理由
4. 靜音狀態下也要能看懂（文字疊層必須獨立傳達資訊）
5. 台灣用語、正體中文
6. 漏斗層級嚴格對應（TOFU 不能有價格/BOFU 必須有臨門一腳）
7. 禁止致命錯誤：品牌名開場 / 嗨大家好 / 泛泛讚美 / 慢熱鋪陳 / 模糊CTA`;
}
