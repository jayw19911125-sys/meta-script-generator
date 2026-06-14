import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  INDUSTRIES, FUNNELS, DURATIONS, APPEARANCES, TONES,
  ENGINE_PRESETS, DEFAULT_ENGINE_CONFIG,
  GPT_MODELS, CLAUDE_MODELS,
  type EngineConfig, type PromptInput, type ScriptModule, type MatrixRecommendation, type EngineVendor,
} from "@shared/scriptTypes";
import {
  Grid3X3, RefreshCw, Copy, Download, Loader2, ChevronRight,
  Star, CheckCircle2, AlertCircle, Sparkles, Trophy, ChevronDown, ChevronUp, Settings2,
} from "lucide-react";

type Step = "form" | "hooks" | "bodies" | "ctas" | "recommendations";

interface MatrixState {
  hooks: ScriptModule[];
  bodies: ScriptModule[];
  ctas: ScriptModule[];
  recommendations: MatrixRecommendation[];
}

const STEP_LABELS: Record<Step, string> = {
  form: "設定",
  hooks: "Hook 開場",
  bodies: "Body 主體",
  ctas: "CTA 行動",
  recommendations: "AI 推薦",
};

const STEP_ORDER: Step[] = ["form", "hooks", "bodies", "ctas", "recommendations"];

const STEP_COLORS: Record<Step, string> = {
  form: "text-muted-foreground",
  hooks: "text-[oklch(0.72_0.19_35)]",
  bodies: "text-[oklch(0.65_0.22_280)]",
  ctas: "text-[oklch(0.60_0.18_200)]",
  recommendations: "text-[oklch(0.72_0.19_150)]",
};

const STEP_BG: Record<Step, string> = {
  form: "bg-muted/50",
  hooks: "bg-[oklch(0.72_0.19_35/0.1)]",
  bodies: "bg-[oklch(0.65_0.22_280/0.1)]",
  ctas: "bg-[oklch(0.60_0.18_200/0.1)]",
  recommendations: "bg-[oklch(0.72_0.19_150/0.1)]",
};

