import {
  EMBEDDED_EXPORT_METADATA,
  EMBEDDED_FOLLOWERS_1_JSON,
  EMBEDDED_FOLLOWING_JSON,
} from '../data/embeddedExport';
import {
  AppSettings,
  BatchSessionState,
  CompletedAccountRecord,
  FullDatabaseBackup,
  InstagramAccount,
  PrimaryZipMetadata,
  PrimaryZipRecord,
  StoragePersistenceInfo,
  StoredDataset,
} from '../types/instagram';
import {
  buildProfileUrl,
  extractAccountsFromEntries,
  generateInstagramZipArchive,
  normalizeUsername,
  parseUploadedInstagramFiles,
} from '../utils/instagramParser';

const DB_NAME = 'InstagramUnfollowManagerDB';
const DB_VERSION = 2;

const STORE_COMPLETED = 'completed_accounts';
const STORE_DATASET = 'dataset';
const STORE_BATCH = 'batch_session';
const STORE_SETTINGS = 'settings';
const STORE_PRIMARY_ZIP = 'primary_zip_store';

const LS_KEYS = {
  COMPLETED: 'ium_completed_v1',
  DATASET: 'ium_dataset_v1',
  BATCH: 'ium_batch_v1',
  SETTINGS: 'ium_settings_v1',
  AUTO_BACKUP: 'ium_autobackup_v1',
  PRIMARY_ZIP_META: 'ium_primary_zip_meta_v2',
  PRIMARY_ZIP_B64: 'ium_primary_zip_b64_v2',
  CLEARED_FLAG: 'ium_dataset_intentionally_cleared_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'user_settings',
  theme: 'dark',
  defaultBatchSize: 25,
  hideCompletedAccounts: true,
  autoBackup: true,
  lastAutoBackupAt: null,
  instagramLaunchMethod: 'auto-native',
};

export const DEFAULT_BATCH_SESSION: BatchSessionState = {
  id: 'active_batch',
  batchSize: 25,
  queueUsernames: [],
  currentBatchIndex: 0,
  currentPointerNormalized: null,
  lastOpenedUsername: null,
  lastOpenedAt: null,
  status: 'idle',
  startedAt: null,
  undoStack: [],
  openedProfiles: [],
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_COMPLETED)) {
        db.createObjectStore(STORE_COMPLETED, { keyPath: 'normalizedUsername' });
      }
      if (!db.objectStoreNames.contains(STORE_DATASET)) {
        db.createObjectStore(STORE_DATASET, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BATCH)) {
        db.createObjectStore(STORE_BATCH, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PRIMARY_ZIP)) {
        db.createObjectStore(STORE_PRIMARY_ZIP, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });

  return dbPromise;
}

function safeLocalStorageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Handle storage quota limitations gracefully
  }
}

function safeLocalStorageGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, mimeType = 'application/zip'): Blob {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];
  const sliceSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays as BlobPart[], { type: mimeType });
}

/**
 * Requests persistent browser storage via navigator.storage.persist() and checks storage quota
 */
export async function requestAndCheckPersistentStorage(): Promise<{
  isPersisted: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
}> {
  let isPersisted = false;
  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;

  try {
    if (typeof navigator !== 'undefined' && navigator.storage) {
      if (typeof navigator.storage.persisted === 'function') {
        isPersisted = await navigator.storage.persisted();
      }
      if (!isPersisted && typeof navigator.storage.persist === 'function') {
        isPersisted = await navigator.storage.persist();
      }
      if (typeof navigator.storage.estimate === 'function') {
        const estimate = await navigator.storage.estimate();
        usageBytes = typeof estimate.usage === 'number' ? estimate.usage : null;
        quotaBytes = typeof estimate.quota === 'number' ? estimate.quota : null;
      }
    }
  } catch {
    // Ignore errors in restricted contexts
  }

  return { isPersisted, usageBytes, quotaBytes };
}

/**
 * Builds the default embedded StoredDataset from connections/followers_and_following
 */
export function buildEmbeddedDefaultDataset(): StoredDataset {
  const followers = extractAccountsFromEntries(EMBEDDED_FOLLOWERS_1_JSON);
  const following = extractAccountsFromEntries(
    EMBEDDED_FOLLOWING_JSON.relationships_following || []
  );

  return {
    id: 'current_dataset',
    followers,
    following,
    lastImportDate: EMBEDDED_EXPORT_METADATA.defaultImportTimestamp,
    sourceLabel: EMBEDDED_EXPORT_METADATA.sourceLabel,
    importedFiles: EMBEDDED_EXPORT_METADATA.importedFiles,
    isEmbeddedDefault: true,
  };
}

