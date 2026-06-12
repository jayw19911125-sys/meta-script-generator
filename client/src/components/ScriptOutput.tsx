import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Copy, Download, FileText, ChevronUp, ChevronDown,
  BookMarked, Loader2, CheckCircle2, ExternalLink, X
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";

// ========== 存入 Notion 所需的表單資料 ==========
export interface NotionSavePayload {
  clientName?: string;       // 若已知客戶名稱可預填
  projectType: string;       // 例如「Meta 導購型短影音廣告」
  industry: string;
  funnel: string;
  duration: string;
  appearance: string;
  tone: string;
  targetAudience: string;
  sellingPoints: string;
  scriptCount: number;
  gptOutput?: string;
  engineMode: string;
  historyId?: number | null;
}

interface ScriptOutputProps {
  content: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  notionPayload?: NotionSavePayload;  // 傳入後才顯示「存入 Notion」按鈕
}

// ========== 存入 Notion 彈窗 ==========
interface NotionSaveDialogProps {
  payload: NotionSavePayload;
  finalOutput: string;
  onClose: () => void;
}

function NotionSaveDialog({ payload, finalOutput, onClose }: NotionSaveDialogProps) {
  const [clientName, setClientName] = useState(payload.clientName ?? "");
  const [scriptCount, setScriptCount] = useState(payload.scriptCount ?? 1);
  const [saveResult, setSaveResult] = useState<{
    parentPageUrl: string;
    clientPageUrl: string;
    execPageUrl: string;
    slackSent?: boolean;
    mondayUpdated?: boolean;
    mondayItemName?: string;
  } | null>(null);

  const saveToNotionMutation = trpc.script.saveToNotion.useMutation({
    onSuccess: (data) => {
      setSaveResult(data);
      toast.success("✅ 已成功存入 Notion 客戶腳本庫！");
    },
    onError: (err) => {
      toast.error(`存入失敗：${err.message}`);
    },
  });

  const handleSave = () => {
    if (!clientName.trim()) {
      toast.error("請填入客戶名稱");
      return;
    }
    saveToNotionMutation.mutate({
      clientName: clientName.trim(),
      projectType: payload.projectType,
      industry: payload.industry,
      funnel: payload.funnel,
      duration: payload.duration,
      appearance: payload.appearance,
      tone: payload.tone,
      targetAudience: payload.targetAudience,
      sellingPoints: payload.sellingPoints,
      scriptCount,
      finalOutput,
      gptOutput: payload.gptOutput,
      engineMode: payload.engineMode,
      historyId: payload.historyId,
    });
  };

  const isSaving = saveToNotionMutation.isPending;
  const isDone = !!saveResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl p-6">
        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          disabled={isSaving}
        >
          <X className="w-4 h-4" />
        </button>

        {/* 標題 */}
        <div className="flex items-center gap-2 mb-5">
          <BookMarked className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold font-[family-name:var(--font-display)]">
            存入 Notion 客戶腳本庫
          </h3>
        </div>

        {!isDone ? (
          <>
            {/* 表單 */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  客戶名稱 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="例如：天晴藝術諮商室"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  腳本支數
                </label>
                <input
                  type="number"
                  value={scriptCount}
                  onChange={(e) => setScriptCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                  min={1}
                  max={20}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isSaving}
                />
              </div>

              {/* 摘要預覽 */}
              <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>產業</span><span className="text-foreground">{payload.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span>漏斗層級</span><span className="text-foreground">{payload.funnel}</span>
                </div>
                <div className="flex justify-between">
                  <span>引擎模式</span><span className="text-foreground">{payload.engineMode}</span>
                </div>
                <div className="flex justify-between">
                  <span>落點</span>
                  <span className="text-primary">B2 客戶腳本庫</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                將在 Notion 建立三個頁面：<br />
                <span className="text-foreground">客戶總頁</span> → 
                <span className="text-foreground"> 👤 客戶版</span> + 
                <span className="text-foreground"> ⚙️ 執行版</span>
              </p>
            </div>

            <div className="flex gap-2 mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !clientName.trim()}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    建立中...
                  </>
                ) : (
                  <>
                    <BookMarked className="w-3.5 h-3.5 mr-1.5" />
                    確認存入
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          /* 成功畫面 */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">已成功存入 Notion！</span>
            </div>

            {/* Notion 頁面連結 */}
            <div className="space-y-2">
              <a
                href={saveResult.parentPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-muted/40 hover:bg-muted/70 rounded-lg px-3 py-2.5 text-sm transition-colors group"
              >
                <span className="text-foreground">🎬 客戶總頁</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <a
                href={saveResult.clientPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-muted/40 hover:bg-muted/70 rounded-lg px-3 py-2.5 text-sm transition-colors group"
              >
                <span className="text-foreground">👤 客戶版</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
              <a
                href={saveResult.execPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-muted/40 hover:bg-muted/70 rounded-lg px-3 py-2.5 text-sm transition-colors group"
              >
                <span className="text-foreground">⚙️ 執行版</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </div>

            {/* 自動化通知狀態 */}
            <div className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium mb-1.5">自動化執行狀態</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">💬 Slack #影音製作</span>
                {saveResult.slackSent ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 已通知
                  </span>
                ) : (
                  <span className="text-amber-400 text-xs">未發送</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">📊 Monday 專案狀態</span>
                {saveResult.mondayUpdated ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{saveResult.mondayItemName ?? "已更新"}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">未找到對應項目</span>
                )}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="w-full mt-2"
            >
              關閉
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 主元件 ==========
export default function ScriptOutput({ content, onRetry, isRetrying, notionPayload }: ScriptOutputProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotionDialog, setShowNotionDialog] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success("已複製到剪貼簿");
  };

  const handleExportTxt = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meta_script_${new Date().toISOString().slice(0, 10)}_${Date.now().toString(36)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("TXT 匯出成功");
  };

  const handleExportMd = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meta_script_${new Date().toISOString().slice(0, 10)}_${Date.now().toString(36)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Markdown 匯出成功");
  };

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
            <span className="text-sm font-medium font-[family-name:var(--font-display)]">
              模組化矩陣輸出
            </span>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={collapsed ? "展開" : "收合"}
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs h-8">
              <Copy className="w-3.5 h-3.5 mr-1" /> 複製
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportMd} className="text-xs h-8">
              <FileText className="w-3.5 h-3.5 mr-1" /> .md
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportTxt} className="text-xs h-8">
              <Download className="w-3.5 h-3.5 mr-1" /> .txt
            </Button>
            {/* 存入 Notion 按鈕（只在有 notionPayload 時顯示） */}
            {notionPayload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotionDialog(true)}
                className="text-xs h-8 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/30"
              >
                <BookMarked className="w-3.5 h-3.5 mr-1" /> 存入 Notion
              </Button>
            )}
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="text-xs h-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              >
                {isRetrying ? "重新生成中..." : "重新整合"}
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {!collapsed && (
          <div className="p-6 overflow-y-auto bg-background" style={{ maxHeight: "calc(100vh - 300px)" }}>
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:font-[family-name:var(--font-display)]
              prose-headings:text-foreground
              prose-h2:text-primary prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-accent prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
              prose-h4:text-foreground prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2
              prose-p:text-foreground/90 prose-p:leading-relaxed
              prose-li:text-foreground/90
              prose-strong:text-primary
              prose-code:text-accent prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-table:border-border
              prose-th:text-primary prose-th:border-border prose-th:bg-muted
              prose-td:border-border
            ">
              <Streamdown>{content}</Streamdown>
            </div>
          </div>
        )}
      </div>

      {/* Notion 存入彈窗 */}
      {showNotionDialog && notionPayload && (
        <NotionSaveDialog
          payload={notionPayload}
          finalOutput={content}
          onClose={() => setShowNotionDialog(false)}
        />
      )}
    </>
  );
}
