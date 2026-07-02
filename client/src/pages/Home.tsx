import { useState, useEffect } from "react";
import { useScriptExport } from "@/hooks/useScriptExport";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { parseGenerationError } from "@/lib/errorParser";
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
import { Zap, Copy, Download, ChevronDown, ChevronUp, Loader2, CheckCircle2, Sparkles, BookmarkPlus, ExternalLink, Eye, Info, FileText, Code2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGenerating } from "@/components/DashboardLayout";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

type PresetKey = "premium" | "standard" | "lite";

export default function Home() {
  const { setIsGenerating } = useGenerating();
  const [location] = useLocation();

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
  const { copied, copyScript, downloadScript } = useScriptExport();
  const [notionUrl, setNotionUrl] = useState<string | null>(null);
  const [notionSaved, setNotionSaved] = useState(false);
  const [knowledgeHit, setKnowledgeHit] = useState<{ funnel: boolean; hook: boolean; methodology: boolean } | null>(null);
  const [quality, setQuality] = useState<{ estimatedSeconds: number; hookStrength: number; ctaClarity: number } | null>(null);
  // Notion 預覽視窗 state
  const [notionPreviewOpen, setNotionPreviewOpen] = useState(false);
  const [notionPreviewTitle, setNotionPreviewTitle] = useState("");
  const [notionPreviewContent, setNotionPreviewContent] = useState("");
  const [notionPreviewNote, setNotionPreviewNote] = useState("");

  // 從 URL 參數自動填入（來自歷史頁「以此設定重新生成」）
  useEffect(() => {
    const search = window.location.search;
    if (!search) return;
    const params = new URLSearchParams(search);
    const productName = params.get("productName");
    const industry = params.get("industry");
    const funnel = params.get("funnel");
    const sellingPoints = params.get("sellingPoints");
    const targetAudience = params.get("targetAudience");
    const duration = params.get("duration");
    const appearance = params.get("appearance");
    const tone = params.get("tone");
    const hasAny = productName || industry || funnel || sellingPoints || targetAudience || duration || appearance || tone;
    if (hasAny) {
      setForm(f => ({
        ...f,
        ...(productName ? { productName } : {}),
        ...(industry ? { industry } : {}),
        ...(funnel ? { funnel } : {}),
        ...(sellingPoints ? { sellingPoints } : {}),
        ...(targetAudience ? { targetAudience } : {}),
        ...(duration ? { duration } : {}),
        ...(appearance ? { appearance } : {}),
        ...(tone ? { tone } : {}),
      }));
      // 清除 URL 參數，避免重新整理時重複填入
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

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
    onMutate: () => { setIsGenerating(true); },
    onSuccess: (data: { finalOutput: string; gptOutput: string; historyId: number | null; knowledgeHit?: { funnel: boolean; hook: boolean; methodology: boolean }; quality?: { estimatedSeconds: number; hookStrength: number; ctaClarity: number } }) => {
      setIsGenerating(false);
      setOutput(data.finalOutput);
      setNotionSaved(false);
      setNotionUrl(null);
      setKnowledgeHit(data.knowledgeHit ?? null);
      setQuality(data.quality ?? null);
      navigator.vibrate?.(200);
      toast.success("腳本生成完成！");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setIsGenerating(false);
      const parsed = parseGenerationError(err);
      toast.error(parsed.title, {
        description: parsed.description,
        duration: parsed.canRetry ? 5000 : 8000,
        action: parsed.retryLabel && parsed.canRetry ? {
          label: parsed.retryLabel,
          onClick: () => handleSubmit(),
        } : undefined,
      });
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

  // 純文字：移除 Markdown 標記（#、**、- 等）
  const stripMarkdown = (md: string): string =>
    md
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^>\s+/gm, "")
      .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  const handleCopyMarkdown = () => { if (output) copyScript(output); };
  const handleCopyPlainText = () => { if (output) copyScript(stripMarkdown(output)); };
  const handleDownload = (format: "txt" | "md") => {
    if (!output) return;
    if (format === "txt") {
      downloadScript(output, form.productName);
    } else {
      // MD 格式保留原有結構化輸出
      const content = `# ${form.productName} 腳本\n\n**產業：** ${form.industry}\n**漏斗：** ${form.funnel}\n\n---\n\n${output}`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `META腳本_${form.productName}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("已下載 MD 檔案");
    }
  };

  const isLoading = generateMutation.isPending;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-primary/30 bg-primary/8 flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">快速出稿</h1>
            <p className="text-[11px] text-muted-foreground font-mono">dual-engine · meta ads script</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          {/* Engine Preset */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                引擎配置
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px] text-xs leading-relaxed">
                      <p className="font-semibold mb-1">雙引擎架構</p>
                      <p><span className="text-orange-400">發散引擎（GPT）</span>：負責生成多樣化 Hook，廣泛探索創意方向</p>
                      <p className="mt-1"><span className="text-violet-400">整合引擎（Claude）</span>：負責 Body + CTA + 品質評分，確保邏輯一致與導購力</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                      className={`p-2.5 rounded border text-left transition-all ${
                        isSelected
                          ? "border-l-2 border-primary bg-muted text-foreground"
                          : "border-border bg-card hover:border-border/80 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
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
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">產品資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">產品名稱 *</Label>
                  <Input
                    placeholder="e.g. 膠原蛋白飲"
                    value={form.productName}
                    onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                    className="h-8 text-sm bg-input border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">產業 *</Label>
                  <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                    <SelectTrigger className="h-8 text-sm bg-input border-border">
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
                  className="text-sm bg-input border-border resize-none"
                  rows={2}
                  maxLength={2000}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">目標受眾 *</Label>
                <Input
                  placeholder="e.g. 25-40 歲女性，注重保養，有消費力"
                  value={form.targetAudience}
                  onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                  className="h-8 text-sm bg-input border-border"
                  maxLength={1000}
                />
              </div>
            </CardContent>
          </Card>

          {/* Script Settings */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">腳本設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">漏斗層級 *</Label>
                  <Select value={form.funnel} onValueChange={v => setForm(f => ({ ...f, funnel: v }))}>
                    <SelectTrigger className="h-8 text-sm bg-input border-border">
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
                    <SelectTrigger className="h-8 text-sm bg-input border-border">
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
                    <SelectTrigger className="h-8 text-sm bg-input border-border">
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
                    <SelectTrigger className="h-8 text-sm bg-input border-border">
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
            className="w-full h-9 bg-primary text-primary-foreground font-semibold text-xs tracking-wide hover:bg-primary/90 transition-colors active-scale border border-primary/80"
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
          <Card className="bg-card border-border flex flex-col min-h-[400px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">生成結果</CardTitle>
                {output && (
                  <div className="flex items-center gap-0.5 flex-wrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                          複製
                          <ChevronDown className="w-3 h-3 ml-0.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={handleCopyPlainText} className="text-xs gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          複製純文字
                          <span className="ml-auto text-[10px] text-muted-foreground">LINE/Slack</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopyMarkdown} className="text-xs gap-2">
                          <Code2 className="w-3.5 h-3.5" />
                          複製 Markdown
                          <span className="ml-auto text-[10px] text-muted-foreground">Notion</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    <div className="h-4 w-px bg-border/50 hidden sm:block" />
                    {notionSaved ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => notionUrl && window.open(notionUrl, "_blank")}
                        className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">已存入 Notion</span>
                        {notionUrl && <ExternalLink className="w-3 h-3 ml-1" />}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={saveToNotionMutation.isPending}
                        onClick={() => {
                          if (!output) return;
                          const today = new Date().toLocaleDateString("zh-TW");
                          setNotionPreviewTitle(`[META快速出稿] ${form.productName} · ${form.funnel} · ${today}`);
                          setNotionPreviewContent(output);
                          setNotionPreviewNote("");
                          setNotionPreviewOpen(true);
                        }}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {saveToNotionMutation.isPending
                          ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          : <Eye className="w-3.5 h-3.5 mr-1" />}
                        <span className="hidden sm:inline">{saveToNotionMutation.isPending ? "存入中..." : "預覽存入 Notion"}</span>
                        <span className="sm:hidden">{saveToNotionMutation.isPending ? "存入..." : "Notion"}</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            {/* 品質指標列 */}
            {output && quality && (
              <div className="px-4 py-2 flex flex-wrap items-center gap-3 border-b border-border/40 bg-background/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>✅ 預估秒數</span>
                  <span className="font-semibold text-foreground">{quality.estimatedSeconds}s</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>🎯 Hook 強度</span>
                  <span className="font-semibold text-foreground">{quality.hookStrength}/5</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>📣 CTA 明確度</span>
                  <span className="font-semibold text-foreground">{quality.ctaClarity}/5</span>
                </div>
                {knowledgeHit && (
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-muted-foreground/60">知識庫：</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${knowledgeHit.funnel ? 'border-emerald-500/50 text-emerald-400' : 'border-border/40 text-muted-foreground/50'}`}>漏斗</Badge>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${knowledgeHit.hook ? 'border-emerald-500/50 text-emerald-400' : 'border-border/40 text-muted-foreground/50'}`}>Hook</Badge>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${knowledgeHit.methodology ? 'border-emerald-500/50 text-emerald-400' : 'border-border/40 text-muted-foreground/50'}`}>方法論</Badge>
                  </div>
                )}
              </div>
            )}
            <Separator className="bg-border/50" />
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded border border-primary/40 bg-primary/10 animate-pulse" />
                    <Loader2 className="w-6 h-6 text-primary absolute inset-0 m-auto animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">雙引擎運算中...</p>
                    <p className="text-xs text-muted-foreground mt-1">{engineConfig.scatterVendor.toUpperCase()} 發散 → {engineConfig.integrateVendor.toUpperCase()} 整合</p>
                  </div>
                </div>
              ) : output ? (
                <>
                  <div className="script-output text-foreground/90 bg-background/50 rounded border border-border/30 p-4 max-h-[50dvh] lg:max-h-[600px] overflow-y-auto prose prose-sm prose-invert max-w-none">
                    <Streamdown>{output}</Streamdown>
                  </div>
                  {/* Notion 存入成功 inline 狀態列 */}
                  {notionSaved && notionUrl && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded border border-emerald-500/30 bg-emerald-500/5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs text-emerald-400 font-mono truncate flex-1">
                        已存入 Notion
                      </span>
                      <a
                        href={notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>開啟頁面</span>
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-10 h-10 rounded border border-border bg-muted/50 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">尚未生成腳本</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">填寫上方表單後點擊「開始生成」</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notion 預覽存入視窗 */}
      <Dialog open={notionPreviewOpen} onOpenChange={setNotionPreviewOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90dvh] flex flex-col bg-[oklch(0.15_0.02_240)] border-border/40">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              預覽存入 Notion
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">確認內容後再存入，可在此微調標題與備註</p>
          </DialogHeader>

          <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
            {/* 腳本標題 */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">腳本標題</Label>
              <Input
                value={notionPreviewTitle}
                onChange={(e) => setNotionPreviewTitle(e.target.value)}
                className="text-sm bg-muted/30 border-border/40 h-8"
                placeholder="腳本標題"
                maxLength={300}
              />
            </div>

            {/* 腳本內容 */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">腳本內容（可微調）</Label>
              <Textarea
                value={notionPreviewContent}
                onChange={(e) => setNotionPreviewContent(e.target.value)}
                className="text-xs bg-muted/30 border-border/40 font-mono leading-relaxed resize-none"
                rows={14}
                maxLength={50000}
              />
            </div>

            {/* 備註 */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">備註（選填）</Label>
              <Input
                value={notionPreviewNote}
                onChange={(e) => setNotionPreviewNote(e.target.value)}
                className="text-sm bg-muted/30 border-border/40 h-8"
                placeholder="例：第一次測試、客戶 A 用"
                maxLength={2000}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-2 border-t border-border/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotionPreviewOpen(false)}
              className="text-muted-foreground"
            >
              取消
            </Button>
            <Button
              size="sm"
              disabled={saveToNotionMutation.isPending || !notionPreviewTitle.trim()}
              onClick={() => {
                const engineLabel = `${engineConfig.scatterVendor.toUpperCase()}(${engineConfig.scatterModel}) → ${engineConfig.integrateVendor.toUpperCase()}(${engineConfig.integrateModel})`;
                saveToNotionMutation.mutate({
                  productName: form.productName,
                  funnel: form.funnel,
                  duration: form.duration,
                  platform: "多平台",
                  industry: form.industry,
                  scriptContent: notionPreviewContent,
                  engineConfig: engineLabel,
                  scriptTitle: notionPreviewTitle,
                  notes: notionPreviewNote || undefined,
                }, {
                  onSuccess: () => setNotionPreviewOpen(false),
                });
              }}
              className="bg-primary text-primary-foreground font-medium hover:bg-primary/90 border border-primary/80"
            >
              {saveToNotionMutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />存入中...</>
                : <><BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />確認存入 Notion</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
