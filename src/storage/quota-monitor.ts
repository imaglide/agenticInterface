/**
 * Storage Quota Monitoring
 *
 * Monitors IndexedDB storage usage using the Storage API.
 * Provides warnings at configurable thresholds.
 *
 * See spec: docs/work_objects_and_agentic_work_surfaces.md §18
 */

// ============================================
// Types
// ============================================

export interface StorageQuotaConfig {
  /** Percentage at which to show warning (default: 75) */
  warningThreshold: number;
  /** Percentage at which to show critical alert (default: 90) */
  criticalThreshold: number;
}

export type StorageStatus = 'normal' | 'warning' | 'critical' | 'unknown';

export interface StorageQuotaInfo {
  /** Storage status based on thresholds */
  status: StorageStatus;
  /** Bytes currently used */
  usageBytes: number;
  /** Total bytes available (quota) */
  quotaBytes: number;
  /** Usage as percentage (0-100) */
  usagePercent: number;
  /** Human-readable usage string (e.g., "45.2 MB") */
  usageFormatted: string;
  /** Human-readable quota string */
  quotaFormatted: string;
  /** Whether storage API is available */
  apiAvailable: boolean;
  /** Timestamp of last check */
  checkedAt: string;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_QUOTA_CONFIG: StorageQuotaConfig = {
  warningThreshold: 75,
  criticalThreshold: 90,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Check if Storage API is available.
 */
export function isStorageApiAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    'estimate' in navigator.storage
  );
}

// ============================================
// Core Functions
// ============================================

/**
 * Get current storage quota information.
 *
 * Uses the StorageManager API (navigator.storage.estimate).
 * Returns unknown status if API is not available.
 */
export async function getStorageQuotaInfo(
  config: Partial<StorageQuotaConfig> = {}
): Promise<StorageQuotaInfo> {
  const { warningThreshold, criticalThreshold } = {
    ...DEFAULT_QUOTA_CONFIG,
    ...config,
  };

  const now = new Date().toISOString();

  // Check if API is available
  if (!isStorageApiAvailable()) {
    return {
      status: 'unknown',
      usageBytes: 0,
      quotaBytes: 0,
      usagePercent: 0,
      usageFormatted: 'Unknown',
      quotaFormatted: 'Unknown',
      apiAvailable: false,
      checkedAt: now,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usageBytes = estimate.usage ?? 0;
    const quotaBytes = estimate.quota ?? 0;

    // Calculate percentage (avoid division by zero)
    const usagePercent = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

    // Determine status
    let status: StorageStatus = 'normal';
    if (usagePercent >= criticalThreshold) {
      status = 'critical';
    } else if (usagePercent >= warningThreshold) {
      status = 'warning';
    }

    return {
      status,
      usageBytes,
      quotaBytes,
      usagePercent,
      usageFormatted: formatBytes(usageBytes),
      quotaFormatted: formatBytes(quotaBytes),
      apiAvailable: true,
      checkedAt: now,
    };
  } catch (error) {
    console.error('[QuotaMonitor] Failed to get storage estimate:', error);
    return {
      status: 'unknown',
      usageBytes: 0,
      quotaBytes: 0,
      usagePercent: 0,
      usageFormatted: 'Error',
      quotaFormatted: 'Error',
      apiAvailable: true,
      checkedAt: now,
    };
  }
}

/**
 * Check if storage is persisted (won't be cleared by browser).
 * Requests persistence if not already persisted.
 */
export async function checkAndRequestPersistence(): Promise<{
  persisted: boolean;
  requested: boolean;
}> {
  if (!isStorageApiAvailable() || !('persist' in navigator.storage)) {
    return { persisted: false, requested: false };
  }

  try {
    const alreadyPersisted = await navigator.storage.persisted();
    if (alreadyPersisted) {
      return { persisted: true, requested: false };
    }

    // Request persistence
    const granted = await navigator.storage.persist();
    return { persisted: granted, requested: true };
  } catch (error) {
    console.error('[QuotaMonitor] Failed to check/request persistence:', error);
    return { persisted: false, requested: false };
  }
}

/**
 * Get detailed storage breakdown by type (if available).
 * Note: This is an experimental API and may not be available in all browsers.
 */
export async function getStorageBreakdown(): Promise<
  Record<string, number> | null
> {
  if (!isStorageApiAvailable()) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();

    // The usageDetails property is experimental
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = (estimate as any).usageDetails;
    if (!details) {
      return null;
    }

    return details as Record<string, number>;
  } catch {
    return null;
  }
}
