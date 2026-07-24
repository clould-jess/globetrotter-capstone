/**
 * In-memory fixed-window rate limiter.
 *
 * PHASE 1 SCOPE ONLY: this state lives in process memory, so it resets on
 * restart and does not work across multiple instances. That's fine for a
 * single local dev server. Once Phase 3/4 introduces multiple instances
 * behind a load balancer, this MUST be replaced with a shared store
 * (Redis INCR + EXPIRE is the standard pattern) or attackers can simply
 * get load-balanced to a fresh instance with a clean counter.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Best-effort client identifier for rate limiting in local dev. */
export function getClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}
