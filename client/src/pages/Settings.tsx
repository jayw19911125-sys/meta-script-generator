import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  ExternalLink,
  History,
  Key,
  RefreshCw,
  Settings as SettingsIcon,
  Shield,
  User,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "從未同步";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  return new Date(isoString).toLocaleString("zh-TW");
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  api:      { label: "Notion API 即時", color: "text-emerald-400" },
  disk:     { label: "磁碟快取",         color: "text-amber-400" },
  embedded: { label: "內嵌知識庫",       color: "text-slate-400" },
};

const FUNNEL_TYPE_LABELS: Record<string, string> = {
  cold: "冷受眾",
  warm: "暖受眾",
  hot:  "熱受眾",
};

// Notion 頁面 ID → Notion 頁面連結（供授權診斷用）
const NOTION_PAGE_LINKS: Record<string, string> = {
  "37997a06-fae5-81d6-9837-c8b6c1dd242d": "https://www.notion.so/37997a06fae581d69837c8b6c1dd242d",
  "37997a06-fae5-8109-801f-d3835ed6fa6e": "https://www.notion.so/37997a06fae58109801fd3835ed6fa6e",
  "37997a06-fae5-8191-9536-e1f3aff7c48e": "https://www.notion.so/37997a06fae581919536e1f3aff7c48e",
  "37997a06-fae5-815d-b375-ef4353b4d362": "https://www.notion.so/37997a06fae5815db375ef4353b4d362",
  "37b97a06-fae5-819e-b37a-f3f13be3f8c4": "https://www.notion.so/37b97a06fae5819eb37af3f13be3f8c4",
};

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const { data: status, refetch: refetchStatus } = trpc.notion.status.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { data: syncLogs } = trpc.notion.syncLogs.useQuery(
    { limit: 10 },
    { enabled: isAdmin, refetchInterval: 60000 }
  );

  const syncMutation = trpc.notion.sync.useMutation({
    onMutate: () => setIsSyncing(true),
    onSuccess: (result) => {
      setIsSyncing(false);
      if (result.success) {
        const failCount = result.failedPages?.length ?? 0;
        if (failCount > 0) {
          toast.warning("部分同步完成", {
            description: `${result.message}，但有 ${failCount} 個頁面失敗`,
          });
        } else {
          toast.success("同步完成", { description: result.message });
        }
      } else {
        toast.error("同步失敗", { description: result.message });
      }
      void refetchStatus();
    },
    onError: (err) => {
      setIsSyncing(false);
      toast.error("同步失敗", { description: err.message });
    },
  });

  const handleSync = () => {
    if (!isAdmin) { toast.error("需要管理員權限"); return; }
    syncMutation.mutate();
  };

  const sourceInfo = status?.source ? SOURCE_LABELS[status.source] : null;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header — Linear 風格 */}
      <div className="flex items-center gap-2.5 border-b border-border pb-4">
        <div className="w-7 h-7 rounded border border-border bg-muted/50 flex items-center justify-center shrink-0">
          <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground tracking-tight">系統設定</h1>
          <p className="text-[11px] text-muted-foreground font-mono hidden sm:block">notion sync · system config</p>
        </div>
      </div>

      {/* 權限提示 */}
      {!isAdmin && (
        <div className="flex items-center gap-2.5 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>部分設定需要管理員權限才能操作。目前以一般使用者身份瀏覽。</span>
        </div>
      )}

      {/* NOTION_API_TOKEN 設定說明 */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shrink-0">
              <Key className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
              Notion API Token
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded border border-border bg-background/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              {status?.hasToken ? (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400">Token 已設定並生效</span>
                </>
              ) : (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span className="text-xs font-medium text-slate-400">尚未設定 Token</span>
                </>
              )}
            </div>
            <Badge
              variant="outline"
              className={status?.hasToken
                ? "border-emerald-500/30 text-emerald-400 text-[10px] font-mono"
                : "border-slate-500/30 text-slate-500 text-[10px] font-mono"}
            >
              {status?.hasToken ? "NOTION_API_TOKEN ✓" : "未設定"}
            </Badge>
          </div>

          <div className="rounded border border-border bg-background/30 p-3 space-y-2.5">
            <p className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">如何設定 Token</p>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold font-mono">1</span>
                <span>前往 <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5">Notion My Integrations <ExternalLink className="h-3 w-3" /></a>，建立新的 Integration</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold font-mono">2</span>
                <span>複製 <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">secret_xxx</code> 格式的 Token</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold font-mono">3</span>
                <span>在 Manus 管理介面 → <strong>Settings → Secrets</strong> → 新增 <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">NOTION_API_TOKEN</code></span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold font-mono">4</span>
                <span>在 Notion 頁面右上角 <strong>Share</strong>，把你的 Integration 加入 L01/L02/L03 頁面的存取權限</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold font-mono">5</span>
                <span>回到此頁點擊「立即同步」，系統即從 Notion 拉取最新框架內容</span>
              </li>
            </ol>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
            <Shield className="h-3 w-3 shrink-0" />
            Token 儲存於伺服器環境變數，不會暴露在前端或資料庫中。
          </p>
        </CardContent>
      </Card>

      {/* Notion 知識庫同步 */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded border border-violet-500/30 bg-violet-500/10 flex items-center justify-center shrink-0">
                <Database className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                知識庫同步
              </CardTitle>
            </div>
            {status && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                {status.hasToken ? (
                  <>
                    <Wifi className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">API 已設定</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-slate-500" />
                    <span className="text-slate-500">使用內嵌知識庫</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded border border-border bg-background/50 p-2.5">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono mb-1">
                <Clock className="h-3 w-3" />
                上次同步
              </div>
              <div className="text-xs font-medium">
                {formatRelativeTime(status?.lastSyncAt ?? null)}
              </div>
            </div>

            <div className="rounded border border-border bg-background/50 p-2.5">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono mb-1">
                <Database className="h-3 w-3" />
                知識來源
              </div>
              <div className={`text-xs font-medium ${sourceInfo?.color ?? "text-slate-400"}`}>
                {sourceInfo?.label ?? "未知"}
              </div>
            </div>

            <div className="rounded border border-border bg-background/50 p-2.5">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono mb-1">
                <CheckCircle2 className="h-3 w-3" />
                已載入框架
              </div>
              <div className="text-xs font-medium">
                {status?.frameworkCount ?? 0} / 3 個
              </div>
            </div>

            <div className="rounded border border-border bg-background/50 p-2.5">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono mb-1">
                <AlertCircle className="h-3 w-3" />
                快取狀態
              </div>
              <div className="text-xs font-medium">
                {status?.isStale ? (
                  <span className="text-amber-400">已過期</span>
                ) : (
                  <span className="text-emerald-400">有效</span>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {status?.frameworks && status.frameworks.length > 0 && (
            <div>
              <p className="text-[11px] font-mono text-muted-foreground mb-2 uppercase tracking-wider">已載入漏斗框架</p>
              <div className="flex flex-wrap gap-1.5">
                {status.frameworks.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-1.5 rounded border border-border bg-background/50 px-2 py-1"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-mono font-medium">{f.id}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-border font-mono">
                      {FUNNEL_TYPE_LABELS[f.funnelType] ?? f.funnelType}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 同步失敗詳細提示 */}
          {status?.failedPages && status.failedPages.length > 0 && (
            <Alert variant="destructive" className="border-red-500/40 bg-red-500/10">
              <XCircle className="h-4 w-4" />
              <AlertTitle className="text-red-400 text-xs font-mono uppercase tracking-wider">
                {status.failedPages.length} 個頁面同步失敗
              </AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                {status.failedPages.map((page) => (
                  <div key={page.pageId} className="rounded border border-red-500/20 bg-red-500/5 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-red-300">{page.label}</span>
                    </div>
                    <p className="text-[11px] text-red-400/80 font-mono break-all">{page.error}</p>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={!isAdmin || isSyncing}
                  className="mt-2 gap-2 border-red-500/30 text-red-300 hover:bg-red-500/10 h-7 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "重試中..." : "重試同步"}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* usedFallback 降級提示 */}
          {status?.usedFallback && !status?.failedPages?.length && (
            <Alert className="border-amber-500/40 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertTitle className="text-amber-400 text-xs font-mono uppercase tracking-wider">使用內嵌知識庫（降級模式）</AlertTitle>
              <AlertDescription className="text-amber-400/80 text-xs">
                Notion API 拉取全部失敗，目前使用內嵌知識庫作為備用。請檢查 NOTION_API_TOKEN 設定與頁面授權後重試同步。
              </AlertDescription>
            </Alert>
          )}

          {/* partialSuccess 提示 */}
          {status?.partialSuccess && (
            <Alert className="border-amber-500/40 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertTitle className="text-amber-400 text-xs font-mono uppercase tracking-wider">部分同步成功</AlertTitle>
              <AlertDescription className="text-amber-400/80 text-xs">
                部分頁面已成功拉取，但仍有頁面失敗（詳見上方錯誤訊息）。建議檢查失敗頁面的授權設定。
              </AlertDescription>
            </Alert>
          )}

          <Separator className="bg-border" />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">手動同步</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                {status?.hasToken
                  ? "從 Notion 拉取最新的 L01/L02/L03 框架內容"
                  : "未設定 NOTION_API_TOKEN，將重新載入內嵌知識庫"}
              </p>
            </div>
            <Button
              onClick={handleSync}
              disabled={!isAdmin || isSyncing}
              variant="outline"
              size="sm"
              className="gap-2 shrink-0 h-7 text-xs border-border"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "同步中..." : "立即同步"}
            </Button>
          </div>

          {!isAdmin && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
              <Shield className="h-3 w-3" />
              手動同步需要管理員權限
            </p>
          )}
        </CardContent>
      </Card>

      {/* 最近同步記錄 (admin only) */}
      {isAdmin && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded border border-border bg-muted/50 flex items-center justify-center shrink-0">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                  同步記錄
                </CardTitle>
              </div>
              {syncLogs && syncLogs.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllLogs(v => !v)}
                  className="gap-1 text-xs text-muted-foreground h-7"
                >
                  {showAllLogs ? (
                    <><ChevronUp className="h-3 w-3" />收起</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" />展開全部</>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!syncLogs || syncLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <History className="h-7 w-7 mb-2 opacity-20" />
                <p className="text-xs">尚無同步記錄</p>
                <p className="text-[11px] mt-1 font-mono">點擊「立即同步」後即可在此查看</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(showAllLogs ? syncLogs : syncLogs.slice(0, 5)).map((log) => (
                  <div
                    key={log.id}
                    className={`rounded border px-3 py-2.5 ${
                      log.failCount === 0
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : log.usedFallback
                        ? "border-red-500/20 bg-red-500/5"
                        : "border-amber-500/20 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {log.failCount === 0 ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                        ) : log.usedFallback ? (
                          <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                        )}
                        <span className="text-xs font-medium">
                          {log.failCount === 0
                            ? `全部成功（${log.successCount}/5 頁）`
                            : log.usedFallback
                            ? `全部失敗，使用內嵌知識庫`
                            : `部分成功（${log.successCount}/5 頁）`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.triggeredBy}
                        </span>
                        <span>{formatRelativeTime(log.attemptAt)}</span>
                      </div>
                    </div>

                    {/* 失敗頁面詳情 + 授權診斷連結 */}
                    {log.failedPages.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {log.failedPages.map((page) => {
                          const isAuthError = page.error.includes("未授權") || page.error.includes("不存在") || page.error.includes("為空");
                          const notionLink = NOTION_PAGE_LINKS[page.pageId];
                          return (
                            <div key={page.pageId} className="rounded border border-border/20 bg-background/30 px-2 py-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] font-medium text-muted-foreground">{page.label}</span>
                                  <p className="text-[10px] text-red-400/70 font-mono mt-0.5 break-all">{page.error}</p>
                                </div>
                                {isAuthError && notionLink && (
                                  <a
                                    href={notionLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 underline underline-offset-2 font-mono"
                                  >
                                    授權頁面
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                              {isAuthError && (
                                <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                                  指引：點擊「授權頁面」→ 頁面右上角 Share → 把你的 Integration 加入存取權限
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 系統資訊 */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-border bg-muted/50 flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
              系統資訊
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted-foreground font-mono">使用者名稱</span>
              <span className="text-xs font-medium">{user?.name ?? "未知"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted-foreground font-mono shrink-0">Email</span>
              <span className="text-xs font-medium truncate ml-3 text-right">{user?.email ?? "未設定"}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground font-mono">角色</span>
              <Badge
                variant={isAdmin ? "default" : "secondary"}
                className={`text-[10px] font-mono ${isAdmin ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : ""}`}
              >
                {isAdmin ? "admin" : "user"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