function countNonFollowers(
  followers: InstagramAccount[],
  following: InstagramAccount[]
): number {
  const followerSet = new Set(followers.map((f) => f.normalizedUsername));
  return following.filter((acc) => !followerSet.has(acc.normalizedUsername)).length;
}

/**
 * PRIMARY LOCKED ZIP STORAGE OPERATIONS
 */
export async function loadPrimaryZipRecord(): Promise<PrimaryZipRecord | null> {
  try {
    const db = await openDatabase();
    const record = await new Promise<PrimaryZipRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_PRIMARY_ZIP, 'readonly');
      const store = tx.objectStore(STORE_PRIMARY_ZIP);
      const req = store.get('primary_zip');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (record && record.zipBlob) {
      return record;
    }
  } catch {
    // Check fallback base64 mirror if IndexedDB failed
  }

  const meta = safeLocalStorageGet<PrimaryZipMetadata>(LS_KEYS.PRIMARY_ZIP_META);
  const b64 = safeLocalStorageGet<string>(LS_KEYS.PRIMARY_ZIP_B64);
  if (meta && b64) {
    try {
      const zipBlob = base64ToBlob(b64, 'application/zip');
      const file = new File([zipBlob], meta.fileName, { type: 'application/zip' });
      const parsed = await parseUploadedInstagramFiles([file]);
      const reconstructed: PrimaryZipRecord = {
        ...meta,
        zipBlob,
        followers: parsed.followers,
        following: parsed.following,
      };
      // Re-save back to IndexedDB
      await writePrimaryZipRecordToDb(reconstructed);
      return reconstructed;
    } catch {
      return null;
    }
  }

  return null;
}

async function writePrimaryZipRecordToDb(record: PrimaryZipRecord): Promise<void> {
  const metadata: PrimaryZipMetadata = {
    id: 'primary_zip',
    fileName: record.fileName,
    importedAt: record.importedAt,
    fileSize: record.fileSize,
    isLocked: record.isLocked,
    followersCount: record.followersCount,
    followingCount: record.followingCount,
    nonFollowersCount: record.nonFollowersCount,
    extractedFiles: record.extractedFiles,
    isUserUploaded: record.isUserUploaded,
  };

  safeLocalStorageSet(LS_KEYS.PRIMARY_ZIP_META, metadata);

  // If ZIP is <= 3.5MB, also keep a Base64 emergency recovery copy
  if (record.fileSize <= 3.5 * 1024 * 1024) {
    try {
      const b64 = await blobToBase64(record.zipBlob);
      safeLocalStorageSet(LS_KEYS.PRIMARY_ZIP_B64, b64);
    } catch {
      // Ignore quota limits on secondary mirror
    }
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PRIMARY_ZIP, 'readwrite');
      const store = tx.objectStore(STORE_PRIMARY_ZIP);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        if (tx.error?.name === 'QuotaExceededError') {
          reject(
            new Error(
              'Browser storage quota exceeded while saving Primary ZIP. Please free up disk space or export a backup.'
            )
          );
        } else {
          reject(tx.error || new Error('Failed to store Primary ZIP in IndexedDB.'));
        }
      };
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('quota')) {
      throw err;
    }
  }
}

/**
 * Saves and locks the Primary ZIP dataset.
 * Will NOT overwrite an existing user-uploaded locked Primary ZIP unless forceAdminReplace is true!
 */
