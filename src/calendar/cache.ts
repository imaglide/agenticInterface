/**
 * Calendar Snapshot Cache
 *
 * Caches calendar events to reduce API calls and enable offline support.
 */

import {
  CalendarEvent,
  SnapshotCache,
  DEFAULT_STALE_MS,
  CRITICAL_STALE_MS,
  CACHE_STORAGE_KEY,
} from './types';
import { fetchCalendarSnapshot } from './api';

// ============================================
// In-Memory Cache
// ============================================

let memoryCache: SnapshotCache | null = null;

// ============================================
// Cache Operations
// ============================================

/**
 * Check if snapshot is stale (needs refresh).
 */
export function isSnapshotStale(cache: SnapshotCache): boolean {
  const age = Date.now() - cache.fetchedAt;
  return age >= cache.staleAfterMs;
}

/**
 * Check if snapshot is critically stale (shouldn't be used even offline).
 */
export function isSnapshotCriticallyStale(cache: SnapshotCache): boolean {
  const age = Date.now() - cache.fetchedAt;
  return age >= CRITICAL_STALE_MS;
}

/**
 * Get cache age in human-readable format.
 */
export function getCacheAge(cache: SnapshotCache): string {
  const ageMs = Date.now() - cache.fetchedAt;
  const minutes = Math.floor(ageMs / 60000);

  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  return `${hours} hours ago`;
}

// ============================================
// Storage Operations
// ============================================

/**
 * Save cache to localStorage.
 */
function persistCache(cache: SnapshotCache): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to persist calendar cache:', error);
    }
  }
}

/**
 * Load cache from localStorage.
 */
function loadPersistedCache(): SnapshotCache | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!cached) return null;
    return JSON.parse(cached) as SnapshotCache;
  } catch {
    return null;
  }
}

/**
 * Clear persisted cache.
 */
export function clearCache(): void {
  memoryCache = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  }
}

// ============================================
// Cache Access
// ============================================

/**
 * Get current cache (memory or persisted).
 */
export function getCache(): SnapshotCache | null {
  if (memoryCache) {
    return memoryCache;
  }

  const persisted = loadPersistedCache();
  if (persisted) {
    memoryCache = persisted;
  }

  return memoryCache;
}

/**
 * Update cache with new events.
 */
export function updateCache(
  events: CalendarEvent[],
  staleAfterMs: number = DEFAULT_STALE_MS
): SnapshotCache {
  const cache: SnapshotCache = {
    events,
    fetchedAt: Date.now(),
    staleAfterMs,
  };

  memoryCache = cache;
  persistCache(cache);

  return cache;
}

/**
 * Get cached events if available and not critically stale.
 */
export function getCachedEvents(): CalendarEvent[] | null {
  const cache = getCache();

  if (!cache) {
    return null;
  }

  // Don't use critically stale cache
  if (isSnapshotCriticallyStale(cache)) {
    return null;
  }

  return cache.events;
}

// ============================================
// Refresh Logic
// ============================================

/**
 * Refresh snapshot if needed.
 * Returns cached events if still fresh, otherwise fetches new ones.
 */
export async function refreshSnapshotIfNeeded(): Promise<{
  events: CalendarEvent[];
  fromCache: boolean;
  cacheAge: string | null;
}> {
  const cache = getCache();

  // If cache exists and is fresh, use it
  if (cache && !isSnapshotStale(cache)) {
    return {
      events: cache.events,
      fromCache: true,
      cacheAge: getCacheAge(cache),
    };
  }

  // Try to fetch fresh data
  try {
    const events = await fetchCalendarSnapshot();
    updateCache(events);

    return {
      events,
      fromCache: false,
      cacheAge: null,
    };
  } catch (error) {
    // If fetch fails but we have cache (even stale), use it
    if (cache && !isSnapshotCriticallyStale(cache)) {
      console.warn('Using stale cache due to fetch error:', error);
      return {
        events: cache.events,
        fromCache: true,
        cacheAge: getCacheAge(cache),
      };
    }

    // No usable cache, propagate error
    throw error;
  }
}

/**
 * Force refresh the snapshot (ignore cache).
 */
export async function forceRefreshSnapshot(): Promise<CalendarEvent[]> {
  const events = await fetchCalendarSnapshot();
  updateCache(events);
  return events;
}

// ============================================
// Snapshot Info
// ============================================

export interface SnapshotInfo {
  hasCachedData: boolean;
  isStale: boolean;
  isCriticallyStale: boolean;
  eventCount: number;
  lastFetchedAt: number | null;
  cacheAge: string | null;
}

/**
 * Get information about the current snapshot state.
 */
export function getSnapshotInfo(): SnapshotInfo {
  const cache = getCache();

  if (!cache) {
    return {
      hasCachedData: false,
      isStale: true,
      isCriticallyStale: true,
      eventCount: 0,
      lastFetchedAt: null,
      cacheAge: null,
    };
  }

  return {
    hasCachedData: true,
    isStale: isSnapshotStale(cache),
    isCriticallyStale: isSnapshotCriticallyStale(cache),
    eventCount: cache.events.length,
    lastFetchedAt: cache.fetchedAt,
    cacheAge: getCacheAge(cache),
  };
}
