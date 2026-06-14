import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CheckCircle2,
  XCircle,
  Users,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Clock,
  Crown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  approved: boolean;
  role: "user" | "admin";
  createdAt: Date;
  lastSignedIn: Date;
};

export default function AdminPage() {
  const { user: me } = useAuth();

  // 非 admin 直接擋
  if (me && me.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <ShieldOff className="w-10 h-10 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">你沒有管理員權限</p>
        </div>
      </div>
    );
  }

  return <AdminContent />;
}

function AdminContent() {
  const { data: users, isLoading, refetch, isFetching } = trpc.admin.listUsers.useQuery();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const setApproved = trpc.admin.setApproved.useMutation({
    onMutate: ({ userId }) => setPendingId(userId),
    onSuccess: (_, { userId, approved }) => {
      const target = users?.find(u => u.id === userId);
      const name = target?.name ?? `用戶 #${userId}`;
      toast.success(approved ? `已開通 ${name}` : `已封鎖 ${name}`);
      refetch();
    },
    onError: (err) => {
      toast.error(`操作失敗：${err.message}`);
    },
    onSettled: () => setPendingId(null),
  });

  const approved = users?.filter(u => u.approved) ?? [];
  const pending = users?.filter(u => !u.approved) ?? [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* 標題列 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center">
            <Users className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">用戶管理</h1>
            <p className="text-xs text-muted-foreground">
              共 {users?.length ?? "—"} 位用戶 · {pending.length} 位待審核
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          重新整理
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Users className="w-4 h-4 text-muted-foreground" />}
          label="總用戶"
          value={users?.length ?? "—"}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          label="已開通"
          value={approved.length}
          accent="emerald"
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          label="待審核"
          value={pending.length}
          accent="amber"
        />
      </div>

      {/* 待審核區塊 */}
      {pending.length > 0 && (
        <Section title="待審核" accent="amber">
          {pending.map(u => (
            <UserRow
              key={u.id}
              user={u as UserRow}
              isPending={pendingId === u.id}
              onToggle={(approved) => setApproved.mutate({ userId: u.id, approved })}
            />
          ))}
        </Section>
      )}

      {/* 全部用戶 */}
      <Section title="所有用戶">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : users?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">尚無用戶</p>
        ) : (
          users?.map(u => (
            <UserRow
              key={u.id}
              user={u as UserRow}
              isPending={pendingId === u.id}
              onToggle={(approved) => setApproved.mutate({ userId: u.id, approved })}
            />
          ))
        )}
      </Section>
    </div>
  );
}

// ========== 子組件 ==========

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: "emerald" | "amber";
}) {
  const bg = accent === "emerald"
    ? "bg-emerald-500/5 border-emerald-500/15"
    : accent === "amber"
    ? "bg-amber-500/5 border-amber-500/15"
    : "bg-card border-border";

  return (
    <div className={`rounded-xl border p-4 space-y-1 ${bg}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: "amber";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {accent === "amber" && (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      </div>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function UserRow({
  user,
  isPending,
  onToggle,
}: {
  user: UserRow;
  isPending: boolean;
  onToggle: (approved: boolean) => void;
}) {
  const initials = (user.name ?? user.email ?? "?")
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joinedAt = new Date(user.createdAt).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const lastSeen = new Date(user.lastSignedIn).toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
      {/* 上半行：頭像 + 姓名 + 操作按鈕 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <span className="text-xs font-medium text-muted-foreground">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {user.name ?? "（未命名）"}
            </span>
            {user.role === "admin" && (
              <Crown className="w-3 h-3 text-amber-400 shrink-0" />
            )}
          </div>
        </div>
        {/* 狀態 badge */}
        <Badge
          variant="outline"
          className={
            user.approved
              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 text-xs shrink-0"
              : "border-amber-500/30 text-amber-400 bg-amber-500/5 text-xs shrink-0"
          }
        >
          {user.approved ? (
            <><CheckCircle2 className="w-3 h-3 mr-1" />已開通</>
          ) : (
            <><Clock className="w-3 h-3 mr-1" />待審核</>
          )}
        </Badge>
        {/* 操作按鈕 */}
        {user.role !== "admin" && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onToggle(!user.approved)}
            className={`text-xs gap-1.5 shrink-0 transition-all ${
              user.approved
                ? "hover:border-destructive/50 hover:text-destructive hover:bg-destructive/5"
                : "hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5"
            }`}
          >
            {isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : user.approved ? (
              <><ShieldOff className="w-3.5 h-3.5" /><span className="hidden sm:inline">封鎖</span></>
            ) : (
              <><ShieldCheck className="w-3.5 h-3.5" /><span className="hidden sm:inline">開通</span></>
            )}
          </Button>
        )}
      </div>
      {/* 下半行：Email + 加入時間 */}
      <div className="mt-1 pl-11">
        <p className="text-xs text-muted-foreground truncate">
          {user.email ?? "無 Email"} · 加入 {joinedAt} · 最後登入 {lastSeen}
        </p>
      </div>
    </div>
  );
}
