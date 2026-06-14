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
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Key,
  RefreshCw,
  Settings as SettingsIcon,
  Shield,
  Wifi,
  WifiOff,
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

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: status, refetch: refetchStatus } = trpc.notion.status.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const syncMutation = trpc.notion.sync.useMutation({
    onMutate: () => setIsSyncing(true),
    onSuccess: (result) => {
      setIsSyncing(false);
      if (result.success) {
        toast.success("同步成功", { description: result.message });
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
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
                <div className="flex items-center gap-1.5 text-xs">
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

            <Separator className="bg-border/30" />

            <div className="flex items-center justify-between">
              <div>
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
                className="gap-2 min-w-[100px]"
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
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user?.email ?? "未設定"}</span>
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
