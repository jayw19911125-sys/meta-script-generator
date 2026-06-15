import { useState } from "react";
import { toast } from "sonner";

/**
 * 共用腳本匯出 hook
 * - copyScript: 複製到剪貼簿，顯示 toast 並短暫切換 icon 狀態
 * - downloadScript: 下載 .txt 文字檔，檔名自動帶入產品名稱與時間戳
 */
export function useScriptExport() {
  const [copied, setCopied] = useState(false);

  const copyScript = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("已複製到剪貼簿");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers / non-HTTPS
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      toast.success("已複製到剪貼簿");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadScript = (text: string, productName?: string) => {
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const safeName = (productName ?? "腳本").replace(/[/\\?%*:|"<>]/g, "-");
    const filename = `META腳本_${safeName}_${ts}.txt`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已下載 ${filename}`);
  };

  return { copied, copyScript, downloadScript };
}
