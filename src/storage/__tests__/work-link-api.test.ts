/**
 * WorkLink API Tests
 *
 * Tests for creating, validating, and querying WorkLinks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWorkLink,
  softDeleteWorkLink,
  getActiveLinksForWorkObject,
  LinkValidationError,
} from '../work-object-api';

// Mock the database stores
vi.mock('../db', () => ({
  workObjectsStore: {
    get: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn(),
    getByType: vi.fn(),
  },
  workLinksStore: {
    get: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn(),
    getByFromId: vi.fn(),
    getByToId: vi.fn(),
  },
}));

vi.mock('../storage-api', () => ({
  logEvent: vi.fn(),
}));

// Mock UUID generation for deterministic tests
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

import { workObjectsStore, workLinksStore } from '../db';

describe('createWorkLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const meetingUid = 'meeting-abc-123';
  const sourceId = `wo:marker:mtg:${meetingUid}:m1`;
  const targetId = `wo:goal:mtg:${meetingUid}:g1`;

  it('creates a valid link between two WorkObjects', async () => {
    vi.mocked(workObjectsStore.get)
      .mockResolvedValueOnce({ id: sourceId, type: 'marker' } as any)
      .mockResolvedValueOnce({ id: targetId, type: 'goal' } as any);

    const linkId = await createWorkLink(sourceId, targetId, 'related');

    expect(linkId).toMatch(/^wo:link:mtg:/);
    expect(workLinksStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        fromId: sourceId,
        toId: targetId,
        type: 'related',
      })
    );
  });

  it('throws SELF_LINK when linking to itself', async () => {
    try {
      await createWorkLink(sourceId, sourceId, 'related');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LinkValidationError);
      expect((e as LinkValidationError).code).toBe('SELF_LINK');
    }
  });

  it('throws CROSS_SCOPE for different meeting scopes', async () => {
    const differentMeetingId = `wo:marker:mtg:different-meeting:m1`;

    try {
      await createWorkLink(sourceId, differentMeetingId, 'related');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LinkValidationError);
      expect((e as LinkValidationError).code).toBe('CROSS_SCOPE');
    }
  });

  it('throws SOURCE_NOT_FOUND when source does not exist', async () => {
    vi.mocked(workObjectsStore.get).mockResolvedValueOnce(null);

    try {
      await createWorkLink(sourceId, targetId, 'related');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LinkValidationError);
      expect((e as LinkValidationError).code).toBe('SOURCE_NOT_FOUND');
    }
  });

  it('throws TARGET_NOT_FOUND when target does not exist', async () => {
    vi.mocked(workObjectsStore.get)
      .mockResolvedValueOnce({ id: sourceId, type: 'marker' } as any)
      .mockResolvedValueOnce(null);

    try {
      await createWorkLink(sourceId, targetId, 'related');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LinkValidationError);
      expect((e as LinkValidationError).code).toBe('TARGET_NOT_FOUND');
    }
  });

  it('throws SOURCE_DELETED when source is soft-deleted', async () => {
    vi.mocked(workObjectsStore.get).mockResolvedValueOnce({
      id: sourceId,
      type: 'marker',
      deletedAtIso: '2024-01-01T00:00:00.000Z',
    } as any);

    try {
      await createWorkLink(sourceId, targetId, 'related');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LinkValidationError);
      expect((e as LinkValidationError).code).toBe('SOURCE_DELETED');
    }
  });

  it('throws TARGET_DELETED when target is soft-deleted', async () => {
    vi.mocked(workObjectsStore.get)
      .mockResolvedValueOnce({ id: sourceId, type: 'marker' } as any)
      .mockResolvedValueOnce({
        id: targetId,
        type: 'goal',
        deletedAtIso: '2024-01-01T00:00:00.000Z',
      } as any);

    try {
      await createWorkLink(sourceId, targetId, 'related');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LinkValidationError);
      expect((e as LinkValidationError).code).toBe('TARGET_DELETED');
    }
  });

  it('supports all link types', async () => {
    const linkTypes: Array<'related' | 'supports' | 'blocks' | 'duplicates'> = [
      'related',
      'supports',
      'blocks',
      'duplicates',
    ];

    for (const linkType of linkTypes) {
      vi.clearAllMocks();
      vi.mocked(workObjectsStore.get)
        .mockResolvedValueOnce({ id: sourceId, type: 'marker' } as any)
        .mockResolvedValueOnce({ id: targetId, type: 'goal' } as any);

      await createWorkLink(sourceId, targetId, linkType);

      expect(workLinksStore.put).toHaveBeenCalledWith(
        expect.objectContaining({ type: linkType })
      );
    }
  });
});

describe('softDeleteWorkLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft-deletes an existing link', async () => {
    const linkId = 'wo:link:mtg:abc:uuid-123';
    vi.mocked(workLinksStore.get).mockResolvedValue({
      id: linkId,
      fromId: 'from',
      toId: 'to',
      type: 'related',
      createdAtIso: '2024-01-01T00:00:00.000Z',
    } as any);

    await softDeleteWorkLink(linkId);

    expect(workLinksStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: linkId,
        deletedAtIso: expect.any(String),
      })
    );
  });

  it('does nothing when link not found', async () => {
    vi.mocked(workLinksStore.get).mockResolvedValue(null);

    await softDeleteWorkLink('wo:link:mtg:abc:not-found');

    expect(workLinksStore.put).not.toHaveBeenCalled();
  });

  it('does nothing when link already deleted', async () => {
    vi.mocked(workLinksStore.get).mockResolvedValue({
      id: 'wo:link:mtg:abc:already-deleted',
      deletedAtIso: '2024-01-01T00:00:00.000Z',
    } as any);

    await softDeleteWorkLink('wo:link:mtg:abc:already-deleted');

    expect(workLinksStore.put).not.toHaveBeenCalled();
  });
});

describe('getActiveLinksForWorkObject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns links where object is source', async () => {
    const workObjectId = 'wo:marker:mtg:abc:m1';
    const link = {
      id: 'wo:link:mtg:abc:link-1',
      fromId: workObjectId,
      toId: 'wo:goal:mtg:abc:g1',
      type: 'related',
      createdAtIso: '2024-01-01T00:00:00.000Z',
    };

    vi.mocked(workLinksStore.getByFromId).mockResolvedValue([link] as any);
    vi.mocked(workLinksStore.getByToId).mockResolvedValue([]);

    const links = await getActiveLinksForWorkObject(workObjectId);

    expect(links).toHaveLength(1);
    expect(links[0].id).toBe(link.id);
  });

  it('returns links where object is target', async () => {
    const workObjectId = 'wo:goal:mtg:abc:g1';
    const link = {
      id: 'wo:link:mtg:abc:link-1',
      fromId: 'wo:marker:mtg:abc:m1',
      toId: workObjectId,
      type: 'supports',
      createdAtIso: '2024-01-01T00:00:00.000Z',
    };

    vi.mocked(workLinksStore.getByFromId).mockResolvedValue([]);
    vi.mocked(workLinksStore.getByToId).mockResolvedValue([link] as any);

    const links = await getActiveLinksForWorkObject(workObjectId);

    expect(links).toHaveLength(1);
    expect(links[0].id).toBe(link.id);
  });

  it('deduplicates links appearing in both directions', async () => {
    const workObjectId = 'wo:marker:mtg:abc:m1';
    const link = {
      id: 'wo:link:mtg:abc:link-1',
      fromId: workObjectId,
      toId: workObjectId, // Shouldn't happen but tests dedup
      type: 'related',
      createdAtIso: '2024-01-01T00:00:00.000Z',
    };

    vi.mocked(workLinksStore.getByFromId).mockResolvedValue([link] as any);
    vi.mocked(workLinksStore.getByToId).mockResolvedValue([link] as any);

    const links = await getActiveLinksForWorkObject(workObjectId);

    expect(links).toHaveLength(1);
  });

  it('filters out deleted links', async () => {
    const workObjectId = 'wo:marker:mtg:abc:m1';
    const activeLink = {
      id: 'wo:link:mtg:abc:link-active',
      fromId: workObjectId,
      toId: 'wo:goal:mtg:abc:g1',
      type: 'related',
      createdAtIso: '2024-01-01T00:00:00.000Z',
    };
    const deletedLink = {
      id: 'wo:link:mtg:abc:link-deleted',
      fromId: workObjectId,
      toId: 'wo:goal:mtg:abc:g2',
      type: 'blocks',
      createdAtIso: '2024-01-01T00:00:00.000Z',
      deletedAtIso: '2024-06-01T00:00:00.000Z',
    };

    vi.mocked(workLinksStore.getByFromId).mockResolvedValue([
      activeLink,
      deletedLink,
    ] as any);
    vi.mocked(workLinksStore.getByToId).mockResolvedValue([]);

    const links = await getActiveLinksForWorkObject(workObjectId);

    expect(links).toHaveLength(1);
    expect(links[0].id).toBe(activeLink.id);
  });
});
