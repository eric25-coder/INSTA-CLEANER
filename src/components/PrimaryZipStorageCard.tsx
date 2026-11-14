import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  HardDrive,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import {
  PrimaryZipRecord,
  StoragePersistenceInfo,
} from '../types/instagram';

interface PrimaryZipStorageCardProps {
  primaryZip: PrimaryZipRecord | null;
  persistenceInfo: StoragePersistenceInfo;
  activeFollowersCount: number;
  activeFollowingCount: number;
  activeNonFollowersCount: number;
  completedUnfollowedCount: number;
  remainingCount: number;
  onDownloadOriginalPrimaryZip: () => void;
  onDownloadFullBackupBundle: () => Promise<void>;
  onReExtractFromPrimaryZip: () => Promise<void>;
  onAdminReplacePrimaryZip: (file: File) => Promise<void>;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB (${bytes.toLocaleString()} B)`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB (${bytes.toLocaleString()} B)`;
}

export const PrimaryZipStorageCard: React.FC<PrimaryZipStorageCardProps> = ({
  primaryZip,
  persistenceInfo,
  activeFollowersCount,
  activeFollowingCount,
  activeNonFollowersCount,
  completedUnfollowedCount,
  remainingCount,
  onDownloadOriginalPrimaryZip,
  onDownloadFullBackupBundle,
  onReExtractFromPrimaryZip,
  onAdminReplacePrimaryZip,
}) => {
  const [showAdminReplaceModal, setShowAdminReplaceModal] = useState(false);
  const [adminConfirmChecked, setAdminConfirmChecked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<string | null>(
    null
  );
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const adminFileInputRef = useRef<HTMLInputElement | null>(null);

  const formattedImportDate = primaryZip?.importedAt
    ? new Date(primaryZip.importedAt).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not recorded';

  const totalExtractedAccounts = activeFollowersCount + activeFollowingCount;

  const handleAdminFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onAdminReplacePrimaryZip(file);
      setFeedback({
        type: 'success',
        message: `Primary ZIP successfully replaced and re-locked with "${file.name}". All ${completedUnfollowedCount} completed unfollow records were preserved.`,
      });
      setShowAdminReplaceModal(false);
      setAdminConfirmChecked(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to replace Primary ZIP. Existing locked Primary ZIP remains intact.',
      });
    } finally {
      setIsProcessing(false);
      if (adminFileInputRef.current) adminFileInputRef.current.value = '';
    }
  };

  const handleReExtract = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onReExtractFromPrimaryZip();
      setFeedback({
        type: 'success',
        message: `Successfully re-extracted followers and following lists from locked Primary ZIP ("${primaryZip?.fileName}").`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to re-extract from Primary ZIP.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackupClick = async () => {
    await onDownloadFullBackupBundle();
    setLastBackupTimestamp(
      new Date().toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-6 space-y-6 shadow-lg">
      {/* Recovery or Corruption Notifications */}
      {persistenceInfo.recoveryPerformed && persistenceInfo.recoveryMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-emerald-700 dark:text-emerald-300">
              Automatic Primary ZIP Recovery Completed
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              {persistenceInfo.recoveryMessage}
            </p>
          </div>
        </div>
      )}

      {persistenceInfo.corruptionDetected && persistenceInfo.corruptionMessage && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-amber-700 dark:text-amber-300">
              Storage Recovery Notice
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              {persistenceInfo.corruptionMessage}
            </p>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Large Status Header Card: PRIMARY INSTAGRAM DATASET — Status: LOCKED AND SAVED */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-[#11182B] to-violet-950/30 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40">
              <Lock className="w-3.5 h-3.5" />
              <span>Status: LOCKED AND SAVED</span>
            </span>
            <span className="text-xs font-mono text-emerald-400">
              PRIMARY ZIP SAVED – LOCKED
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-violet-400 shrink-0" />
            <span>PRIMARY INSTAGRAM DATASET</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] max-w-2xl">
            Your original Instagram ZIP file is stored as a binary Blob inside IndexedDB ({persistenceInfo.isPersisted ? 'Durable Persistent Storage Granted' : 'Local IndexedDB Active'}) and locked against accidental replacement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onDownloadOriginalPrimaryZip}
            disabled={!primaryZip}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileArchive className="w-3.5 h-3.5 text-violet-400" />
            <span>Download Original ZIP</span>
          </button>

          <button
            onClick={handleBackupClick}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Backup</span>
          </button>
        </div>
      </div>

      {/* Storage Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Primary ZIP Filename */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#11182B] p-4">
          <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
            Filename
          </div>
          <div className="mt-1 text-sm font-bold font-mono text-slate-900 dark:text-white truncate">
            {primaryZip?.fileName || 'None'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-[#9CA3AF]">
            {primaryZip?.isUserUploaded
              ? 'User-Imported Primary Archive'
              : 'Embedded Primary Archive (Upgrades on 1st ZIP Upload)'}
          </div>
        </div>

        {/* 2. Import Date */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#11182B] p-4">
          <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
            Import Date
          </div>
          <div className="mt-1 text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formattedImportDate}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-[#9CA3AF]">
            Last backup: {lastBackupTimestamp || 'Auto-synced in IndexedDB'}
          </div>
        </div>

        {/* 3. File Size */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#11182B] p-4">
          <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
            File Size
          </div>
          <div className="mt-1 text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatBytes(primaryZip?.fileSize)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-[#9CA3AF]">
            Binary Blob in IndexedDB (primary_zip_store)
          </div>
        </div>

        {/* 4. Storage Location & Status */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
            Storage Location
          </div>
          <div className="mt-1 text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>IndexedDB · LOCKED AND SAVED</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-[#9CA3AF]">
            {totalExtractedAccounts.toLocaleString()} total extracted account records
          </div>
        </div>

        {/* 5. Followers & Following Count */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#11182B] p-4">
          <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
            Extracted Followers & Following
          </div>
          <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {activeFollowersCount.toLocaleString()} Followers · {activeFollowingCount.toLocaleString()} Following
          </div>
          <div className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-[#9CA3AF]">
            Non-Followers identified: {activeNonFollowersCount.toLocaleString()}
          </div>
        </div>

        {/* 6. Unfollowed & Remaining */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#11182B] p-4">
          <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
            Unfollowed vs Remaining
          </div>
          <div className="mt-1 text-lg font-bold font-mono tabular-nums text-emerald-500">
            {completedUnfollowedCount.toLocaleString()} Unfollowed ·{' '}
            <span className="text-pink-400">{remainingCount.toLocaleString()} Remaining</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9CA3AF]">
            Permanently synced across sessions
          </div>
        </div>
      </div>

      {/* Bottom Controls: Re-Extract & Administrator Lock Override */}
      <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleReExtract}
            disabled={!primaryZip || isProcessing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
            <span>Re-Extract Active Lists from Locked Primary ZIP</span>
          </button>

          <button
            onClick={() => setShowAdminReplaceModal((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Administrator Action: Replace Locked Primary ZIP</span>
          </button>
        </div>

        {persistenceInfo.usageBytes !== null && (
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-[#9CA3AF]">
            Storage Used: {formatBytes(persistenceInfo.usageBytes).split(' (')[0]}
          </div>
        )}
      </div>

      {/* Administrator Explicit Confirmation Panel */}
      {showAdminReplaceModal && (
        <div className="p-5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Administrator Lock Override — Replace Primary ZIP Dataset
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Your current Primary ZIP (<span className="font-mono font-semibold">{primaryZip?.fileName}</span>) is locked against accidental overwrite. For normal updates, use the standard <strong>Import Updated Instagram ZIP</strong> dropzone below, which updates your comparison lists without overwriting the original Primary ZIP.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={adminConfirmChecked}
              onChange={(e) => setAdminConfirmChecked(e.target.checked)}
              className="rounded border-slate-400 text-violet-600 focus:ring-violet-500"
            />
            <span>
              I confirm as administrator that I want to unlock and replace the stored Primary ZIP file.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={adminFileInputRef}
              type="file"
              accept=".zip"
              onChange={handleAdminFileSelected}
              className="hidden"
            />
            <button
              onClick={() => adminFileInputRef.current?.click()}
              disabled={!adminConfirmChecked || isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Select New Primary .ZIP to Lock</span>
            </button>
            <button
              onClick={() => {
                setShowAdminReplaceModal(false);
                setAdminConfirmChecked(false);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 cursor-pointer"
            >
              Cancel & Keep Locked
            </button>
          </div>
        </div>
      )}

      {/* Storage Durability Note */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 flex items-start gap-2.5 text-xs text-slate-500 dark:text-[#9CA3AF]">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>
          <strong>Persistent Storage & Backup Guarantee:</strong> Your original ZIP archive and completion database are stored in IndexedDB with <code className="font-mono">navigator.storage.persist()</code>. Use <strong>Download Backup</strong> periodically to keep an external copy safe from manual browser cache resets or device loss.
        </span>
      </div>
    </div>
  );
};
