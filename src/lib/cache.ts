/**
 * LocalStorage Cache Utility
 * Provides fast access to data with background Supabase sync
 */

const CACHE_PREFIX = 'qfactor_';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes default expiry

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// ---- Core Cache Functions ----

export function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

export function setCache<T>(key: string, data: T, expiryMs: number = CACHE_EXPIRY_MS): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiryMs,
    };
    localStorage.setItem(getCacheKey(key), JSON.stringify(entry));
  } catch (error) {
    console.warn('Failed to set cache:', error);
  }
}

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Return data even if expired (stale-while-revalidate pattern)
    return entry.data;
  } catch (error) {
    console.warn('Failed to get cache:', error);
    return null;
  }
}

export function isCacheValid(key: string): boolean {
  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) return false;

    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return Date.now() < entry.expiresAt;
  } catch {
    return false;
  }
}

export function clearCache(key: string): void {
  try {
    localStorage.removeItem(getCacheKey(key));
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}

export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch (error) {
    console.warn('Failed to clear all cache:', error);
  }
}

// ---- Specific Cache Keys ----

export const CacheKeys = {
  events: () => 'events',
  event: (id: string) => `event_${id}`,
  rounds: (eventId: string) => `rounds_${eventId}`,
  teams: (eventId: string) => `teams_${eventId}`,
  scores: (eventId: string) => `scores_${eventId}`,
  participants: (teamId: string) => `participants_${teamId}`,
} as const;

// ---- Optimistic Update Helpers ----

export function updateCacheItem<T extends { id: string }>(
  key: string,
  itemId: string,
  updater: (item: T) => T
): void {
  const cached = getCache<T[]>(key);
  if (!cached) return;

  const updated = cached.map(item =>
    item.id === itemId ? updater(item) : item
  );
  setCache(key, updated);
}

export function addCacheItem<T>(key: string, item: T): void {
  const cached = getCache<T[]>(key) || [];
  setCache(key, [...cached, item]);
}

export function removeCacheItem<T extends { id: string }>(key: string, itemId: string): void {
  const cached = getCache<T[]>(key);
  if (!cached) return;

  setCache(key, cached.filter(item => item.id !== itemId));
}
