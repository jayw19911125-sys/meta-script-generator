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
          <ShieldOff className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">access denied · admin only</p>
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
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header — Linear 風格 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-border bg-muted/50 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">用戶管理</h1>
            <p className="text-[11px] text-muted-foreground font-mono hidden sm:block">
              {users?.length ?? "—"} users · {pending.length} pending
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 text-xs h-7 border-border"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          重新整理
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<Users className="w-3.5 h-3.5 text-muted-foreground" />}
          label="total"
          value={users?.length ?? "—"}
        />
        <StatCard
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          label="active"
          value={approved.length}
          accent="emerald"
        />
        <StatCard
          icon={<Clock className="w-3.5 h-3.5 text-amber-400" />}
          label="pending"
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
          <div className="space-y-px">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : users?.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 font-mono">no users yet</p>
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
    ? "bg-emerald-500/5 border-emerald-500/20"
    : accent === "amber"
    ? "bg-amber-500/5 border-amber-500/20"
    : "bg-card border-border";

  return (
    <div className={`rounded border p-2.5 sm:p-3 space-y-1 ${bg}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg sm:text-xl font-semibold text-foreground tabular-nums font-mono">{value}</p>
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
        <h2 className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      </div>
      <div className="rounded border border-border bg-card divide-y divide-border overflow-hidden">
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
    <div className="px-3 py-2.5 hover:bg-muted/20 transition-colors">
      {/* 上半行：頭像 + 姓名 + 操作按鈕 */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded border border-border bg-muted/50 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-mono font-medium text-muted-foreground">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground truncate">
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
              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 text-[10px] font-mono shrink-0"
              : "border-amber-500/30 text-amber-400 bg-amber-500/5 text-[10px] font-mono shrink-0"
          }
        >
          {user.approved ? (
            <><CheckCircle2 className="w-2.5 h-2.5 mr-1" />active</>
          ) : (
            <><Clock className="w-2.5 h-2.5 mr-1" />pending</>
          )}
        </Badge>
        {/* 操作按鈕 */}
        {user.role !== "admin" && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onToggle(!user.approved)}
            className={`text-xs gap-1 shrink-0 transition-all h-7 border-border ${
              user.approved
                ? "hover:border-destructive/50 hover:text-destructive hover:bg-destructive/5"
                : "hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5"
            }`}
          >
            {isPending ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : user.approved ? (
              <><ShieldOff className="w-3 h-3" /><span className="hidden sm:inline">封鎖</span></>
            ) : (
              <><ShieldCheck className="w-3 h-3" /><span className="hidden sm:inline">開通</span></>
            )}
          </Button>
        )}
      </div>
      {/* 下半行：Email + 加入時間 */}
      <div className="mt-1 pl-9">
        <p className="text-[11px] text-muted-foreground font-mono truncate">{user.email ?? "無 Email"}</p>
        <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">
          joined {joinedAt}<span className="hidden sm:inline"> · last seen {lastSeen}</span>
        </p>
      </div>
    </div>
  );
}