export default function MatrixPage() {
  const [currentStep, setCurrentStep] = useState<Step>("form");
  const [form, setForm] = useState<PromptInput>({
    industry: "",
    productName: "",
    sellingPoints: "",
    targetAudience: "",
    funnel: "",
    duration: "30",
    appearance: "person",
    tone: "friendly",
  });
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(DEFAULT_ENGINE_CONFIG);
  const [showEngineConfig, setShowEngineConfig] = useState(false);
  const [matrix, setMatrix] = useState<MatrixState>({
    hooks: [],
    bodies: [],
    ctas: [],
    recommendations: [],
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedRec, setSelectedRec] = useState<number>(0);
  const [rerunningId, setRerunningId] = useState<string | null>(null);

  // tRPC mutations
  const hooksMutation = trpc.matrix.generateHooks.useMutation({
    onSuccess: (data: unknown) => {
      const hooks = data as ScriptModule[];
      setMatrix(m => ({ ...m, hooks }));
      setCurrentStep("hooks");
      toast.success("Hook 生成完成！");
    },
    onError: (err: { message: string }) => toast.error(`Hook 生成失敗：${err.message}`),
  });

  const bodiesMutation = trpc.matrix.generateBodies.useMutation({
    onSuccess: (data: unknown) => {
      const bodies = data as ScriptModule[];
      setMatrix(m => ({ ...m, bodies }));
      setCurrentStep("bodies");
      toast.success("Body 生成完成！");
    },
    onError: (err: { message: string }) => toast.error(`Body 生成失敗：${err.message}`),
  });

  const ctasMutation = trpc.matrix.generateCtas.useMutation({
    onSuccess: (data: unknown) => {
      const ctas = data as ScriptModule[];
      setMatrix(m => ({ ...m, ctas }));
      setCurrentStep("ctas");
      toast.success("CTA 生成完成！");
    },
    onError: (err: { message: string }) => toast.error(`CTA 生成失敗：${err.message}`),
  });

  const recsMutation = trpc.matrix.generateRecommendations.useMutation({
    onSuccess: (data: unknown) => {
      const recommendations = data as MatrixRecommendation[];
      setMatrix(m => ({ ...m, recommendations }));
      setCurrentStep("recommendations");
      toast.success("AI 推薦評分完成！");
    },
    onError: (err: { message: string }) => toast.error(`推薦評分失敗：${err.message}`),
  });

  const isAnyLoading = hooksMutation.isPending || bodiesMutation.isPending || ctasMutation.isPending || recsMutation.isPending || !!rerunningId;

  // 局部重跑：使用專屬 rerunCard procedure，只替換指定卡片，其他卡片保持不變
  const rerunCardMutation = trpc.matrix.rerunCard.useMutation();

  const handleRerunHook = (mod: ScriptModule) => {
    setRerunningId(mod.id);
    rerunCardMutation.mutate(
      { step: "hook", targetIndex: mod.index, input: form, contextJson: "", engineConfig },
      {
        onSuccess: (replacement: unknown) => {
          if (replacement) {
            setMatrix(m => ({ ...m, hooks: m.hooks.map(h => h.id === mod.id ? { ...(replacement as ScriptModule), id: mod.id } : h) }));
          }
          setRerunningId(null);
          toast.success(`Hook ${mod.index} 重新生成完成！`);
        },
        onError: () => setRerunningId(null),
      }
    );
  };

  const handleRerunBody = (mod: ScriptModule) => {
    setRerunningId(mod.id);
    rerunCardMutation.mutate(
      { step: "body", targetIndex: mod.index, input: form, contextJson: JSON.stringify(matrix.hooks), engineConfig },
      {
        onSuccess: (replacement: unknown) => {
          if (replacement) {
            setMatrix(m => ({ ...m, bodies: m.bodies.map(b => b.id === mod.id ? { ...(replacement as ScriptModule), id: mod.id } : b) }));
          }
          setRerunningId(null);
          toast.success(`Body ${mod.index} 重新生成完成！`);
        },
        onError: () => setRerunningId(null),
      }
    );
  };

  const handleRerunCta = (mod: ScriptModule) => {
    setRerunningId(mod.id);
    rerunCardMutation.mutate(
      { step: "cta", targetIndex: mod.index, input: form, contextJson: JSON.stringify(matrix.bodies), engineConfig },
      {
        onSuccess: (replacement: unknown) => {
          if (replacement) {
            setMatrix(m => ({ ...m, ctas: m.ctas.map(c => c.id === mod.id ? { ...(replacement as ScriptModule), id: mod.id } : c) }));
          }
          setRerunningId(null);
          toast.success(`CTA ${mod.index} 重新生成完成！`);
        },
        onError: () => setRerunningId(null),
      }
    );
  };

  const validateForm = () => {
    if (!form.productName.trim()) { toast.error("請填寫產品名稱"); return false; }
    if (!form.industry) { toast.error("請選擇產業"); return false; }
    if (!form.funnel) { toast.error("請選擇漏斗層級"); return false; }
    if (!form.sellingPoints.trim()) { toast.error("請填寫核心賣點"); return false; }
    if (!form.targetAudience.trim()) { toast.error("請填寫目標受眾"); return false; }
    return true;
  };

  const handleGenerateHooks = () => {
    if (!validateForm()) return;
    hooksMutation.mutate({ input: form, engineConfig });
  };

  const handleGenerateBodies = () => {
    bodiesMutation.mutate({
      input: form,
      hooksJson: JSON.stringify(matrix.hooks),
      engineConfig,
    });
  };

  const handleGenerateCtas = () => {
    ctasMutation.mutate({
      input: form,
      bodiesJson: JSON.stringify(matrix.bodies),
      engineConfig,
    });
  };

  const handleGenerateRecommendations = () => {
    recsMutation.mutate({
      input: form,
      matrixJson: JSON.stringify({ hooks: matrix.hooks, bodies: matrix.bodies, ctas: matrix.ctas }),
      engineConfig,
    });
  };

  const handleCopyModule = async (mod: ScriptModule) => {
    const text = `【${mod.type.toUpperCase()} ${mod.index}】\n口播：${mod.text}\n畫面：${mod.shotDirection}\n音效：${mod.soundEffect}\n人物：${mod.performanceNote}`;
    await navigator.clipboard.writeText(text);
    toast.success("已複製");
  };

  const handleExportMatrix = (format: "csv" | "md") => {
    if (!matrix.hooks.length) { toast.error("尚未生成矩陣"); return; }
    let content = "";
    if (format === "md") {
      content = `# ${form.productName} 3-3-3 矩陣腳本\n\n`;
      content += `**產業：** ${form.industry} | **漏斗：** ${form.funnel}\n\n---\n\n`;
      content += `## Hook 開場\n\n`;
      matrix.hooks.forEach(h => {
        content += `### H${h.index}\n- 口播：${h.text}\n- 畫面：${h.shotDirection}\n- 音效：${h.soundEffect}\n- 人物：${h.performanceNote}\n\n`;
      });
      content += `## Body 主體\n\n`;
      matrix.bodies.forEach(b => {
        content += `### B${b.index}\n- 口播：${b.text}\n- 畫面：${b.shotDirection}\n- 音效：${b.soundEffect}\n- 人物：${b.performanceNote}\n\n`;
      });
      content += `## CTA 行動\n\n`;
      matrix.ctas.forEach(c => {
        content += `### C${c.index}\n- 口播：${c.text}\n- 畫面：${c.shotDirection}\n- 音效：${c.soundEffect}\n- 人物：${c.performanceNote}\n\n`;
      });
      if (matrix.recommendations.length) {
        content += `## AI 推薦組合\n\n`;
        matrix.recommendations.forEach(r => {
          content += `### 第 ${r.rank} 名（評分：${r.score}）\n- 組合：H${r.hookIndex} + B${r.bodyIndex} + C${r.ctaIndex}\n- 原因：${r.reason}\n\n`;
        });
      }
    } else {
      const rows = [["類型", "編號", "口播", "畫面", "音效", "人物動向"]];
      [...matrix.hooks, ...matrix.bodies, ...matrix.ctas].forEach(m => {
        rows.push([m.type, String(m.index), m.text, m.shotDirection, m.soundEffect, m.performanceNote]);
      });
      content = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.productName}_矩陣.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已下載 ${format.toUpperCase()}`);
  };

  const stepIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shrink-0">
            <Grid3X3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">3-3-3 矩陣生成</h1>
            <p className="text-sm text-muted-foreground">分步生成 Hook × Body × CTA 矩陣組合</p>
          </div>
        </div>
        {matrix.hooks.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportMatrix("md")} className="h-8 text-xs border-border/50">
              <Download className="w-3.5 h-3.5 mr-1" />MD
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportMatrix("csv")} className="h-8 text-xs border-border/50">
              <Download className="w-3.5 h-3.5 mr-1" />CSV
            </Button>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEP_ORDER.map((step, idx) => {
          const isCompleted = idx < stepIndex;
          const isCurrent = step === currentStep;
          const isAccessible = idx <= stepIndex;
          return (
            <div key={step} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => isAccessible && setCurrentStep(step)}
                disabled={!isAccessible}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isCurrent
                    ? `${STEP_BG[step]} ${STEP_COLORS[step]} border border-current/30`
                    : isCompleted
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                {isCompleted && !isCurrent && <CheckCircle2 className="w-3 h-3" />}
                {STEP_LABELS[step]}
              </button>
              {idx < STEP_ORDER.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step: Form */}
      {currentStep === "form" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">產品資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">產品名稱 *</Label>
                  <Input placeholder="e.g. 膠原蛋白飲" value={form.productName}
                    onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                    className="h-9 text-sm bg-input border-border/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">產業 *</Label>
                  <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50"><SelectValue placeholder="選擇產業" /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">核心賣點 *</Label>
                <Textarea placeholder="e.g. 日本專利配方、28天見效" value={form.sellingPoints}
                  onChange={e => setForm(f => ({ ...f, sellingPoints: e.target.value }))}
                  className="text-sm bg-input border-border/50 resize-none" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">目標受眾 *</Label>
                <Input placeholder="e.g. 25-40 歲女性，注重保養" value={form.targetAudience}
                  onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                  className="h-9 text-sm bg-input border-border/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">腳本設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">漏斗層級 *</Label>
                  <Select value={form.funnel} onValueChange={v => setForm(f => ({ ...f, funnel: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50"><SelectValue placeholder="選擇漏斗" /></SelectTrigger>
                    <SelectContent>{FUNNELS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">影片時長</Label>
                  <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">出鏡方式</Label>
                  <Select value={form.appearance} onValueChange={v => setForm(f => ({ ...f, appearance: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{APPEARANCES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">語氣風格</Label>
                  <Select value={form.tone} onValueChange={v => setForm(f => ({ ...f, tone: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {/* 引擎設定 */}
              <div className="border border-border/40 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowEngineConfig(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>引擎設定</span>
                    <span className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded">
                      發散: {engineConfig.scatterModel.split("-").slice(0,2).join("-")} · 整合: {engineConfig.integrateModel.split("-").slice(0,2).join("-")}
                    </span>
                  </div>
                  {showEngineConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showEngineConfig && (
                  <div className="px-3 pb-3 space-y-4 border-t border-border/30 pt-3">
                    <MatrixEngineSlot
                      label="發散引擎（Hook 生成）"
                      vendor={engineConfig.scatterVendor}
                      model={engineConfig.scatterModel}
                      onVendorChange={(v) => {
                        const defaultModel = v === "gpt" ? GPT_MODELS[1].value : CLAUDE_MODELS[2].value;
                        setEngineConfig(c => ({ ...c, scatterVendor: v, scatterModel: defaultModel, preset: "custom" }));
                      }}
                      onModelChange={(m) => setEngineConfig(c => ({ ...c, scatterModel: m, preset: "custom" }))}
                    />
                    <Separator className="bg-border/30" />
                    <MatrixEngineSlot
                      label="整合引擎（Body + CTA + 評分）"
                      vendor={engineConfig.integrateVendor}
                      model={engineConfig.integrateModel}
                      onVendorChange={(v) => {
                        const defaultModel = v === "claude" ? CLAUDE_MODELS[2].value : GPT_MODELS[1].value;
                        setEngineConfig(c => ({ ...c, integrateVendor: v, integrateModel: defaultModel, preset: "custom" }));
                      }}
                      onModelChange={(m) => setEngineConfig(c => ({ ...c, integrateModel: m, preset: "custom" }))}
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button onClick={handleGenerateHooks} disabled={isAnyLoading}
                  className="w-full h-11 brand-gradient text-white font-semibold text-sm">
                  {hooksMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成 Hook 中...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />開始生成 Hook</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Hooks */}
      {currentStep === "hooks" && (
        <div className="space-y-4">
          <ModuleGrid
            modules={matrix.hooks}
            label="Hook"
            color="text-[oklch(0.72_0.19_35)]"
            bg="bg-[oklch(0.72_0.19_35/0.08)]"
            notes={notes}
            onNoteChange={(id, val) => setNotes(n => ({ ...n, [id]: val }))}
            onCopy={handleCopyModule}
            rerunningId={rerunningId}
            onRerun={handleRerunHook}
          />
          <div className="flex justify-end">
            <Button onClick={handleGenerateBodies} disabled={isAnyLoading}
              className="brand-gradient text-white font-semibold">
              {bodiesMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成 Body 中...</>
              ) : (
                <>生成 Body 主體 <ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Bodies */}
      {currentStep === "bodies" && (
        <div className="space-y-4">
          <ModuleGrid
            modules={matrix.bodies}
            label="Body"
            color="text-[oklch(0.65_0.22_280)]"
            bg="bg-[oklch(0.65_0.22_280/0.08)]"
            notes={notes}
            onNoteChange={(id, val) => setNotes(n => ({ ...n, [id]: val }))}
            onCopy={handleCopyModule}
            rerunningId={rerunningId}
            onRerun={handleRerunBody}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("hooks")} className="border-border/50">
              ← 回到 Hook
            </Button>
            <Button onClick={handleGenerateCtas} disabled={isAnyLoading}
              className="brand-gradient text-white font-semibold">
              {ctasMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成 CTA 中...</>
              ) : (
                <>生成 CTA 行動 <ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: CTAs */}
      {currentStep === "ctas" && (
        <div className="space-y-4">
          <ModuleGrid
            modules={matrix.ctas}
            label="CTA"
            color="text-[oklch(0.60_0.18_200)]"
            bg="bg-[oklch(0.60_0.18_200/0.08)]"
            notes={notes}
            onNoteChange={(id, val) => setNotes(n => ({ ...n, [id]: val }))}
            onCopy={handleCopyModule}
            rerunningId={rerunningId}
            onRerun={handleRerunCta}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("bodies")} className="border-border/50">
              ← 回到 Body
            </Button>
            <Button onClick={handleGenerateRecommendations} disabled={isAnyLoading}
              className="brand-gradient text-white font-semibold">
              {recsMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 評分中...</>
              ) : (
                <><Star className="w-4 h-4 mr-2" />AI 推薦評分</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Recommendations */}
      {currentStep === "recommendations" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {matrix.recommendations.map((rec, idx) => (
              <Card
                key={idx}
                onClick={() => setSelectedRec(idx)}
                className={`bg-card border cursor-pointer transition-all ${
                  selectedRec === idx
                    ? "border-primary glow-orange"
                    : "border-border/50 hover:border-primary/50"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {rec.rank === 1 && <Trophy className="w-4 h-4 text-yellow-400" />}
                      <CardTitle className="text-sm font-semibold text-foreground">
                        第 {rec.rank} 名
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-bold text-foreground">{rec.score}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-xs border-[oklch(0.72_0.19_35/0.5)] text-[oklch(0.72_0.19_35)]">H{rec.hookIndex}</Badge>
                    <span className="text-muted-foreground/40 text-xs">+</span>
                    <Badge variant="outline" className="text-xs border-[oklch(0.65_0.22_280/0.5)] text-[oklch(0.65_0.22_280)]">B{rec.bodyIndex}</Badge>
                    <span className="text-muted-foreground/40 text-xs">+</span>
                    <Badge variant="outline" className="text-xs border-[oklch(0.60_0.18_200/0.5)] text-[oklch(0.60_0.18_200)]">C{rec.ctaIndex}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
                  {rec.checklistNotes && (
                    <div className="mt-2 p-2 rounded-md bg-background/50 border border-border/30">
                      <p className="text-xs text-muted-foreground/80 leading-relaxed">{rec.checklistNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Script Output */}
          {matrix.recommendations.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    快速出稿 — 第 {matrix.recommendations[selectedRec]?.rank} 名組合
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const rec = matrix.recommendations[selectedRec];
                      if (!rec) return;
                      const h = matrix.hooks[rec.hookIndex - 1];
                      const b = matrix.bodies[rec.bodyIndex - 1];
                      const c = matrix.ctas[rec.ctaIndex - 1];
                      const text = `【Hook】\n${h?.text}\n\n【Body】\n${b?.text}\n\n【CTA】\n${c?.text}`;
                      await navigator.clipboard.writeText(text);
                      toast.success("已複製腳本");
                    }}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />複製
                  </Button>
                </div>
              </CardHeader>
              <Separator className="bg-border/50" />
              <CardContent className="pt-3">
                {(() => {
                  const rec = matrix.recommendations[selectedRec];
                  if (!rec) return null;
                  const h = matrix.hooks[rec.hookIndex - 1];
                  const b = matrix.bodies[rec.bodyIndex - 1];
                  const c = matrix.ctas[rec.ctaIndex - 1];
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { label: "Hook", mod: h, color: "text-[oklch(0.72_0.19_35)]", bg: "bg-[oklch(0.72_0.19_35/0.06)]" },
                        { label: "Body", mod: b, color: "text-[oklch(0.65_0.22_280)]", bg: "bg-[oklch(0.65_0.22_280/0.06)]" },
                        { label: "CTA", mod: c, color: "text-[oklch(0.60_0.18_200)]", bg: "bg-[oklch(0.60_0.18_200/0.06)]" },
                      ].map(({ label, mod, color, bg }) => mod && (
                        <div key={label} className={`${bg} rounded-lg p-3 space-y-2`}>
                          <div className={`text-xs font-bold ${color}`}>{label}</div>
                          <p className="text-sm text-foreground leading-relaxed">{mod.text}</p>
                          <div className="space-y-1 pt-1 border-t border-border/30">
                            <p className="text-xs text-muted-foreground">📷 {mod.shotDirection}</p>
                            <p className="text-xs text-muted-foreground">🎵 {mod.soundEffect}</p>
                            <p className="text-xs text-muted-foreground">🎬 {mod.performanceNote}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("ctas")} className="border-border/50">
              ← 回到 CTA
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep("form");
                setMatrix({ hooks: [], bodies: [], ctas: [], recommendations: [] });
              }}
              className="border-border/50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />重新開始
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Module Grid Component ==========

interface ModuleGridProps {
  modules: ScriptModule[];
  label: string;
  color: string;
  bg: string;
  notes: Record<string, string>;
  onNoteChange: (id: string, val: string) => void;
  onCopy: (mod: ScriptModule) => void;
  rerunningId?: string | null;
  onRerun?: (mod: ScriptModule) => void;
}

function ModuleGrid({ modules, label, color, bg, notes, onNoteChange, onCopy, rerunningId, onRerun }: ModuleGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {modules.map((mod) => {
        const isRerunning = rerunningId === mod.id;
        const isOtherRunning = !!rerunningId && !isRerunning;
        return (
        <Card
          key={mod.id}
          className={[
            "bg-card border transition-all duration-300",
            isRerunning
              ? "border-primary/60 shadow-[0_0_0_2px_oklch(0.65_0.22_150/0.25)] scale-[1.01]"
              : isOtherRunning
              ? "border-border/30 opacity-50"
              : "border-border/50 hover:border-border/80",
          ].join(" ")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className={`text-xs font-bold ${color} ${bg} px-2 py-0.5 rounded-md`}>
                {label} {mod.index}
              </div>
              <div className="flex items-center gap-1">
                {onRerun && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRerun(mod)}
                    disabled={!!rerunningId}
                    title={isRerunning ? "生成中…" : "重新生成此卡片"}
                    className={[
                      "h-6 w-6 p-0 transition-colors",
                      isRerunning
                        ? "text-primary cursor-not-allowed"
                        : "text-muted-foreground hover:text-primary",
                    ].join(" ")}
                  >
                    {isRerunning
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <RefreshCw className="w-3 h-3" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(mod)}
                  disabled={isRerunning}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* 生成中遮罩 */}
          {isRerunning && (
            <div className="mx-4 mb-3 flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
              <span className="text-xs text-primary font-medium">AI 正在重新生成此卡片…</span>
            </div>
          )}

          <CardContent className={`space-y-3 transition-opacity duration-300 ${isRerunning ? 'opacity-40' : 'opacity-100'}`}>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">口播文案</p>
              <p className="text-sm text-foreground leading-relaxed">{mod.text}</p>
            </div>
            <Separator className="bg-border/30" />
            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="text-xs shrink-0">📷</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{mod.shotDirection}</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-xs shrink-0">🎵</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{mod.soundEffect}</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-xs shrink-0">🎬</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{mod.performanceNote}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">備註</p>
              <Textarea
                placeholder="加入備註..."
                value={notes[mod.id] ?? ""}
                onChange={e => onNoteChange(mod.id, e.target.value)}
                disabled={isRerunning}
                className="text-xs bg-input border-border/30 resize-none h-14"
              />
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}

// ========== MatrixEngineSlot 組件：廠商 → 子模型兩層選擇 ==========

interface MatrixEngineSlotProps {
  label: string;
  vendor: EngineVendor;
  model: string;
  onVendorChange: (v: EngineVendor) => void;
  onModelChange: (m: string) => void;
}

function MatrixEngineSlot({ label, vendor, model, onVendorChange, onModelChange }: MatrixEngineSlotProps) {
  const models = vendor === "gpt" ? GPT_MODELS : CLAUDE_MODELS;
  const currentModel = models.find(m => m.value === model);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">{label}</p>

      {/* 廠商切換 */}
      <div className="flex gap-2">
        {(["gpt", "claude"] as EngineVendor[]).map((v) => (
          <button
            key={v}
            onClick={() => onVendorChange(v)}
            className={[
              "flex-1 h-7 rounded-md text-xs font-medium border transition-all",
              vendor === v
                ? "bg-primary/15 border-primary/50 text-primary"
                : "bg-transparent border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
            ].join(" ")}
          >
            {v === "gpt" ? "GPT" : "Claude"}
          </button>
        ))}
      </div>

      {/* 子模型選擇 */}
      <div className="grid gap-1">
        {models.map((m) => (
          <button
            key={m.value}
            onClick={() => onModelChange(m.value)}
            className={[
              "flex items-center justify-between rounded px-2.5 py-1.5 text-left border transition-all",
              model === m.value
                ? "bg-primary/10 border-primary/40 text-foreground"
                : "bg-transparent border-border/20 text-muted-foreground hover:border-border/50 hover:text-foreground",
            ].join(" ")}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">{m.label}</span>
              <span className={[
                "text-[10px] px-1 py-0.5 rounded",
                m.tier === "頂配" ? "bg-amber-500/15 text-amber-400" :
                m.tier === "標準" ? "bg-primary/15 text-primary" :
                "bg-muted/50 text-muted-foreground",
              ].join(" ")}>{m.tier}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/60 hidden sm:block">{m.recommend}</span>
              <span className={[
                "text-[10px] font-medium",
                (m.costHint === "極高" || m.costHint === "高") ? "text-red-400/80" :
                m.costHint === "中" ? "text-yellow-400/80" : "text-green-400/80",
              ].join(" ")}>費:{m.costHint}</span>
            </div>
          </button>
        ))}
      </div>

      {currentModel && (
        <p className="text-[10px] text-muted-foreground/50 pl-0.5">
          已選：{currentModel.label}
        </p>
      )}
    </div>
  );
}
