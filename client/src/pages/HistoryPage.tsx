import { useState, useDeferredValue, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Trash2, Copy, ChevronDown, ChevronUp, Loader2, FileDown, CheckCircle2, Search, X, GitCompare, CalendarDays, Zap, RefreshCw, Grid3X3, BookmarkPlus, ExternalLink, ArrowUpDown, SortAsc, SortDesc, ChevronRight, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { useScriptExport } from "@/hooks/useScriptExport";
import { FUNNELS } from "@shared/scriptTypes";
import { Streamdown } from "streamdown";
import type { MatrixRecommendation, ScriptModule } from "@shared/scriptTypes";

export default function HistoryPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"scripts" | "matrix">("scripts");
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

  // Cursor-based pagination state
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allItems, setAllItems] = useState<Array<{
    id: number; userId: number; productName: string; industry: string; funnel: string;
    engine: string; gptOutput: string | null; finalOutput: string; inputSnapshot: string | null; createdAt: Date;
  }>>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const queryInput = { keyword: deferredKeyword || undefined, funnel: funnelFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, cursor };

  const prevCursorRef = useRef<number | undefined>(undefined);
  const { data: historyData, isLoading } = trpc.script.history.useQuery(queryInput);

  useEffect(() => {
    if (!historyData || Array.isArray(historyData)) return;
    if (prevCursorRef.current === cursor && cursor === undefined) {
      setAllItems(historyData.items);
    } else if (cursor !== undefined && cursor !== prevCursorRef.current) {
      setAllItems(prev => [...prev, ...historyData.items]);
    } else {
      setAllItems(historyData.items);
    }
    prevCursorRef.current = cursor;
    setHasMore(historyData.hasMore);
    setNextCursor(historyData.nextCursor);
    setIsLoadingMore(false);
  }, [historyData, cursor]);

  const resetPagination = useCallback(() => {
    setCursor(undefined);
    setAllItems([]);
    setHasMore(false);
    setNextCursor(null);
    setSelectedScriptIds(new Set());
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setCursor(nextCursor);
  };

  const [selectedScriptIds, setSelectedScriptIds] = useState<Set<number>>(new Set());
  const [batchDeleteDialog, setBatchDeleteDialog] = useState<{ type: "script" | "matrix"; count: number } | null>(null);
  const deleteMutation = trpc.script.deleteHistory.useMutation({
    onSuccess: (_, variables) => {
      utils.script.history.invalidate();
      setSelectedScriptIds(prev => { const next = new Set(prev); next.delete(variables.id); return next; });
      toast.success("已刪除");
    },
    onError: () => toast.error("刪除失敗"),
  });
  const batchDeleteHistoryMutation = trpc.script.batchDeleteHistory.useMutation({
    onSuccess: (data) => {
      resetPagination();
      utils.script.history.invalidate();
      setSelectedScriptIds(new Set());
      toast.success(`已刪除 ${data.count} 筆腳本紀錄`);
    },
    onError: () => toast.error("批次刪除失敗"),
  });

  // ===== 矩陣歷史（分頁載入） =====
  const [matrixCursor, setMatrixCursor] = useState<number | undefined>(undefined);
  const [allMatrixItems, setAllMatrixItems] = useState<Array<{
    id: number; userId: number; productName: string; industry: string; funnel: string;
    hooksJson: string; bodiesJson: string; ctasJson: string; recommendationsJson: string;
    inputSnapshot: string | null; createdAt: Date;
  }>>([]);
  const [matrixHasMore, setMatrixHasMore] = useState(false);
  const [matrixNextCursor, setMatrixNextCursor] = useState<number | null>(null);
  const [isMatrixLoadingMore, setIsMatrixLoadingMore] = useState(false);
  const matrixPrevCursorRef = useRef<number | undefined>(undefined);
  const { data: matrixPageData, isLoading: isMatrixLoading } = trpc.matrix.listMatrix.useQuery(
    { cursor: matrixCursor, limit: 20 }
  );
  useEffect(() => {
    if (!matrixPageData) return;
    if (matrixPrevCursorRef.current === matrixCursor && matrixCursor === undefined) {
      setAllMatrixItems(matrixPageData.items);
    } else if (matrixCursor !== undefined && matrixCursor !== matrixPrevCursorRef.current) {
      setAllMatrixItems(prev => [...prev, ...matrixPageData.items]);
    } else {
      setAllMatrixItems(matrixPageData.items);
    }
    matrixPrevCursorRef.current = matrixCursor;
    setMatrixHasMore(matrixPageData.hasMore);
    setMatrixNextCursor(matrixPageData.nextCursor);
    setIsMatrixLoadingMore(false);
  }, [matrixPageData, matrixCursor]);
  const handleMatrixLoadMore = () => {
    if (!matrixNextCursor || isMatrixLoadingMore) return;
    setIsMatrixLoadingMore(true);
    setMatrixCursor(matrixNextCursor);
  };
  const deleteMatrixMutation = trpc.matrix.deleteMatrix.useMutation({
    onSuccess: () => {
      setMatrixCursor(undefined);
      setAllMatrixItems([]);
      utils.matrix.listMatrix.invalidate();
      toast.success("已刪除");
    },
    onError: () => toast.error("刪除失敗"),
  });
  const batchDeleteMatrixMutation = trpc.matrix.batchDeleteMatrix.useMutation({
    onSuccess: (data) => {
      setMatrixCursor(undefined);
      setAllMatrixItems([]);
      utils.matrix.listMatrix.invalidate();
      setSelectedMatrixIds(new Set());
      toast.success(`已刪除 ${data.count} 筆矩陣紀錄`);
    },
    onError: () => toast.error("批次刪除失敗"),
  });
  const [expandedMatrixId, setExpandedMatrixId] = useState<number | null>(null);
  const [copiedMatrixId, setCopiedMatrixId] = useState<string | null>(null);
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixSort, setMatrixSort] = useState<"date_desc" | "name_asc" | "score_desc">("date_desc");
  const [matrixDateFrom, setMatrixDateFrom] = useState("");
  const [matrixDateTo, setMatrixDateTo] = useState("");
  const [selectedMatrixIds, setSelectedMatrixIds] = useState<Set<number>>(new Set());
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null);
  const [notionSavedMatrixKey, setNotionSavedMatrixKey] = useState<string | null>(null);
  const [notionUrlMatrixMap, setNotionUrlMatrixMap] = useState<Record<string, string>>({});

  const saveMatrixToNotionMutation = trpc.notion.saveMatrixScript.useMutation({
    onSuccess: (data, variables) => {
      const key = `${variables.productName}-${variables.rankLabel ?? ""}`;
      setNotionSavedMatrixKey(key);
      if (data.notionUrl) setNotionUrlMatrixMap(prev => ({ ...prev, [key]: data.notionUrl! }));
      toast.success("已存入 Notion 腳本庫！", {
        action: data.notionUrl ? { label: "開啟", onClick: () => window.open(data.notionUrl!, "_blank") } : undefined,
      });
    },
    onError: (err: { message: string }) => toast.error(`存入 Notion 失敗：${err.message}`),
  });

  const handleCopyMatrixRec = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedMatrixId(key);
    setTimeout(() => setCopiedMatrixId(null), 2000);
    toast.success("已複製推薦組合");
  };

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
  const history = allItems.length > 0 ? allItems : (historyData && !Array.isArray(historyData) ? historyData.items : []);

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
        {activeTab === "scripts" && history && history.length > 0 && (
          <span className="text-[11px] text-muted-foreground font-mono">{history.length} records</span>
        )}
        {activeTab === "matrix" && allMatrixItems.length > 0 && (
          <span className="text-[11px] text-muted-foreground font-mono">{allMatrixItems.length} matrices</span>
        )}
      </div>

      {/* Tab 切換 */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("scripts")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "scripts"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-3.5 h-3.5" />快速出稿
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "matrix"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />3-3-3 矩陣
        </button>
      </div>

      {/* ===== 快速出稿歷史 ===== */}
      {activeTab === "scripts" && (
        <>
          {/* 搜尋列 */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
                <Input
                  placeholder="搜尋產品名稱、產業或腳本內容..."
                  value={keyword}
                  onChange={e => { setKeyword(e.target.value); resetPagination(); }}
                  className="pl-8 pr-8 h-8 text-xs bg-input border-border"
                  maxLength={200}
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
              <Select value={funnelFilter} onValueChange={v => { setFunnelFilter(v); resetPagination(); }}>
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
                  onClick={() => { setKeyword(""); setFunnelFilter(""); setDateFrom(""); setDateTo(""); resetPagination(); }}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5 mr-1" />清除篩選
                </Button>
              )}
              {/* 匯出 CSV */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (allItems.length === 0) { toast.error("無腳本紀錄可匯出"); return; }
                  const rows: string[][] = [["產品名稱", "產業", "漏斗層級", "AI 引擎", "賣點", "目標受眾", "影片長度", "影片風格", "腳本內容", "建立時間"]];
                  allItems.forEach(item => {
                    let snap: Record<string, string> = {};
                    try { snap = JSON.parse(item.inputSnapshot ?? "{}"); } catch { snap = {}; }
                    rows.push([
                      item.productName, item.industry, item.funnel, item.engine,
                      snap.sellingPoints ?? "",
                      snap.targetAudience ?? "",
                      snap.duration ?? "",
                      snap.appearance ?? "",
                      (item.finalOutput ?? "").replace(/\n/g, " "),
                      new Date(item.createdAt).toLocaleString("zh-TW"),
                    ]);
                  });
                  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
                  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `腳本歷史_${new Date().toISOString().slice(0,10)}.csv`;
                  a.click(); URL.revokeObjectURL(url);
                  toast.success("匯出 CSV 成功");
                }}
                className="h-8 px-3 text-xs font-mono text-muted-foreground hover:text-foreground shrink-0 gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />匯出 CSV
              </Button>
            </div>
            {/* 日期範圍篩選 */}
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              <Input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); resetPagination(); }}
                className="h-8 text-xs bg-input border-border w-full sm:w-40"
                title="開始日期"
              />
              <span className="text-xs text-muted-foreground shrink-0">至</span>
              <Input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); resetPagination(); }}
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
                <div className="w-10 h-10 rounded border border-border bg-muted/50 flex items-center justify-center">
                  <History className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {hasFilters ? "找不到符合條件的紀錄" : "尚無歷史紀錄"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">
                    {hasFilters ? "try other keywords or clear filters" : "scripts will be saved here automatically"}
                  </p>
                </div>
                {!hasFilters && (
                  <Button
                    size="sm"
                    onClick={() => setLocation("/")}
                    className="mt-1 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/80"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    立即生成第一支腳本
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* 全選列 */}
              {(() => {
                const allIds = allItems.map(i => i.id);
                const allSelected = allIds.length > 0 && allIds.every(id => selectedScriptIds.has(id));
                const someSelected = selectedScriptIds.size > 0;
                return (
                  <div className="flex items-center justify-between px-1 py-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="script-select-all"
                        checked={allSelected}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedScriptIds(new Set(allIds));
                          else setSelectedScriptIds(new Set());
                        }}
                        className="w-3.5 h-3.5"
                      />
                      <label htmlFor="script-select-all" className="text-[11px] text-muted-foreground font-mono cursor-pointer select-none">
                        {allSelected ? "取消全選" : "全選"}{someSelected && ` (${selectedScriptIds.size})`}
                      </label>
                      {hasMore && allSelected && (
                        <span className="text-[10px] text-amber-500/80 font-mono">⚠️ 尚有未載入的紀錄</span>
                      )}
                    </div>
                    {someSelected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBatchDeleteDialog({ type: "script", count: selectedScriptIds.size })}
                        disabled={batchDeleteHistoryMutation.isPending}
                        className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 font-mono gap-1"
                      >
                        {batchDeleteHistoryMutation.isPending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                        刪除選取 ({selectedScriptIds.size})
                      </Button>
                    )}
                  </div>
                );
              })()}
              {history.map((item) => {
                const isExpanded = expandedId === item.id;
                const isShowingGpt = showGptId === item.id;
                return (
                  <Card key={item.id} className={`bg-card border-border overflow-hidden transition-colors ${selectedScriptIds.has(item.id) ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 shrink-0 pt-0.5">
                          <Checkbox
                            checked={selectedScriptIds.has(item.id)}
                            onCheckedChange={(checked) => {
                              setSelectedScriptIds(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(item.id); else next.delete(item.id);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5"
                          />
                        </div>
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
                          {/* 以此設定重新生成 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              let snapshot: Record<string, string> = {};
                              try {
                                if (item.inputSnapshot) {
                                  snapshot = JSON.parse(item.inputSnapshot) as Record<string, string>;
                                }
                              } catch { /* ignore */ }
                              const params = new URLSearchParams({
                                productName: item.productName,
                                industry: item.industry,
                                funnel: item.funnel,
                                ...(snapshot.sellingPoints ? { sellingPoints: snapshot.sellingPoints } : {}),
                                ...(snapshot.targetAudience ? { targetAudience: snapshot.targetAudience } : {}),
                                ...(snapshot.duration ? { duration: snapshot.duration } : {}),
                                ...(snapshot.appearance ? { appearance: snapshot.appearance } : {}),
                                ...(snapshot.tone ? { tone: snapshot.tone } : {}),
                              });
                              setLocation(`/?${params.toString()}`);
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="以此設定重新生成（100% 自動填入）"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                          {/* 發散版本 diff 按鈕 */}
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
                          <div>
                            <p className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider mb-1.5">整合版本 · final</p>
                            <div className="script-output text-foreground/90 bg-background/50 rounded border border-border p-3 max-h-[40dvh] sm:max-h-80 overflow-y-auto prose prose-sm prose-invert max-w-none">
                              <Streamdown>{item.finalOutput}</Streamdown>
                            </div>
                          </div>
                          {isShowingGpt && item.gptOutput && (
                            <div>
                              <p className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider mb-1.5">發散版本 · draft</p>
                              <div className="script-output text-foreground/70 bg-background/30 rounded border border-border p-3 max-h-[30dvh] sm:max-h-60 overflow-y-auto prose prose-sm prose-invert max-w-none opacity-80">
                                <Streamdown>{item.gptOutput}</Streamdown>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </>
                    )}
                  </Card>
                );
              })}
              {/* 載入更多按鈕 */}
              {hasMore && (
                <div className="flex justify-center pt-2 pb-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="h-8 text-xs border-border text-muted-foreground hover:text-foreground font-mono"
                  >
                    {isLoadingMore ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />載入中...</>
                    ) : (
                      <><ChevronDown className="w-3.5 h-3.5 mr-1.5" />載入更多紀錄</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== 矩陣歷史 ===== */}
      {activeTab === "matrix" && (
        <>
          {isMatrixLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : allMatrixItems.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 rounded border border-border bg-muted/50 flex items-center justify-center">
                  <Grid3X3 className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">尚無矩陣紀錄</p>
                  <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">
                    matrix results will be saved here automatically
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation("/matrix")}
                  className="mt-1 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/80"
                >
                  <Grid3X3 className="w-3.5 h-3.5 mr-1.5" />
                  前往 3-3-3 矩陣
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* 矩陣搜尋列 + 排序切換 + 全選批次刪除 */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    placeholder="搜尋產品名稱、產業或漏斗層級..."
                    value={matrixSearch}
                    onChange={e => setMatrixSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-card border-border font-mono"
                  />
                  {matrixSearch && (
                    <button
                      onClick={() => setMatrixSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* 排序切換 */}
                <Select value={matrixSort} onValueChange={(v) => setMatrixSort(v as typeof matrixSort)}>
                  <SelectTrigger className="h-8 w-full sm:w-36 text-xs bg-card border-border font-mono">
                    <ArrowUpDown className="w-3 h-3 mr-1 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc" className="text-xs font-mono">最新優先</SelectItem>
                    <SelectItem value="name_asc" className="text-xs font-mono">產品名稱 A→Z</SelectItem>
                    <SelectItem value="score_desc" className="text-xs font-mono">推薦最高分</SelectItem>
                  </SelectContent>
                </Select>
                {/* 匯出 CSV */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (allMatrixItems.length === 0) { toast.error("無矩陣紀錄可匯出"); return; }
                    // 每組推薦各佔一行，方便後續分析
                    const rows: string[][] = [["產品名稱", "產業", "漏斗層級", "推薦排名", "評分", "Hook", "Body", "CTA", "建立時間"]];
                    allMatrixItems.forEach(m => {
                      let recs: MatrixRecommendation[] = [];
                      let hooks: ScriptModule[] = [];
                      let bodies: ScriptModule[] = [];
                      let ctas: ScriptModule[] = [];
                      try { recs = JSON.parse(m.recommendationsJson ?? "[]"); } catch { recs = []; }
                      try { hooks = JSON.parse(m.hooksJson ?? "[]"); } catch { hooks = []; }
                      try { bodies = JSON.parse(m.bodiesJson ?? "[]"); } catch { bodies = []; }
                      try { ctas = JSON.parse(m.ctasJson ?? "[]"); } catch { ctas = []; }
                      const sorted = [...recs].sort((a, b) => b.score - a.score);
                      if (sorted.length === 0) {
                        rows.push([m.productName, m.industry, m.funnel, "", "", "", "", "", new Date(m.createdAt).toLocaleString("zh-TW")]);
                      } else {
                        sorted.forEach((rec, idx) => {
                          const hook = hooks[rec.hookIndex];
                          const body = bodies[rec.bodyIndex];
                          const cta = ctas[rec.ctaIndex];
                          rows.push([
                            m.productName, m.industry, m.funnel,
                            `#${idx + 1}`,
                            String(rec.score),
                            hook?.text ?? "",
                            body?.text ?? "",
                            cta?.text ?? "",
                            new Date(m.createdAt).toLocaleString("zh-TW"),
                          ]);
                        });
                      }
                    });
                    const totalRecs = rows.length - 1;
                    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `矩陣歷史_${new Date().toISOString().slice(0,10)}.csv`;
                    a.click(); URL.revokeObjectURL(url);
                    toast.success(`匯出 CSV 成功（共 ${totalRecs} 筆推薦組合）`);
                  }}
                  className="h-8 px-3 text-xs font-mono text-muted-foreground hover:text-foreground shrink-0 gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />匯出 CSV
                </Button>
              </div>
              {/* 日期範圍篩選 */}
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <Input
                  type="date"
                  value={matrixDateFrom}
                  onChange={e => setMatrixDateFrom(e.target.value)}
                  className="h-8 text-xs bg-input border-border w-full sm:w-40"
                  title="開始日期"
                />
                <span className="text-xs text-muted-foreground shrink-0">至</span>
                <Input
                  type="date"
                  value={matrixDateTo}
                  onChange={e => setMatrixDateTo(e.target.value)}
                  className="h-8 text-xs bg-input border-border w-full sm:w-40"
                  title="結束日期"
                />
                {(matrixDateFrom || matrixDateTo) && (
                  <button
                    onClick={() => { setMatrixDateFrom(""); setMatrixDateTo(""); }}
                    className="text-muted-foreground/60 hover:text-foreground"
                    title="清除日期篩選"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* 矩陣列表 */}
              {(() => {
                const filtered = (() => {
                  let list = allMatrixItems.filter(m => {
                    if (matrixSearch.trim() && !(
                      m.productName.toLowerCase().includes(matrixSearch.toLowerCase()) ||
                      m.industry.toLowerCase().includes(matrixSearch.toLowerCase()) ||
                      m.funnel.toLowerCase().includes(matrixSearch.toLowerCase())
                    )) return false;
                    const d = new Date(m.createdAt);
                    if (matrixDateFrom && d < new Date(matrixDateFrom)) return false;
                    if (matrixDateTo && d > new Date(matrixDateTo + "T23:59:59")) return false;
                    return true;
                  });
                  if (matrixSort === "name_asc") {
                    list = list.sort((a, b) => a.productName.localeCompare(b.productName, "zh-TW"));
                  } else if (matrixSort === "score_desc") {
                    list = list.sort((a, b) => {
                      const getTopScore = (item: typeof a) => {
                        try {
                          const recs = JSON.parse(item.recommendationsJson) as Array<{ score?: number }>;
                          return Math.max(0, ...recs.map(r => r.score ?? 0));
                        } catch { return 0; }
                      };
                      return getTopScore(b) - getTopScore(a);
                    });
                  } else {
                    // date_desc: 默認已是最新優先
                    list = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  }
                  return list;
                })();
                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center">
                      <p className="text-xs text-muted-foreground font-mono">搜尋無結果：「{matrixSearch}」</p>
                    </div>
                  );
                }
                const allFilteredIds = filtered.map(m => m.id);
                const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedMatrixIds.has(id));
                const someSelected = selectedMatrixIds.size > 0;
                return (
                  <div className="space-y-2">
                    {/* 全選列 */}
                    <div className="flex items-center justify-between px-1 py-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="matrix-select-all"
                          checked={allSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMatrixIds(new Set(allFilteredIds));
                            } else {
                              setSelectedMatrixIds(new Set());
                            }
                          }}
                          className="w-3.5 h-3.5"
                        />
                        <label htmlFor="matrix-select-all" className="text-[11px] text-muted-foreground font-mono cursor-pointer select-none">
                          {allSelected ? "取消全選" : "全選"}
                          {someSelected && ` (${selectedMatrixIds.size})`}
                        </label>
                        {matrixHasMore && allSelected && (
                          <span className="text-[10px] text-amber-500/80 font-mono">⚠️ 尚有未載入的紀錄</span>
                        )}
                      </div>
                      {someSelected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBatchDeleteDialog({ type: "matrix", count: selectedMatrixIds.size })}
                          disabled={batchDeleteMatrixMutation.isPending}
                          className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 font-mono gap-1"
                        >
                          {batchDeleteMatrixMutation.isPending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                          刪除選取 ({selectedMatrixIds.size})
                        </Button>
                      )}
                    </div>
                    {filtered.map((item) => {
              // 展開列表起始位置（下方繼續原有 map callback）
                const isExpanded = expandedMatrixId === item.id;
                let recommendations: MatrixRecommendation[] = [];
                let hooks: ScriptModule[] = [];
                let bodies: ScriptModule[] = [];
                let ctas: ScriptModule[] = [];
                try {
                  recommendations = JSON.parse(item.recommendationsJson) as MatrixRecommendation[];
                  recommendations = recommendations.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
                  hooks = JSON.parse(item.hooksJson) as ScriptModule[];
                  bodies = JSON.parse(item.bodiesJson) as ScriptModule[];
                  ctas = JSON.parse(item.ctasJson) as ScriptModule[];
                } catch { /* ignore */ }

                return (
                  <Card key={item.id} className={`bg-card border-border overflow-hidden transition-colors ${selectedMatrixIds.has(item.id) ? "border-primary/50 bg-primary/5" : ""}`}>
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedMatrixIds.has(item.id)}
                            onCheckedChange={(checked) => {
                              setSelectedMatrixIds(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(item.id); else next.delete(item.id);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-xs font-semibold text-foreground truncate">
                              {item.productName}
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/10 text-primary border-primary/30">
                              3-3-3 矩陣
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
                            {recommendations.length > 0 && (
                              <>
                                <span className="text-muted-foreground/30 text-[10px]">·</span>
                                <span className="text-[11px] text-muted-foreground font-mono">{recommendations.length} 組推薦</span>
                              </>
                            )}
                          </div>
                          </div>{/* end checkbox wrapper */}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* 重新生成：帶入完整欄位（包含 sellingPoints/targetAudience）跳轉矩陣頁 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              let snapshot: Record<string, string> = {};
                              try {
                                if (item.inputSnapshot) {
                                  snapshot = JSON.parse(item.inputSnapshot) as Record<string, string>;
                                }
                              } catch { /* ignore */ }
                              const params = new URLSearchParams({
                                productName: item.productName,
                                industry: item.industry,
                                funnel: item.funnel,
                                ...(snapshot.sellingPoints ? { sellingPoints: snapshot.sellingPoints } : {}),
                                ...(snapshot.targetAudience ? { targetAudience: snapshot.targetAudience } : {}),
                              });
                              setLocation(`/matrix?${params.toString()}`);
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="以此設定重新生成矩陣"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                          {/* Notion 存入：存入最高分推薦組合 */}
                          {(() => {
                            if (recommendations.length === 0) return null;
                            const topRec = recommendations[0];
                            const hookMod = hooks.find(h => h.index === topRec.hookIndex);
                            const bodyMod = bodies.find(b => b.index === topRec.bodyIndex);
                            const ctaMod = ctas.find(c => c.index === topRec.ctaIndex);
                            if (!hookMod || !bodyMod || !ctaMod) return null;
                            const notionKey = `${item.productName}-rank${topRec.rank}`;
                            const notionUrl = notionUrlMatrixMap[notionKey];
                            const isSaved = notionSavedMatrixKey === notionKey;
                            return (
                              <>
                                {notionUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(notionUrl, "_blank")}
                                    className="h-7 w-7 p-0 text-green-500 hover:text-green-400"
                                    title="開啟 Notion 頁面"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    saveMatrixToNotionMutation.mutate({
                                      productName: item.productName,
                                      funnel: item.funnel,
                                      duration: "30",
                                      industry: item.industry,
                                      rankLabel: `推薦#${topRec.rank} · score ${topRec.score}`,
                                      score: topRec.score,
                                      checklistNotes: topRec.checklistNotes,
                                      hook: { text: hookMod.text, shotDirection: hookMod.shotDirection, soundEffect: hookMod.soundEffect, performanceNote: hookMod.performanceNote },
                                      body: { text: bodyMod.text, shotDirection: bodyMod.shotDirection, soundEffect: bodyMod.soundEffect, performanceNote: bodyMod.performanceNote },
                                      cta: { text: ctaMod.text, shotDirection: ctaMod.shotDirection, soundEffect: ctaMod.soundEffect, performanceNote: ctaMod.performanceNote },
                                    });
                                  }}
                                  disabled={saveMatrixToNotionMutation.isPending || isSaved}
                                  className={`h-7 w-7 p-0 ${
                                    isSaved ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                                  }`}
                                  title={isSaved ? "已存入 Notion" : "存入 Notion 腳本庫（最高分推薦組合）"}
                                >
                                  {saveMatrixToNotionMutation.isPending
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : isSaved
                                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                                      : <BookmarkPlus className="w-3.5 h-3.5" />}
                                </Button>
                              </>
                            );
                          })()}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMatrixMutation.mutate({ id: item.id })}
                            disabled={deleteMatrixMutation.isPending}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="刪除此矩陣紀錄"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedMatrixId(isExpanded ? null : item.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title={isExpanded ? "收合" : "展開推薦組合"}
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
                          {recommendations.length === 0 ? (
                            <p className="text-xs text-muted-foreground font-mono">無推薦組合資料</p>
                          ) : (
                            recommendations.map((rec, idx) => (
                              <div key={idx} className="border border-border rounded p-3 space-y-2 bg-background/50">
                                {/* 組合標題列 */}
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                                    推薦組合 #{idx + 1}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {rec.score !== undefined && (
                                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-mono">
                                        score {rec.score}
                                      </Badge>
                                    )}
                                    {/* 每組推薦獨立 Notion 存入按鈕 */}
                                    {(() => {
                                      const hookMod = hooks.find(h => h.index === rec.hookIndex);
                                      const bodyMod = bodies.find(b => b.index === rec.bodyIndex);
                                      const ctaMod = ctas.find(c => c.index === rec.ctaIndex);
                                      if (!hookMod || !bodyMod || !ctaMod) return null;
                                      const recNotionKey = `${item.id}-rec${idx}`;
                                      const recNotionUrl = notionUrlMatrixMap[recNotionKey];
                                      const recIsSaved = notionSavedMatrixKey === recNotionKey;
                                      return (
                                        <>
                                          {recNotionUrl && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => window.open(recNotionUrl, "_blank")}
                                              className="h-5 w-5 p-0 text-green-500 hover:text-green-400"
                                              title="開啟 Notion 頁面"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              saveMatrixToNotionMutation.mutate({
                                                productName: item.productName,
                                                funnel: item.funnel,
                                                duration: "30",
                                                industry: item.industry,
                                                rankLabel: `推薦#${rec.rank ?? idx + 1} · score ${rec.score}`,
                                                score: rec.score,
                                                checklistNotes: rec.checklistNotes,
                                                hook: { text: hookMod.text, shotDirection: hookMod.shotDirection, soundEffect: hookMod.soundEffect, performanceNote: hookMod.performanceNote },
                                                body: { text: bodyMod.text, shotDirection: bodyMod.shotDirection, soundEffect: bodyMod.soundEffect, performanceNote: bodyMod.performanceNote },
                                                cta: { text: ctaMod.text, shotDirection: ctaMod.shotDirection, soundEffect: ctaMod.soundEffect, performanceNote: ctaMod.performanceNote },
                                              }, {
                                                onSuccess: (data) => {
                                                  setNotionSavedMatrixKey(recNotionKey);
                                                  if (data.notionUrl) setNotionUrlMatrixMap(prev => ({ ...prev, [recNotionKey]: data.notionUrl! }));
                                                },
                                              });
                                            }}
                                            disabled={saveMatrixToNotionMutation.isPending || recIsSaved}
                                            className={`h-5 w-5 p-0 ${
                                              recIsSaved ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                                            }`}
                                            title={recIsSaved ? "已存入 Notion" : "存入此推薦組合至 Notion"}
                                          >
                                            {recIsSaved
                                              ? <CheckCircle2 className="w-3 h-3" />
                                              : <BookmarkPlus className="w-3 h-3" />}
                                          </Button>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                {/* 一鍵複製按鈕 */}
                                {(() => {
                                  const hookText = hooks.find(h => h.index === rec.hookIndex)?.text ?? "";
                                  const bodyText = bodies.find(b => b.index === rec.bodyIndex)?.text ?? "";
                                  const ctaText = ctas.find(c => c.index === rec.ctaIndex)?.text ?? "";
                                  const copyKey = `${item.id}-${idx}`;
                                  const copyText = `【Hook】\n${hookText}\n\n【Body】\n${bodyText}\n\n【CTA】\n${ctaText}`;
                                  return (
                                    <div className="flex justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyMatrixRec(copyText, copyKey)}
                                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground font-mono gap-1"
                                        title="複製 Hook+Body+CTA 合併文案"
                                      >
                                        {copiedMatrixId === copyKey
                                          ? <><CheckCircle2 className="w-3 h-3 text-green-500" />已複製</>
                                          : <><Copy className="w-3 h-3" />複製組合</>}
                                      </Button>
                                    </div>
                                  );
                                })()}
                                {/* Hook */}
                                <div>
                                  <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-0.5">Hook #{rec.hookIndex}</p>
                                  <p className="text-xs text-foreground/90 leading-relaxed">{hooks.find(h => h.index === rec.hookIndex)?.text ?? "—"}</p>
                                </div>
                                <Separator className="bg-border/50" />
                                {/* Body */}
                                <div>
                                  <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-0.5">Body #{rec.bodyIndex}</p>
                                  <p className="text-xs text-foreground/90 leading-relaxed">{bodies.find(b => b.index === rec.bodyIndex)?.text ?? "—"}</p>
                                </div>
                                <Separator className="bg-border/50" />
                                {/* CTA */}
                                <div>
                                  <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-0.5">CTA #{rec.ctaIndex}</p>
                                  <p className="text-xs text-foreground/90 leading-relaxed">{ctas.find(c => c.index === rec.ctaIndex)?.text ?? "—"}</p>
                                </div>
                                {/* checklistNotes 評分依據折疊區塊 */}
                                {rec.checklistNotes && rec.checklistNotes.trim() && (() => {
                                  const checklistKey = `${item.id}-rec${idx}-checklist`;
                                  const isChecklistOpen = expandedChecklistId === checklistKey;
                                  return (
                                    <div className="mt-1">
                                      <button
                                        onClick={() => setExpandedChecklistId(isChecklistOpen ? null : checklistKey)}
                                        className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                      >
                                        <Info className="w-3 h-3" />
                                        評分依據
                                        {isChecklistOpen
                                          ? <ChevronUp className="w-3 h-3" />
                                          : <ChevronRight className="w-3 h-3" />}
                                      </button>
                                      {isChecklistOpen && (
                                        <div className="mt-1.5 p-2 rounded bg-muted/40 border border-border/50">
                                          <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">{rec.checklistNotes}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ))
                          )}
                        </CardContent>
                      </>
                    )}
                  </Card>
                );
              })}
                    {matrixHasMore && (
                      <div className="flex justify-center pt-2 pb-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMatrixLoadMore}
                          disabled={isMatrixLoadingMore}
                          className="text-xs font-mono text-muted-foreground hover:text-foreground gap-1.5 h-7"
                        >
                          {isMatrixLoadingMore
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />載入中...</>
                            : <><ChevronDown className="w-3.5 h-3.5" />載入更多矩陣紀錄</>}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
      {/* 批次刪除確認 AlertDialog */}
      <AlertDialog open={!!batchDeleteDialog} onOpenChange={(open) => !open && setBatchDeleteDialog(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold font-mono">
              確認批次刪除
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground font-mono">
              即將刪除 <span className="text-destructive font-bold">{batchDeleteDialog?.count}</span> 筆
              {batchDeleteDialog?.type === "script" ? "腳本" : "矩陣"}紀錄，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs font-mono">取消</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (batchDeleteDialog?.type === "script") {
                  batchDeleteHistoryMutation.mutate({ ids: Array.from(selectedScriptIds) });
                } else if (batchDeleteDialog?.type === "matrix") {
                  batchDeleteMatrixMutation.mutate({ ids: Array.from(selectedMatrixIds) });
                }
                setBatchDeleteDialog(null);
              }}
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
