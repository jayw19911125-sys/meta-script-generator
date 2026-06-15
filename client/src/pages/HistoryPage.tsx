import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { History, Trash2, Copy, ChevronDown, ChevronUp, Loader2, FileDown, CheckCircle2 } from "lucide-react";
import { useScriptExport } from "@/hooks/useScriptExport";

export default function HistoryPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const { copied, copyScript, downloadScript } = useScriptExport();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = async (text: string, id: number) => {
    await copyScript(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: history, isLoading } = trpc.script.history.useQuery();
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

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !history || history.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <History className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">尚無歷史紀錄</p>
            <p className="text-xs text-muted-foreground/60">生成腳本後會自動儲存在這裡</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const isExpanded = expandedId === item.id;
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
                    <CardContent className="pt-3 pb-4">
                      <div className="script-output text-foreground/90 bg-background/50 rounded-lg p-3 max-h-[40dvh] sm:max-h-80 overflow-y-auto text-xs">
                        {item.finalOutput}
                      </div>
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
