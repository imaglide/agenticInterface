/**
 * Tombstone Compaction Tests
 *
 * Tests the tombstone lifecycle management for soft-deleted WorkObjects.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTombstoneStats,
  compactTombstones,
  generateExportFilename,
  DEFAULT_COMPACTION_CONFIG,
} from '../tombstone-compaction';

// Mock the database stores
vi.mock('../db', () => ({
  workObjectsStore: {
    getAll: vi.fn(),
  },
  workLinksStore: {
    getAll: vi.fn(),
  },
  deleteRecord: vi.fn(),
}));

vi.mock('../storage-api', () => ({
  logEvent: vi.fn(),
}));

import { workObjectsStore, workLinksStore, deleteRecord } from '../db';
import { logEvent } from '../storage-api';

describe('DEFAULT_COMPACTION_CONFIG', () => {
  it('has correct default values', () => {
    expect(DEFAULT_COMPACTION_CONFIG.retentionDays).toBe(90);
    expect(DEFAULT_COMPACTION_CONFIG.maxTombstoneCount).toBe(5000);
    expect(DEFAULT_COMPACTION_CONFIG.exportBeforeDelete).toBe(true);
  });
});

describe('getTombstoneStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero counts when no tombstones exist', async () => {
    vi.mocked(workObjectsStore.getAll).mockResolvedValue([]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    const stats = await getTombstoneStats();

    expect(stats.workObjectCount).toBe(0);
    expect(stats.workLinkCount).toBe(0);
    expect(stats.oldestTombstoneIso).toBeNull();
    expect(stats.newestTombstoneIso).toBeNull();
    expect(stats.compactionRecommended).toBe(false);
  });

  it('counts tombstoned objects correctly', async () => {
    const now = new Date().toISOString();
    vi.mocked(workObjectsStore.getAll).mockResolvedValue([
      { id: 'wo:1', deletedAtIso: now } as any,
      { id: 'wo:2', deletedAtIso: now } as any,
      { id: 'wo:3' } as any, // Not tombstoned
    ]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([
      { id: 'link:1', deletedAtIso: now } as any,
    ]);

    const stats = await getTombstoneStats();

    expect(stats.workObjectCount).toBe(2);
    expect(stats.workLinkCount).toBe(1);
  });

  it('identifies oldest and newest tombstones', async () => {
    const oldest = '2024-01-01T00:00:00.000Z';
    const middle = '2024-06-15T00:00:00.000Z';
    const newest = '2024-12-01T00:00:00.000Z';

    vi.mocked(workObjectsStore.getAll).mockResolvedValue([
      { id: 'wo:1', deletedAtIso: middle } as any,
      { id: 'wo:2', deletedAtIso: oldest } as any,
    ]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([
      { id: 'link:1', deletedAtIso: newest } as any,
    ]);

    const stats = await getTombstoneStats();

    expect(stats.oldestTombstoneIso).toBe(oldest);
    expect(stats.newestTombstoneIso).toBe(newest);
  });

  it('recommends compaction when count exceeds threshold', async () => {
    const tombstones = Array.from({ length: 5001 }, (_, i) => ({
      id: `wo:${i}`,
      deletedAtIso: new Date().toISOString(),
    }));

    vi.mocked(workObjectsStore.getAll).mockResolvedValue(tombstones as any);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    const stats = await getTombstoneStats();

    expect(stats.compactionRecommended).toBe(true);
    expect(stats.recommendationReason).toContain('exceeds threshold');
  });

  it('recommends compaction when tombstones exceed retention period', async () => {
    // 100 days ago (exceeds 90 day default)
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(workObjectsStore.getAll).mockResolvedValue([
      { id: 'wo:1', deletedAtIso: oldDate } as any,
    ]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    const stats = await getTombstoneStats();

    expect(stats.compactionRecommended).toBe(true);
    expect(stats.recommendationReason).toContain('older than');
  });

  it('respects custom retention days', async () => {
    // 50 days ago
    const oldDate = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(workObjectsStore.getAll).mockResolvedValue([
      { id: 'wo:1', deletedAtIso: oldDate } as any,
    ]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    // With default 90 days, should NOT recommend
    let stats = await getTombstoneStats({ retentionDays: 90 });
    expect(stats.compactionRecommended).toBe(false);

    // With 30 day retention, SHOULD recommend
    stats = await getTombstoneStats({ retentionDays: 30 });
    expect(stats.compactionRecommended).toBe(true);
  });
});

describe('compactTombstones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero counts when no tombstones to compact', async () => {
    vi.mocked(workObjectsStore.getAll).mockResolvedValue([]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    const result = await compactTombstones();

    expect(result.workObjectsDeleted).toBe(0);
    expect(result.workLinksDeleted).toBe(0);
    expect(result.tombstonesRemaining).toBe(0);
    expect(result.exportBlob).toBeUndefined();
    expect(deleteRecord).not.toHaveBeenCalled();
  });

  it('deletes tombstones older than retention period', async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(workObjectsStore.getAll).mockResolvedValue([
      { id: 'wo:old', type: 'marker', deletedAtIso: oldDate } as any,
      { id: 'wo:recent', type: 'goal', deletedAtIso: recentDate } as any,
    ]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([
      { id: 'link:old', deletedAtIso: oldDate } as any,
    ]);

    const result = await compactTombstones();

    expect(result.workObjectsDeleted).toBe(1);
    expect(result.workLinksDeleted).toBe(1);
    expect(result.tombstonesRemaining).toBe(1); // The recent one
    expect(deleteRecord).toHaveBeenCalledTimes(2);
    expect(logEvent).toHaveBeenCalled();
  });

  it('creates export blob when exportBeforeDelete is true', async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(workObjectsStore.getAll).mockResolvedValue([
      { id: 'wo:old', type: 'marker', deletedAtIso: oldDate } as any,
    ]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    const result = await compactTombstones({ exportBeforeDelete: true });

    expect(result.exportBlob).toBeInstanceOf(Blob);
    expect(result.exportBlob?.type).toBe('application/json');
  });

  it('skips export when exportBeforeDelete is false', async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(workObjectsStore.getAll).mockResolvedValue([
      { id: 'wo:old', type: 'marker', deletedAtIso: oldDate } as any,
    ]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    const result = await compactTombstones({ exportBeforeDelete: false });

    expect(result.exportBlob).toBeUndefined();
  });

  it('respects custom retention days for deletion', async () => {
    // 50 days ago
    const midDate = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(workObjectsStore.getAll).mockResolvedValue([
      { id: 'wo:mid', type: 'note', deletedAtIso: midDate } as any,
    ]);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    // With 90 day retention, should NOT delete
    let result = await compactTombstones({ retentionDays: 90 });
    expect(result.workObjectsDeleted).toBe(0);

    // With 30 day retention, SHOULD delete
    result = await compactTombstones({ retentionDays: 30 });
    expect(result.workObjectsDeleted).toBe(1);
  });

  it('deletes oldest tombstones when count exceeds threshold', async () => {
    // Create 120 tombstones (exceeds 100 threshold)
    // All within retention period (stagger by hours, not days)
    const tombstones = Array.from({ length: 120 }, (_, i) => ({
      id: `wo:${i}`,
      type: 'marker',
      // Stagger by hours so all are within 90 day retention
      deletedAtIso: new Date(
        Date.now() - (1 + i) * 60 * 60 * 1000 // hours ago
      ).toISOString(),
    }));

    vi.mocked(workObjectsStore.getAll).mockResolvedValue(tombstones as any);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    // Set threshold to 100, should delete 120 - 80 (80% of 100) = 40 oldest
    const result = await compactTombstones({
      retentionDays: 90, // None qualify by age
      maxTombstoneCount: 100,
    });

    // 120 - 80 = 40 should be deleted
    expect(result.workObjectsDeleted).toBe(40);
    expect(result.tombstonesRemaining).toBe(80);
    expect(deleteRecord).toHaveBeenCalledTimes(40);
  });

  it('combines age and count based deletion', async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    // 5 old (should be deleted by age) + 100 recent (exceeds 80 threshold after age deletion)
    const oldTombstones = Array.from({ length: 5 }, (_, i) => ({
      id: `wo:old:${i}`,
      type: 'marker',
      deletedAtIso: oldDate,
    }));

    const recentTombstones = Array.from({ length: 100 }, (_, i) => ({
      id: `wo:recent:${i}`,
      type: 'marker',
      deletedAtIso: new Date(Date.now() - (10 + i) * 24 * 60 * 60 * 1000).toISOString(),
    }));

    vi.mocked(workObjectsStore.getAll).mockResolvedValue([
      ...oldTombstones,
      ...recentTombstones,
    ] as any);
    vi.mocked(workLinksStore.getAll).mockResolvedValue([]);

    const result = await compactTombstones({
      retentionDays: 90,
      maxTombstoneCount: 80,
    });

    // 5 by age + (100 - 64) = 5 + 36 = 41 deleted
    // 80 * 0.8 = 64 target remaining
    expect(result.workObjectsDeleted).toBe(41);
    expect(result.tombstonesRemaining).toBe(64);
  });
});

describe('generateExportFilename', () => {
  it('generates filename with current date', () => {
    const filename = generateExportFilename();
    const today = new Date().toISOString().split('T')[0];

    expect(filename).toBe(`tombstones-export-${today}.json`);
  });

  it('uses YYYY-MM-DD format', () => {
    const filename = generateExportFilename();

    expect(filename).toMatch(/^tombstones-export-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
