// ========== 3-3-3 矩陣生成模式 UI ==========
// 分步生成：Hook → Body → CTA → AI 推薦評分
// 功能：模組卡片切換、備註欄位、快速出稿、複製、匯出

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Zap, RefreshCw, CheckCircle2, ChevronRight, Copy, Download,
  Star, Lightbulb, Camera, Volume2, User, StickyNote, RotateCcw,
  Trophy, Layers, FileText
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { EngineConfig, PromptInput, ScriptModule, MatrixRecommendation } from "@shared/scriptTypes";

// ========== 型別 ==========
type MatrixPhase =
  | "idle"
  | "generating_hooks"
  | "hooks_done"
  | "generating_bodies"
  | "bodies_done"
  | "generating_ctas"
  | "ctas_done"
  | "generating_recommendations"
  | "complete"
  | "error";

interface MatrixState {
  phase: MatrixPhase;
  hooks: ScriptModule[];
  bodies: ScriptModule[];
  ctas: ScriptModule[];
  recommendations: MatrixRecommendation[];
  error: string | null;
  progress: number;
  progressLabel: string;
}

const IDLE_MATRIX: MatrixState = {
  phase: "idle",
  hooks: [],
  bodies: [],
  ctas: [],
  recommendations: [],
  error: null,
  progress: 0,
  progressLabel: "",
};

interface MatrixModeProps {
  input: PromptInput;
  engineConfig: EngineConfig;
  isFormValid: boolean;
}

