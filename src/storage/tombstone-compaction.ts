/**
 * Tombstone Compaction
 *
 * Manages lifecycle of soft-deleted WorkObjects and WorkLinks.
 * Tombstones are retained for a configurable period before permanent deletion.
 *
 * See spec: docs/work_objects_and_agentic_work_surfaces.md §18
 */

import { workObjectsStore, workLinksStore, deleteRecord } from './db';
import { logEvent } from './storage-api';
import { STORE_NAMES } from './types';
import type { WorkObject, WorkLink } from './work-object-types';

// ============================================
// Configuration
// ============================================

export interface TombstoneCompactionConfig {
  /** Days to retain tombstones before permanent deletion (default: 90) */
  retentionDays: number;
  /** Max tombstone count before triggering compaction (default: 5000) */
  maxTombstoneCount: number;
  /** Whether to create JSON export before deletion (default: true) */
  exportBeforeDelete: boolean;
}

export const DEFAULT_COMPACTION_CONFIG: TombstoneCompactionConfig = {
  retentionDays: 90,
  maxTombstoneCount: 5000,
  exportBeforeDelete: true,
};

// ============================================
// Compaction Results
// ============================================

export interface CompactionResult {
  /** Number of WorkObjects permanently deleted */
  workObjectsDeleted: number;
  /** Number of WorkLinks permanently deleted */
  workLinksDeleted: number;
  /** Total tombstones remaining after compaction */
  tombstonesRemaining: number;
  /** Export blob if exportBeforeDelete was true */
  exportBlob?: Blob;
  /** Timestamp of compaction */
  compactedAt: string;
}

export interface TombstoneStats {
  /** Total tombstoned WorkObjects */
  workObjectCount: number;
  /** Total tombstoned WorkLinks */
  workLinkCount: number;
  /** Oldest tombstone ISO timestamp */
  oldestTombstoneIso: string | null;
  /** Newest tombstone ISO timestamp */
  newestTombstoneIso: string | null;
  /** Whether compaction is recommended based on config */
  compactionRecommended: boolean;
  /** Reason for recommendation */
  recommendationReason?: string;
}

// ============================================
// Core Compaction Functions
// ============================================

/**
 * Get statistics about current tombstones.
 * Use this to decide whether to trigger compaction.
 */
export async function getTombstoneStats(
  config: Partial<TombstoneCompactionConfig> = {}
): Promise<TombstoneStats> {
  const { retentionDays, maxTombstoneCount } = {
    ...DEFAULT_COMPACTION_CONFIG,
    ...config,
  };

  const [allObjects, allLinks] = await Promise.all([
    workObjectsStore.getAll(),
    workLinksStore.getAll(),
  ]);

  const tombstonedObjects = allObjects.filter((obj) => !!obj.deletedAtIso);
  const tombstonedLinks = allLinks.filter((link) => !!link.deletedAtIso);

  const totalCount = tombstonedObjects.length + tombstonedLinks.length;

  // Find oldest and newest tombstones
  let oldestTombstoneIso: string | null = null;
  let newestTombstoneIso: string | null = null;

  const allTombstones = [
    ...tombstonedObjects.map((o) => o.deletedAtIso!),
    ...tombstonedLinks.map((l) => l.deletedAtIso!),
  ];

  for (const iso of allTombstones) {
    if (!oldestTombstoneIso || iso < oldestTombstoneIso) {
      oldestTombstoneIso = iso;
    }
    if (!newestTombstoneIso || iso > newestTombstoneIso) {
      newestTombstoneIso = iso;
    }
  }

  // Check if compaction is recommended
  let compactionRecommended = false;
  let recommendationReason: string | undefined;

  if (totalCount >= maxTombstoneCount) {
    compactionRecommended = true;
    recommendationReason = `Tombstone count (${totalCount}) exceeds threshold (${maxTombstoneCount})`;
  } else if (oldestTombstoneIso) {
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const oldestTime = new Date(oldestTombstoneIso).getTime();
    if (oldestTime < cutoffTime) {
      compactionRecommended = true;
      recommendationReason = `Tombstones older than ${retentionDays} days exist`;
    }
  }

  return {
    workObjectCount: tombstonedObjects.length,
    workLinkCount: tombstonedLinks.length,
    oldestTombstoneIso,
    newestTombstoneIso,
    compactionRecommended,
    recommendationReason,
  };
}

