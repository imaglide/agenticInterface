/**
 * WorkObject API
 *
 * High-level operations for WorkObjects including soft-delete (tombstoning).
 * See spec: docs/work_objects_and_agentic_work_surfaces.md §8, §18
 */

import { workObjectsStore, workLinksStore } from './db';
import { logEvent } from './storage-api';
import { workObjectIds, isSameScope, getMeetingUidFromWorkObjectId } from './work-object-id';
import type { WorkObject, WorkLink, LinkType } from './work-object-types';

// ============================================
// Soft Delete Operations
// ============================================

/**
 * Soft-delete a WorkObject by setting deletedAtIso timestamp.
 * The object remains in storage but is hidden from normal queries.
 */
export async function softDeleteWorkObject(id: string): Promise<void> {
  const obj = await workObjectsStore.get(id);
  if (!obj) {
    console.warn(`[WorkObjectAPI] Cannot delete: object not found: ${id}`);
    return;
  }

  if (obj.deletedAtIso) {
    console.warn(`[WorkObjectAPI] Object already deleted: ${id}`);
    return;
  }

  const now = new Date().toISOString();
  obj.deletedAtIso = now;
  obj.updatedAtIso = now;

  await workObjectsStore.put(obj);
  await logEvent('work_object_deleted', {
    workObjectId: id,
    type: obj.type,
    deletedAtIso: now,
  });
}

/**
 * Restore a soft-deleted WorkObject by clearing deletedAtIso.
 */
export async function restoreWorkObject(id: string): Promise<void> {
  const obj = await workObjectsStore.get(id);
  if (!obj) {
    console.warn(`[WorkObjectAPI] Cannot restore: object not found: ${id}`);
    return;
  }

  if (!obj.deletedAtIso) {
    console.warn(`[WorkObjectAPI] Object is not deleted: ${id}`);
    return;
  }

  const previousDeletedAt = obj.deletedAtIso;
  obj.deletedAtIso = undefined;
  obj.updatedAtIso = new Date().toISOString();

  await workObjectsStore.put(obj);
  await logEvent('work_object_restored', {
    workObjectId: id,
    type: obj.type,
    previousDeletedAt,
  });
}

/**
 * Soft-delete a WorkLink by setting deletedAtIso timestamp.
 */
export async function softDeleteWorkLink(id: string): Promise<void> {
  const link = await workLinksStore.get(id);
  if (!link) {
    console.warn(`[WorkObjectAPI] Cannot delete link: not found: ${id}`);
    return;
  }

  if (link.deletedAtIso) {
    console.warn(`[WorkObjectAPI] Link already deleted: ${id}`);
    return;
  }

  link.deletedAtIso = new Date().toISOString();
  await workLinksStore.put(link);
}

// ============================================
// WorkLink Creation
// ============================================

/**
 * Error thrown when link creation fails validation.
 */
export class LinkValidationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'SELF_LINK'
      | 'CROSS_SCOPE'
      | 'SOURCE_NOT_FOUND'
      | 'TARGET_NOT_FOUND'
      | 'SOURCE_DELETED'
      | 'TARGET_DELETED'
      | 'INVALID_ID'
  ) {
    super(message);
    this.name = 'LinkValidationError';
  }
}

/**
 * Create a WorkLink between two WorkObjects.
 *
 * Validates:
 * - Both IDs are valid WorkObject IDs
 * - Not a self-link (fromId !== toId)
 * - Both objects exist and are not deleted
 * - Both objects are in the same scope (V1 restriction)
 *
 * @param fromId - Source WorkObject ID
 * @param toId - Target WorkObject ID
 * @param type - Link type (related, supports, blocks, duplicates)
 * @returns The created WorkLink ID
 * @throws LinkValidationError if validation fails
 */
export async function createWorkLink(
  fromId: string,
  toId: string,
  type: LinkType
): Promise<string> {
  // Self-link check
  if (fromId === toId) {
    throw new LinkValidationError(
      'Cannot create a link from an object to itself',
      'SELF_LINK'
    );
  }

  // Same-scope check (V1 restriction: no cross-scope linking)
  if (!isSameScope(fromId, toId)) {
    throw new LinkValidationError(
      'Cannot create links between objects in different scopes',
      'CROSS_SCOPE'
    );
  }

  // Get meeting UID from source for link ID generation
  const meetingUid = getMeetingUidFromWorkObjectId(fromId);
  if (!meetingUid) {
    throw new LinkValidationError(
      `Invalid source WorkObject ID: ${fromId}`,
      'INVALID_ID'
    );
  }

  // Validate source object exists and is active
  const sourceObj = await workObjectsStore.get(fromId);
  if (!sourceObj) {
    throw new LinkValidationError(
      `Source WorkObject not found: ${fromId}`,
      'SOURCE_NOT_FOUND'
    );
  }
  if (sourceObj.deletedAtIso) {
    throw new LinkValidationError(
      `Source WorkObject is deleted: ${fromId}`,
      'SOURCE_DELETED'
    );
  }

  // Validate target object exists and is active
  const targetObj = await workObjectsStore.get(toId);
  if (!targetObj) {
    throw new LinkValidationError(
      `Target WorkObject not found: ${toId}`,
      'TARGET_NOT_FOUND'
    );
  }
  if (targetObj.deletedAtIso) {
    throw new LinkValidationError(
      `Target WorkObject is deleted: ${toId}`,
      'TARGET_DELETED'
    );
  }

  // Create the link
  const linkId = workObjectIds.link(meetingUid);
  const now = new Date().toISOString();

  const link: WorkLink = {
    id: linkId,
    fromId,
    toId,
    type,
    createdAtIso: now,
  };

  await workLinksStore.put(link);
  await logEvent('work_object_created', {
    workObjectId: linkId,
    type: 'link',
    linkType: type,
    fromId,
    toId,
  });

  return linkId;
}