export async function saveAndLockPrimaryZip(params: {
  zipBlob: Blob;
  fileName: string;
  followers: InstagramAccount[];
  following: InstagramAccount[];
  extractedFiles: string[];
  isUserUploaded: boolean;
  importedAt?: string;
  forceAdminReplace?: boolean;
}): Promise<{
  record: PrimaryZipRecord;
  wasLockedAsNewPrimary: boolean;
}> {
  const existing = await loadPrimaryZipRecord();

  // Enforce lock protection: If a user-uploaded Primary ZIP is already locked, never overwrite it unless forceAdminReplace is explicitly true
  if (
    existing &&
    existing.isLocked &&
    existing.isUserUploaded &&
    !params.forceAdminReplace
  ) {
    return {
      record: existing,
      wasLockedAsNewPrimary: false,
    };
  }

  // Request browser storage persistence whenever locking a Primary ZIP
  await requestAndCheckPersistentStorage();

  const nonFollowersCount = countNonFollowers(params.followers, params.following);
  const nowIso = params.importedAt || new Date().toISOString();

  const newRecord: PrimaryZipRecord = {
    id: 'primary_zip',
    fileName: params.fileName,
    importedAt: nowIso,
    fileSize: params.zipBlob.size,
    isLocked: true,
    followersCount: params.followers.length,
    followingCount: params.following.length,
    nonFollowersCount,
    extractedFiles: params.extractedFiles,
    isUserUploaded: params.isUserUploaded,
    zipBlob: params.zipBlob,
    followers: params.followers,
    following: params.following,
  };

  await writePrimaryZipRecordToDb(newRecord);

  return {
    record: newRecord,
    wasLockedAsNewPrimary: true,
  };
}

/**
 * AUTOMATIC RECOVERY & STARTUP INITIALIZATION
 * 1. Requests persistent browser storage.
 * 2. Checks whether Primary ZIP exists in IndexedDB.
 * 3. If Primary ZIP exists but active extracted dataset is missing/corrupted, automatically re-extracts it from the Primary ZIP Blob!
 * 4. If no Primary ZIP exists yet on first launch, generates and locks the embedded Instagram ZIP archive so the app starts ready and locked.
 */
export async function initializeAndRecoverStorage(): Promise<{
  dataset: StoredDataset | null;
  primaryZip: PrimaryZipRecord | null;
  persistenceInfo: StoragePersistenceInfo;
}> {
  const storageStats = await requestAndCheckPersistentStorage();
  let recoveryPerformed = false;
  let recoveryMessage: string | null = null;
  let corruptionDetected = false;
  let corruptionMessage: string | null = null;

  const expectedMeta = safeLocalStorageGet<PrimaryZipMetadata>(LS_KEYS.PRIMARY_ZIP_META);
  const wasIntentionallyCleared = safeLocalStorageGet<boolean>(LS_KEYS.CLEARED_FLAG);

  let primaryZip = await loadPrimaryZipRecord();
  let currentDataset = await loadStoredDatasetRaw();
  const completedRecords = await getAllCompletedAccounts();
  const completedNormSet = new Set(
    completedRecords.map((r) => r.normalizedUsername)
  );

  // Case A: Primary ZIP exists in IndexedDB, but extracted dataset is missing or empty (and not intentionally cleared)
  if (
    primaryZip &&
    (!currentDataset ||
      (currentDataset.followers.length === 0 && currentDataset.following.length === 0)) &&
    !wasIntentionallyCleared
  ) {
    try {
      let recoveredFollowers = primaryZip.followers || [];
      let recoveredFollowing = primaryZip.following || [];
      let recoveredFiles = primaryZip.extractedFiles || [];

      // If arrays inside primaryZip record were somehow stripped, re-extract directly from the stored ZIP Blob!
      if (
        (recoveredFollowers.length === 0 || recoveredFollowing.length === 0) &&
        primaryZip.zipBlob
      ) {
        const zipFile = new File([primaryZip.zipBlob], primaryZip.fileName, {
          type: 'application/zip',
        });
        const extracted = await parseUploadedInstagramFiles([zipFile]);
        recoveredFollowers = extracted.followers;
        recoveredFollowing = extracted.following;
        recoveredFiles = extracted.importedFiles;
      }

      // Permanently exclude any account already marked done
      const activeFollowing = recoveredFollowing.filter(
        (acc) => !completedNormSet.has(acc.normalizedUsername)
      );

      if (recoveredFollowers.length > 0 || recoveredFollowing.length > 0) {
        currentDataset = {
          id: 'current_dataset',
          followers: recoveredFollowers,
          following: activeFollowing,
          lastImportDate: primaryZip.importedAt,
          sourceLabel: `${primaryZip.fileName} (Auto-Recovered from Locked Primary ZIP)`,
          importedFiles: recoveredFiles,
          isEmbeddedDefault: !primaryZip.isUserUploaded,
        };
        await saveStoredDataset(currentDataset);
        recoveryPerformed = true;
        recoveryMessage = `Automatically recovered ${recoveredFollowers.length} followers and ${activeFollowing.length} active following accounts from your locked Primary ZIP ("${primaryZip.fileName}").`;
      } else {
        corruptionDetected = true;
        corruptionMessage = `Primary ZIP "${primaryZip.fileName}" was found, but its extracted contents appeared empty. Please use Re-Extract or restore from backup.`;
      }
    } catch (err) {
      corruptionDetected = true;
      corruptionMessage =
        err instanceof Error
          ? `Automatic extraction recovery failed: ${err.message}`
          : 'Automatic recovery encountered a corrupted ZIP archive. Please restore from backup.';
    }
  }

  // Case B: Metadata says a user-uploaded Primary ZIP was locked previously, but both Primary ZIP and Dataset are now missing
  if (!primaryZip && expectedMeta && expectedMeta.isUserUploaded && !currentDataset) {
    corruptionDetected = true;
    corruptionMessage = `Previously locked Primary ZIP ("${expectedMeta.fileName}") could not be found in browser storage (browser site data may have been cleared). Please restore your backup or import your Instagram ZIP.`;
  }

  // Case C: First-time launch (no Primary ZIP and no corruption/clear flag): Seed and Lock initial Embedded ZIP archive
  if (!primaryZip && !corruptionDetected && !wasIntentionallyCleared) {
    const embeddedDataset = buildEmbeddedDefaultDataset();
    const zipBlob = await generateInstagramZipArchive(
      embeddedDataset.followers,
      embeddedDataset.following
    );
    const lockRes = await saveAndLockPrimaryZip({
      zipBlob,
      fileName: 'instagram_connections_export.zip',
      followers: embeddedDataset.followers,
      following: embeddedDataset.following,
      extractedFiles: embeddedDataset.importedFiles,
      isUserUploaded: false,
      importedAt: embeddedDataset.lastImportDate,
      forceAdminReplace: true,
    });
    primaryZip = lockRes.record;

    if (!currentDataset) {
      currentDataset = {
        ...embeddedDataset,
        following: embeddedDataset.following.filter(
          (acc) => !completedNormSet.has(acc.normalizedUsername)
        ),
      };
      await saveStoredDataset(currentDataset);
    }
  }

  // Ensure any existing currentDataset has completed accounts permanently stripped from following
  if (currentDataset && completedNormSet.size > 0) {
    const filteredFollowing = currentDataset.following.filter(
      (acc) => !completedNormSet.has(acc.normalizedUsername)
    );
    if (filteredFollowing.length !== currentDataset.following.length) {
      currentDataset = {
        ...currentDataset,
        following: filteredFollowing,
      };
      await saveStoredDataset(currentDataset);
    }
  }

  return {
    dataset: currentDataset,
    primaryZip,
    persistenceInfo: {
      ...storageStats,
      recoveryPerformed,
      recoveryMessage,
      corruptionDetected,
      corruptionMessage,
    },
  };
}

