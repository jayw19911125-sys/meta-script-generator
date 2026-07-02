/**
 * rateLimiter.ts — In-memory per-user rate limiter for LLM calls
 *
 * Strategy: Sliding window (1 minute) with configurable max calls.
 * Uses a Map<userId, number[]> where each entry is an array of timestamps.
 * Expired timestamps are pruned on each check to keep memory bounded.
 *
 * This is process-local — fine for single-instance Autoscale deployments.
 * For multi-instance, replace with Redis-backed counter.
 */

const WINDOW_MS = 60_000; // 1 minute sliding window

interface RateLimitConfig {
  /** Maximum number of calls allowed per user within the window */
  maxCalls: number;
  /** Window size in milliseconds (default: 60_000) */
  windowMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  /** How many calls the user has made in the current window */
  current: number;
  /** Maximum calls allowed */
  limit: number;
  /** Milliseconds until the oldest call expires and frees a slot */
  retryAfterMs: number;
}

class RateLimiter {
  private store = new Map<string | number, number[]>();
  private readonly maxCalls: number;
  private readonly windowMs: number;

  constructor(config: RateLimitConfig) {
    this.maxCalls = config.maxCalls;
    this.windowMs = config.windowMs ?? WINDOW_MS;
  }

  /**
   * Check and record a call attempt for the given userId.
   * Returns whether the call is allowed.
   */
  check(userId: string | number): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    // Get or create timestamps array
    let timestamps = this.store.get(userId) ?? [];

    // Prune expired timestamps (sliding window)
    timestamps = timestamps.filter((t) => t > cutoff);

    const current = timestamps.length;
    const allowed = current < this.maxCalls;

    if (allowed) {
      // Record this call
      timestamps.push(now);
      this.store.set(userId, timestamps);
    }

    // Calculate retry-after: time until oldest timestamp expires
    const retryAfterMs =
      !allowed && timestamps.length > 0
        ? Math.max(0, timestamps[0] - cutoff)
        : 0;

    return {
      allowed,
      current: allowed ? current + 1 : current,
      limit: this.maxCalls,
      retryAfterMs,
    };
  }

  /**
   * Peek at current usage without recording a call.
   * Useful for exposing quota info to the client.
   */
  peek(userId: string | number): { current: number; limit: number; retryAfterMs: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.store.get(userId) ?? []).filter((t) => t > cutoff);
    const retryAfterMs =
      timestamps.length >= this.maxCalls && timestamps.length > 0
        ? Math.max(0, timestamps[0] - cutoff)
        : 0;
    return { current: timestamps.length, limit: this.maxCalls, retryAfterMs };
  }

  /** Periodically clean up entries for users who haven't called in a while */
  cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    Array.from(this.store.entries()).forEach(([userId, timestamps]) => {
      const pruned = timestamps.filter((t: number) => t > cutoff);
      if (pruned.length === 0) {
        this.store.delete(userId);
      } else {
        this.store.set(userId, pruned);
      }
    });
  }
}

// ── Singleton instances ──────────────────────────────────────────────────────

/** LLM generation rate limiter: 10 calls per user per minute */
export const llmRateLimiter = new RateLimiter({ maxCalls: 10, windowMs: WINDOW_MS });

/** Matrix generation rate limiter: 20 calls per user per minute (4 steps × 5 retries) */
export const matrixRateLimiter = new RateLimiter({ maxCalls: 20, windowMs: WINDOW_MS });

// Cleanup every 5 minutes to prevent memory leaks in long-running processes
setInterval(() => {
  llmRateLimiter.cleanup();
  matrixRateLimiter.cleanup();
}, 5 * 60_000);

export type { RateLimitResult };
