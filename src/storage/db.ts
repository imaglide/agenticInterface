/**
 * IndexedDB Core
 *
 * Low-level database operations for the agentic interface.
 * Handles initialization, versioning, and basic CRUD.
 */

import {
  DB_NAME,
  DB_VERSION,
  STORE_NAMES,
  EventRecord,
  MeetingState,
  IntentItem,
  DailyAggregate,
} from './types';

// ============================================
// Database Instance
// ============================================

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Get or initialize the database connection.
 * Returns a singleton instance.
 */
export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      initializeStores(db);
    };
  });

  return dbPromise;
}

/**
 * Initialize object stores on database creation/upgrade.
 */
function initializeStores(db: IDBDatabase): void {
  // Events store with timestamp index for range queries
  if (!db.objectStoreNames.contains(STORE_NAMES.events)) {
    const eventsStore = db.createObjectStore(STORE_NAMES.events, { keyPath: 'id' });
    eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
    eventsStore.createIndex('type', 'type', { unique: false });
  }

  // Meetings store
  if (!db.objectStoreNames.contains(STORE_NAMES.meetings)) {
    const meetingsStore = db.createObjectStore(STORE_NAMES.meetings, { keyPath: 'id' });
    meetingsStore.createIndex('startTime', 'startTime', { unique: false });
  }

  // Intents store
  if (!db.objectStoreNames.contains(STORE_NAMES.intents)) {
    const intentsStore = db.createObjectStore(STORE_NAMES.intents, { keyPath: 'id' });
    intentsStore.createIndex('scope', 'scope', { unique: false });
    intentsStore.createIndex('status', 'status', { unique: false });
    intentsStore.createIndex('meetingId', 'meetingId', { unique: false });
  }

  // Aggregates store for compacted noise events
  if (!db.objectStoreNames.contains(STORE_NAMES.aggregates)) {
    const aggregatesStore = db.createObjectStore(STORE_NAMES.aggregates, { keyPath: 'id' });
    aggregatesStore.createIndex('date', 'date', { unique: true });
  }
}

/**
 * Close the database connection.
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbPromise = null;
  }
}

// ============================================
// Generic CRUD Operations
// ============================================

/**
 * Add a record to a store.
 */
export async function addRecord<T>(
  storeName: string,
  record: T
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Put (upsert) a record in a store.
 */
export async function putRecord<T>(
  storeName: string,
  record: T
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get a record by key.
 */
export async function getRecord<T>(
  storeName: string,
  key: string
): Promise<T | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

/**
 * Get all records from a store.
 */
export async function getAllRecords<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete a record by key.
 */
export async function deleteRecord(
  storeName: string,
  key: string
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Delete multiple records by keys.
 */
export async function deleteRecords(
  storeName: string,
  keys: string[]
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    let completed = 0;
    const total = keys.length;

    if (total === 0) {
      resolve();
      return;
    }

    for (const key of keys) {
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
    }
  });
}

/**
 * Query records by index.
 */
export async function queryByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Query records by index range.
 */
export async function queryByRange<T>(
  storeName: string,
  indexName: string,
  lower?: IDBValidKey,
  upper?: IDBValidKey
): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);

    let range: IDBKeyRange | null = null;
    if (lower !== undefined && upper !== undefined) {
      range = IDBKeyRange.bound(lower, upper);
    } else if (lower !== undefined) {
      range = IDBKeyRange.lowerBound(lower);
    } else if (upper !== undefined) {
      range = IDBKeyRange.upperBound(upper);
    }

    const request = range ? index.getAll(range) : index.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Count records in a store.
 */
export async function countRecords(storeName: string): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Clear all records from a store.
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================
// Typed Store Operations
// ============================================

export const eventsStore = {
  add: (record: EventRecord) => addRecord(STORE_NAMES.events, record),
  get: (id: string) => getRecord<EventRecord>(STORE_NAMES.events, id),
  getAll: () => getAllRecords<EventRecord>(STORE_NAMES.events),
  delete: (id: string) => deleteRecord(STORE_NAMES.events, id),
  deleteMany: (ids: string[]) => deleteRecords(STORE_NAMES.events, ids),
  queryByType: (type: string) => queryByIndex<EventRecord>(STORE_NAMES.events, 'type', type),
  queryByTimeRange: (start?: number, end?: number) =>
    queryByRange<EventRecord>(STORE_NAMES.events, 'timestamp', start, end),
  count: () => countRecords(STORE_NAMES.events),
  clear: () => clearStore(STORE_NAMES.events),
};

export const meetingsStore = {
  add: (record: MeetingState) => addRecord(STORE_NAMES.meetings, record),
  put: (record: MeetingState) => putRecord(STORE_NAMES.meetings, record),
  get: (id: string) => getRecord<MeetingState>(STORE_NAMES.meetings, id),
  getAll: () => getAllRecords<MeetingState>(STORE_NAMES.meetings),
  delete: (id: string) => deleteRecord(STORE_NAMES.meetings, id),
  count: () => countRecords(STORE_NAMES.meetings),
  clear: () => clearStore(STORE_NAMES.meetings),
};

export const intentsStore = {
  add: (record: IntentItem) => addRecord(STORE_NAMES.intents, record),
  put: (record: IntentItem) => putRecord(STORE_NAMES.intents, record),
  get: (id: string) => getRecord<IntentItem>(STORE_NAMES.intents, id),
  getAll: () => getAllRecords<IntentItem>(STORE_NAMES.intents),
  delete: (id: string) => deleteRecord(STORE_NAMES.intents, id),
  queryByScope: (scope: string) => queryByIndex<IntentItem>(STORE_NAMES.intents, 'scope', scope),
  queryByStatus: (status: string) => queryByIndex<IntentItem>(STORE_NAMES.intents, 'status', status),
  count: () => countRecords(STORE_NAMES.intents),
  clear: () => clearStore(STORE_NAMES.intents),
};

export const aggregatesStore = {
  add: (record: DailyAggregate) => addRecord(STORE_NAMES.aggregates, record),
  put: (record: DailyAggregate) => putRecord(STORE_NAMES.aggregates, record),
  get: (id: string) => getRecord<DailyAggregate>(STORE_NAMES.aggregates, id),
  getAll: () => getAllRecords<DailyAggregate>(STORE_NAMES.aggregates),
  getByDate: (date: string) => queryByIndex<DailyAggregate>(STORE_NAMES.aggregates, 'date', date),
  count: () => countRecords(STORE_NAMES.aggregates),
  clear: () => clearStore(STORE_NAMES.aggregates),
};
