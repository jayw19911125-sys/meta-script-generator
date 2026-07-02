/**
 * errorParser.ts
 * 統一解析 tRPC 錯誤，回傳用戶友善的繁中訊息與重試建議。
 */

export interface ParsedError {
  title: string;
  description: string;
  retryLabel?: string;
  canRetry: boolean;
}

/**
 * 解析 tRPC mutation onError 的 err 物件
 * 支援：RATE_LIMIT | TIMEOUT | NETWORK | CREDIT | 通用錯誤
 */
export function parseGenerationError(err: { message?: string; data?: { code?: string } }): ParsedError {
  const msg = err.message ?? "";
  const code = err.data?.code ?? "";

  // Rate limit: RATE_LIMIT|retryAfterSec|limit
  if (msg.startsWith("RATE_LIMIT|") || code === "TOO_MANY_REQUESTS") {
    const parts = msg.split("|");
    const retryAfterSec = parseInt(parts[1] ?? "60", 10);
    const limit = parseInt(parts[2] ?? "10", 10);
    const retryMin = Math.ceil(retryAfterSec / 60);
    return {
      title: "請求過於頻繁",
      description: `每分鐘最多 ${limit} 次生成，請等待約 ${retryMin > 1 ? `${retryMin} 分鐘` : `${retryAfterSec} 秒`}後再試。`,
      retryLabel: `${retryAfterSec} 秒後重試`,
      canRetry: false,
    };
  }

  // Timeout
  if (
    msg.toLowerCase().includes("timeout") ||
    msg.toLowerCase().includes("timed out") ||
    code === "TIMEOUT"
  ) {
    return {
      title: "生成超時",
      description: "AI 模型回應時間過長，可能是伺服器繁忙。建議切換至「快速模式」或稍後重試。",
      retryLabel: "切換快速模式重試",
      canRetry: true,
    };
  }

  // Network / fetch error
  if (
    msg.toLowerCase().includes("fetch") ||
    msg.toLowerCase().includes("network") ||
    msg.toLowerCase().includes("failed to fetch") ||
    code === "INTERNAL_SERVER_ERROR" && msg.includes("ECONNREFUSED")
  ) {
    return {
      title: "網路連線錯誤",
      description: "無法連接到伺服器，請檢查網路連線後重試。",
      retryLabel: "重試",
      canRetry: true,
    };
  }

  // Credit / quota exhausted
  if (
    msg.toLowerCase().includes("credit") ||
    msg.toLowerCase().includes("quota") ||
    msg.toLowerCase().includes("insufficient") ||
    msg.toLowerCase().includes("billing")
  ) {
    return {
      title: "AI 額度不足",
      description: "目前 AI 生成額度已用盡，請聯繫管理員補充額度。",
      canRetry: false,
    };
  }

  // Unauthorized / not approved
  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
    return {
      title: "無使用權限",
      description: "您的帳號尚未通過審核，請聯繫管理員開通使用權限。",
      canRetry: false,
    };
  }

  // Generic fallback
  return {
    title: "生成失敗",
    description: msg ? `錯誤訊息：${msg.slice(0, 120)}` : "發生未知錯誤，請稍後重試或聯繫管理員。",
    retryLabel: "重試",
    canRetry: true,
  };
}
