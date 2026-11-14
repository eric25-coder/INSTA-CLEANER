import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  Home,
  Lock,
  Menu,
  Moon,
  Search,
  Settings,
  Smartphone,
  Sun,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { AnalyticsView } from './components/AnalyticsView';
import { BatchUnfollowView } from './components/BatchUnfollowView';
import { ConnectionsDirectoryView } from './components/ConnectionsDirectoryView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { ImportExportView } from './components/ImportExportView';
import { InstaCleanerLogo } from './components/InstaCleanerLogo';
import {
  InstagramAppFallbackModal,
  InstagramAppReturnBar,
} from './components/InstagramAppIntegrationBar';
import { NonFollowersView } from './components/NonFollowersView';
import { formatBytes } from './components/PrimaryZipStorageCard';
import { SettingsView } from './components/SettingsView';
import {
  buildEmbeddedDefaultDataset,
  clearAllCompletedAccounts,
  clearStoredDataset,
  createFullDatabaseBackup,
  DEFAULT_BATCH_SESSION,
  DEFAULT_SETTINGS,
  getAllCompletedAccounts,
  initializeAndRecoverStorage,
  loadAppSettings,
  loadBatchSession,
  reExtractFromPrimaryZip,
  removeCompletedAccount,
  requestAndCheckPersistentStorage,
  restoreFullDatabaseBackup,
  saveAndLockPrimaryZip,
  saveAppSettings,
  saveBatchSession,
  saveBulkCompletedAccounts,
  saveCompletedAccount,
  saveStoredDataset,
} from './db/indexedDb';
import {
  AppSettings,
  BatchSessionState,
  BatchSizeOption,
  CompletedAccountRecord,
  InstagramAccount,
  InstagramLaunchMethod,
  NavigationTab,
  PrimaryZipRecord,
  ReconciliationSummary,
  StoragePersistenceInfo,
  StoredDataset,
} from './types/instagram';
import {
  downloadFullDatabaseBackupJson,
  exportAccountsToCsv,
  exportCompletedHistoryToCsv,
  exportCompletedHistoryToJson,
  triggerFileDownload,
} from './utils/exportHelpers';
import {
  InstagramDeepLinkSet,
  launchProfileInInstagramApp,
} from './utils/instagramAppLauncher';
import {
  generateInstagramZipArchive,
  parseUploadedInstagramFiles,
} from './utils/instagramParser';