/**
 * Forces re-extraction of the active dataset directly from the stored Primary ZIP Blob
 * while permanently excluding all accounts already marked as completed/unfollowed.
 */
export async function reExtractFromPrimaryZip(): Promise<{
  dataset: StoredDataset;
  primaryZip: PrimaryZipRecord;
}> {
  const primaryZip = await loadPrimaryZipRecord();
  if (!primaryZip || !primaryZip.zipBlob) {
    throw new Error('No locked Primary ZIP Blob found in IndexedDB to extract from.');
  }

  const file = new File([primaryZip.zipBlob], primaryZip.fileName, {
    type: 'application/zip',
  });
  const parsed = await parseUploadedInstagramFiles([file]);
  const completedRecords = await getAllCompletedAccounts();
  const completedNormSet = new Set(
    completedRecords.map((r) => r.normalizedUsername)
  );

  const activeFollowing = parsed.following.filter(
    (acc) => !completedNormSet.has(acc.normalizedUsername)
  );

  const updatedPrimary: PrimaryZipRecord = {
    ...primaryZip,
    followers: parsed.followers,
    following: activeFollowing,
    followersCount: parsed.followers.length,
    followingCount: activeFollowing.length,
    nonFollowersCount: countNonFollowers(parsed.followers, activeFollowing),
    extractedFiles: parsed.importedFiles,
  };
  await writePrimaryZipRecordToDb(updatedPrimary);

  const restoredDataset: StoredDataset = {
    id: 'current_dataset',
    followers: parsed.followers,
    following: activeFollowing,
    lastImportDate: primaryZip.importedAt,
    sourceLabel: `${primaryZip.fileName} (Primary ZIP)`,
    importedFiles: parsed.importedFiles,
    isEmbeddedDefault: !primaryZip.isUserUploaded,
  };

  await saveStoredDataset(restoredDataset);
  return { dataset: restoredDataset, primaryZip: updatedPrimary };
}

