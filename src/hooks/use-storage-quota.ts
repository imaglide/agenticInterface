'use client';

/**
 * Storage Quota Hook
 *
 * React hook for monitoring IndexedDB storage usage.
 * Provides current quota info with automatic refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getStorageQuotaInfo,
  checkAndRequestPersistence,
  type StorageQuotaInfo,
  type StorageQuotaConfig,
  DEFAULT_QUOTA_CONFIG,
} from '@/storage/quota-monitor';

interface UseStorageQuotaOptions extends Partial<StorageQuotaConfig> {
  /** How often to refresh quota info in milliseconds (default: 60000 = 1 minute) */
  refreshIntervalMs?: number;
  /** Whether to auto-request storage persistence (default: true) */
  requestPersistence?: boolean;
}

interface UseStorageQuotaReturn {
  /** Current storage quota information */
  quota: StorageQuotaInfo | null;
  /** Whether quota is currently loading */
  isLoading: boolean;
  /** Whether storage is persisted */
  isPersisted: boolean;
  /** Manually refresh quota info */
  refresh: () => Promise<void>;
}

export function useStorageQuota(
  options: UseStorageQuotaOptions = {}
): UseStorageQuotaReturn {
  const {
    refreshIntervalMs = 60000,
    requestPersistence = true,
    ...quotaConfig
  } = options;

  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await getStorageQuotaInfo(quotaConfig);
      setQuota(info);
    } catch (error) {
      console.error('[useStorageQuota] Failed to get quota:', error);
    } finally {
      setIsLoading(false);
    }
  }, [quotaConfig]);

  // Initial load and persistence check
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Check/request persistence
      if (requestPersistence) {
        const { persisted } = await checkAndRequestPersistence();
        if (mounted) {
          setIsPersisted(persisted);
        }
      }

      // Get initial quota
      if (mounted) {
        await refresh();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [requestPersistence, refresh]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshIntervalMs <= 0) return;

    const intervalId = setInterval(refresh, refreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [refreshIntervalMs, refresh]);

  return {
    quota,
    isLoading,
    isPersisted,
    refresh,
  };
}

/**
 * Simpler hook that just returns the current storage status.
 */
export function useStorageStatus(): {
  status: StorageQuotaInfo['status'];
  usagePercent: number;
  needsAttention: boolean;
} {
  const { quota } = useStorageQuota({ refreshIntervalMs: 120000 }); // 2 min refresh

  return {
    status: quota?.status ?? 'unknown',
    usagePercent: quota?.usagePercent ?? 0,
    needsAttention:
      quota?.status === 'warning' || quota?.status === 'critical',
  };
}