const DEFAULT_PERSISTENCE_INFO: StoragePersistenceInfo = {
  isPersisted: false,
  usageBytes: null,
  quotaBytes: null,
  recoveryPerformed: false,
  recoveryMessage: null,
  corruptionDetected: false,
  corruptionMessage: null,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [dataset, setDataset] = useState<StoredDataset | null>(null);
  const [primaryZip, setPrimaryZip] = useState<PrimaryZipRecord | null>(null);
  const [persistenceInfo, setPersistenceInfo] =
    useState<StoragePersistenceInfo>(DEFAULT_PERSISTENCE_INFO);

  const [completedRecords, setCompletedRecords] = useState<
    CompletedAccountRecord[]
  >([]);
  const [batchSession, setBatchSession] =
    useState<BatchSessionState>(DEFAULT_BATCH_SESSION);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(
    new Set()
  );
  const [lastReconciliation, setLastReconciliation] =
    useState<ReconciliationSummary | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Top Bar Global Search, Notifications, and Account Menu State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalSearchDropdown, setShowGlobalSearchDropdown] =
    useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] =
    useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Direct Instagram Mobile App Integration State
  const [fallbackLinksModal, setFallbackLinksModal] =
    useState<InstagramDeepLinkSet | null>(null);
  const [invalidUsernameErrorModal, setInvalidUsernameErrorModal] = useState<
    string | null
  >(null);
  const [returnedFromAppRecently, setReturnedFromAppRecently] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Initial Load & Automatic Primary ZIP Recovery from IndexedDB
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [storageInit, loadedCompleted, loadedBatch, loadedSettings] =
          await Promise.all([
            initializeAndRecoverStorage(),
            getAllCompletedAccounts(),
            loadBatchSession(),
            loadAppSettings(),
          ]);

        if (!mounted) return;
        setDataset(storageInit.dataset);
        setPrimaryZip(storageInit.primaryZip);
        setPersistenceInfo(storageInit.persistenceInfo);
        setCompletedRecords(loadedCompleted);
        setBatchSession(loadedBatch);
        setSettings(loadedSettings);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Detect when user returns from the Instagram mobile app back to the manager
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (
        document.visibilityState === 'visible' &&
        batchSession.lastOpenedUsername
      ) {
        setReturnedFromAppRecently(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [batchSession.lastOpenedUsername]);

  // Build lookup sets and maps for completed accounts
  const completedMap = useMemo(() => {
    const map = new Map<string, CompletedAccountRecord>();
    for (const r of completedRecords) {
      map.set(r.normalizedUsername, r);
    }
    return map;
  }, [completedRecords]);

  const completedSet = useMemo(
    () => new Set(completedRecords.map((r) => r.normalizedUsername)),
    [completedRecords]
  );

  // Automatic Follow-Back Comparison (Mutuals, Non-Followers, Followers)
  // Permanently excludes any account marked done (completedSet) from active following and non-follower lists
  const comparison = useMemo(() => {
    const followers = dataset?.followers || [];
    const rawFollowing = dataset?.following || [];
    const following = rawFollowing.filter(
      (acc) => !completedSet.has(acc.normalizedUsername)
    );

    const followerSet = new Set(followers.map((f) => f.normalizedUsername));
    const followingSet = new Set(following.map((f) => f.normalizedUsername));

    const mutualFollowers: InstagramAccount[] = [];
    const remainingNonFollowers: InstagramAccount[] = [];

    for (const acc of following) {
      if (followerSet.has(acc.normalizedUsername)) {
        mutualFollowers.push(acc);
      } else {
        remainingNonFollowers.push(acc);
      }
    }

    const mutualSet = new Set(mutualFollowers.map((m) => m.normalizedUsername));

    const allNonFollowersInExport = remainingNonFollowers;

    const allNonFollowersMap = new Map<string, InstagramAccount>();
    for (const acc of remainingNonFollowers) {
      allNonFollowersMap.set(acc.normalizedUsername, acc);
    }

    const totalTaskPool = remainingNonFollowers.length + completedRecords.length;

    const completionPercentage =
      totalTaskPool > 0 ? (completedRecords.length / totalTaskPool) * 100 : 0;

    return {
      followers,
      following,
      followerSet,
      followingSet,
      mutualFollowers,
      mutualSet,
      allNonFollowersInExport,
      remainingNonFollowers,
      allNonFollowersMap,
      totalTaskPool,
      completionPercentage,
    };
  }, [dataset, completedSet, completedRecords.length]);

  const openedProfilesSet = useMemo(
    () => new Set(batchSession.openedProfiles || []),
    [batchSession.openedProfiles]
  );

  // Global search results across active accounts (excludes accounts marked done)
  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase().replace(/^@/, '');
    if (!q) return [];
    const seen = new Set<string>();
    const results: Array<{
      account: InstagramAccount;
      badge: string;
      badgeColor: string;
      isNonFollower: boolean;
      isCompleted: boolean;
    }> = [];

    for (const acc of comparison.remainingNonFollowers) {
      if (
        acc.normalizedUsername.includes(q) ||
        acc.username.toLowerCase().includes(q)
      ) {
        seen.add(acc.normalizedUsername);
        results.push({
          account: acc,
          badge: 'Non-Follower',
          badgeColor: 'text-pink-300 bg-pink-500/15 border-pink-500/30',
          isNonFollower: true,
          isCompleted: false,
        });
      }
      if (results.length >= 8) break;
    }

    if (results.length < 8) {
      for (const acc of comparison.mutualFollowers) {
        if (seen.has(acc.normalizedUsername)) continue;
        if (
          acc.normalizedUsername.includes(q) ||
          acc.username.toLowerCase().includes(q)
        ) {
          seen.add(acc.normalizedUsername);
          results.push({
            account: acc,
            badge: 'Mutual',
            badgeColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
            isNonFollower: false,
            isCompleted: false,
          });
        }
        if (results.length >= 8) break;
      }
    }

    return results;
  }, [
    globalSearchQuery,
    comparison.remainingNonFollowers,
    comparison.mutualFollowers,
  ]);

  // Resolve the last opened account (if still remaining) and the next remaining account
  const lastOpenedRemainingAccount: InstagramAccount | null = useMemo(() => {
    const norm = batchSession.lastOpenedUsername;
    if (!norm || completedSet.has(norm)) return null;
    return (
      comparison.allNonFollowersMap.get(norm) || {
        username: norm,
        normalizedUsername: norm,
        profileUrl: `https://www.instagram.com/${norm}/`,
      }
    );
  }, [
    batchSession.lastOpenedUsername,
    completedSet,
    comparison.allNonFollowersMap,
  ]);

  const nextRemainingAccountAfterLastOpened: InstagramAccount | null =
    useMemo(() => {
      if (comparison.remainingNonFollowers.length === 0) return null;
      if (!lastOpenedRemainingAccount) {
        return comparison.remainingNonFollowers[0] || null;
      }
      const idx = comparison.remainingNonFollowers.findIndex(
        (a) =>
          a.normalizedUsername === lastOpenedRemainingAccount.normalizedUsername
      );
      if (idx >= 0 && idx + 1 < comparison.remainingNonFollowers.length) {
        return comparison.remainingNonFollowers[idx + 1];
      }
      return (
        comparison.remainingNonFollowers.find(
          (a) =>
            a.normalizedUsername !==
            lastOpenedRemainingAccount.normalizedUsername
        ) || null
      );
    }, [comparison.remainingNonFollowers, lastOpenedRemainingAccount]);

  const totalBatchesCount = useMemo(() => {
    const poolLen =
      batchSession.queueUsernames.length > 0
        ? batchSession.queueUsernames.length
        : comparison.remainingNonFollowers.length;
    return Math.max(1, Math.ceil(poolLen / (batchSession.batchSize || 25)));
  }, [
    batchSession.batchSize,
    batchSession.queueUsernames.length,
    comparison.remainingNonFollowers.length,
  ]);

  /**
   * Direct Instagram Mobile App Launcher Handler
   */
  const handleOpenInInstagramApp = useCallback(
    async (account: InstagramAccount) => {
      const norm = account.normalizedUsername;
      const nowIso = new Date().toISOString();

      const updatedOpened = openedProfilesSet.has(norm)
        ? batchSession.openedProfiles
        : [...(batchSession.openedProfiles || []), norm];

      const updatedSession: BatchSessionState = {
        ...batchSession,
        currentPointerNormalized: norm,
        lastOpenedUsername: norm,
        lastOpenedAt: nowIso,
        openedProfiles: updatedOpened,
      };
      setBatchSession(updatedSession);
      await saveBatchSession(updatedSession);
      setReturnedFromAppRecently(false);

      launchProfileInInstagramApp({
        username: account.username,
        preferredMethod: settings.instagramLaunchMethod || 'auto-native',
        onLaunched: () => {
          showToast(`Opening @${account.username} in Instagram App...`);
        },
        onInvalidUsername: (err) => {
          setInvalidUsernameErrorModal(err);
        },
        onAppNotDetected: (links) => {
          setFallbackLinksModal(links);
        },
      });
    },
    [batchSession, openedProfilesSet, settings.instagramLaunchMethod, showToast]
  );

  // Skip an account in the current session
  const handleSkipAccount = useCallback(
    async (normalizedUsername: string) => {
      const existingSkipped = new Set(batchSession.skippedProfiles || []);
      existingSkipped.add(normalizedUsername);
      const updatedSession: BatchSessionState = {
        ...batchSession,
        skippedProfiles: Array.from(existingSkipped),
      };
      setBatchSession(updatedSession);
      await saveBatchSession(updatedSession);
      showToast(`Skipped @${normalizedUsername} for now.`);
    },
    [batchSession, showToast]
  );

  // Mark a single account as completed (unfollowed) and permanently remove it from active lists
  const handleMarkAccountCompleted = useCallback(
    async (account: InstagramAccount) => {
      const savedRecord = await saveCompletedAccount(account.username);
      const removedNorm = savedRecord.normalizedUsername;

      // Permanently remove from active dataset in state and IndexedDB
      setDataset((prev) => {
        if (!prev) return prev;
        const updatedFollowing = prev.following.filter(
          (acc) => acc.normalizedUsername !== removedNorm
        );
        const updatedDataset: StoredDataset = {
          ...prev,
          following: updatedFollowing,
        };
        saveStoredDataset(updatedDataset);
        return updatedDataset;
      });

      setCompletedRecords((prev) => {
        const filtered = prev.filter((r) => r.normalizedUsername !== removedNorm);
        return [savedRecord, ...filtered];
      });

      setSelectedUsernames((prev) => {
        if (!prev.has(removedNorm)) return prev;
        const next = new Set(prev);
        next.delete(removedNorm);
        return next;
      });

      const nextCompletedSet = new Set(completedSet);
      nextCompletedSet.add(removedNorm);

      // Permanently remove the completed account from the batch queue as well
      const baseQueue =
        batchSession.queueUsernames.length > 0
          ? batchSession.queueUsernames
          : comparison.remainingNonFollowers.map((a) => a.normalizedUsername);

      const activeQueue = baseQueue.filter(
        (u) => u !== removedNorm && !nextCompletedSet.has(u)
      );

      const size = batchSession.batchSize || settings.defaultBatchSize;
      const totalBatches = Math.max(1, Math.ceil(activeQueue.length / size));
      const nextBatchIndex = Math.min(
        batchSession.currentBatchIndex,
        totalBatches - 1
      );
      const batchStart = nextBatchIndex * size;
      const currentBatchSlice = activeQueue.slice(
        batchStart,
        batchStart + size
      );

      const nextPointer: string | null =
        currentBatchSlice[0] || activeQueue[0] || null;

      const updatedSession: BatchSessionState = {
        ...batchSession,
        queueUsernames: activeQueue,
        currentBatchIndex: nextBatchIndex,
        currentPointerNormalized: nextPointer,
        lastOpenedUsername:
          batchSession.lastOpenedUsername === removedNorm
            ? nextPointer
            : batchSession.lastOpenedUsername,
        openedProfiles: (batchSession.openedProfiles || []).filter(
          (u) => u !== removedNorm
        ),
        skippedProfiles: (batchSession.skippedProfiles || []).filter(
          (u) => u !== removedNorm
        ),
        status: nextPointer ? 'running' : 'completed',
        undoStack: [...batchSession.undoStack, savedRecord],
      };

      setBatchSession(updatedSession);
      await saveBatchSession(updatedSession);
      setReturnedFromAppRecently(false);

      if (settings.autoBackup) {
        const nowIso = new Date().toISOString();
        const updatedSettings = { ...settings, lastAutoBackupAt: nowIso };
        setSettings(updatedSettings);
        await saveAppSettings(updatedSettings);
        await createFullDatabaseBackup();
      }

      showToast(
        `Permanently removed @${account.username} from your active unfollow list.`
      );
    },
    [
      batchSession,
      comparison.remainingNonFollowers,
      completedSet,
      settings,
      showToast,
    ]
  );

  const handleMarkAndOpenNextInApp = useCallback(
    async (
      completedAccount: InstagramAccount,
      nextAccount: InstagramAccount | null
    ) => {
      await handleMarkAccountCompleted(completedAccount);
      if (nextAccount) {
        await handleOpenInInstagramApp(nextAccount);
      }
    },
    [handleMarkAccountCompleted, handleOpenInInstagramApp]
  );

  // Mark multiple selected accounts as completed and permanently remove them from active lists
  const handleMarkBulkCompleted = useCallback(
    async (accounts: InstagramAccount[]) => {
      if (accounts.length === 0) return;
      const now = new Date();
      const iso = now.toISOString();
      const dateStr = iso.slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8);

      const newRecords: CompletedAccountRecord[] = accounts.map((acc) => ({
        username: acc.username,
        normalizedUsername: acc.normalizedUsername,
        profileUrl: acc.profileUrl,
        completedAt: iso,
        completedDate: dateStr,
        completedTime: timeStr,
        status: 'completed',
      }));

      const removedSet = new Set(accounts.map((a) => a.normalizedUsername));

      // Permanently remove from active dataset in state and IndexedDB
      setDataset((prev) => {
        if (!prev) return prev;
        const updatedFollowing = prev.following.filter(
          (acc) => !removedSet.has(acc.normalizedUsername)
        );
        const updatedDataset: StoredDataset = {
          ...prev,
          following: updatedFollowing,
        };
        saveStoredDataset(updatedDataset);
        return updatedDataset;
      });

      const mergedMap = new Map<string, CompletedAccountRecord>(completedMap);
      for (const r of newRecords) {
        mergedMap.set(r.normalizedUsername, r);
      }

      const mergedArray = Array.from(mergedMap.values());
      await saveBulkCompletedAccounts(mergedArray);
      setCompletedRecords(mergedArray);
      setSelectedUsernames(new Set());

      // Remove from active batch queue
      const updatedQueue = batchSession.queueUsernames.filter(
        (u) => !removedSet.has(u)
      );
      const updatedBatch: BatchSessionState = {
        ...batchSession,
        queueUsernames: updatedQueue,
        currentPointerNormalized: updatedQueue[0] || null,
      };
      setBatchSession(updatedBatch);
      await saveBatchSession(updatedBatch);

      if (settings.autoBackup) {
        await createFullDatabaseBackup();
      }
      showToast(
        `Permanently removed ${accounts.length} accounts from your active list.`
      );
    },
    [batchSession, completedMap, settings.autoBackup, showToast]
  );

  // Restore / Undo a completed account back to the remaining list
  const handleRestoreCompletedAccount = useCallback(
    async (normalizedUsername: string) => {
      await removeCompletedAccount(normalizedUsername);
      setCompletedRecords((prev) =>
        prev.filter((r) => r.normalizedUsername !== normalizedUsername)
      );

      const updatedSession: BatchSessionState = {
        ...batchSession,
        currentPointerNormalized: normalizedUsername,
        undoStack: batchSession.undoStack.filter(
          (u) => u.normalizedUsername !== normalizedUsername
        ),
      };
      setBatchSession(updatedSession);
      await saveBatchSession(updatedSession);

      showToast(`Restored @${normalizedUsername} to Remaining Non-Followers.`);
    },
    [batchSession, showToast]
  );

  const handleUndoLastBatchCompletion = useCallback(async () => {
    if (batchSession.undoStack.length === 0) return;
    const lastRecord = batchSession.undoStack[batchSession.undoStack.length - 1];
    await handleRestoreCompletedAccount(lastRecord.normalizedUsername);
  }, [batchSession.undoStack, handleRestoreCompletedAccount]);

  // Selection Handlers
  const handleToggleSelectAccount = useCallback((normalizedUsername: string) => {
    setSelectedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedUsername)) {
        next.delete(normalizedUsername);
      } else {
        next.add(normalizedUsername);
      }
      return next;
    });
  }, []);

  const handleSelectMultipleAccounts = useCallback(
    (normalizedUsernames: string[]) => {
      setSelectedUsernames((prev) => {
        const next = new Set(prev);
        for (const u of normalizedUsernames) {
          next.add(u);
        }
        return next;
      });
    },
    []
  );

  const handleClearSelection = useCallback(() => {
    setSelectedUsernames(new Set());
  }, []);

  // Batch Manager Controls
  const handleChangeBatchSize = useCallback(
    async (size: BatchSizeOption) => {
      const updatedSession: BatchSessionState = {
        ...batchSession,
        batchSize: size,
        currentBatchIndex: 0,
      };
      setBatchSession(updatedSession);
      await saveBatchSession(updatedSession);

      const updatedSettings: AppSettings = {
        ...settings,
        defaultBatchSize: size,
      };
      setSettings(updatedSettings);
      await saveAppSettings(updatedSettings);
    },
    [batchSession, settings]
  );

  const handleStartBatch = useCallback(
    async (useSelectedOnly: boolean) => {
      const pool =
        useSelectedOnly && selectedUsernames.size > 0
          ? comparison.remainingNonFollowers
              .filter((a) => selectedUsernames.has(a.normalizedUsername))
              .map((a) => a.normalizedUsername)
          : comparison.remainingNonFollowers.map((a) => a.normalizedUsername);

      const newSession: BatchSessionState = {
        ...batchSession,
        queueUsernames: pool,
        currentBatchIndex: 0,
        currentPointerNormalized: pool[0] || null,
        status: pool.length > 0 ? 'running' : 'completed',
        startedAt: new Date().toISOString(),
      };
      setBatchSession(newSession);
      await saveBatchSession(newSession);
      setActiveTab('batch');
    },
    [batchSession, comparison.remainingNonFollowers, selectedUsernames]
  );

  const handlePauseBatch = useCallback(async () => {
    const updated: BatchSessionState = { ...batchSession, status: 'paused' };
    setBatchSession(updated);
    await saveBatchSession(updated);
  }, [batchSession]);

  const handleResumeBatch = useCallback(async () => {
    const updated: BatchSessionState = { ...batchSession, status: 'running' };
    setBatchSession(updated);
    await saveBatchSession(updated);
  }, [batchSession]);

  const handleNextBatch = useCallback(async () => {
    const activeQueue =
      batchSession.queueUsernames.length > 0
        ? batchSession.queueUsernames
        : comparison.remainingNonFollowers.map((a) => a.normalizedUsername);
    const totalBatches = Math.max(
      1,
      Math.ceil(activeQueue.length / batchSession.batchSize)
    );
    const nextIdx = Math.min(
      batchSession.currentBatchIndex + 1,
      totalBatches - 1
    );
    const slice = activeQueue.slice(
      nextIdx * batchSession.batchSize,
      (nextIdx + 1) * batchSession.batchSize
    );
    const firstRemaining = slice.find((u) => !completedSet.has(u)) || null;

    const updated: BatchSessionState = {
      ...batchSession,
      queueUsernames: activeQueue,
      currentBatchIndex: nextIdx,
      currentPointerNormalized: firstRemaining,
    };
    setBatchSession(updated);
    await saveBatchSession(updated);
  }, [batchSession, comparison.remainingNonFollowers, completedSet]);

  const handlePrevBatch = useCallback(async () => {
    const activeQueue =
      batchSession.queueUsernames.length > 0
        ? batchSession.queueUsernames
        : comparison.remainingNonFollowers.map((a) => a.normalizedUsername);
    const prevIdx = Math.max(0, batchSession.currentBatchIndex - 1);
    const slice = activeQueue.slice(
      prevIdx * batchSession.batchSize,
      (prevIdx + 1) * batchSession.batchSize
    );
    const firstRemaining = slice.find((u) => !completedSet.has(u)) || null;

    const updated: BatchSessionState = {
      ...batchSession,
      queueUsernames: activeQueue,
      currentBatchIndex: prevIdx,
      currentPointerNormalized: firstRemaining,
    };
    setBatchSession(updated);
    await saveBatchSession(updated);
  }, [batchSession, comparison.remainingNonFollowers, completedSet]);

  /**
   * Import & Automatic Reconciliation Handler (With Permanent Primary ZIP Lock Protection!)
   */
  const handleImportFiles = useCallback(
    async (files: File[]) => {
      const previousFollowersCount = dataset?.followers.length || 0;
      const previousFollowingCount = dataset?.following.length || 0;

      const parsed = await parseUploadedInstagramFiles(
        files,
        dataset || undefined
      );
      const nowIso = new Date().toISOString();

      const uploadedZipFile = files.find((f) =>
        f.name.toLowerCase().endsWith('.zip')
      );

      const isAlreadyUserLocked = Boolean(
        primaryZip?.isLocked && primaryZip?.isUserUploaded
      );

      let wasLockedAsNewPrimary = false;
      if (!isAlreadyUserLocked) {
        const zipBlobToSave = uploadedZipFile
          ? new Blob([await uploadedZipFile.arrayBuffer()], {
              type: 'application/zip',
            })
          : await generateInstagramZipArchive(
              parsed.followers,
              parsed.following
            );

        const lockResult = await saveAndLockPrimaryZip({
          zipBlob: zipBlobToSave,
          fileName: uploadedZipFile
            ? uploadedZipFile.name
            : `${parsed.sourceLabel}.zip`,
          followers: parsed.followers,
          following: parsed.following,
          extractedFiles: parsed.importedFiles,
          isUserUploaded: true,
          importedAt: nowIso,
          forceAdminReplace: false,
        });

        setPrimaryZip(lockResult.record);
        wasLockedAsNewPrimary = lockResult.wasLockedAsNewPrimary;
      }

      const updatedPersistence = await requestAndCheckPersistentStorage();
      setPersistenceInfo((prev) => ({
        ...prev,
        ...updatedPersistence,
        corruptionDetected: false,
        corruptionMessage: null,
      }));

      const activeFollowingList = parsed.following.filter(
        (acc) => !completedSet.has(acc.normalizedUsername)
      );

      const newDataset: StoredDataset = {
        id: 'current_dataset',
        followers: parsed.followers,
        following: activeFollowingList,
        lastImportDate: nowIso,
        sourceLabel: wasLockedAsNewPrimary
          ? `${parsed.sourceLabel} (Primary Locked)`
          : `${parsed.sourceLabel} (Update Dataset)`,
        importedFiles: parsed.importedFiles,
        isEmbeddedDefault: false,
      };

      await saveStoredDataset(newDataset);
      setDataset(newDataset);

      const followerSet = new Set(
        parsed.followers.map((f) => f.normalizedUsername)
      );
      const nonFollowersInNewExport = parsed.following.filter(
        (acc) => !followerSet.has(acc.normalizedUsername)
      );
      const mutualsInNewExport = activeFollowingList.filter((acc) =>
        followerSet.has(acc.normalizedUsername)
      );

      const alreadyCompletedRecognized = nonFollowersInNewExport.filter((acc) =>
        completedSet.has(acc.normalizedUsername)
      ).length;

      const outstandingRemainingList = nonFollowersInNewExport.filter(
        (acc) => !completedSet.has(acc.normalizedUsername)
      );

      const summary: ReconciliationSummary = {
        importedAt: nowIso,
        sourceLabel: parsed.sourceLabel,
        isPrimaryLockInitial: wasLockedAsNewPrimary,
        keptOriginalPrimaryLocked: !wasLockedAsNewPrimary,
        totalFollowers: parsed.followers.length,
        totalFollowing: activeFollowingList.length,
        followersDelta: parsed.followers.length - previousFollowersCount,
        followingDelta: activeFollowingList.length - previousFollowingCount,
        totalMutuals: mutualsInNewExport.length,
        totalNonFollowersInExport: nonFollowersInNewExport.length,
        alreadyCompletedRecognized,
        outstandingRemaining: outstandingRemainingList.length,
      };

      setLastReconciliation(summary);

      const updatedBatch: BatchSessionState = {
        ...batchSession,
        queueUsernames: outstandingRemainingList.map(
          (a) => a.normalizedUsername
        ),
        currentBatchIndex: 0,
        currentPointerNormalized:
          outstandingRemainingList[0]?.normalizedUsername || null,
      };
      setBatchSession(updatedBatch);
      await saveBatchSession(updatedBatch);

      if (wasLockedAsNewPrimary) {
        showToast(
          `PRIMARY ZIP SAVED – LOCKED: "${parsed.sourceLabel}" saved permanently.`
        );
      } else {
        showToast(
          `Update Reconciled: ${outstandingRemainingList.length} remaining (${alreadyCompletedRecognized} completed excluded). Primary ZIP untouched.`
        );
      }
    },
    [batchSession, completedSet, dataset, primaryZip, showToast]
  );

  const handleAdminReplacePrimaryZip = useCallback(
    async (file: File) => {
      const parsed = await parseUploadedInstagramFiles([file]);
      const nowIso = new Date().toISOString();
      const zipBlob = new Blob([await file.arrayBuffer()], {
        type: 'application/zip',
      });

      const activeFollowingList = parsed.following.filter(
        (acc) => !completedSet.has(acc.normalizedUsername)
      );

      const lockRes = await saveAndLockPrimaryZip({
        zipBlob,
        fileName: file.name,
        followers: parsed.followers,
        following: activeFollowingList,
        extractedFiles: parsed.importedFiles,
        isUserUploaded: true,
        importedAt: nowIso,
        forceAdminReplace: true,
      });

      setPrimaryZip(lockRes.record);

      const newDataset: StoredDataset = {
        id: 'current_dataset',
        followers: parsed.followers,
        following: activeFollowingList,
        lastImportDate: nowIso,
        sourceLabel: `${file.name} (Primary Locked)`,
        importedFiles: parsed.importedFiles,
        isEmbeddedDefault: false,
      };
      await saveStoredDataset(newDataset);
      setDataset(newDataset);

      const updatedPersistence = await requestAndCheckPersistentStorage();
      setPersistenceInfo((prev) => ({
        ...prev,
        ...updatedPersistence,
        corruptionDetected: false,
        corruptionMessage: null,
      }));

      showToast(
        `Administrator Override: Replaced and locked Primary ZIP with "${file.name}".`
      );
    },
    [completedSet, showToast]
  );

  const handleReExtractFromPrimaryZip = useCallback(async () => {
    const res = await reExtractFromPrimaryZip();
    setDataset(res.dataset);
    setPrimaryZip(res.primaryZip);
    setPersistenceInfo((prev) => ({
      ...prev,
      recoveryPerformed: true,
      recoveryMessage: `Re-extracted ${res.dataset.followers.length} followers and ${res.dataset.following.length} following accounts from locked Primary ZIP ("${res.primaryZip.fileName}").`,
      corruptionDetected: false,
      corruptionMessage: null,
    }));
    showToast(
      `Re-extracted dataset from locked Primary ZIP ("${res.primaryZip.fileName}").`
    );
  }, [showToast]);

  const handleDownloadOriginalPrimaryZip = useCallback(() => {
    if (!primaryZip || !primaryZip.zipBlob) return;
    triggerFileDownload(
      primaryZip.zipBlob,
      primaryZip.fileName || 'primary_instagram_export.zip',
      'application/zip'
    );
  }, [primaryZip]);

  // Settings & Database Management Handlers
  const handleUpdateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      const updated: AppSettings = { ...settings, ...partial };
      setSettings(updated);
      await saveAppSettings(updated);

      if (
        partial.defaultBatchSize &&
        partial.defaultBatchSize !== batchSession.batchSize
      ) {
        const updatedBatch: BatchSessionState = {
          ...batchSession,
          batchSize: partial.defaultBatchSize,
          currentBatchIndex: 0,
        };
        setBatchSession(updatedBatch);
        await saveBatchSession(updatedBatch);
      }
    },
    [batchSession, settings]
  );

  const handleReloadEmbeddedDataset = useCallback(async () => {
    const embedded = buildEmbeddedDefaultDataset();
    embedded.lastImportDate = new Date().toISOString();
    await saveStoredDataset(embedded);
    setDataset(embedded);
    showToast('Loaded embedded Instagram ZIP dataset.');
  }, [showToast]);

  const handleClearAllHistory = useCallback(async () => {
    await clearAllCompletedAccounts();
    setCompletedRecords([]);
    const updatedBatch: BatchSessionState = {
      ...batchSession,
      undoStack: [],
      queueUsernames: [],
      currentBatchIndex: 0,
    };
    setBatchSession(updatedBatch);
    await saveBatchSession(updatedBatch);
    showToast('Cleared all completed unfollow history.');
  }, [batchSession, showToast]);

  const handleClearImportedInstagramData = useCallback(async () => {
    await clearStoredDataset();
    setDataset(null);
    setSelectedUsernames(new Set());
    showToast(
      'Cleared active comparison lists. Locked Primary ZIP & completion history kept.'
    );
  }, [showToast]);

  const handleRestoreDatabaseFromFile = useCallback(
    async (file: File, allowReplacePrimaryZip = false) => {
      const text = await file.text();
      await restoreFullDatabaseBackup(text, { allowReplacePrimaryZip });
      const [storageInit, reloadedCompleted, reloadedBatch, reloadedSettings] =
        await Promise.all([
          initializeAndRecoverStorage(),
          getAllCompletedAccounts(),
          loadBatchSession(),
          loadAppSettings(),
        ]);
      setDataset(storageInit.dataset);
      setPrimaryZip(storageInit.primaryZip);
      setPersistenceInfo(storageInit.persistenceInfo);
      setCompletedRecords(reloadedCompleted);
      setBatchSession(reloadedBatch);
      setSettings(reloadedSettings);
      showToast(
        'Restored database and preserved all completed-unfollow records.'
      );
    },
    [showToast]
  );

  // All 9 Navigation Items matching the template & specification
  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    {
      id: 'non-followers',
      label: 'Non-Followers',
      icon: UserMinus,
      count: comparison.remainingNonFollowers.length,
    },
    {
      id: 'following',
      label: 'Following',
      icon: UserPlus,
      count: comparison.following.length,
    },
    {
      id: 'followers',
      label: 'Followers',
      icon: Users,
      count: comparison.followers.length,
    },
    { id: 'batch', label: 'Unfollow Manager', icon: Zap },
    {
      id: 'history',
      label: 'Completed Accounts',
      icon: CheckCircle2,
      count: completedRecords.length,
    },
    { id: 'import', label: 'Import & Data', icon: Database },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const primaryZipSinceDate = useMemo(() => {
    if (!primaryZip?.importedAt) return 'Nov 14, 2026';
    return new Date(primaryZip.importedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [primaryZip?.importedAt]);

  const storageSizeDisplay = useMemo(() => {
    if (persistenceInfo.usageBytes && persistenceInfo.usageBytes > 0) {
      return formatBytes(persistenceInfo.usageBytes).split(' (')[0];
    }
    if (primaryZip?.fileSize) {
      return formatBytes(primaryZip.fileSize).split(' (')[0];
    }
    return 'Local IndexedDB';
  }, [persistenceInfo.usageBytes, primaryZip?.fileSize]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="animate-pulse mx-auto flex items-center justify-center">
            <InstaCleanerLogo size="lg" />
          </div>
          <div className="text-sm font-semibold text-white">
            Loading INSTA CLEANER & Locked Primary ZIP...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B1020] text-slate-900 dark:text-white">
      {/* Left Fixed Vertical Navigation Panel (Matches Attached Reference Image) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[250px] shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#11182B] transform transition-transform duration-200 lg:translate-x-0 flex flex-col justify-between ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand + Navigation Links */}
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Brand Logo & Name: INSTA CLEANER — Following Manager */}
          <div className="flex items-center justify-between px-1.5 pt-1">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 text-left cursor-pointer group"
            >
              <InstaCleanerLogo
                size="md"
                className="group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="text-base font-extrabold tracking-wide leading-tight text-slate-900 dark:text-white">
                  INSTA
                  <br />
                  CLEANER
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-[#9CA3AF] mt-0.5">
                  Following Manager
                </div>
              </div>
            </button>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 9 Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-semibold shadow-md shadow-violet-950/50'
                      : 'text-slate-600 dark:text-[#9CA3AF] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 dark:text-[#9CA3AF]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.count === 'number' && (
                    <span
                      className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-white/20 text-white font-bold'
                          : 'text-slate-500 dark:text-[#9CA3AF]'
                      }`}
                    >
                      {item.count.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Section: Primary ZIP Locked Card, Storage & Version, My Account */}
        <div className="p-4 space-y-3 border-t border-slate-200 dark:border-white/5">
          {/* Primary ZIP Locked Status Card */}
          <button
            onClick={() => {
              setActiveTab('import');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/30 transition-colors flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-emerald-400 truncate">
                Primary ZIP Locked
              </div>
              <div className="text-[11px] text-slate-500 dark:text-[#9CA3AF] truncate">
                Since: {primaryZipSinceDate}
              </div>
            </div>
          </button>

          {/* Storage Status & Application Version */}
          <div className="px-2 space-y-0.5 text-xs text-slate-500 dark:text-[#9CA3AF]">
            <div className="font-medium text-slate-700 dark:text-slate-300">
              Storage: {storageSizeDisplay}
            </div>
            <div className="font-mono text-[11px]">v3.0.0</div>
          </div>

          {/* User Profile / Settings Menu */}
          <div className="relative">
            <button
              onClick={() => setShowAccountMenu((v) => !v)}
              className="w-full p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-[#171F35] hover:bg-slate-200/70 dark:hover:bg-[#1E2946] transition-colors flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-white shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  My Account
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {showAccountMenu && (
              <div className="absolute bottom-14 left-0 right-0 rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#171F35] p-2 shadow-2xl space-y-1 z-50">
                <button
                  onClick={() => {
                    setActiveTab('import');
                    setShowAccountMenu(false);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-violet-500/15 flex items-center gap-2 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-violet-400" />
                  <span>Primary ZIP & Storage</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setShowAccountMenu(false);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-violet-500/15 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-pink-400" />
                  <span>Application Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Right Column: Top Navigation Bar + Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar (Matches Reference Image: Global Search, All Data Saved, Notifications, Theme Toggle) */}
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0B1020]/90 backdrop-blur-md flex items-center justify-between gap-4">
          {/* Left: Mobile Menu Button + Global Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#171F35] border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Input with Live Results Popover */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalSearchQuery}
                onFocus={() => setShowGlobalSearchDropdown(true)}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  setShowGlobalSearchDropdown(true);
                }}
                placeholder="Search usernames..."
                className="w-full pl-11 pr-9 py-2 rounded-full text-sm bg-slate-100 dark:bg-[#171F35] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
              />
              {globalSearchQuery && (
                <button
                  onClick={() => {
                    setGlobalSearchQuery('');
                    setShowGlobalSearchDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Global Search Dropdown */}
              {showGlobalSearchDropdown && globalSearchQuery.trim() !== '' && (
                <div className="absolute left-0 right-0 top-12 rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#171F35] shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Global Search Results ({globalSearchResults.length})
                    </span>
                    <button
                      onClick={() => setShowGlobalSearchDropdown(false)}
                      className="text-violet-400 hover:underline cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  {globalSearchResults.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 text-center">
                      No accounts matching "{globalSearchQuery}"
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-white/5 max-h-80 overflow-y-auto">
                      {globalSearchResults.map((item) => (
                        <div
                          key={item.account.normalizedUsername}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#1E2946]/60"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                              @{item.account.username}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.badgeColor}`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                handleOpenInInstagramApp(item.account);
                                setShowGlobalSearchDropdown(false);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 cursor-pointer"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>Open in App</span>
                            </button>
                            {item.isNonFollower && !item.isCompleted && (
                              <button
                                onClick={() => {
                                  handleMarkAccountCompleted(item.account);
                                  setShowGlobalSearchDropdown(false);
                                }}
                                className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                                title="Mark as Unfollowed"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Data Synchronization Status, Notifications, Theme Toggle */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            {/* All Data Saved Status Indicator */}
            <button
              onClick={() => setActiveTab('import')}
              className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-400 transition-colors cursor-pointer"
              title="IndexedDB & Primary ZIP Locked"
            >
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
              </span>
              <span>All Data Saved</span>
            </button>

            <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-white/10" />

            {/* Notifications Bell Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsPopover((v) => !v)}
                aria-label="Notifications"
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  2
                </span>
              </button>

              {showNotificationsPopover && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#171F35] p-4 shadow-2xl space-y-3 z-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      System & Storage Notifications
                    </span>
                    <button
                      onClick={() => setShowNotificationsPopover(false)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      <div className="font-bold">Primary ZIP Saved – Locked</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {primaryZip?.fileName || 'connections_export.zip'} is safely stored in IndexedDB.
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300">
                      <div className="font-bold">
                        {comparison.remainingNonFollowers.length.toLocaleString()} Non-Followers Remaining
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {completedRecords.length.toLocaleString()} accounts permanently marked as unfollowed.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-white/10" />

            {/* Theme Switcher Button */}
            <button
              onClick={() =>
                handleUpdateSettings({
                  theme: settings.theme === 'dark' ? 'light' : 'dark',
                })
              }
              aria-label="Toggle Light/Dark Theme"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title={
                settings.theme === 'dark'
                  ? 'Switch to Light Mode'
                  : 'Switch to Dark Mode'
              }
            >
              {settings.theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1440px] w-full mx-auto">
          {/* Persistent Return-from-Instagram-App Bar when an account was opened */}
          <InstagramAppReturnBar
            lastOpenedAccount={lastOpenedRemainingAccount}
            nextRemainingAccount={nextRemainingAccountAfterLastOpened}
            currentBatchNumber={batchSession.currentBatchIndex + 1}
            totalBatches={totalBatchesCount}
            returnedFromAppRecently={returnedFromAppRecently}
            onMarkLastOpenedUnfollowed={handleMarkAccountCompleted}
            onMarkAndOpenNextInApp={handleMarkAndOpenNextInApp}
            onAdvanceToNextAccount={async () => {
              if (!nextRemainingAccountAfterLastOpened) return;
              const nextNorm =
                nextRemainingAccountAfterLastOpened.normalizedUsername;
              const updated: BatchSessionState = {
                ...batchSession,
                currentPointerNormalized: nextNorm,
                lastOpenedUsername: nextNorm,
              };
              setBatchSession(updated);
              await saveBatchSession(updated);
              setReturnedFromAppRecently(false);
            }}
            onReopenInInstagramApp={handleOpenInInstagramApp}
            onDismissBar={async () => {
              const updated: BatchSessionState = {
                ...batchSession,
                lastOpenedUsername: null,
              };
              setBatchSession(updated);
              await saveBatchSession(updated);
              setReturnedFromAppRecently(false);
            }}
          />

          {activeTab === 'dashboard' && (
            <DashboardView
              dataset={dataset}
              primaryZip={primaryZip}
              persistenceInfo={persistenceInfo}
              totalFollowing={comparison.following.length}
              totalFollowers={comparison.followers.length}
              totalMutuals={comparison.mutualFollowers.length}
              totalNonFollowersIdentified={
                comparison.allNonFollowersInExport.length
              }
              totalCompletedCount={completedRecords.length}
              remainingNonFollowers={comparison.remainingNonFollowers}
              completionPercentage={comparison.completionPercentage}
              recentCompletions={completedRecords}
              lastReconciliation={lastReconciliation}
              selectedUsernames={selectedUsernames}
              onToggleSelectAccount={handleToggleSelectAccount}
              onMarkCompleted={handleMarkAccountCompleted}
              onNavigate={setActiveTab}
              onStartQuickBatch={() => handleStartBatch(false)}
              onOpenInInstagramApp={handleOpenInInstagramApp}
              openedProfilesSet={openedProfilesSet}
            />
          )}

          {activeTab === 'non-followers' && (
            <NonFollowersView
              allNonFollowers={comparison.allNonFollowersInExport}
              remainingNonFollowers={comparison.remainingNonFollowers}
              completedSet={completedSet}
              completedMap={completedMap}
              selectedUsernames={selectedUsernames}
              hideCompletedAccounts={settings.hideCompletedAccounts}
              openedProfilesSet={openedProfilesSet}
              onToggleSelectAccount={handleToggleSelectAccount}
              onSelectMultipleAccounts={handleSelectMultipleAccounts}
              onClearSelection={handleClearSelection}
              onToggleHideCompleted={(hide) =>
                handleUpdateSettings({ hideCompletedAccounts: hide })
              }
              onMarkCompleted={handleMarkAccountCompleted}
              onMarkBulkCompleted={handleMarkBulkCompleted}
              onUndoCompleted={handleRestoreCompletedAccount}
              onStartBatchWithSelected={() => handleStartBatch(true)}
              onOpenInInstagramApp={handleOpenInInstagramApp}
              onExportRemainingCsv={() =>
                exportAccountsToCsv(
                  comparison.remainingNonFollowers,
                  completedSet,
                  completedMap,
                  'instagram_remaining_non_followers'
                )
              }
              onExportAllNonFollowersCsv={() =>
                exportAccountsToCsv(
                  comparison.allNonFollowersInExport,
                  completedSet,
                  completedMap,
                  'instagram_all_non_followers'
                )
              }
            />
          )}

          {activeTab === 'following' && (
            <ConnectionsDirectoryView
              mode="following"
              accounts={comparison.following}
              mutualSet={comparison.mutualSet}
              completedSet={completedSet}
              completedMap={completedMap}
              openedProfilesSet={openedProfilesSet}
              onOpenInInstagramApp={handleOpenInInstagramApp}
              onMarkCompleted={handleMarkAccountCompleted}
            />
          )}

          {activeTab === 'followers' && (
            <ConnectionsDirectoryView
              mode="followers"
              accounts={comparison.followers}
              mutualSet={comparison.mutualSet}
              completedSet={completedSet}
              completedMap={completedMap}
              openedProfilesSet={openedProfilesSet}
              onOpenInInstagramApp={handleOpenInInstagramApp}
            />
          )}

          {activeTab === 'batch' && (
            <BatchUnfollowView
              batchSession={batchSession}
              allNonFollowersMap={comparison.allNonFollowersMap}
              remainingNonFollowers={comparison.remainingNonFollowers}
              selectedUsernames={selectedUsernames}
              completedSet={completedSet}
              overallCompletionPercentage={comparison.completionPercentage}
              openedProfilesSet={openedProfilesSet}
              onChangeBatchSize={handleChangeBatchSize}
              onStartBatch={handleStartBatch}
              onPauseBatch={handlePauseBatch}
              onResumeBatch={handleResumeBatch}
              onNextBatch={handleNextBatch}
              onPrevBatch={handlePrevBatch}
              onSelectTargetInBatch={async (norm) => {
                const updated: BatchSessionState = {
                  ...batchSession,
                  currentPointerNormalized: norm,
                };
                setBatchSession(updated);
                await saveBatchSession(updated);
              }}
              onSkipAccount={handleSkipAccount}
              onOpenInInstagramApp={handleOpenInInstagramApp}
              onMarkTargetUnfollowed={handleMarkAccountCompleted}
              onMarkAndOpenNextInApp={handleMarkAndOpenNextInApp}
              onUndoLastBatchCompletion={handleUndoLastBatchCompletion}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              completedRecords={completedRecords}
              onRestoreAccount={handleRestoreCompletedAccount}
              onClearAllHistory={handleClearAllHistory}
              onExportHistoryCsv={() =>
                exportCompletedHistoryToCsv(completedRecords)
              }
              onExportHistoryJson={() =>
                exportCompletedHistoryToJson(completedRecords)
              }
              onRestoreHistoryFromFile={(file) =>
                handleRestoreDatabaseFromFile(file, false)
              }
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              totalIdentified={comparison.totalTaskPool}
              totalCompleted={completedRecords.length}
              totalRemaining={comparison.remainingNonFollowers.length}
              completionPercentage={comparison.completionPercentage}
              totalFollowing={comparison.following.length}
              totalFollowers={comparison.followers.length}
              totalMutuals={comparison.mutualFollowers.length}
              completedRecords={completedRecords}
            />
          )}

          {activeTab === 'import' && (
            <ImportExportView
              dataset={dataset}
              primaryZip={primaryZip}
              persistenceInfo={persistenceInfo}
              totalFollowersCount={comparison.followers.length}
              totalFollowingCount={comparison.following.length}
              totalNonFollowersCount={comparison.allNonFollowersInExport.length}
              remainingNonFollowersCount={
                comparison.remainingNonFollowers.length
              }
              completedCount={completedRecords.length}
              lastReconciliation={lastReconciliation}
              onImportFiles={handleImportFiles}
              onAdminReplacePrimaryZip={handleAdminReplacePrimaryZip}
              onReExtractFromPrimaryZip={handleReExtractFromPrimaryZip}
              onDownloadOriginalPrimaryZip={handleDownloadOriginalPrimaryZip}
              onDownloadAllNonFollowersCsv={() =>
                exportAccountsToCsv(
                  comparison.allNonFollowersInExport,
                  completedSet,
                  completedMap,
                  'instagram_all_non_followers'
                )
              }
              onDownloadRemainingCsv={() =>
                exportAccountsToCsv(
                  comparison.remainingNonFollowers,
                  completedSet,
                  completedMap,
                  'instagram_remaining_non_followers'
                )
              }
              onDownloadCompletedCsv={() =>
                exportCompletedHistoryToCsv(completedRecords)
              }
              onDownloadCompleteHistoryJson={() =>
                exportCompletedHistoryToJson(completedRecords)
              }
              onDownloadDatabaseBackupJson={async () => {
                const backup = await createFullDatabaseBackup();
                downloadFullDatabaseBackupJson(backup);
              }}
              onRestoreDatabaseBackupFile={(file, allowReplacePrimary) =>
                handleRestoreDatabaseFromFile(file, allowReplacePrimary)
              }
              onDownloadCurrentDatasetZip={async () => {
                const blob = await generateInstagramZipArchive(
                  comparison.followers,
                  comparison.following
                );
                const dateStamp = new Date().toISOString().slice(0, 10);
                triggerFileDownload(
                  blob,
                  `instagram_export_${dateStamp}.zip`,
                  'application/zip'
                );
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              completedCount={completedRecords.length}
              hasDataset={Boolean(dataset)}
              persistenceInfo={persistenceInfo}
              primaryZipFileName={primaryZip?.fileName}
              onUpdateSettings={handleUpdateSettings}
              onExportDatabaseBackup={async () => {
                const backup = await createFullDatabaseBackup();
                downloadFullDatabaseBackupJson(backup);
              }}
              onRestoreDatabaseBackup={(file) =>
                handleRestoreDatabaseFromFile(file, false)
              }
              onResetCompletionHistory={handleClearAllHistory}
              onClearImportedInstagramData={handleClearImportedInstagramData}
              onReloadEmbeddedDataset={handleReloadEmbeddedDataset}
            />
          )}
        </main>

        {/* Mobile Android-Friendly Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#11182B]/95 backdrop-blur-md px-2 py-1.5 flex items-center justify-around">
          {(
            [
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'non-followers', label: 'Non-Followers', icon: UserMinus },
              { id: 'batch', label: 'Unfollow', icon: Zap },
              { id: 'history', label: 'Completed', icon: CheckCircle2 },
              { id: 'import', label: 'Data & ZIP', icon: Database },
            ] as Array<{
              id: NavigationTab;
              label: string;
              icon: React.FC<{ className?: string }>;
            }>
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-slate-500 dark:text-[#9CA3AF]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Instagram Mobile App Detection / Fallback & Invalid Username Modal */}
      <InstagramAppFallbackModal
        fallbackLinks={fallbackLinksModal}
        invalidUsernameError={invalidUsernameErrorModal}
        currentLaunchMethod={settings.instagramLaunchMethod || 'auto-native'}
        onSelectLaunchMethod={(method: InstagramLaunchMethod) =>
          handleUpdateSettings({ instagramLaunchMethod: method })
        }
        onClose={() => {
          setFallbackLinksModal(null);
          setInvalidUsernameErrorModal(null);
        }}
      />

      {/* Floating Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-16 lg:bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#171F35] text-white border border-violet-500/40 shadow-2xl text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
