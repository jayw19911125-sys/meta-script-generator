import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Zap, Target, Film, Sparkles, ChevronRight, CheckCircle2, History, RefreshCw, Trash2, PenLine, Send, BookOpen, RotateCcw, LogIn } from "lucide-react";
import { toast } from "sonner";
import ScriptOutput from "@/components/ScriptOutput";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  INDUSTRIES, FUNNELS, DURATIONS, APPEARANCES, TONES, toLabel,
  type PromptInput, type IntegrateEngine,
} from "@shared/scriptTypes";
import type { ScriptHistory } from "@shared/types";

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

const IDLE_STATUS: EngineStatus = {
  phase: "idle",
  gptOutput: null,
  claudeOutput: null,
  error: null,
  progress: 0,
  progressLabel: "",
};

export default function Home() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const [step, setStep] = useState(1);
  const [viewingHistory, setViewingHistory] = useState<ScriptHistory | null>(null);

  // Custom Hook Mode
  const [customHookMode, setCustomHookMode] = useState(false);
  const [customHooks, setCustomHooks] = useState("");
  const [customHookEngine, setCustomHookEngine] = useState<IntegrateEngine>("claude");

  const [engineStatus, setEngineStatus] = useState<EngineStatus>(IDLE_STATUS);
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

  // 體感進度動畫的 rAF 控制
  const rafRef = useRef<number | null>(null);
  const stopProgress = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };
  useEffect(() => () => stopProgress(), []);

  // ========== 歷史紀錄（後端持久化） ==========
  const historyQuery = trpc.script.history.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const history = historyQuery.data ?? [];

  const deleteHistoryMutation = trpc.script.deleteHistory.useMutation({
    onMutate: async ({ id }) => {
      await utils.script.history.cancel();
      const prev = utils.script.history.getData();
      utils.script.history.setData(undefined, (old) => (old ?? []).filter(h => h.id !== id));
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) utils.script.history.setData(undefined, context.prev);
      toast.error("刪除失敗，已還原");
    },
    onSettled: () => {
      utils.script.history.invalidate();
    },
  });

  // ========== tRPC mutations ==========
  const dualMutation = trpc.script.generateDual.useMutation();
  const hooksMutation = trpc.script.generateHooks.useMutation();
  const integrateMutation = trpc.script.integrate.useMutation();

  const isGenerating =
    engineStatus.phase === "gpt_generating" || engineStatus.phase === "claude_generating";

  const updateForm = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isStep1Valid = formData.industry && formData.productName && formData.sellingPoints;
  const isStep2Valid = formData.targetAudience && formData.funnel && formData.duration;
  const isStep3Valid = formData.appearance && formData.tone;

  // ========== 體感進度動畫（後端為單次回傳，前端模擬進度提升體驗） ==========
  const animateProgress = (from: number, to: number, duration: number, label: string) => {
    stopProgress();
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      const current = from + (to - from) * ratio;
      setEngineStatus(prev => ({ ...prev, progress: Math.round(current), progressLabel: label }));
      if (ratio < 1) rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  // ========== Helper：FormData → PromptInput（轉中文 label 給後端組 prompt） ==========
  const toPromptInput = (): PromptInput => ({
    industry: toLabel(INDUSTRIES, formData.industry),
    productName: formData.productName,
    sellingPoints: formData.sellingPoints,
    targetAudience: formData.targetAudience,
    funnel: toLabel(FUNNELS, formData.funnel),
    duration: formData.duration,
    appearance: toLabel(APPEARANCES, formData.appearance),
    tone: toLabel(TONES, formData.tone),
  });

  // 存庫摘要 meta
  const buildMeta = () => ({
    productName: formData.productName,
    industry: toLabel(INDUSTRIES, formData.industry),
    funnel: toLabel(FUNNELS, formData.funnel).split("｜")[0],
  });

  const refreshHistory = () => utils.script.history.invalidate();

  const handleError = (e: unknown, prefix: string) => {
    stopProgress();
    const msg = e instanceof Error ? e.message : String(e);
    setEngineStatus(prev => ({ ...prev, phase: "error", error: `${prefix}：${msg}`, progress: 0, progressLabel: "" }));
  };

  // ========== 雙引擎核心流程 ==========
  const handleGenerate = async () => {
    setViewingHistory(null);
    setCustomHookMode(false);
    setEngineStatus({ ...IDLE_STATUS, phase: "gpt_generating", progressLabel: "GPT 正在發散 12 個 Hook 概念..." });
    animateProgress(0, 95, 30000, "雙引擎運算中：GPT 發散 → Claude 整合...");

    try {
      const res = await dualMutation.mutateAsync({ input: toPromptInput(), meta: buildMeta() });
      stopProgress();
      setEngineStatus({
        phase: "claude_done",
        gptOutput: res.gptOutput,
        claudeOutput: res.finalOutput,
        error: null,
        progress: 100,
        progressLabel: "雙引擎生成完成 ✓",
      });
      refreshHistory();
    } catch (e) {
      handleError(e, "雙引擎生成失敗");
    }
  };

  // ========== 只跑 GPT 重新發散 Hook ==========
  const handleRegenerateHooks = async () => {
    setEngineStatus(prev => ({ ...prev, phase: "gpt_generating", gptOutput: null, claudeOutput: null, error: null, progress: 0, progressLabel: "GPT 正在發散新的 Hook 概念..." }));
    animateProgress(0, 90, 15000, "GPT 正在發散新的 Hook 概念...");
    try {
      const res = await hooksMutation.mutateAsync({ input: toPromptInput() });
      stopProgress();
      setEngineStatus(prev => ({ ...prev, phase: "gpt_done", gptOutput: res.gptOutput, progress: 100, progressLabel: "GPT 發散完成 — 可選擇整合引擎" }));
    } catch (e) {
      handleError(e, "GPT 重新發散失敗");
    }
  };

  // ========== 用既有 Hook 重新整合（claude / gpt） ==========
  const handleReintegrate = async (engine: "claude" | "gpt") => {
    if (!engineStatus.gptOutput) return;
    const label = engine === "claude" ? "Claude" : "GPT";
    setEngineStatus(prev => ({ ...prev, phase: "claude_generating", claudeOutput: null, error: null, progress: 0, progressLabel: `${label} 正在用新 Hook 重新整合腳本...` }));
    animateProgress(0, 92, 22000, `${label} 正在用新 Hook 重新整合腳本...`);
    try {
      const res = await integrateMutation.mutateAsync({
        input: toPromptInput(),
        hooks: engineStatus.gptOutput,
        engine,
        meta: buildMeta(),
      });
      stopProgress();
      setEngineStatus(prev => ({ ...prev, phase: "claude_done", claudeOutput: res.finalOutput, progress: 100, progressLabel: `${label} 整合完成 ✓` }));
      refreshHistory();
    } catch (e) {
      handleError(e, `${label} 整合失敗`);
    }
  };

  // ========== 自訂 Hook → 選擇引擎整合 ==========
  const handleCustomHookGenerate = async () => {
    if (!customHooks.trim()) return;
    setViewingHistory(null);
    const label = customHookEngine === "both" ? "Claude + GPT" : customHookEngine === "claude" ? "Claude" : "GPT";
    setEngineStatus({ ...IDLE_STATUS, phase: "claude_generating", gptOutput: customHooks, progressLabel: `${label} 正在整合你的自訂 Hook...` });
    animateProgress(0, 92, customHookEngine === "both" ? 35000 : 22000, `${label} 正在整合你的自訂 Hook...`);
    try {
      const res = await integrateMutation.mutateAsync({
        input: toPromptInput(),
        hooks: customHooks,
        engine: customHookEngine,
        meta: buildMeta(),
      });
      stopProgress();
      setEngineStatus({
        phase: "claude_done",
        gptOutput: customHooks,
        claudeOutput: res.finalOutput,
        error: null,
        progress: 100,
        progressLabel: "整合完成 ✓",
      });
      refreshHistory();
    } catch (e) {
      handleError(e, "自訂 Hook 整合失敗");
    }
  };

  // ========== 未登入提示 ==========
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold glow-text">META 腳本生成器</h1>
            <p className="text-sm text-muted-foreground mt-2">好創整合行銷 | 雙引擎 AI v3.0</p>
          </div>
          <p className="text-sm text-muted-foreground">
            登入後即可使用雙引擎生成（GPT 發散 → Claude 整合），無需自備任何 API Key，所有運算與知識底層皆在後端完成。
          </p>
          <Button size="lg" onClick={() => { window.location.href = getLoginUrl(); }} className="glow-border">
            <LogIn className="w-4 h-4 mr-2" /> 登入開始使用
          </Button>
        </div>
      </div>
    );
  }

  const engineMeta = (engine: string) =>
    engine === "dual" ? "雙引擎" : engine === "both" ? "雙引擎比較" : engine === "claude_only" ? "Claude" : "GPT";

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

        {/* History */}
        <div className="pt-4 border-t border-border">
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
                {historyQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">載入中...</p>
                ) : history.length === 0 ? (
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
                          onClick={(e) => { e.stopPropagation(); deleteHistoryMutation.mutate({ id: record.id }); }}
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
                        <span>{new Date(record.createdAt).toLocaleString("zh-TW")}</span>
                      </div>
                      <Badge variant="secondary" className="mt-1.5 text-[10px]">
                        {engineMeta(record.engine)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
          <p className="text-[10px] text-muted-foreground/60 mt-3 px-1 leading-relaxed">
            內建雙引擎 AI，無需自備 API Key，金鑰與知識底層皆在後端。
          </p>
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
              GPT → Hook 發散（12個）｜Claude → 篩選整合（3×3×3）
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
              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setFormData({
                      industry: "beauty",
                      productName: "好創短影音代操方案",
                      sellingPoints: "30 天內產出 27 支變體素材，模組化拍攝一次搞定，專業投手即時優化",
                      targetAudience: "25-45 歲中小企業主，有投放經驗但素材產能不足",
                      funnel: "cold",
                      duration: "20",
                      appearance: "person",
                      tone: "professional",
                    });
                    toast.success("已填入測試資料");
                  }}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1" /> 填入測試資料
                </Button>
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
                      <p className="text-xs text-muted-foreground">{viewingHistory.productName} • {new Date(viewingHistory.createdAt).toLocaleString("zh-TW")}</p>
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
                    <SummaryCard label="產業" value={toLabel(INDUSTRIES, formData.industry) || "-"} />
                    <SummaryCard label="產品" value={formData.productName || "-"} />
                    <SummaryCard label="漏斗" value={toLabel(FUNNELS, formData.funnel).split("｜")[0] || "-"} />
                    <SummaryCard label="時長" value={formData.duration ? `${formData.duration} 秒` : "-"} />
                    <SummaryCard label="出鏡" value={toLabel(APPEARANCES, formData.appearance) || "-"} />
                    <SummaryCard label="語氣" value={toLabel(TONES, formData.tone) || "-"} />
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
                            <Button variant={customHookEngine === "claude" ? "default" : "outline"} size="sm" onClick={() => setCustomHookEngine("claude")} className="text-xs">送 Claude 整合</Button>
                            <Button variant={customHookEngine === "gpt" ? "default" : "outline"} size="sm" onClick={() => setCustomHookEngine("gpt")} className="text-xs">送 GPT 整合</Button>
                            <Button variant={customHookEngine === "both" ? "default" : "outline"} size="sm" onClick={() => setCustomHookEngine("both")} className="text-xs">兩個都跑（比較）</Button>
                          </div>
                        </div>
                        <Button onClick={handleCustomHookGenerate} disabled={!customHooks.trim() || isGenerating} className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          {isGenerating ? "生成中..." : `用自訂 Hook → ${customHookEngine === "both" ? "Claude + GPT 比較" : customHookEngine === "claude" ? "Claude 整合" : "GPT 整合"}`}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Standard Action Buttons */}
                  {!customHookMode && (
                    <div className="flex items-center gap-3 mb-6 flex-wrap">
                      <Button size="lg" onClick={handleGenerate} disabled={isGenerating} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border">
                        {isGenerating ? (<><span className="animate-spin mr-2">⚡</span> 生成中...</>) : (<><Zap className="w-4 h-4 mr-2" /> 啟動雙引擎生成</>)}
                      </Button>

                      {(engineStatus.gptOutput || engineStatus.claudeOutput) && !isGenerating && (
                        <Button variant="outline" onClick={handleRegenerateHooks} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                          <RefreshCw className="w-4 h-4 mr-2" /> 重新發散 Hook
                        </Button>
                      )}

                      {engineStatus.phase === "gpt_done" && engineStatus.gptOutput && !engineStatus.claudeOutput && (
                        <div className="flex gap-2">
                          <Button onClick={() => handleReintegrate("claude")} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Zap className="w-4 h-4 mr-2" /> 送 Claude 整合
                          </Button>
                          <Button onClick={() => handleReintegrate("gpt")} variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                            <Zap className="w-4 h-4 mr-2" /> 送 GPT 整合
                          </Button>
                        </div>
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
                    label="引擎 1：GPT Hook 發散"
                    description="產出 12 個不同概念的 Hook 草稿"
                    status={engineStatus.phase === "gpt_generating" ? "running" : engineStatus.gptOutput ? "done" : "pending"}
                  />
                  <EngineStep
                    label="引擎 2：Claude 篩選整合"
                    description="篩選最強 3 個 Hook → 撰寫 Body/CTA → 評分"
                    status={engineStatus.phase === "claude_generating" ? "running" : engineStatus.claudeOutput ? "done" : "pending"}
                  />
                </div>
              )}

              {/* Error */}
              {engineStatus.error && !viewingHistory && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-mono mb-3">{engineStatus.error}</p>
                  <Button variant="outline" size="sm" onClick={handleGenerate} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> 重試
                  </Button>
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
                  {viewingHistory.gptOutput && (
                    <details className="mb-4 border border-border rounded-lg">
                      <summary className="px-4 py-3 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                        📋 查看原始 Hook 草稿
                      </summary>
                      <div className="px-4 pb-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                        {viewingHistory.gptOutput}
                      </div>
                    </details>
                  )}
                  <ScriptOutput content={viewingHistory.finalOutput} />
                </>
              ) : (
                engineStatus.claudeOutput && (
                  <ScriptOutput
                    content={engineStatus.claudeOutput}
                    onRetry={() => handleReintegrate("claude")}
                    isRetrying={engineStatus.phase === "claude_generating"}
                  />
                )
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
  if (status.phase === "claude_generating") return <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">整合運算中</Badge>;
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
        status === "running" || status === "done" ? "bg-primary/20" : "bg-muted"
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