/**
 * Permanently removes a set of normalized usernames from the stored dataset's following list
 */
export async function permanentlyRemoveAccountsFromStoredDataset(
  normalizedUsernamesToRemove: Set<string>
): Promise<void> {
  if (normalizedUsernamesToRemove.size === 0) return;
  const existingDataset = await loadStoredDatasetRaw();
  if (existingDataset) {
    const updatedFollowing = existingDataset.following.filter(
      (acc) => !normalizedUsernamesToRemove.has(acc.normalizedUsername)
    );
    if (updatedFollowing.length !== existingDataset.following.length) {
      await saveStoredDataset({
        ...existingDataset,
        following: updatedFollowing,
      });
    }
  }
}

/**
 * COMPLETED ACCOUNTS PERSISTENCE
 */
export async function getAllCompletedAccounts(): Promise<CompletedAccountRecord[]> {
  try {
    const db = await openDatabase();
    const records = await new Promise<CompletedAccountRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_COMPLETED, 'readonly');
      const store = tx.objectStore(STORE_COMPLETED);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const mirror = safeLocalStorageGet<CompletedAccountRecord[]>(LS_KEYS.COMPLETED) || [];
    if (mirror.length > records.length) {
      const mergedMap = new Map<string, CompletedAccountRecord>();
      for (const r of [...records, ...mirror]) {
        if (r && r.normalizedUsername) {
          mergedMap.set(r.normalizedUsername, r);
        }
      }
      const merged = Array.from(mergedMap.values());
      await saveBulkCompletedAccounts(merged);
      return merged;
    }

    safeLocalStorageSet(LS_KEYS.COMPLETED, records);
    return records;
  } catch {
    return safeLocalStorageGet<CompletedAccountRecord[]>(LS_KEYS.COMPLETED) || [];
  }
}

export async function saveCompletedAccount(
  username: string,
  customDate?: Date
): Promise<CompletedAccountRecord> {
  const now = customDate || new Date();
  const normalizedUsername = normalizeUsername(username);
  const iso = now.toISOString();
  const completedDate = iso.slice(0, 10);
  const completedTime = now.toTimeString().slice(0, 8);

  const record: CompletedAccountRecord = {
    username: username.trim().replace(/^@/, '') || normalizedUsername,
    normalizedUsername,
    profileUrl: buildProfileUrl(normalizedUsername),
    completedAt: iso,
    completedDate,
    completedTime,
    status: 'completed',
  };

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_COMPLETED, 'readwrite');
      const store = tx.objectStore(STORE_COMPLETED);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback mirror below
  }

  const currentMirror = safeLocalStorageGet<CompletedAccountRecord[]>(LS_KEYS.COMPLETED) || [];
  const filtered = currentMirror.filter((r) => r.normalizedUsername !== normalizedUsername);
  filtered.push(record);
  safeLocalStorageSet(LS_KEYS.COMPLETED, filtered);

  // Permanently remove from stored dataset following list as well
  await permanentlyRemoveAccountsFromStoredDataset(new Set([normalizedUsername]));

  return record;
}

export async function saveBulkCompletedAccounts(
  records: CompletedAccountRecord[]
): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_COMPLETED, 'readwrite');
      const store = tx.objectStore(STORE_COMPLETED);
      for (const r of records) {
        if (r && r.normalizedUsername) {
          store.put(r);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback mirror
  }
  safeLocalStorageSet(LS_KEYS.COMPLETED, records);

  // Permanently remove all completed usernames from stored dataset following list
  const removeSet = new Set(
    records.map((r) => r.normalizedUsername).filter(Boolean)
  );
  await permanentlyRemoveAccountsFromStoredDataset(removeSet);
}

export async function removeCompletedAccount(normalizedUsername: string): Promise<void> {
  const norm = normalizeUsername(normalizedUsername);
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_COMPLETED, 'readwrite');
      const store = tx.objectStore(STORE_COMPLETED);
      store.delete(norm);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback mirror
  }

  const currentMirror = safeLocalStorageGet<CompletedAccountRecord[]>(LS_KEYS.COMPLETED) || [];
  safeLocalStorageSet(
    LS_KEYS.COMPLETED,
    currentMirror.filter((r) => r.normalizedUsername !== norm)
  );
}

