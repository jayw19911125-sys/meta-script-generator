import { useState, useDeferredValue } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Trash2, Copy, ChevronDown, ChevronUp, Loader2, FileDown, CheckCircle2, Search, X, GitCompare } from "lucide-react";
import { useScriptExport } from "@/hooks/useScriptExport";
import { FUNNELS } from "@shared/scriptTypes";

export default function HistoryPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showGptId, setShowGptId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [funnelFilter, setFunnelFilter] = useState("");
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
    { keyword: deferredKeyword || undefined, funnel: funnelFilter || undefined }
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

  const hasFilters = !!keyword || !!funnelFilter;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <History className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">歷史紀錄</h1>
          <p className="text-sm text-muted-foreground">查看過去生成的腳本</p>
        </div>
      </div>

      {/* 搜尋列 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            placeholder="搜尋產品名稱、產業或腳本內容..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm bg-input border-border/50"
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
          <SelectTrigger className="h-9 text-sm bg-input border-border/50 w-full sm:w-36">
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
            onClick={() => { setKeyword(""); setFunnelFilter(""); }}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-3.5 h-3.5 mr-1" />清除篩選
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !history || history.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <History className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "找不到符合條件的紀錄" : "尚無歷史紀錄"}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {hasFilters ? "試試其他關鍵字或清除篩選" : "生成腳本後會自動儲存在這裡"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const isExpanded = expandedId === item.id;
            const isShowingGpt = showGptId === item.id;
            return (
              <Card key={item.id} className="bg-card border-border/50 overflow-hidden">
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-semibold text-foreground truncate">
                          {item.productName}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${engineColor(item.engine)}`}
                        >
                          {engineLabel(item.engine)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{item.industry}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">{item.funnel}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">
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
                          className={`h-8 w-8 p-0 ${isShowingGpt ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                          title="查看發散引擎原始版本"
                        >
                          <GitCompare className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(item.finalOutput, item.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="複製腳本"
                      >
                        {copiedId === item.id
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadScript(item.finalOutput, item.productName ?? undefined)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="下載 TXT"
                      >
                        <FileDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ id: item.id })}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <>
                    <Separator className="bg-border/50" />
                    <CardContent className="pt-3 pb-4 space-y-3">
                      {/* 整合版本（最終腳本） */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">✅ 整合版本（最終腳本）</p>
                        <div className="script-output text-foreground/90 bg-background/50 rounded-lg p-3 max-h-[40dvh] sm:max-h-80 overflow-y-auto text-xs">
                          {item.finalOutput}
                        </div>
                      </div>
                      {/* 發散版本（原始 Hook 草稿） */}
                      {isShowingGpt && item.gptOutput && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">🔀 發散版本（原始 Hook 草稿）</p>
                          <div className="script-output text-foreground/70 bg-background/30 rounded-lg p-3 max-h-[30dvh] sm:max-h-60 overflow-y-auto text-xs border border-border/30">
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
