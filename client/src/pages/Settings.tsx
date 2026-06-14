import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
    <div className="min-h-screen bg-background text-foreground">
      {/* 頂部標題列 */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="container max-w-4xl py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">系統設定</h1>
              <p className="text-sm text-muted-foreground">管理 Notion 知識庫同步與系統狀態</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl py-8 space-y-6">
        {/* 權限提示 */}
        {!isAdmin && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            <Shield className="h-4 w-4 shrink-0" />
            <span>部分設定需要管理員權限才能操作。目前以一般使用者身份瀏覽。</span>
          </div>
        )}

        {/* NOTION_API_TOKEN 設定說明 */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Notion API Token 設定</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  設定後即可從 Notion 即時拉取最新知識庫
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/30 bg-background/50 px-4 py-3">
              <div className="flex items-center gap-2">
                {status?.hasToken ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-400">Token 已設定並生效</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-slate-500" />
                    <span className="text-sm font-medium text-slate-400">尚未設定 Token</span>
                  </>
                )}
              </div>
              <Badge
                variant="outline"
                className={status?.hasToken
                  ? "border-emerald-500/30 text-emerald-400 text-[10px]"
                  : "border-slate-500/30 text-slate-500 text-[10px]"}
              >
                {status?.hasToken ? "NOTION_API_TOKEN ✓" : "未設定"}
              </Badge>
            </div>

            <div className="rounded-lg border border-border/30 bg-background/30 p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">如何設定 Token</p>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>
                  <span>前往 <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5">Notion My Integrations <ExternalLink className="h-3 w-3" /></a>，建立新的 Integration</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">2</span>
                  <span>複製 <code className="bg-muted px-1 py-0.5 rounded text-xs">secret_xxx</code> 格式的 Token</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">3</span>
                  <span>在 Manus 管理介面 → <strong>Settings → Secrets</strong> → 新增 <code className="bg-muted px-1 py-0.5 rounded text-xs">NOTION_API_TOKEN</code></span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">4</span>
                  <span>在 Notion 頁面右上角 <strong>Share</strong>，把你的 Integration 加入 L01/L02/L03 頁面的存取權限</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">5</span>
                  <span>回到此頁點擊「立即同步」，系統即從 Notion 拉取最新框架內容</span>
                </li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3 w-3 shrink-0" />
              Token 儲存於伺服器環境變數，不會暴露在前端或資料庫中。
            </p>
          </CardContent>
        </Card>

        {/* Notion 知識庫同步 */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Notion 知識庫同步</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    L01/L02/L03 漏斗框架從 Notion 即時拉取
                  </CardDescription>
                </div>
              </div>
              {status && (
                <div className="flex items-center gap-1.5 text-xs mt-1 sm:mt-0">
                  {status.hasToken ? (
                    <>
                      <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">API 已設定</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-slate-500">使用內嵌知識庫</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border/30 bg-background/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  上次同步
                </div>
                <div className="text-sm font-medium">
                  {formatRelativeTime(status?.lastSyncAt ?? null)}
                </div>
              </div>

              <div className="rounded-lg border border-border/30 bg-background/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Database className="h-3 w-3" />
                  知識來源
                </div>
                <div className={`text-sm font-medium ${sourceInfo?.color ?? "text-slate-400"}`}>
                  {sourceInfo?.label ?? "未知"}
                </div>
              </div>

              <div className="rounded-lg border border-border/30 bg-background/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <CheckCircle2 className="h-3 w-3" />
                  已載入框架
                </div>
                <div className="text-sm font-medium">
                  {status?.frameworkCount ?? 0} / 3 個
                </div>
              </div>

              <div className="rounded-lg border border-border/30 bg-background/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <AlertCircle className="h-3 w-3" />
                  快取狀態
                </div>
                <div className="text-sm font-medium">
                  {status?.isStale ? (
                    <span className="text-amber-400">已過期</span>
                  ) : (
                    <span className="text-emerald-400">有效</span>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-border/30" />

            {status?.frameworks && status.frameworks.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">已載入的漏斗框架</p>
                <div className="flex flex-wrap gap-2">
                  {status.frameworks.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-1.5 rounded-md border border-border/30 bg-background/50 px-2.5 py-1.5"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs font-medium">{f.id}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border/40">
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
                <AlertTitle className="text-red-400">
                  {status.failedPages.length} 個頁面同步失敗
                </AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  {status.failedPages.map((page) => (
                    <div key={page.pageId} className="rounded border border-red-500/20 bg-red-500/5 px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-red-300">{page.label}</span>
                      </div>
                      <p className="text-xs text-red-400/80 font-mono break-all">{page.error}</p>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={!isAdmin || isSyncing}
                    className="mt-2 gap-2 border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "重試中..." : "重試同步"}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* usedFallback 降級提示 */}
            {status?.usedFallback && !status?.failedPages?.length && (
              <Alert className="border-amber-500/40 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-amber-400">使用內嵌知識庫（降級模式）</AlertTitle>
                <AlertDescription className="text-amber-400/80 text-xs">
                  Notion API 拉取全部失敗，目前使用內嵌知識庫作為備用。請檢查 NOTION_API_TOKEN 設定與頁面授權後重試同步。
                </AlertDescription>
              </Alert>
            )}

            {/* partialSuccess 提示 */}
            {status?.partialSuccess && (
              <Alert className="border-amber-500/40 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-amber-400">部分同步成功</AlertTitle>
                <AlertDescription className="text-amber-400/80 text-xs">
                  部分頁面已成功拉取，但仍有頁面失敗（詳見上方錯誤訊息）。建議檢查失敗頁面的授權設定。
                </AlertDescription>
              </Alert>
            )}

            <Separator className="bg-border/30" />

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">手動同步</p>
                <p className="text-xs text-muted-foreground mt-0.5">
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
                className="gap-2 shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "同步中..." : "立即同步"}
              </Button>
            </div>

            {!isAdmin && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                手動同步需要管理員權限
              </p>
            )}
          </CardContent>
        </Card>

        {/* 最近同步記錄 (admin only) */}
        {isAdmin && (
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-500/10 text-slate-400">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">最近同步記錄</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      最近 10 次同步結果，含手動與自動觸發
                    </CardDescription>
                  </div>
                </div>
                {syncLogs && syncLogs.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllLogs(v => !v)}
                    className="gap-1 text-xs text-muted-foreground"
                  >
                    {showAllLogs ? (
                      <><ChevronUp className="h-3.5 w-3.5" />收起</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" />展開全部</>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!syncLogs || syncLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">尚無同步記錄</p>
                  <p className="text-xs mt-1">點擊「立即同步」後即可在此查看</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(showAllLogs ? syncLogs : syncLogs.slice(0, 5)).map((log) => (
                    <div
                      key={log.id}
                      className={`rounded-lg border px-4 py-3 ${
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
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : log.usedFallback ? (
                            <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="text-xs font-medium">
                            {log.failCount === 0
                              ? `全部成功（${log.successCount}/5 頁）`
                              : log.usedFallback
                              ? `全部失敗，使用內嵌知識庫`
                              : `部分成功（${log.successCount}/5 頁）`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.triggeredBy}
                          </span>
                          <span>{formatRelativeTime(log.attemptAt)}</span>
                        </div>
                      </div>

                      {/* 失敗頁面詳情 + 授權診斷連結 */}
                      {log.failedPages.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {log.failedPages.map((page) => {
                            const isAuthError = page.error.includes("未授權") || page.error.includes("不存在") || page.error.includes("為空");
                            const notionLink = NOTION_PAGE_LINKS[page.pageId];
                            return (
                              <div key={page.pageId} className="rounded border border-border/20 bg-background/30 px-2.5 py-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium text-muted-foreground">{page.label}</span>
                                    <p className="text-[11px] text-red-400/70 font-mono mt-0.5 break-all">{page.error}</p>
                                  </div>
                                  {isAuthError && notionLink && (
                                    <a
                                      href={notionLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 underline underline-offset-2"
                                    >
                                      授權頁面
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                                </div>
                                {isAuthError && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-1">
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
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">系統資訊</CardTitle>
            <CardDescription>目前登入帳號與角色</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">使用者名稱</span>
                <span className="text-sm font-medium">{user?.name ?? "未知"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground shrink-0">Email</span>
                <span className="text-sm font-medium truncate ml-3 text-right">{user?.email ?? "未設定"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">角色</span>
                <Badge
                  variant={isAdmin ? "default" : "secondary"}
                  className={isAdmin ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : ""}
                >
                  {isAdmin ? "管理員" : "一般使用者"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