export async function clearAllCompletedAccounts(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_COMPLETED, 'readwrite');
      const store = tx.objectStore(STORE_COMPLETED);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback mirror
  }
  safeLocalStorageSet(LS_KEYS.COMPLETED, []);
}

/**
 * DATASET PERSISTENCE
 */
async function loadStoredDatasetRaw(): Promise<StoredDataset | null> {
  try {
    const db = await openDatabase();
    const record = await new Promise<StoredDataset | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_DATASET, 'readonly');
      const store = tx.objectStore(STORE_DATASET);
      const req = store.get('current_dataset');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (record) {
      safeLocalStorageSet(LS_KEYS.DATASET, record);
      return record;
    }
  } catch {
    // Fallback mirror
  }

  return safeLocalStorageGet<StoredDataset>(LS_KEYS.DATASET);
}

export async function loadStoredDataset(): Promise<StoredDataset | null> {
  const existing = await loadStoredDatasetRaw();
  if (existing) return existing;

  const wasCleared = safeLocalStorageGet<boolean>(LS_KEYS.CLEARED_FLAG);
  if (wasCleared) return null;

  const embedded = buildEmbeddedDefaultDataset();
  await saveStoredDataset(embedded);
  return embedded;
}

export async function saveStoredDataset(dataset: StoredDataset): Promise<void> {
  safeLocalStorageSet(LS_KEYS.CLEARED_FLAG, false);
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DATASET, 'readwrite');
      const store = tx.objectStore(STORE_DATASET);
      store.put(dataset);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback mirror
  }
  safeLocalStorageSet(LS_KEYS.DATASET, dataset);
}

export async function clearStoredDataset(): Promise<void> {
  safeLocalStorageSet(LS_KEYS.CLEARED_FLAG, true);
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DATASET, 'readwrite');
      const store = tx.objectStore(STORE_DATASET);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
  try {
    localStorage.removeItem(LS_KEYS.DATASET);
  } catch {
    // Ignore
  }
}

/**
 * BATCH SESSION PERSISTENCE
 */
export async function loadBatchSession(): Promise<BatchSessionState> {
  try {
    const db = await openDatabase();
    const session = await new Promise<BatchSessionState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_BATCH, 'readonly');
      const store = tx.objectStore(STORE_BATCH);
      const req = store.get('active_batch');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (session) {
      safeLocalStorageSet(LS_KEYS.BATCH, session);
      return session;
    }
  } catch {
    // Fallback
  }

  return safeLocalStorageGet<BatchSessionState>(LS_KEYS.BATCH) || DEFAULT_BATCH_SESSION;
}

export async function saveBatchSession(session: BatchSessionState): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BATCH, 'readwrite');
      const store = tx.objectStore(STORE_BATCH);
      store.put(session);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback
  }
  safeLocalStorageSet(LS_KEYS.BATCH, session);
}

/**
 * SETTINGS PERSISTENCE
 */
export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const db = await openDatabase();
    const settings = await new Promise<AppSettings | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get('user_settings');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (settings) {
      safeLocalStorageSet(LS_KEYS.SETTINGS, settings);
      return settings;
    }
  } catch {
    // Fallback
  }

  return safeLocalStorageGet<AppSettings>(LS_KEYS.SETTINGS) || DEFAULT_SETTINGS;
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      store.put(settings);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback
  }
  safeLocalStorageSet(LS_KEYS.SETTINGS, settings);
}

/**
 * FULL DATABASE BACKUP & RESTORE (Including Locked Primary ZIP Blob!)
 */