// ============================================
// Query Operations (Tombstone-Aware)
// ============================================

/**
 * Get all active (non-deleted) WorkObjects.
 */
export async function getActiveWorkObjects(): Promise<WorkObject[]> {
  const all = await workObjectsStore.getAll();
  return all.filter((obj) => !obj.deletedAtIso);
}

/**
 * Get active WorkObjects by type.
 */
export async function getActiveWorkObjectsByType(
  type: WorkObject['type']
): Promise<WorkObject[]> {
  const byType = await workObjectsStore.getByType(type);
  return byType.filter((obj) => !obj.deletedAtIso);
}

/**
 * Get all tombstoned (soft-deleted) WorkObjects.
 */
export async function getTombstonedWorkObjects(): Promise<WorkObject[]> {
  const all = await workObjectsStore.getAll();
  return all.filter((obj) => !!obj.deletedAtIso);
}

/**
 * Get tombstoned WorkObjects older than a threshold.
 * Used for compaction to decide what can be permanently deleted.
 */
export async function getTombstonedWorkObjectsOlderThan(
  thresholdIso: string
): Promise<WorkObject[]> {
  const all = await workObjectsStore.getAll();
  return all.filter(
    (obj) => obj.deletedAtIso && obj.deletedAtIso < thresholdIso
  );
}

/**
 * Get all active (non-deleted) WorkLinks.
 */
export async function getActiveWorkLinks(): Promise<WorkLink[]> {
  const all = await workLinksStore.getAll();
  return all.filter((link) => !link.deletedAtIso);
}

/**
 * Get active links for a specific WorkObject (as source or target).
 */
export async function getActiveLinksForWorkObject(
  workObjectId: string
): Promise<WorkLink[]> {
  const [fromLinks, toLinks] = await Promise.all([
    workLinksStore.getByFromId(workObjectId),
    workLinksStore.getByToId(workObjectId),
  ]);

  const allLinks = [...fromLinks, ...toLinks];
  // Dedupe by id and filter out deleted
  const seen = new Set<string>();
  return allLinks.filter((link) => {
    if (seen.has(link.id) || link.deletedAtIso) return false;
    seen.add(link.id);
    return true;
  });
}

// ============================================
// Statistics
// ============================================

/**
 * Get tombstone statistics for monitoring storage usage.
 */
export async function getTombstoneStats(): Promise<{
  totalWorkObjects: number;
  activeWorkObjects: number;
  tombstonedWorkObjects: number;
  totalWorkLinks: number;
  activeWorkLinks: number;
  tombstonedWorkLinks: number;
  oldestTombstoneIso: string | null;
}> {
  const [allObjects, allLinks] = await Promise.all([
    workObjectsStore.getAll(),
    workLinksStore.getAll(),
  ]);

  const tombstonedObjects = allObjects.filter((obj) => !!obj.deletedAtIso);
  const tombstonedLinks = allLinks.filter((link) => !!link.deletedAtIso);

  // Find oldest tombstone
  let oldestTombstoneIso: string | null = null;
  for (const obj of tombstonedObjects) {
    if (!oldestTombstoneIso || obj.deletedAtIso! < oldestTombstoneIso) {
      oldestTombstoneIso = obj.deletedAtIso!;
    }
  }
  for (const link of tombstonedLinks) {
    if (!oldestTombstoneIso || link.deletedAtIso! < oldestTombstoneIso) {
      oldestTombstoneIso = link.deletedAtIso!;
    }
  }

  return {
    totalWorkObjects: allObjects.length,
    activeWorkObjects: allObjects.length - tombstonedObjects.length,
    tombstonedWorkObjects: tombstonedObjects.length,
    totalWorkLinks: allLinks.length,
    activeWorkLinks: allLinks.length - tombstonedLinks.length,
    tombstonedWorkLinks: tombstonedLinks.length,
    oldestTombstoneIso,
  };
}
