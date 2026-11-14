import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FolderArchive,
  Lock,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  PrimaryZipRecord,
  ReconciliationSummary,
  StoragePersistenceInfo,
  StoredDataset,
} from '../types/instagram';
import { PrimaryZipStorageCard } from './PrimaryZipStorageCard';

interface ImportExportViewProps {
  dataset: StoredDataset | null;
  primaryZip: PrimaryZipRecord | null;
  persistenceInfo: StoragePersistenceInfo;
  totalFollowersCount: number;
  totalFollowingCount: number;
  totalNonFollowersCount: number;
  remainingNonFollowersCount: number;
  completedCount: number;
  lastReconciliation: ReconciliationSummary | null;
  onImportFiles: (files: File[]) => Promise<void>;
  onAdminReplacePrimaryZip: (file: File) => Promise<void>;
  onReExtractFromPrimaryZip: () => Promise<void>;
  onDownloadOriginalPrimaryZip: () => void;
  onDownloadAllNonFollowersCsv: () => void;
  onDownloadRemainingCsv: () => void;
  onDownloadCompletedCsv: () => void;
  onDownloadCompleteHistoryJson: () => void;
  onDownloadDatabaseBackupJson: () => Promise<void>;
  onRestoreDatabaseBackupFile: (
    file: File,
    allowReplacePrimaryZip: boolean
  ) => Promise<void>;
  onDownloadCurrentDatasetZip: () => Promise<void>;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  dataset,
  primaryZip,
  persistenceInfo,
  totalFollowersCount,
  totalFollowingCount,
  totalNonFollowersCount,
  remainingNonFollowersCount,
  completedCount,
  lastReconciliation,
  onImportFiles,
  onAdminReplacePrimaryZip,
  onReExtractFromPrimaryZip,
  onDownloadOriginalPrimaryZip,
  onDownloadAllNonFollowersCsv,
  onDownloadRemainingCsv,
  onDownloadCompletedCsv,
  onDownloadCompleteHistoryJson,
  onDownloadDatabaseBackupJson,
  onRestoreDatabaseBackupFile,
  onDownloadCurrentDatasetZip,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Explicit user confirmation state for restoring a backup file
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [allowReplacePrimaryOnRestore, setAllowReplacePrimaryOnRestore] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupRestoreInputRef = useRef<HTMLInputElement | null>(null);

