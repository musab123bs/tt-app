const buckets = new Map<string, number[]>();

// In-memory sliding window. Suitable for a single Node process; replace with a
// shared store (e.g. Redis) when the app runs on multiple instances.
export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) {
    for (const [bucketKey, stamps] of buckets) if (!stamps.some((timestamp) => now - timestamp < windowMs)) buckets.delete(bucketKey);
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