// ========== 主元件 ==========
export default function MatrixMode({ input, engineConfig, isFormValid }: MatrixModeProps) {
  const [matrix, setMatrix] = useState<MatrixState>(IDLE_MATRIX);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [quickScript, setQuickScript] = useState<{ hook: ScriptModule; body: ScriptModule; cta: ScriptModule; score: number; reason: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"matrix" | "quick">("matrix");
  const rafRef = useRef<number | null>(null);

  const stopProgress = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };
  useEffect(() => () => stopProgress(), []);

  const animateProgress = (from: number, to: number, duration: number, label: string) => {
    stopProgress();
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      const current = from + (to - from) * ratio;
      setMatrix(prev => ({ ...prev, progress: Math.round(current), progressLabel: label }));
      if (ratio < 1) rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  // ========== tRPC mutations ==========
  const hooksMut = trpc.matrix.generateHooks.useMutation();
  const bodiesMut = trpc.matrix.generateBodies.useMutation();
  const ctasMut = trpc.matrix.generateCtas.useMutation();
  const recsMut = trpc.matrix.generateRecommendations.useMutation();

  // ========== 分步生成邏輯 ==========
  const handleGenerate = async () => {
    if (!isFormValid) {
      toast.error("請先填寫完整的產品資訊（Step 1-3）");
      return;
    }
    setMatrix({ ...IDLE_MATRIX, phase: "generating_hooks", progressLabel: "Step 1：生成 3 個 Hook..." });
    animateProgress(0, 30, 20000, "Step 1：AI 正在生成 3 個 Hook 概念...");

    try {
      // Step 1: Hooks
      const hooksRaw = await hooksMut.mutateAsync({ input, engineConfig });
      const hooks = (hooksRaw as ScriptModule[]).map((h, i) => ({ ...h, id: `h${i + 1}`, type: "hook" as const, index: i + 1 }));
      stopProgress();
      setMatrix(prev => ({ ...prev, phase: "hooks_done", hooks, progress: 33, progressLabel: "Step 1 完成 ✓ — 生成 Body 中..." }));
      animateProgress(33, 60, 20000, "Step 2：AI 正在生成 3 個 Body 內容...");

      // Step 2: Bodies
      const bodiesRaw = await bodiesMut.mutateAsync({ input, hooksJson: JSON.stringify(hooks), engineConfig });
      const bodies = (bodiesRaw as ScriptModule[]).map((b, i) => ({ ...b, id: `b${i + 1}`, type: "body" as const, index: i + 1 }));
      stopProgress();
      setMatrix(prev => ({ ...prev, phase: "bodies_done", bodies, progress: 66, progressLabel: "Step 2 完成 ✓ — 生成 CTA 中..." }));
      animateProgress(66, 88, 15000, "Step 3：AI 正在生成 3 個 CTA 行動呼籲...");

      // Step 3: CTAs
      const ctasRaw = await ctasMut.mutateAsync({ input, bodiesJson: JSON.stringify(bodies), engineConfig });
      const ctas = (ctasRaw as ScriptModule[]).map((c, i) => ({ ...c, id: `c${i + 1}`, type: "cta" as const, index: i + 1 }));
      stopProgress();
      setMatrix(prev => ({ ...prev, phase: "ctas_done", ctas, progress: 90, progressLabel: "Step 3 完成 ✓ — AI 評分推薦中..." }));
      animateProgress(90, 98, 10000, "Step 4：AI 正在分析最佳組合...");

      // Step 4: Recommendations
      const matrixJson = JSON.stringify({ hooks, bodies, ctas });
      const recsRaw = await recsMut.mutateAsync({ input, matrixJson, engineConfig });
      const recommendations = recsRaw as MatrixRecommendation[];
      stopProgress();

      // 自動設定快速出稿（取最高分推薦）
      const topRec = recommendations[0];
      if (topRec) {
        setQuickScript({
          hook: hooks[topRec.hookIndex - 1],
          body: bodies[topRec.bodyIndex - 1],
          cta: ctas[topRec.ctaIndex - 1],
          score: topRec.score,
          reason: topRec.reason,
        });
      }

      setMatrix(prev => ({
        ...prev,
        phase: "complete",
        recommendations,
        progress: 100,
        progressLabel: "3-3-3 矩陣生成完成 ✓",
      }));
      toast.success("矩陣生成完成！已自動選出最佳組合");
    } catch (e) {
      stopProgress();
      const msg = e instanceof Error ? e.message : String(e);
      setMatrix(prev => ({ ...prev, phase: "error", error: msg, progress: 0, progressLabel: "" }));
    }
  };

  // 局部重跑某個模組
  const handleRerunModule = async (type: "hook" | "body" | "cta", index: number) => {
    if (type === "hook") {
      toast.info("重新生成 Hook...");
      try {
        const hooksRaw = await hooksMut.mutateAsync({ input, engineConfig });
        const newHooks = (hooksRaw as ScriptModule[]).map((h, i) => ({ ...h, id: `h${i + 1}`, type: "hook" as const, index: i + 1 }));
        setMatrix(prev => ({ ...prev, hooks: newHooks }));
        toast.success("Hook 已重新生成");
      } catch (e) {
        toast.error("重跑失敗：" + (e instanceof Error ? e.message : String(e)));
      }
    } else if (type === "body") {
      toast.info("重新生成 Body...");
      try {
        const bodiesRaw = await bodiesMut.mutateAsync({ input, hooksJson: JSON.stringify(matrix.hooks), engineConfig });
        const newBodies = (bodiesRaw as ScriptModule[]).map((b, i) => ({ ...b, id: `b${i + 1}`, type: "body" as const, index: i + 1 }));
        setMatrix(prev => ({ ...prev, bodies: newBodies }));
        toast.success("Body 已重新生成");
      } catch (e) {
        toast.error("重跑失敗：" + (e instanceof Error ? e.message : String(e)));
      }
    } else {
      toast.info("重新生成 CTA...");
      try {
        const ctasRaw = await ctasMut.mutateAsync({ input, bodiesJson: JSON.stringify(matrix.bodies), engineConfig });
        const newCtas = (ctasRaw as ScriptModule[]).map((c, i) => ({ ...c, id: `c${i + 1}`, type: "cta" as const, index: i + 1 }));
        setMatrix(prev => ({ ...prev, ctas: newCtas }));
        toast.success("CTA 已重新生成");
      } catch (e) {
        toast.error("重跑失敗：" + (e instanceof Error ? e.message : String(e)));
      }
    }
    void index; // suppress unused warning
  };

  const updateNote = (id: string, note: string) => {
    setNotes(prev => ({ ...prev, [id]: note }));
  };

  const isGenerating = [
    "generating_hooks", "generating_bodies", "generating_ctas", "generating_recommendations"
  ].includes(matrix.phase);

  // ========== 快速出稿文字組合 ==========
  const buildQuickScriptText = () => {
    if (!quickScript) return "";
    const { hook, body, cta } = quickScript;
    return [
      `【Hook】\n${hook.text}`,
      `\n【畫面】${hook.shotDirection}`,
      `【音效】${hook.soundEffect}`,
      `【動作】${hook.performanceNote}`,
      `\n【Body】\n${body.text}`,
      `\n【畫面】${body.shotDirection}`,
      `【音效】${body.soundEffect}`,
      `【動作】${body.performanceNote}`,
      `\n【CTA】\n${cta.text}`,
      `\n【畫面】${cta.shotDirection}`,
      `【音效】${cta.soundEffect}`,
      `【動作】${cta.performanceNote}`,
    ].join("\n");
  };

  const copyQuickScript = () => {
    const text = buildQuickScriptText();
    navigator.clipboard.writeText(text);
    toast.success("已複製快速出稿腳本");
  };

  const exportCsv = () => {
    const rows = [
      ["模組", "類型", "編號", "口播文案", "畫面建議", "音效建議", "人物動向", "備註"],
      ...matrix.hooks.map(m => [m.id, "Hook", m.index, m.text, m.shotDirection, m.soundEffect, m.performanceNote, notes[m.id] ?? ""]),
      ...matrix.bodies.map(m => [m.id, "Body", m.index, m.text, m.shotDirection, m.soundEffect, m.performanceNote, notes[m.id] ?? ""]),
      ...matrix.ctas.map(m => [m.id, "CTA", m.index, m.text, m.shotDirection, m.soundEffect, m.performanceNote, notes[m.id] ?? ""]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `腳本矩陣_${input.productName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 已下載");
  };

  const exportMarkdown = () => {
    const lines = [
      `# 3-3-3 腳本矩陣 — ${input.productName}`,
      `> 產業：${input.industry} ｜ 漏斗：${input.funnel} ｜ 時長：${input.duration}秒`,
      "",
      "## Hook 模組",
      ...matrix.hooks.map(m => [
        `### H${m.index}`,
        `**口播：** ${m.text}`,
        `**畫面：** ${m.shotDirection}`,
        `**音效：** ${m.soundEffect}`,
        `**動作：** ${m.performanceNote}`,
        notes[m.id] ? `**備註：** ${notes[m.id]}` : "",
        "",
      ].filter(Boolean).join("\n")),
      "## Body 模組",
      ...matrix.bodies.map(m => [
        `### B${m.index}`,
        `**口播：** ${m.text}`,
        `**畫面：** ${m.shotDirection}`,
        `**音效：** ${m.soundEffect}`,
        `**動作：** ${m.performanceNote}`,
        notes[m.id] ? `**備註：** ${notes[m.id]}` : "",
        "",
      ].filter(Boolean).join("\n")),
      "## CTA 模組",
      ...matrix.ctas.map(m => [
        `### C${m.index}`,
        `**口播：** ${m.text}`,
        `**畫面：** ${m.shotDirection}`,
        `**音效：** ${m.soundEffect}`,
        `**動作：** ${m.performanceNote}`,
        notes[m.id] ? `**備註：** ${notes[m.id]}` : "",
        "",
      ].filter(Boolean).join("\n")),
      "## AI 推薦組合",
      ...matrix.recommendations.map(r => [
        `### 推薦 #${r.rank}（評分 ${r.score}/100）`,
        `組合：H${r.hookIndex} + B${r.bodyIndex} + C${r.ctaIndex}`,
        `**推薦原因：** ${r.reason}`,
        `**評分說明：** ${r.checklistNotes}`,
        "",
      ].join("\n")),
    ];
    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `腳本矩陣_${input.productName}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown 已下載");
  };

  // ========== 生成步驟指示器 ==========
  const steps = [
    { label: "Hook 生成", done: matrix.hooks.length > 0, running: matrix.phase === "generating_hooks" },
    { label: "Body 生成", done: matrix.bodies.length > 0, running: matrix.phase === "generating_bodies" },
    { label: "CTA 生成", done: matrix.ctas.length > 0, running: matrix.phase === "generating_ctas" },
    { label: "AI 評分推薦", done: matrix.recommendations.length > 0, running: matrix.phase === "generating_recommendations" },
  ];

  return (
    <div className="space-y-6">
      {/* 頂部操作列 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <span className="font-semibold">3-3-3 矩陣模式</span>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Beta</Badge>
        </div>
        <div className="flex items-center gap-2">
          {matrix.phase === "complete" && (
            <>
              <Button variant="outline" size="sm" onClick={exportCsv} className="text-xs gap-1.5 h-8">
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportMarkdown} className="text-xs gap-1.5 h-8">
                <FileText className="w-3.5 h-3.5" /> Markdown
              </Button>
            </>
          )}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !isFormValid}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border gap-1.5"
          >
            {isGenerating ? (
              <><span className="animate-spin">⚡</span> 生成中...</>
            ) : matrix.phase === "complete" ? (
              <><RefreshCw className="w-4 h-4" /> 重新生成矩陣</>
            ) : (
              <><Zap className="w-4 h-4" /> 啟動矩陣生成</>
            )}
          </Button>
        </div>
      </div>

      {/* 進度條 */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{matrix.progressLabel}</span>
            <span className="text-xs font-mono text-primary">{matrix.progress}%</span>
          </div>
          <Progress value={matrix.progress} className="h-2" />
          {/* 步驟指示器 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            {steps.map((s, i) => (
              <div key={i} className={`flex items-center gap-1.5 p-2 rounded-md border text-xs transition-all ${
                s.running ? "border-primary/50 bg-primary/5 text-primary" :
                s.done ? "border-primary/30 bg-primary/5 text-foreground" :
                "border-border text-muted-foreground"
              }`}>
                {s.running && <span className="animate-spin">⚡</span>}
                {s.done && <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />}
                {!s.running && !s.done && <span className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />}
                <span className="truncate">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 錯誤訊息 */}
      {matrix.phase === "error" && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <p className="text-sm text-destructive font-mono mb-3">{matrix.error}</p>
          <Button variant="outline" size="sm" onClick={handleGenerate} className="border-destructive/30 text-destructive hover:bg-destructive/10">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> 重試
          </Button>
        </div>
      )}

      {/* 完成後的 Tab 切換 */}
      {matrix.phase === "complete" && (
        <>
          <div className="flex gap-2 border-b border-border pb-2">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-4 py-1.5 text-sm rounded-t-md transition-colors ${activeTab === "matrix" ? "bg-primary/10 text-primary border border-primary/30 border-b-0" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Layers className="w-3.5 h-3.5 inline mr-1.5" />矩陣總覽
            </button>
            <button
              onClick={() => setActiveTab("quick")}
              className={`px-4 py-1.5 text-sm rounded-t-md transition-colors ${activeTab === "quick" ? "bg-primary/10 text-primary border border-primary/30 border-b-0" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Trophy className="w-3.5 h-3.5 inline mr-1.5" />快速出稿
              {quickScript && <Badge className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">{quickScript.score}分</Badge>}
            </button>
          </div>

          {/* 矩陣總覽 Tab */}
          {activeTab === "matrix" && (
            <div className="space-y-8">
              {/* AI 推薦評分 */}
              {matrix.recommendations.length > 0 && (
                <div className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">AI 推薦最佳組合</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {matrix.recommendations.map((rec) => (
                      <div
                        key={rec.rank}
                        onClick={() => {
                          setQuickScript({
                            hook: matrix.hooks[rec.hookIndex - 1],
                            body: matrix.bodies[rec.bodyIndex - 1],
                            cta: matrix.ctas[rec.ctaIndex - 1],
                            score: rec.score,
                            reason: rec.reason,
                          });
                          setActiveTab("quick");
                          toast.success(`已切換到推薦組合 #${rec.rank}`);
                        }}
                        className="cursor-pointer p-3 border border-border rounded-lg hover:border-amber-500/40 hover:bg-amber-500/5 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-amber-400">推薦 #{rec.rank}</span>
                          <span className="text-xs font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">{rec.score}分</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">H{rec.hookIndex} + B{rec.bodyIndex} + C{rec.ctaIndex}</p>
                        <p className="text-xs text-foreground/80 line-clamp-2">{rec.reason}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{rec.checklistNotes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hook 模組 */}
              <ModuleSection
                title="Hook 模組"
                modules={matrix.hooks}
                notes={notes}
                onNoteChange={updateNote}
                onRerun={() => handleRerunModule("hook", 0)}
                accentColor="blue"
              />

              {/* Body 模組 */}
              <ModuleSection
                title="Body 模組"
                modules={matrix.bodies}
                notes={notes}
                onNoteChange={updateNote}
                onRerun={() => handleRerunModule("body", 0)}
                accentColor="purple"
              />

              {/* CTA 模組 */}
              <ModuleSection
                title="CTA 模組"
                modules={matrix.ctas}
                notes={notes}
                onNoteChange={updateNote}
                onRerun={() => handleRerunModule("cta", 0)}
                accentColor="green"
              />
            </div>
          )}

          {/* 快速出稿 Tab */}
          {activeTab === "quick" && quickScript && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold">最佳組合腳本</span>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{quickScript.score}/100</Badge>
                </div>
                <Button size="sm" onClick={copyQuickScript} className="gap-1.5 text-xs">
                  <Copy className="w-3.5 h-3.5" /> 複製完整腳本
                </Button>
              </div>

              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400 font-medium mb-1">AI 推薦原因</p>
                <p className="text-sm text-foreground/80">{quickScript.reason}</p>
              </div>

              <div className="space-y-3">
                <QuickModuleCard module={quickScript.hook} label="Hook" />
                <div className="flex justify-center">
                  <ChevronRight className="w-5 h-5 text-muted-foreground rotate-90" />
                </div>
                <QuickModuleCard module={quickScript.body} label="Body" />
                <div className="flex justify-center">
                  <ChevronRight className="w-5 h-5 text-muted-foreground rotate-90" />
                </div>
                <QuickModuleCard module={quickScript.cta} label="CTA" />
              </div>

              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-xs text-muted-foreground mb-2 font-medium">完整腳本預覽</p>
                <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto">
                  {buildQuickScriptText()}
                </pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ========== 模組區塊元件 ==========
interface ModuleSectionProps {
  title: string;
  modules: ScriptModule[];
  notes: Record<string, string>;
  onNoteChange: (id: string, note: string) => void;
  onRerun: () => void;
  accentColor: "blue" | "purple" | "green";
}

const ACCENT_COLORS = {
  blue: { border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-400", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  purple: { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-400", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  green: { border: "border-green-500/30", bg: "bg-green-500/5", text: "text-green-400", badge: "bg-green-500/20 text-green-400 border-green-500/30" },
};

function ModuleSection({ title, modules, notes, onNoteChange, onRerun, accentColor }: ModuleSectionProps) {
  const colors = ACCENT_COLORS[accentColor];
  return (
    <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${colors.text}`}>{title}</span>
          <Badge className={`text-[10px] ${colors.badge}`}>{modules.length} 個</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onRerun} className="text-xs text-muted-foreground hover:text-foreground gap-1">
          <RefreshCw className="w-3 h-3" /> 重新生成
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <ModuleCard
            key={mod.id}
            module={mod}
            note={notes[mod.id] ?? ""}
            onNoteChange={(note) => onNoteChange(mod.id, note)}
            accentColor={accentColor}
          />
        ))}
      </div>
    </div>
  );
}

// ========== 模組卡片 ==========
interface ModuleCardProps {
  module: ScriptModule;
  note: string;
  onNoteChange: (note: string) => void;
  accentColor: "blue" | "purple" | "green";
}

function ModuleCard({ module, note, onNoteChange, accentColor }: ModuleCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const colors = ACCENT_COLORS[accentColor];

  const copyModule = () => {
    const text = `【${module.type.toUpperCase()} ${module.index}】\n口播：${module.text}\n畫面：${module.shotDirection}\n音效：${module.soundEffect}\n動作：${module.performanceNote}`;
    navigator.clipboard.writeText(text);
    toast.success(`已複製 ${module.id.toUpperCase()}`);
  };

  return (
    <div className={`border ${colors.border} ${colors.bg} rounded-lg p-4 space-y-3 hover:shadow-md transition-all`}>
      {/* 標頭 */}
      <div className="flex items-center justify-between">
        <Badge className={`text-xs ${colors.badge}`}>{module.id.toUpperCase()}</Badge>
        <button onClick={copyModule} className="text-muted-foreground hover:text-foreground transition-colors">
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 口播文案 */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
          <FileText className="w-3 h-3" /> 口播文案
        </p>
        <p className="text-sm leading-relaxed">{module.text}</p>
      </div>

      {/* 拍攝指令 */}
      <div className="space-y-1.5 pt-2 border-t border-border/50">
        <div className="flex items-start gap-1.5">
          <Camera className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{module.shotDirection}</p>
        </div>
        <div className="flex items-start gap-1.5">
          <Volume2 className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{module.soundEffect}</p>
        </div>
        <div className="flex items-start gap-1.5">
          <User className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{module.performanceNote}</p>
        </div>
      </div>

      {/* 備註欄位 */}
      <div className="pt-2 border-t border-border/50">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <StickyNote className="w-3 h-3" />
          {note ? "查看備註" : "新增備註"}
          {note && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" />}
        </button>
        {showNotes && (
          <Textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="輸入備註、修改意見或拍攝提醒..."
            className="mt-2 text-xs min-h-[60px] bg-background/50"
          />
        )}
      </div>
    </div>
  );
}

// ========== 快速出稿模組卡片 ==========
function QuickModuleCard({ module, label }: { module: ScriptModule; label: string }) {
  const colorMap = { Hook: "blue", Body: "purple", CTA: "green" } as const;
  const colors = ACCENT_COLORS[colorMap[label as keyof typeof colorMap]];

  return (
    <div className={`border ${colors.border} ${colors.bg} rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Badge className={`text-xs ${colors.badge}`}>{label}</Badge>
        <span className="text-xs text-muted-foreground">{module.id.toUpperCase()}</span>
      </div>
      <p className="text-sm mb-3 leading-relaxed">{module.text}</p>
      <div className="space-y-1.5 pt-2 border-t border-border/50">
        <div className="flex items-start gap-1.5">
          <Camera className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{module.shotDirection}</p>
        </div>
        <div className="flex items-start gap-1.5">
          <Volume2 className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{module.soundEffect}</p>
        </div>
        <div className="flex items-start gap-1.5">
          <User className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{module.performanceNote}</p>
        </div>
      </div>
    </div>
  );
}