export async function createFullDatabaseBackup(): Promise<FullDatabaseBackup> {
  const [completedAccounts, dataset, primaryZip, settings, batchSession] =
    await Promise.all([
      getAllCompletedAccounts(),
      loadStoredDatasetRaw(),
      loadPrimaryZipRecord(),
      loadAppSettings(),
      loadBatchSession(),
    ]);

  let primaryZipMetadata: PrimaryZipMetadata | null = null;
  let primaryZipBase64: string | null = null;

  if (primaryZip) {
    primaryZipMetadata = {
      id: 'primary_zip',
      fileName: primaryZip.fileName,
      importedAt: primaryZip.importedAt,
      fileSize: primaryZip.fileSize,
      isLocked: primaryZip.isLocked,
      followersCount: primaryZip.followersCount,
      followingCount: primaryZip.followingCount,
      nonFollowersCount: primaryZip.nonFollowersCount,
      extractedFiles: primaryZip.extractedFiles,
      isUserUploaded: primaryZip.isUserUploaded,
    };
    try {
      if (primaryZip.zipBlob) {
        primaryZipBase64 = await blobToBase64(primaryZip.zipBlob);
      }
    } catch {
      primaryZipBase64 = null;
    }
  }

  const backup: FullDatabaseBackup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: 'Instagram Unfollow Manager',
    completedAccounts,
    dataset,
    primaryZipMetadata,
    primaryZipBase64,
    settings,
    batchSession,
  };

  // Save lightweight snapshot to localStorage
  safeLocalStorageSet(LS_KEYS.AUTO_BACKUP, {
    ...backup,
    primaryZipBase64: null,
  });

  return backup;
}

export async function restoreFullDatabaseBackup(
  jsonString: string,
  options?: { allowReplacePrimaryZip?: boolean }
): Promise<{
  restoredCompletedCount: number;
  restoredDataset: boolean;
  restoredPrimaryZip: boolean;
}> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid backup JSON file. Could not parse JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup structure.');
  }

  const obj = parsed as Partial<FullDatabaseBackup> & {
    history?: CompletedAccountRecord[];
  };

  // Always preserve and merge all completed-unfollow records during restoration
  const recordsToRestore: CompletedAccountRecord[] = Array.isArray(obj.completedAccounts)
    ? obj.completedAccounts
    : Array.isArray(obj.history)
    ? obj.history
    : Array.isArray(parsed)
    ? (parsed as CompletedAccountRecord[])
    : [];

  const existingCompleted = await getAllCompletedAccounts();
  const mergedMap = new Map<string, CompletedAccountRecord>();

  for (const r of existingCompleted) {
    mergedMap.set(r.normalizedUsername, r);
  }

  let validRestored = 0;
  for (const item of recordsToRestore) {
    if (!item || typeof item !== 'object') continue;
    const rawUser = item.username || item.normalizedUsername || '';
    const norm = normalizeUsername(rawUser);
    if (!norm) continue;

    const nowIso = new Date().toISOString();
    const record: CompletedAccountRecord = {
      username: item.username || norm,
      normalizedUsername: norm,
      profileUrl: item.profileUrl || buildProfileUrl(norm),
      completedAt: item.completedAt || nowIso,
      completedDate:
        item.completedDate ||
        (item.completedAt ? item.completedAt.slice(0, 10) : nowIso.slice(0, 10)),
      completedTime: item.completedTime || '12:00:00',
      status: 'completed',
    };
    mergedMap.set(norm, record);
    validRestored++;
  }

  await saveBulkCompletedAccounts(Array.from(mergedMap.values()));

  let restoredDataset = false;
  if (
    obj.dataset &&
    Array.isArray(obj.dataset.followers) &&
    Array.isArray(obj.dataset.following)
  ) {
    await saveStoredDataset({
      ...obj.dataset,
      id: 'current_dataset',
    });
    restoredDataset = true;
  }

  let restoredPrimaryZip = false;
  if (obj.primaryZipMetadata && obj.primaryZipBase64) {
    try {
      const zipBlob = base64ToBlob(obj.primaryZipBase64, 'application/zip');
      const fallbackFollowers = obj.dataset?.followers || [];
      const fallbackFollowing = obj.dataset?.following || [];
      const res = await saveAndLockPrimaryZip({
        zipBlob,
        fileName: obj.primaryZipMetadata.fileName,
        followers: fallbackFollowers,
        following: fallbackFollowing,
        extractedFiles: obj.primaryZipMetadata.extractedFiles || [],
        isUserUploaded: obj.primaryZipMetadata.isUserUploaded,
        importedAt: obj.primaryZipMetadata.importedAt,
        forceAdminReplace: Boolean(options?.allowReplacePrimaryZip),
      });
      restoredPrimaryZip = res.wasLockedAsNewPrimary;
    } catch {
      restoredPrimaryZip = false;
    }
  }

  if (obj.settings && obj.settings.id === 'user_settings') {
    await saveAppSettings(obj.settings);
  }

  if (obj.batchSession && obj.batchSession.id === 'active_batch') {
    await saveBatchSession(obj.batchSession);
  }

  return {
    restoredCompletedCount: validRestored,
    restoredDataset,
    restoredPrimaryZip,
  };
}
