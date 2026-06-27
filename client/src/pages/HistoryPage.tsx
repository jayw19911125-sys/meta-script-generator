import { useState, useDeferredValue } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Trash2, Copy, ChevronDown, ChevronUp, Loader2, FileDown, CheckCircle2, Search, X, GitCompare, CalendarDays } from "lucide-react";
import { useScriptExport } from "@/hooks/useScriptExport";
import { FUNNELS } from "@shared/scriptTypes";

export default function HistoryPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showGptId, setShowGptId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [funnelFilter, setFunnelFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const deferredKeyword = useDeferredValue(keyword);
  const utils = trpc.useUtils();
  const { copyScript, downloadScript } = useScriptExport();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = async (text: string, id: number) => {
    await copyScript(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: history, isLoading } = trpc.script.history.useQuery(
    { keyword: deferredKeyword || undefined, funnel: funnelFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
  );

  const deleteMutation = trpc.script.deleteHistory.useMutation({
    onSuccess: () => {
      utils.script.history.invalidate();
      toast.success("已刪除");
    },
    onError: () => toast.error("刪除失敗"),
  });

  const engineLabel = (engine: string) => {
    const map: Record<string, string> = {
      dual: "雙引擎",
      claude_only: "Claude",
      gpt_only: "GPT",
      both: "雙引擎對比",
    };
    return map[engine] ?? engine;
  };

  const engineColor = (engine: string) => {
    if (engine === "dual") return "bg-primary/10 text-primary border-primary/30";
    if (engine.includes("claude")) return "bg-accent/10 text-accent border-accent/30";
    return "bg-green-500/10 text-green-400 border-green-500/30";
  };

  const hasFilters = !!keyword || !!funnelFilter || !!dateFrom || !!dateTo;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header — Linear 風格 */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-border bg-muted/50 flex items-center justify-center shrink-0">
            <History className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">歷史紀錄</h1>
            <p className="text-[11px] text-muted-foreground font-mono hidden sm:block">script history · log</p>
          </div>
        </div>
        {history && history.length > 0 && (
          <span className="text-[11px] text-muted-foreground font-mono">{history.length} records</span>
        )}
      </div>

      {/* 搜尋列 */}
      <div className="flex flex-col gap-2">
        {/* 第一行：關鍵字 + 漏斗篩選 + 清除 */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              placeholder="搜尋產品名稱、產業或腳本內容..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs bg-input border-border"
            />
            {keyword && (
              <button
                onClick={() => setKeyword("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Select value={funnelFilter} onValueChange={setFunnelFilter}>
            <SelectTrigger className="h-8 text-xs bg-input border-border w-full sm:w-36">
              <SelectValue placeholder="全部漏斗" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部漏斗</SelectItem>
              {FUNNELS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setKeyword(""); setFunnelFilter(""); setDateFrom(""); setDateTo(""); }}
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-3.5 h-3.5 mr-1" />清除篩選
            </Button>
          )}
        </div>
        {/* 第二行：日期範圍篩選 */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-8 text-xs bg-input border-border w-full sm:w-40"
            title="開始日期"
          />
          <span className="text-xs text-muted-foreground shrink-0">至</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-8 text-xs bg-input border-border w-full sm:w-40"
            title="結束日期"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !history || history.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <History className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              {hasFilters ? "找不到符合條件的紀錄" : "尚無歷史紀錄"}
            </p>
            <p className="text-[11px] text-muted-foreground/60 font-mono">
              {hasFilters ? "try other keywords or clear filters" : "scripts will be saved here automatically"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map((item) => {
            const isExpanded = expandedId === item.id;
            const isShowingGpt = showGptId === item.id;
            return (
              <Card key={item.id} className="bg-card border-border overflow-hidden">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xs font-semibold text-foreground truncate">
                          {item.productName}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${engineColor(item.engine)}`}
                        >
                          {engineLabel(item.engine)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[11px] text-muted-foreground font-mono">{item.industry}</span>
                        <span className="text-muted-foreground/30 text-[10px]">·</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{item.funnel}</span>
                        <span className="text-muted-foreground/30 text-[10px]">·</span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(item.createdAt).toLocaleString("zh-TW", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* 發散版本 diff 按鈕（僅雙引擎模式有 gptOutput） */}
                      {item.gptOutput && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowGptId(isShowingGpt ? null : item.id)}
                          className={`h-7 w-7 p-0 ${isShowingGpt ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                          title="查看發散引擎原始版本"
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(item.finalOutput, item.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="複製腳本"
                      >
                        {copiedId === item.id
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadScript(item.finalOutput, item.productName ?? undefined)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="下載 TXT"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ id: item.id })}
                        disabled={deleteMutation.isPending}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <>
                    <Separator className="bg-border" />
                    <CardContent className="pt-3 pb-4 space-y-3">
                      {/* 整合版本（最終腳本） */}
                      <div>
                        <p className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider mb-1.5">整合版本 · final</p>
                        <div className="script-output text-foreground/90 bg-background/50 rounded border border-border p-3 max-h-[40dvh] sm:max-h-80 overflow-y-auto text-xs">
                          {item.finalOutput}
                        </div>
                      </div>
                      {/* 發散版本（原始 Hook 草稿） */}
                      {isShowingGpt && item.gptOutput && (
                        <div>
                          <p className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider mb-1.5">發散版本 · draft</p>
                          <div className="script-output text-foreground/70 bg-background/30 rounded border border-border p-3 max-h-[30dvh] sm:max-h-60 overflow-y-auto text-xs">
                            {item.gptOutput}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
