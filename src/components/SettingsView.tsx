import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  HardDrive,
  Info,
  Lock,
  Moon,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AccentColorOption,
  AppSettings,
  BatchSizeOption,
  InstagramLaunchMethod,
  StoragePersistenceInfo,
} from '../types/instagram';
import { formatBytes } from './PrimaryZipStorageCard';

interface SettingsViewProps {
  settings: AppSettings;
  completedCount: number;
  hasDataset: boolean;
  persistenceInfo?: StoragePersistenceInfo;
  primaryZipFileName?: string;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  onExportDatabaseBackup: () => Promise<void>;
  onRestoreDatabaseBackup: (file: File) => Promise<void>;
  onResetCompletionHistory: () => Promise<void>;
  onClearImportedInstagramData: () => Promise<void>;
  onReloadEmbeddedDataset: () => Promise<void>;
}

const BATCH_SIZE_OPTIONS: BatchSizeOption[] = [10, 20, 25, 50, 100];

const ACCENT_OPTIONS: Array<{
  id: AccentColorOption;
  label: string;
  swatchClass: string;
}> = [
  { id: 'violet', label: 'Electric Violet', swatchClass: 'bg-[#8B5CF6]' },
  { id: 'pink', label: 'Instagram Pink', swatchClass: 'bg-[#EC4899]' },
  { id: 'cyan', label: 'Cyber Cyan', swatchClass: 'bg-[#06B6D4]' },
  { id: 'emerald', label: 'Emerald Mint', swatchClass: 'bg-[#22C55E]' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  completedCount,
  hasDataset,
  persistenceInfo,
  primaryZipFileName,
  onUpdateSettings,
  onExportDatabaseBackup,
  onRestoreDatabaseBackup,
  onResetCompletionHistory,
  onClearImportedInstagramData,
  onReloadEmbeddedDataset,
}) => {
  const [confirmResetHistory, setConfirmResetHistory] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4500);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingRestoreFile(file);
    if (restoreInputRef.current) restoreInputRef.current.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreFile) return;
    try {
      await onRestoreDatabaseBackup(pendingRestoreFile);
      showNotice(
        'success',
        `Successfully restored database from "${pendingRestoreFile.name}". All completed-unfollow records were preserved.`
      );
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error ? err.message : 'Failed to restore database backup.'
      );
    } finally {
      setPendingRestoreFile(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings & Preferences
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-[#9CA3AF]">
            Configure appearance, accent color, default batch size, Instagram mobile app deep-link method, data backups, and storage settings.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-xs font-mono font-bold text-violet-600 dark:text-violet-300 shrink-0">
          <Info className="w-4 h-4" />
          <span>INSTA CLEANER v3.0.0</span>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Appearance, Accent Color & Workflow Preferences */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] divide-y divide-slate-200 dark:divide-white/10 shadow-lg">
        {/* 1. Appearance (Dark / Light) */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Appearance (Dark / Light)
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Choose between the signature Deep Midnight Navy dark interface (#0B1020) or crisp Light Mode.
            </p>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 shrink-0">
            <button
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                settings.theme === 'dark'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Mode</span>
            </button>
            <button
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                settings.theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light Mode</span>
            </button>
          </div>
        </div>

        {/* 2. Accent Color */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-violet-400" />
              <span>Accent Color</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Select the primary highlight accent across navigation, badges, and progress rings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_OPTIONS.map((opt) => {
              const isSelected = (settings.accentColor || 'violet') === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onUpdateSettings({ accentColor: opt.id })}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-violet-400 bg-violet-500/15 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#11182B] text-slate-600 dark:text-[#9CA3AF]'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${opt.swatchClass}`} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Default Batch Size */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Default Batch Size
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Number of non-follower accounts grouped into each Unfollow Manager session (10, 20, 25, 50, or 100).
            </p>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 shrink-0">
            {BATCH_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => onUpdateSettings({ defaultBatchSize: size })}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  settings.defaultBatchSize === size
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Profile-Opening Preferences */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Profile-Opening Preferences (Instagram Mobile App Integration)
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF] max-w-xl">
              Controls how selected accounts are opened in the official Instagram application. Android Intent mode targets <code className="font-mono">com.instagram.android</code> directly on Android & Redmi phones.
            </p>
          </div>

          <select
            value={settings.instagramLaunchMethod || 'auto-native'}
            onChange={(e) =>
              onUpdateSettings({
                instagramLaunchMethod: e.target.value as InstagramLaunchMethod,
              })
            }
            aria-label="Instagram Mobile App Launch Method"
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 cursor-pointer shrink-0"
          >
            <option value="auto-native">
              Auto Native App (Android Intent / iOS URI)
            </option>
            <option value="android-intent">
              Android & Redmi Explicit Intent (com.instagram.android)
            </option>
            <option value="instagram-scheme">
              Direct Instagram URI (instagram://user?username=...)
            </option>
            <option value="android-applink">
              Android Universal App Link (instagram.com/_u/...)
            </option>
            <option value="web-fallback">
              Web Browser Fallback (instagram.com/...)
            </option>
          </select>
        </div>

        {/* 5. Hide Completed Accounts & Automatic Backup */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Automatic Local Backup Snapshot
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Automatically synchronize a redundant recovery snapshot whenever an account is marked as unfollowed.
              {settings.lastAutoBackupAt && (
                <span className="block mt-0.5 font-mono text-[11px] text-violet-400">
                  Last auto-saved: {new Date(settings.lastAutoBackupAt).toLocaleString()}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() =>
              onUpdateSettings({ autoBackup: !settings.autoBackup })
            }
            role="switch"
            aria-checked={settings.autoBackup}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
              settings.autoBackup
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-[#11182B] border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#9CA3AF]'
            }`}
          >
            {settings.autoBackup ? 'Auto-Backup Active' : 'Auto-Backup Off'}
          </button>
        </div>
      </div>

      {/* Storage Information Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>Storage Information</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-white/10">
            <div className="text-slate-500 dark:text-[#9CA3AF]">Primary ZIP Status</div>
            <div className="mt-1 font-mono font-bold text-emerald-400">
              PRIMARY ZIP SAVED – LOCKED
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-slate-400 truncate">
              {primaryZipFileName || 'connections_export.zip'}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-white/10">
            <div className="text-slate-500 dark:text-[#9CA3AF]">Storage Engine</div>
            <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
              IndexedDB v2 + Blob Store
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {persistenceInfo?.isPersisted
                ? 'navigator.storage.persist() Granted'
                : 'Local Persistent Storage Active'}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-white/10">
            <div className="text-slate-500 dark:text-[#9CA3AF]">Quota & Usage</div>
            <div className="mt-1 font-mono font-bold text-violet-400">
              {persistenceInfo?.usageBytes
                ? formatBytes(persistenceInfo.usageBytes).split(' (')[0]
                : 'Local Active'}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {completedCount.toLocaleString()} permanent completed records
            </div>
          </div>
        </div>
      </div>

      {/* Data Backup & Restoration */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Database className="w-4 h-4 text-violet-400" />
          <span>Data Backup & Restoration</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
          Export your complete local IndexedDB state (locked Primary ZIP, dataset, permanent completion history, batch state, and settings) to a JSON file or restore from a previous backup.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={async () => {
              await onExportDatabaseBackup();
              showNotice('success', 'Full database backup downloaded.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Database Backup (.JSON)</span>
          </button>

          <input
            ref={restoreInputRef}
            type="file"
            accept=".json"
            onChange={handleRestoreFile}
            className="hidden"
          />
          <button
            onClick={() => restoreInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Restore Database (.JSON)</span>
          </button>

          <button
            onClick={async () => {
              await onReloadEmbeddedDataset();
              showNotice(
                'success',
                'Reloaded initial embedded Instagram ZIP dataset while preserving completion history.'
              );
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-violet-700 dark:text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Restore Initial Embedded Dataset</span>
          </button>
        </div>

        {pendingRestoreFile && (
          <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Confirm Database Restoration from "{pendingRestoreFile.name}"?
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              All {completedCount} existing completed-unfollow records will be preserved and merged with the backup.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmRestore}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
              >
                Confirm Restore
              </button>
              <button
                onClick={() => setPendingRestoreFile(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Destructive Operations (With Mandatory Confirmation) */}
      <div className="rounded-2xl border border-rose-500/30 bg-white dark:bg-[#171F35] p-6 space-y-5 shadow-lg">
        <div className="flex items-center gap-2 text-sm font-bold text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Data Reset & Destructive Operations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#11182B] p-4 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Reset Completion History ({completedCount} records)
              </div>
              <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
                Permanently erases all saved unfollowed completion records and restores those accounts to your active remaining list.
              </p>
            </div>

            {!confirmResetHistory ? (
              <button
                onClick={() => setConfirmResetHistory(true)}
                disabled={completedCount === 0}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Completion History</span>
              </button>
            ) : (
              <div className="space-y-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Are you sure you want to erase {completedCount} completed records?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await onResetCompletionHistory();
                      setConfirmResetHistory(false);
                      showNotice('success', 'Completion history has been reset.');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setConfirmResetHistory(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#11182B] p-4 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Clear Active Comparison Dataset
              </div>
              <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
                Clears active comparison lists while keeping your locked Primary ZIP and permanent completion history intact.
              </p>
            </div>

            {!confirmClearData ? (
              <button
                onClick={() => setConfirmClearData(true)}
                disabled={!hasDataset}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Active Dataset</span>
              </button>
            ) : (
              <div className="space-y-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Clear active comparison lists? (Primary ZIP & completion history are kept)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await onClearImportedInstagramData();
                      setConfirmClearData(false);
                      showNotice(
                        'success',
                        'Cleared active comparison lists. Locked Primary ZIP & completion history remain safely stored.'
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer"
                  >
                    Confirm Clear
                  </button>
                  <button
                    onClick={() => setConfirmClearData(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy Information & Application Version */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-6 space-y-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>Privacy Information & Security Architecture</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Version 3.0.0 · Local-First Edition
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-[#9CA3AF]">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>100% Local Processing:</strong> Your Instagram ZIP, JSON, and HTML exports are parsed strictly inside your browser and stored in local IndexedDB. No personal export data is ever transmitted to external servers.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>No Passwords or Unauthorized Automation:</strong> Insta Cleaner never asks for your Instagram password and never performs unauthorized background taps. Unfollowing is performed manually by you inside the official Instagram app.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
