import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { PENDING_APPROVAL_ERR_MSG } from "@shared/const";
import { Grid3X3, History, LogOut, PanelLeft, Sparkles, Zap, Clock, Shield, ShieldCheck, Settings, Loader2 } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, createContext, useContext } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: Zap, label: "快速出稿", path: "/" },
  { icon: Grid3X3, label: "3-3-3 矩陣", path: "/matrix" },
  { icon: History, label: "歷史紀錄", path: "/history" },
  { icon: Settings, label: "系統設定", path: "/settings" },
];

// 全局生成狀態 context，供 Tab Bar 讀取
export const GeneratingContext = createContext<{ isGenerating: boolean; setIsGenerating: (v: boolean) => void }>({
  isGenerating: false,
  setIsGenerating: () => {},
});
export const useGenerating = () => useContext(GeneratingContext);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full text-center">
          {/* Logo */}
          <div className="w-14 h-14 rounded border border-border bg-muted/50 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              META 腳本生成器
            </h1>
            <p className="text-sm text-muted-foreground">
              好創整合行銷｜雙引擎 AI v3.0
            </p>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-xs">
            登入後即可使用雙引擎生成，引擎、子模型均可自由選擇。
            所有運算與知識底層皆在後端完成，無需自備任何 API Key。
          </p>

          {/* Login Button */}
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors h-10 text-sm border border-primary/80"
          >
            →  登入開始使用
          </Button>
        </div>
      </div>
    );
  }

  // 已登入但尚未審核
  if (user.approved === false) {
    return <PendingApprovalScreen name={user.name} />;
  }

  return (
    <GeneratingContext.Provider value={{ isGenerating, setIsGenerating }}>
      <SidebarProvider
        style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      >
        <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
    </GeneratingContext.Provider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const { isGenerating } = useGenerating();

  // 未讀歷史筆數：從 localStorage 取得上次查看歷史的時間，計算新筆數
  const historyQuery = trpc.script.history.useQuery(
    undefined,
    { enabled: isMobile, staleTime: 30_000 }
  );
  const [lastSeenAt] = useState<number>(() => {
    const v = localStorage.getItem("history-last-seen");
    return v ? parseInt(v, 10) : 0;
  });
  const historyItems = historyQuery.data && !Array.isArray(historyQuery.data)
    ? historyQuery.data.items
    : (historyQuery.data ?? []) as Array<{ createdAt: string | number | Date }>;
  const unreadCount = historyItems.filter(
    (s: { createdAt: string | number | Date }) => new Date(s.createdAt).getTime() > lastSeenAt
  ).length;

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/50" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b border-border/50">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-secondary rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded border border-primary/40 bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="w-3 h-3 text-primary" />
                  </div>
                  <span className="font-semibold text-xs tracking-widest truncate text-foreground/70 font-mono uppercase">
                    META 腳本生成器
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="py-1">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-8 text-sm transition-colors font-medium rounded-md ${
                        isActive
                          ? "bg-secondary text-foreground border border-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
                      }`}
                    >
                      <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span className="text-xs">{item.label.replace(/^3-3-3\s/, "")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-border/30">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-secondary transition-colors w-full text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-transparent hover:border-border/50">
                  <Avatar className="h-7 w-7 border border-border/50 shrink-0">
                    <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none text-foreground">
                        {user?.name || "使用者"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {user?.email || ""}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer">
                    <ShieldCheck className="mr-2 h-4 w-4 text-amber-400" />
                    <span>管理後台</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>登出</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-border h-12 items-center justify-between bg-background px-3 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-8 w-8 rounded-md shrink-0" />
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded border border-primary/40 bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="w-2.5 h-2.5 text-primary" />
                </div>
                <span className="font-mono text-[11px] font-semibold text-foreground/60 tracking-widest uppercase truncate max-w-[120px]">
                  {(activeMenuItem?.label ?? "META").replace("3-3-3 ", "")}
                </span>
              </div>
            </div>
            {/* 手機端右側：用戶頭像快速選單 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 rounded border border-border bg-muted/50 flex items-center justify-center text-xs font-semibold text-primary shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <div className="px-3 py-2 border-b border-border/30">
                  <p className="text-xs font-medium truncate text-foreground">{user?.name ?? "使用者"}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email ?? ""}</p>
                </div>
                {user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer">
                    <ShieldCheck className="mr-2 h-4 w-4 text-amber-400" />
                    <span>管理後台</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>登出</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <main className="flex-1 overflow-x-hidden overflow-y-auto pb-16 md:pb-0" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>{children}</main>

        {/* 手機底部 Tab Bar */}
        {isMobile && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background flex items-start"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {menuItems.map((item) => {
              const isActive = location === item.path;
              const isHome = item.path === "/";
              const isHistory = item.path === "/history";
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    if (isHistory) {
                      localStorage.setItem("history-last-seen", Date.now().toString());
                    }
                    setLocation(item.path);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 h-16 transition-colors relative ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {/* 快速出稿：生成中顯示 loading 圖示 */}
                  {isHome && isGenerating ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <item.icon className={`h-5 w-5 ${ isActive ? "text-primary" : "text-muted-foreground" }`} />
                  )}
                  <span className={`text-[10px] font-medium leading-none ${ isActive ? "text-primary" : "" }`}>
                    {item.label.replace(/^3-3-3\s/, "")}
                  </span>
                  {/* 歷史未讀 Badge */}
                  {isHistory && unreadCount > 0 && !isActive && (
                    <span className="absolute top-2.5 right-[calc(50%-14px)] min-w-[16px] h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center px-1 leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </SidebarInset>
    </>
  );
}

// ========== 等待審核畫面 ==========

function PendingApprovalScreen({ name }: { name: string | null }) {
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full text-center">
        {/* 圖示 */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* 標題 */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">帳號待審核</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {name ? `${name}，你好。` : ""}
            你的帳號已登入，正在等待管理員開通使用權限。
          </p>
          <p className="text-xs text-muted-foreground/60">
            開通後即可直接使用，無需重新登入。
          </p>
        </div>

        {/* 狀態列 */}
        <div className="w-full rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-xs text-amber-400/90">等待管理員審核中</span>
        </div>

        {/* 登出 */}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          登出
        </button>
      </div>
    </div>
  );
}
