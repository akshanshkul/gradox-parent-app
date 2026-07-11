/**
 * Simple In-Memory API Cache
 */
class ApiCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private DEFAULT_TTL = 10 * 60 * 1000; // 10 Minutes in ms

  /**
   * Set data in cache
   */
  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get data from cache if not expired
   */
  get(key: string, ttl: number = this.DEFAULT_TTL) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Manually invalidate an entry (e.g. on logout or specific update)
   */
  invalidate(key: string) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache (e.g. on logout)
   */
  clear() {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();
