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
  type EngineConfig, type PromptInput, type EngineVendor,
} from "@shared/scriptTypes";
import { Zap, Copy, Download, ChevronDown, ChevronUp, Loader2, CheckCircle2, Sparkles, BookmarkPlus, ExternalLink } from "lucide-react";

type PresetKey = "premium" | "standard" | "lite";

export default function Home() {
  // Form state
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
  const [scriptCount, setScriptCount] = useState(3);
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(DEFAULT_ENGINE_CONFIG);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Output state
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [notionUrl, setNotionUrl] = useState<string | null>(null);
  const [notionSaved, setNotionSaved] = useState(false);

  const saveToNotionMutation = trpc.notion.saveQuickScript.useMutation({
    onSuccess: (data) => {
      setNotionSaved(true);
      setNotionUrl(data.notionUrl ?? null);
      toast.success("已存入 Notion 腳本庫！", {
        action: data.notionUrl ? {
          label: "開啟",
          onClick: () => window.open(data.notionUrl!, "_blank"),
        } : undefined,
      });
    },
    onError: (err) => {
      toast.error(`存入 Notion 失敗：${err.message}`);
    },
  });

  const generateMutation = trpc.script.generateDual.useMutation({
    onSuccess: (data: { finalOutput: string; gptOutput: string; historyId: number | null }) => {
      setOutput(data.finalOutput);
      setNotionSaved(false);
      setNotionUrl(null);
      toast.success("腳本生成完成！");
    },
    onError: (err: { message: string }) => {
      toast.error(`生成失敗：${err.message}`);
    },
  });

  const handlePreset = (key: PresetKey) => {
    setSelectedPreset(key);
    setEngineConfig(ENGINE_PRESETS[key].config);
  };

  const handleSubmit = () => {
    if (!form.productName.trim()) { toast.error("請填寫產品名稱"); return; }
    if (!form.industry) { toast.error("請選擇產業"); return; }
    if (!form.funnel) { toast.error("請選擇漏斗層級"); return; }
    if (!form.sellingPoints.trim()) { toast.error("請填寫核心賣點"); return; }
    if (!form.targetAudience.trim()) { toast.error("請填寫目標受眾"); return; }

    generateMutation.mutate({
      input: form,
      engineConfig,
      meta: {
        productName: form.productName,
        industry: form.industry,
        funnel: form.funnel,
      },
    });
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("已複製到剪貼簿");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: "txt" | "md") => {
    if (!output) return;
    const content = format === "md"
      ? `# ${form.productName} 腳本\n\n**產業：** ${form.industry}\n**漏斗：** ${form.funnel}\n\n---\n\n${output}`
      : output;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.productName}_腳本.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已下載 ${format.toUpperCase()} 檔案`);
  };

  const isLoading = generateMutation.isPending;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">快速出稿</h1>
          <p className="text-sm text-muted-foreground">雙引擎 AI 生成 Meta 導購型短影音腳本</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          {/* Engine Preset */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                引擎配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ENGINE_PRESETS) as PresetKey[]).map((key) => {
                  const preset = ENGINE_PRESETS[key];
                  const isSelected = selectedPreset === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handlePreset(key)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="text-xs font-semibold">{preset.label}</div>
                      <div className="text-xs opacity-70 mt-0.5">{preset.costHint}</div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                進階自訂
              </button>
              {showAdvanced && (
                <div className="space-y-4 pt-1">
                  {/* 發散引擎 */}
                  <EngineSlot
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
                  {/* 整合引擎 */}
                  <EngineSlot
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
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">產品資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">產品名稱 *</Label>
                  <Input
                    placeholder="e.g. 膠原蛋白飲"
                    value={form.productName}
                    onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                    className="h-9 text-sm bg-input border-border/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">產業 *</Label>
                  <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50">
                      <SelectValue placeholder="選擇產業" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">核心賣點 *</Label>
                <Textarea
                  placeholder="e.g. 日本專利配方、28天見效、素食膠囊"
                  value={form.sellingPoints}
                  onChange={e => setForm(f => ({ ...f, sellingPoints: e.target.value }))}
                  className="text-sm bg-input border-border/50 resize-none"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">目標受眾 *</Label>
                <Input
                  placeholder="e.g. 25-40 歲女性，注重保養，有消費力"
                  value={form.targetAudience}
                  onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                  className="h-9 text-sm bg-input border-border/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Script Settings */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">腳本設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">漏斗層級 *</Label>
                  <Select value={form.funnel} onValueChange={v => setForm(f => ({ ...f, funnel: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50">
                      <SelectValue placeholder="選擇漏斗" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUNNELS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">影片時長</Label>
                  <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">出鏡方式</Label>
                  <Select value={form.appearance} onValueChange={v => setForm(f => ({ ...f, appearance: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPEARANCES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">語氣風格</Label>
                  <Select value={form.tone} onValueChange={v => setForm(f => ({ ...f, tone: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-input border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">腳本數量（1-10）</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={scriptCount}
                    onChange={e => setScriptCount(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <Badge variant="secondary" className="min-w-[2.5rem] justify-center text-sm font-mono">
                    {scriptCount}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full h-11 brand-gradient text-white font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI 生成中...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                開始生成腳本
              </>
            )}
          </Button>
        </div>

        {/* Right: Output */}
        <div className="space-y-4">
          <Card className="bg-card border-border/50 h-full min-h-[400px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">生成結果</CardTitle>
                {output && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      複製
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload("md")}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      MD
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload("txt")}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      TXT
                    </Button>
                    {/* Notion 存入按鈕 */}
                    <div className="h-4 w-px bg-border/50" />
                    {notionSaved ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => notionUrl && window.open(notionUrl, "_blank")}
                        className="h-7 px-2 text-xs text-emerald-500 hover:text-emerald-400"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        已存入 Notion
                        {notionUrl && <ExternalLink className="w-3 h-3 ml-1" />}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={saveToNotionMutation.isPending}
                        onClick={() => {
                          if (!output) return;
                          const engineLabel = `${engineConfig.scatterVendor.toUpperCase()}(${engineConfig.scatterModel}) → ${engineConfig.integrateVendor.toUpperCase()}(${engineConfig.integrateModel})`;
                          saveToNotionMutation.mutate({
                            productName: form.productName,
                            funnel: form.funnel,
                            duration: form.duration,
                            platform: "多平台",
                            industry: form.industry,
                            scriptContent: output,
                            engineConfig: engineLabel,
                          });
                        }}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {saveToNotionMutation.isPending
                          ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          : <BookmarkPlus className="w-3.5 h-3.5 mr-1" />}
                        {saveToNotionMutation.isPending ? "存入中..." : "存入 Notion"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <Separator className="bg-border/50" />
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full brand-gradient animate-pulse-glow" />
                    <Loader2 className="w-6 h-6 text-white absolute inset-0 m-auto animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">雙引擎運算中...</p>
                    <p className="text-xs text-muted-foreground mt-1">GPT 發散 → Claude 整合</p>
                  </div>
                </div>
              ) : output ? (
                <div className="script-output text-foreground/90 bg-background/50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                  {output}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">尚未生成腳本</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">填寫左側表單後點擊「開始生成」</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ========== EngineSlot 組件：廠商 → 子模型兩層選擇 ==========

interface EngineSlotProps {
  label: string;
  vendor: EngineVendor;
  model: string;
  onVendorChange: (v: EngineVendor) => void;
  onModelChange: (m: string) => void;
}

function EngineSlot({ label, vendor, model, onVendorChange, onModelChange }: EngineSlotProps) {
  const models = vendor === "gpt" ? GPT_MODELS : CLAUDE_MODELS;
  const currentModel = models.find(m => m.value === model);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>

      {/* 廠商切換 */}
      <div className="flex gap-2">
        {(["gpt", "claude"] as EngineVendor[]).map((v) => (
          <button
            key={v}
            onClick={() => onVendorChange(v)}
            className={[
              "flex-1 h-8 rounded-md text-xs font-medium border transition-all",
              vendor === v
                ? "bg-primary/15 border-primary/50 text-primary"
                : "bg-transparent border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
            ].join(" ")}
          >
            {v === "gpt" ? "GPT (OpenAI)" : "Claude (Anthropic)"}
          </button>
        ))}
      </div>

      {/* 子模型選擇 */}
      <div className="grid gap-1.5">
        {models.map((m) => (
          <button
            key={m.value}
            onClick={() => onModelChange(m.value)}
            className={[
              "flex items-center justify-between rounded-md px-3 py-2 text-left border transition-all",
              model === m.value
                ? "bg-primary/10 border-primary/40 text-foreground"
                : "bg-transparent border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium shrink-0">{m.label}</span>
              <span className={[
                "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                m.tier === "極耗成本慎選" ? "bg-red-500/15 text-red-400" :
                m.tier === "標準" ? "bg-primary/15 text-primary" :
                m.tier === "經典" ? "bg-purple-500/15 text-purple-400" :
                "bg-muted/50 text-muted-foreground",
              ].join(" ")}>{m.tier}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[10px] text-muted-foreground/70">{m.recommend}</span>
              <span className={[
                "text-[10px] font-medium",
                (m.costHint === "極高" || m.costHint === "高") ? "text-red-400/80" :
                m.costHint === "中" ? "text-yellow-400/80" : "text-green-400/80",
              ].join(" ")}>費用:{m.costHint}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 目前選擇摘要 */}
      {currentModel && (
        <p className="text-[10px] text-muted-foreground/60 pl-1">
          已選：{currentModel.label}　{currentModel.recommend}
        </p>
      )}
    </div>
  );
}
