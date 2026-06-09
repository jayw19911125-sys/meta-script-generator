import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Download, FileText, Database, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface ScriptOutputProps {
  content: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export default function ScriptOutput({ content, onRetry, isRetrying }: ScriptOutputProps) {
  const [collapsed, setCollapsed] = useState(false);

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

  const handleSaveToNotion = () => {
    toast.info("存入庫房功能需要設定 Notion Integration Token，請至 API 設定中填入。", {
      duration: 5000,
    });
  };

  return (
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveToNotion}
            className="text-xs h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          >
            <Database className="w-3.5 h-3.5 mr-1" /> 存入庫房
          </Button>
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

      {/* Content - no max-height limit */}
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
  );
}
