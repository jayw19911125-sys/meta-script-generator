/**
 * PWAInstallBanner
 * - Android/Chrome：攔截 beforeinstallprompt，顯示自訂橫幅，點擊後觸發原生安裝對話框
 * - iOS Safari：偵測 standalone 未安裝狀態，顯示「分享 → 加入主畫面」操作指引
 * - 用戶關閉後 localStorage 記錄，7 天內不再顯示
 */

import { useEffect, useState } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  const v = localStorage.getItem(DISMISSED_KEY);
  if (!v) return false;
  return Date.now() - parseInt(v, 10) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 已安裝或已關閉則不顯示
    if (isInStandaloneMode() || isDismissed()) return;

    const ios = isIOS();
    setIsIOSDevice(ios);

    if (ios) {
      // iOS：直接顯示手動指引
      setShow(true);
    } else {
      // Android/Chrome：等待 beforeinstallprompt 事件
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setShow(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] animate-fade-in-up"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* 底部 Tab Bar 上方留空（手機端 Tab Bar 高度 64px） */}
      <div
        className="mx-3 mb-20 rounded-xl border border-border/60 bg-card/95 backdrop-blur shadow-2xl p-4"
        style={{ boxShadow: "0 -4px 32px rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <img
            src="/manus-storage/icon-192_3354a938.png"
            alt="META 腳本生成器"
            className="w-12 h-12 rounded-xl flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              加入主畫面
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {isIOSDevice
                ? "點擊下方分享按鈕，選擇「加入主畫面」即可像 App 一樣開啟"
                : "安裝到主畫面，下次直接開啟，獲得更快的體驗"}
            </p>

            {/* iOS 操作指引 */}
            {isIOSDevice && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Share className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>分享</span>
                <span className="text-border">→</span>
                <PlusSquare className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>加入主畫面</span>
              </div>
            )}
          </div>

          {/* 關閉按鈕 */}
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1 -mt-1 -mr-1"
            aria-label="關閉提示"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Android 安裝按鈕 */}
        {!isIOSDevice && deferredPrompt && (
          <Button
            onClick={handleInstall}
            size="sm"
            className="w-full mt-3 h-9 text-sm font-medium brand-gradient text-white border-0"
          >
            <Download className="h-4 w-4 mr-1.5" />
            立即安裝
          </Button>
        )}
      </div>
    </div>
  );
}