/**
 * Compact tombstones older than the retention period.
 * Optionally exports data before permanent deletion.
 */
export async function compactTombstones(
  config: Partial<TombstoneCompactionConfig> = {}
): Promise<CompactionResult> {
  const { retentionDays, exportBeforeDelete } = {
    ...DEFAULT_COMPACTION_CONFIG,
    ...config,
  };

  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffTime).toISOString();
  const now = new Date().toISOString();

  // Find tombstones older than cutoff
  const [allObjects, allLinks] = await Promise.all([
    workObjectsStore.getAll(),
    workLinksStore.getAll(),
  ]);

  const objectsToDelete = allObjects.filter(
    (obj) => obj.deletedAtIso && obj.deletedAtIso < cutoffIso
  );

  const linksToDelete = allLinks.filter(
    (link) => link.deletedAtIso && link.deletedAtIso < cutoffIso
  );

  if (objectsToDelete.length === 0 && linksToDelete.length === 0) {
    return {
      workObjectsDeleted: 0,
      workLinksDeleted: 0,
      tombstonesRemaining:
        allObjects.filter((o) => !!o.deletedAtIso).length +
        allLinks.filter((l) => !!l.deletedAtIso).length,
      compactedAt: now,
    };
  }

  // Create export if requested
  let exportBlob: Blob | undefined;
  if (exportBeforeDelete) {
    exportBlob = createExportBlob(objectsToDelete, linksToDelete, now);
  }

  // Permanently delete tombstoned records
  for (const obj of objectsToDelete) {
    await deleteRecord(STORE_NAMES.workObjects, obj.id);
  }

  for (const link of linksToDelete) {
    await deleteRecord(STORE_NAMES.workLinks, link.id);
  }

  // Log compaction event
  await logEvent('work_object_deleted', {
    action: 'tombstone_compaction',
    workObjectsDeleted: objectsToDelete.length,
    workLinksDeleted: linksToDelete.length,
    retentionDays,
    cutoffIso,
    exported: exportBeforeDelete,
  });

  // Calculate remaining tombstones
  const remainingObjects = allObjects.filter(
    (o) => o.deletedAtIso && o.deletedAtIso >= cutoffIso
  );
  const remainingLinks = allLinks.filter(
    (l) => l.deletedAtIso && l.deletedAtIso >= cutoffIso
  );

  return {
    workObjectsDeleted: objectsToDelete.length,
    workLinksDeleted: linksToDelete.length,
    tombstonesRemaining: remainingObjects.length + remainingLinks.length,
    exportBlob,
    compactedAt: now,
  };
}

/**
 * Export all tombstoned records to a JSON blob.
 * Useful for archiving before compaction or manual backup.
 */
export async function exportAllTombstones(): Promise<Blob> {
  const [allObjects, allLinks] = await Promise.all([
    workObjectsStore.getAll(),
    workLinksStore.getAll(),
  ]);

  const tombstonedObjects = allObjects.filter((obj) => !!obj.deletedAtIso);
  const tombstonedLinks = allLinks.filter((link) => !!link.deletedAtIso);

  return createExportBlob(
    tombstonedObjects,
    tombstonedLinks,
    new Date().toISOString()
  );
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a JSON blob for export.
 */
function createExportBlob(
  objects: WorkObject[],
  links: WorkLink[],
  exportedAt: string
): Blob {
  const exportData = {
    exportedAt,
    version: 1,
    workObjects: objects,
    workLinks: links,
    summary: {
      workObjectCount: objects.length,
      workLinkCount: links.length,
      objectTypes: countByType(objects),
      linkTypes: countLinkTypes(links),
    },
  };

  return new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
}

/**
 * Count objects by type.
 */
function countByType(objects: WorkObject[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const obj of objects) {
    counts[obj.type] = (counts[obj.type] || 0) + 1;
  }
  return counts;
}

/**
 * Count links by type.
 */
function countLinkTypes(links: WorkLink[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const link of links) {
    counts[link.type] = (counts[link.type] || 0) + 1;
  }
  return counts;
}

/**
 * Download a blob as a file (browser utility).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename for tombstone export.
 */
export function generateExportFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `tombstones-export-${date}.json`;
}