  const isPrimaryUserLocked = Boolean(
    primaryZip?.isLocked && primaryZip?.isUserUploaded
  );

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);

    try {
      const files = Array.from(fileList);
      await onImportFiles(files);
      if (!isPrimaryUserLocked && files.some((f) => f.name.toLowerCase().endsWith('.zip'))) {
        setImportSuccess(
          `First-Time ZIP Import Complete: "${files[0].name}" has been automatically saved in IndexedDB and locked as your PRIMARY DATASET (PRIMARY ZIP SAVED – LOCKED).`
        );
      } else {
        setImportSuccess(
          `Update Import Complete: Reconciled "${files.map((f) => f.name).join(', ')}" against your existing dataset. Your original locked Primary ZIP ("${primaryZip?.fileName}") and all ${completedCount} completed records remain safely preserved.`
        );
      }
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : 'Failed to import Instagram data. Existing locked Primary ZIP and completion history remain untouched.'
      );
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmRestoreBackup = async () => {
    if (!pendingRestoreFile) return;
    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);
    try {
      await onRestoreDatabaseBackupFile(
        pendingRestoreFile,
        allowReplacePrimaryOnRestore
      );
      setImportSuccess(
        `Successfully restored backup from "${pendingRestoreFile.name}". All completed-unfollow records were preserved.`
      );
      setPendingRestoreFile(null);
      setAllowReplacePrimaryOnRestore(false);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Failed to restore backup file.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const formattedLastImport = dataset?.lastImportDate
    ? new Date(dataset.lastImportDate).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'None';

  return (
    <div className="space-y-6">
      {/* Section 7: Permanent ZIP Storage Dashboard */}
      <PrimaryZipStorageCard
        primaryZip={primaryZip}
        persistenceInfo={persistenceInfo}
        activeFollowersCount={totalFollowersCount}
        activeFollowingCount={totalFollowingCount}
        activeNonFollowersCount={totalNonFollowersCount}
        completedUnfollowedCount={completedCount}
        remainingCount={remainingNonFollowersCount}
        onDownloadOriginalPrimaryZip={onDownloadOriginalPrimaryZip}
        onDownloadFullBackupBundle={onDownloadDatabaseBackupJson}
        onReExtractFromPrimaryZip={onReExtractFromPrimaryZip}
        onAdminReplacePrimaryZip={onAdminReplacePrimaryZip}
      />

      {/* Upload Dropzone & Reconciliation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Drag & Drop Importer */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isPrimaryUserLocked
                    ? 'Import Updated Instagram ZIP (Non-Destructive Update)'
                    : 'First-Time Instagram ZIP Import (Auto-Saves & Locks)'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isPrimaryUserLocked
                    ? `Your original Primary ZIP ("${primaryZip?.fileName}") is locked and will NOT be overwritten. Importing a newer ZIP updates your comparison lists while preserving all completed records.`
                    : 'Your first imported Instagram ZIP will be automatically saved as a Blob in IndexedDB and permanently locked as your Primary Dataset.'}
                </p>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-fuchsia-500 bg-fuchsia-500/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-fuchsia-500/60 bg-slate-50/50 dark:bg-slate-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".zip,.json,.html,.htm"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-fuchsia-500/30 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-fuchsia-500" />
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {isImporting
                  ? 'Saving & Reconciling Instagram Export...'
                  : isPrimaryUserLocked
                  ? 'Click or drop a newer Instagram ZIP to reconcile updates'
                  : 'Click or drop your Instagram ZIP to save & lock permanently'}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Extracts <span className="font-mono">connections/followers_and_following/followers_1.json</span> & <span className="font-mono">following.json</span> automatically.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600">
                <FolderArchive className="w-3.5 h-3.5" />
                <span>
                  {isPrimaryUserLocked
                    ? 'Select Updated Instagram ZIP / JSON'
                    : 'Select Instagram ZIP to Save & Lock'}
                </span>
              </div>
            </div>

            {importError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Import Error — Locked Primary ZIP & History Untouched
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {importError}
                  </p>
                </div>
              </div>
            )}

            {importSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Permanent Storage & Reconciliation Complete
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {importSuccess}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Original Primary ZIP is protected against accidental overwrite.</span>
            </span>
          </div>
        </div>

        {/* Right 5 Cols: Automatic Reconciliation & Update Comparison Report */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Dataset Comparison & Reconciliation</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Active Dataset vs. Locked Primary
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Locked Primary ZIP</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[210px]">
                  {primaryZip?.fileName || 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Active Comparison Source</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white truncate max-w-[210px]">
                  {dataset?.sourceLabel || 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Last Update / Import Date</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {formattedLastImport}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Followers (Active / Primary)</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  {totalFollowersCount} / {primaryZip?.followersCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Following (Active / Primary)</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  {totalFollowingCount} / {primaryZip?.followingCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Saved Completed Excluded</span>
                <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {completedCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Outstanding Remaining
                </span>
                <span className="font-mono font-bold text-base tabular-nums text-fuchsia-600 dark:text-fuchsia-400">
                  {remainingNonFollowersCount.toLocaleString()}
                </span>
              </div>
            </div>

            {lastReconciliation && (
              <div className="p-3 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                  {lastReconciliation.keptOriginalPrimaryLocked
                    ? 'Update Reconciled (Original Primary ZIP Preserved)'
                    : 'Primary ZIP Saved & Locked'}
                </div>
                <div>
                  Excluded <span className="font-mono font-bold text-emerald-500">{lastReconciliation.alreadyCompletedRecognized}</span> previously completed accounts. Followers delta:{' '}
                  <span className="font-mono">
                    {lastReconciliation.followersDelta >= 0
                      ? `+${lastReconciliation.followersDelta}`
                      : lastReconciliation.followersDelta}
                  </span>
                  , Following delta:{' '}
                  <span className="font-mono">
                    {lastReconciliation.followingDelta >= 0
                      ? `+${lastReconciliation.followingDelta}`
                      : lastReconciliation.followingDelta}
                  </span>
                  .
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onDownloadCurrentDatasetZip}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <FileArchive className="w-4 h-4 text-fuchsia-500" />
            <span>Export Active Comparison Lists as .ZIP</span>
          </button>
        </div>
      </div>

      {/* Section 5 & 13: Backup, Restoration & Data Export Center */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Backup, Restoration & CSV Export Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Download backups of your original locked ZIP, full application database, or CSV spreadsheets—or restore from a previously exported backup with confirmation.
          </p>
        </div>

        {/* Explicit Confirmation Banner when a Backup File is selected for Restore */}
        {pendingRestoreFile && (
          <div className="p-5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Confirm Backup Restoration: "{pendingRestoreFile.name}"
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Restoring this backup will merge and preserve all existing completed-unfollow records ({completedCount} records) and update your active dataset.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowReplacePrimaryOnRestore}
                onChange={(e) => setAllowReplacePrimaryOnRestore(e.target.checked)}
                className="rounded border-slate-400 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              <span>
                Also allow this backup to replace my locked Primary ZIP if the backup contains a Primary ZIP archive.
              </span>
            </label>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleConfirmRestoreBackup}
                disabled={isImporting}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
              >
                Confirm & Restore Backup
              </button>
              <button
                onClick={() => {
                  setPendingRestoreFile(null);
                  setAllowReplacePrimaryOnRestore(false);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. All Non-Followers as CSV */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileSpreadsheet className="w-4 h-4 text-purple-500" />
                <span>All Non-Followers (CSV)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete list of all {totalNonFollowersCount} accounts that do not follow you back, with current status.
              </p>
            </div>
            <button
              onClick={onDownloadAllNonFollowersCsv}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All Non-Followers CSV</span>
            </button>
          </div>

          {/* 2. Remaining Accounts as CSV */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileSpreadsheet className="w-4 h-4 text-pink-500" />
                <span>Remaining Accounts (CSV)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only the {remainingNonFollowersCount} outstanding non-followers that have not yet been marked as completed.
              </p>
            </div>
            <button
              onClick={onDownloadRemainingCsv}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Remaining CSV</span>
            </button>
          </div>

          {/* 3. Completed Accounts as CSV */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Completed Accounts (CSV)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spreadsheet of all {completedCount} accounts you have unfollowed, with exact completion dates and times.
              </p>
            </div>
            <button
              onClick={onDownloadCompletedCsv}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Completed CSV</span>
            </button>
          </div>

          {/* 4. Complete Unfollowing History (JSON) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileCode className="w-4 h-4 text-fuchsia-500" />
                <span>Complete Unfollowing History</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Portable JSON archive of your entire permanent unfollowed history.
              </p>
            </div>
            <button
              onClick={onDownloadCompleteHistoryJson}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download History JSON</span>
            </button>
          </div>

          {/* 5. Full Local Database + Primary ZIP Backup & Restoration */}
          <div className="sm:col-span-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Database className="w-4 h-4 text-fuchsia-500" />
                <span>Full Backup & Restore (Original Primary ZIP + App Data)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Export or restore a complete backup containing your locked Primary ZIP, extracted dataset, and all completed-unfollow records.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={onDownloadDatabaseBackupJson}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Full Backup</span>
              </button>

              <input
                ref={backupRestoreInputRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPendingRestoreFile(file);
                  }
                  if (backupRestoreInputRef.current) {
                    backupRestoreInputRef.current.value = '';
                  }
                }}
                className="hidden"
              />
              <button
                onClick={() => backupRestoreInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore from Backup</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
