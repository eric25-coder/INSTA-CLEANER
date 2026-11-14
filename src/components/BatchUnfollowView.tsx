import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FastForward,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import {
  BatchSessionState,
  BatchSizeOption,
  InstagramAccount,
} from '../types/instagram';
import { detectDevicePlatform } from '../utils/instagramAppLauncher';

interface BatchUnfollowViewProps {
  batchSession: BatchSessionState;
  allNonFollowersMap: Map<string, InstagramAccount>;
  remainingNonFollowers: InstagramAccount[];
  selectedUsernames: Set<string>;
  completedSet: Set<string>;
  overallCompletionPercentage: number;
  openedProfilesSet: Set<string>;
  onChangeBatchSize: (size: BatchSizeOption) => void;
  onStartBatch: (useSelectedOnly: boolean) => void;
  onPauseBatch: () => void;
  onResumeBatch: () => void;
  onNextBatch: () => void;
  onPrevBatch: () => void;
  onSelectTargetInBatch: (normalizedUsername: string) => void;
  onSkipAccount: (normalizedUsername: string) => void;
  onOpenInInstagramApp: (account: InstagramAccount) => void;
  onMarkTargetUnfollowed: (account: InstagramAccount) => Promise<void>;
  onMarkAndOpenNextInApp: (
    completedAccount: InstagramAccount,
    nextAccount: InstagramAccount | null
  ) => Promise<void>;
  onUndoLastBatchCompletion: () => Promise<void>;
}

const BATCH_SIZE_OPTIONS: BatchSizeOption[] = [10, 20, 25, 50, 100];

export const BatchUnfollowView: React.FC<BatchUnfollowViewProps> = ({
  batchSession,
  allNonFollowersMap,
  remainingNonFollowers,
  selectedUsernames,
  completedSet,
  overallCompletionPercentage,
  openedProfilesSet,
  onChangeBatchSize,
  onStartBatch,
  onPauseBatch,
  onResumeBatch,
  onNextBatch,
  onPrevBatch,
  onSelectTargetInBatch,
  onSkipAccount,
  onOpenInInstagramApp,
  onMarkTargetUnfollowed,
  onMarkAndOpenNextInApp,
  onUndoLastBatchCompletion,
}) => {
  const [copiedUser, setCopiedUser] = useState<string | null>(null);
  const device = detectDevicePlatform();

  const skippedSet = useMemo(
    () => new Set(batchSession.skippedProfiles || []),
    [batchSession.skippedProfiles]
  );

  // Build effective queue of accounts for the batch manager (permanently excluding any account marked done)
  const queueUsernames = useMemo(() => {
    const activeRemaining = remainingNonFollowers
      .filter((a) => !completedSet.has(a.normalizedUsername))
      .map((a) => a.normalizedUsername);

    if (batchSession.queueUsernames.length > 0) {
      const filteredQueue = batchSession.queueUsernames.filter(
        (norm) => !completedSet.has(norm)
      );
      if (filteredQueue.length > 0) {
        return filteredQueue;
      }
    }
    return activeRemaining;
  }, [batchSession.queueUsernames, completedSet, remainingNonFollowers]);

  // Split queueUsernames into batches of batchSession.batchSize
  const batches = useMemo(() => {
    const size = batchSession.batchSize || 25;
    const chunks: string[][] = [];
    for (let i = 0; i < queueUsernames.length; i += size) {
      chunks.push(queueUsernames.slice(i, i + size));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, [queueUsernames, batchSession.batchSize]);

  const totalBatches = batches.length;
  const safeBatchIndex = Math.min(
    Math.max(0, batchSession.currentBatchIndex),
    totalBatches - 1
  );
  const currentBatchUsernames = batches[safeBatchIndex] || [];

  const currentBatchAccounts = useMemo(() => {
    return currentBatchUsernames.map((norm) => {
      const existing = allNonFollowersMap.get(norm);
      return (
        existing || {
          username: norm,
          normalizedUsername: norm,
          profileUrl: `https://www.instagram.com/${norm}/`,
        }
      );
    });
  }, [currentBatchUsernames, allNonFollowersMap]);

  const completedInCurrentBatch = useMemo(
    () =>
      currentBatchAccounts.filter((a) => completedSet.has(a.normalizedUsername))
        .length,
    [currentBatchAccounts, completedSet]
  );

  const remainingInCurrentBatchList = useMemo(
    () =>
      currentBatchAccounts.filter(
        (a) => !completedSet.has(a.normalizedUsername)
      ),
    [currentBatchAccounts, completedSet]
  );

  const remainingInCurrentBatchCount = remainingInCurrentBatchList.length;

  // Determine active target account in current batch (prefer non-skipped first)
  const activeTargetAccount: InstagramAccount | null = useMemo(() => {
    if (
      batchSession.currentPointerNormalized &&
      !completedSet.has(batchSession.currentPointerNormalized)
    ) {
      const inCurrent = remainingInCurrentBatchList.find(
        (a) => a.normalizedUsername === batchSession.currentPointerNormalized
      );
      if (inCurrent) return inCurrent;
    }
    const nonSkipped = remainingInCurrentBatchList.find(
      (a) => !skippedSet.has(a.normalizedUsername)
    );
    return nonSkipped || remainingInCurrentBatchList[0] || null;
  }, [
    batchSession.currentPointerNormalized,
    completedSet,
    remainingInCurrentBatchList,
    skippedSet,
  ]);

  // Determine the next remaining account after activeTargetAccount
  const nextUpAfterTargetAccount: InstagramAccount | null = useMemo(() => {
    if (!activeTargetAccount) return remainingInCurrentBatchList[0] || null;
    const currentIdx = remainingInCurrentBatchList.findIndex(
      (a) => a.normalizedUsername === activeTargetAccount.normalizedUsername
    );
    if (
      currentIdx >= 0 &&
      currentIdx + 1 < remainingInCurrentBatchList.length
    ) {
      return remainingInCurrentBatchList[currentIdx + 1];
    }
    return (
      remainingNonFollowers.find(
        (a) =>
          a.normalizedUsername !== activeTargetAccount.normalizedUsername &&
          !completedSet.has(a.normalizedUsername)
      ) || null
    );
  }, [
    activeTargetAccount,
    completedSet,
    remainingInCurrentBatchList,
    remainingNonFollowers,
  ]);

  const currentPositionInBatch = useMemo(() => {
    if (!activeTargetAccount) return currentBatchAccounts.length;
    const idx = currentBatchAccounts.findIndex(
      (a) => a.normalizedUsername === activeTargetAccount.normalizedUsername
    );
    return idx >= 0 ? idx + 1 : 1;
  }, [activeTargetAccount, currentBatchAccounts]);

  const currentBatchCompletionPercent =
    currentBatchAccounts.length > 0
      ? (completedInCurrentBatch / currentBatchAccounts.length) * 100
      : 0;

  const handleCopy = async (username: string) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUser(username);
      setTimeout(() => setCopiedUser(null), 1600);
    } catch {
      // Ignore
    }
  };

  const handleAdvanceToNextRemaining = () => {
    if (nextUpAfterTargetAccount) {
      onSelectTargetInBatch(nextUpAfterTargetAccount.normalizedUsername);
    } else if (remainingInCurrentBatchList[0]) {
      onSelectTargetInBatch(remainingInCurrentBatchList[0].normalizedUsername);
    }
  };

  const handleSkipCurrent = () => {
    if (!activeTargetAccount) return;
    onSkipAccount(activeTargetAccount.normalizedUsername);
    if (nextUpAfterTargetAccount) {
      onSelectTargetInBatch(nextUpAfterTargetAccount.normalizedUsername);
    }
  };

  const isPaused = batchSession.status === 'paused';
  const isRunning = batchSession.status === 'running';

  return (
    <div className="space-y-6">
      {/* Top Session Header (Matches Section 5: Unfollow Session, Batch X of Y, Progress: X / Y completed, Progress bar) */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-6 space-y-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-500 dark:text-violet-400 mb-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                Unfollow Session · Direct Instagram App Launcher ({device.platformLabel})
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Unfollow Session
              </h1>
              <span className="text-sm font-mono font-semibold text-violet-600 dark:text-violet-400">
                Batch {safeBatchIndex + 1} of {totalBatches}
              </span>
              <span className="text-sm font-mono text-slate-500 dark:text-[#9CA3AF]">
                · Progress: {completedInCurrentBatch} / {currentBatchAccounts.length} completed
              </span>
            </div>
          </div>

          {/* Batch Size Selector (10, 20, 25, 50, 100) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-500 dark:text-[#9CA3AF] mr-1">
              Batch size:
            </span>
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10">
              {BATCH_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => onChangeBatchSize(size)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    batchSession.batchSize === size
                      ? 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-xs'
                      : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Session Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Batch {safeBatchIndex + 1} of {totalBatches} Progress ({completedInCurrentBatch} / {currentBatchAccounts.length} completed)
            </span>
            <span className="font-mono font-bold text-violet-500 dark:text-violet-400">
              {currentBatchCompletionPercent.toFixed(0)}% Batch · {overallCompletionPercentage.toFixed(1)}% Overall
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-[#11182B] overflow-hidden p-0.5 border border-slate-200 dark:border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#22C55E] transition-all duration-500"
              style={{ width: `${Math.min(100, currentBatchCompletionPercent)}%` }}
            />
          </div>
        </div>

        {/* 5 Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#11182B] p-3.5">
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Current Batch
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {safeBatchIndex + 1} / {totalBatches}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#11182B] p-3.5">
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Position in Batch
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
              #{currentPositionInBatch}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#11182B] p-3.5">
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Completed in Batch
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {completedInCurrentBatch}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#11182B] p-3.5">
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Remaining in Batch
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-pink-600 dark:text-pink-400">
              {remainingInCurrentBatchCount}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#11182B] p-3.5">
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF]">
              Overall Progress
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
              {overallCompletionPercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Session Control Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onStartBatch(false)}
              disabled={remainingNonFollowers.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] disabled:opacity-40 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {isRunning || isPaused
                  ? 'Restart Session Queue'
                  : `Start Unfollow Session (${remainingNonFollowers.length})`}
              </span>
            </button>

            {selectedUsernames.size > 0 && (
              <button
                onClick={() => onStartBatch(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Start Session with Selected ({selectedUsernames.size})</span>
              </button>
            )}

            <button
              onClick={onPauseBatch}
              disabled={!isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Session</span>
            </button>

            <button
              onClick={onResumeBatch}
              disabled={!isPaused}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume Session</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onPrevBatch}
              disabled={safeBatchIndex <= 0}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev Batch</span>
            </button>

            <button
              onClick={onNextBatch}
              disabled={safeBatchIndex >= totalBatches - 1}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Next Batch</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onUndoLastBatchCompletion}
              disabled={batchSession.undoStack.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                Undo{' '}
                {batchSession.undoStack.length > 0
                  ? `(@${batchSession.undoStack[batchSession.undoStack.length - 1].username})`
                  : ''}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Workspace: Current Profile Card (Left) & Batch Queue List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 6 Cols: Current Profile Card */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-6 flex flex-col justify-between space-y-6 shadow-lg">
          <div className="space-y-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                Current Profile Card · Account {currentPositionInBatch} of {currentBatchAccounts.length}
              </span>
              {activeTargetAccount && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    openedProfilesSet.has(activeTargetAccount.normalizedUsername)
                      ? 'text-violet-300 bg-violet-500/15 border-violet-500/30'
                      : skippedSet.has(activeTargetAccount.normalizedUsername)
                      ? 'text-slate-300 bg-slate-500/15 border-slate-500/30'
                      : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      openedProfilesSet.has(activeTargetAccount.normalizedUsername)
                        ? 'bg-violet-400'
                        : skippedSet.has(activeTargetAccount.normalizedUsername)
                        ? 'bg-slate-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    {openedProfilesSet.has(activeTargetAccount.normalizedUsername)
                      ? 'Opened'
                      : skippedSet.has(activeTargetAccount.normalizedUsername)
                      ? 'Skipped'
                      : 'Pending'}
                  </span>
                </span>
              )}
            </div>

            {activeTargetAccount ? (
              <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#1E1B4B]/80 via-[#11182B] to-[#3B0764]/50 p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-xl font-bold font-mono text-white shrink-0 shadow-lg ring-2 ring-white/15">
                      {activeTargetAccount.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-slate-400">
                        Selected Instagram Account
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <button
                          onClick={() => onOpenInInstagramApp(activeTargetAccount)}
                          className="text-xl sm:text-2xl font-bold font-mono text-white hover:text-violet-300 truncate cursor-pointer text-left"
                        >
                          @{activeTargetAccount.username}
                        </button>
                        <button
                          onClick={() => handleCopy(activeTargetAccount.username)}
                          className="p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Copy username"
                        >
                          {copiedUser === activeTargetAccount.username ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <a
                          href={activeTargetAccount.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-violet-300 hover:underline font-mono"
                        >
                          <span>{activeTargetAccount.profileUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Button: OPEN IN INSTAGRAM */}
                <button
                  onClick={() => onOpenInInstagramApp(activeTargetAccount)}
                  disabled={isPaused}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl text-sm font-extrabold tracking-wide text-white bg-gradient-to-r from-[#8B5CF6] via-[#9333EA] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] disabled:opacity-50 transition-all shadow-lg cursor-pointer"
                >
                  <Smartphone className="w-5 h-5 shrink-0" />
                  <span>OPEN IN INSTAGRAM</span>
                </button>

                {/* Secondary Buttons: Mark as Unfollowed, Skip Account, Next Account */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => onMarkTargetUnfollowed(activeTargetAccount)}
                    disabled={isPaused}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Mark as Unfollowed</span>
                  </button>

                  <button
                    onClick={handleSkipCurrent}
                    disabled={isPaused}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <FastForward className="w-4 h-4 shrink-0" />
                    <span>Skip Account</span>
                  </button>

                  <button
                    onClick={handleAdvanceToNextRemaining}
                    disabled={!nextUpAfterTargetAccount || isPaused}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-40 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>Next Account</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>

                {/* 1-Tap Combined Action: Mark Unfollowed & Open Next in Instagram */}
                {nextUpAfterTargetAccount && (
                  <button
                    onClick={() =>
                      onMarkAndOpenNextInApp(
                        activeTargetAccount,
                        nextUpAfterTargetAccount
                      )
                    }
                    disabled={isPaused}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-violet-200 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 shrink-0 text-pink-400" />
                    <span>
                      Mark @{activeTargetAccount.username} Unfollowed & Open Next (@
                      {nextUpAfterTargetAccount.username})
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Batch #{safeBatchIndex + 1} Completed!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#9CA3AF] max-w-md mx-auto">
                    All accounts in this batch have been marked as unfollowed and saved to your permanent history.
                  </p>
                </div>
                {safeBatchIndex < totalBatches - 1 && (
                  <button
                    onClick={onNextBatch}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] cursor-pointer"
                  >
                    <span>Advance to Batch #{safeBatchIndex + 2}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-[#9CA3AF] bg-slate-50 dark:bg-[#11182B] p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
            <ShieldAlert className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <span>
              Android & Redmi Deep-Link Integration: Launches <code className="font-mono text-violet-300">com.instagram.android</code> directly to the user profile without requiring manual username copy/paste or passwords.
            </span>
          </div>
        </div>

        {/* Right 6 Cols: Batch Queue List */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-6 flex flex-col shadow-lg">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Batch Queue List (Batch #{safeBatchIndex + 1})
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">
                {completedInCurrentBatch} completed · {remainingInCurrentBatchCount} remaining in this batch
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-[#9CA3AF]">
              Size: {batchSession.batchSize}/batch
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[440px] divide-y divide-slate-200 dark:divide-white/5 pr-1">
            {currentBatchAccounts.map((acc, idx) => {
              const isCompleted = completedSet.has(acc.normalizedUsername);
              const isCurrentTarget =
                activeTargetAccount?.normalizedUsername === acc.normalizedUsername;
              const wasOpened = openedProfilesSet.has(acc.normalizedUsername);
              const wasSkipped = skippedSet.has(acc.normalizedUsername);

              // Status badge: Pending, Opened, Completed, Skipped
              let statusLabel = 'Pending';
              let statusColor =
                'text-amber-300 bg-amber-500/15 border-amber-500/30';
              if (isCompleted) {
                statusLabel = 'Completed';
                statusColor =
                  'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
              } else if (wasOpened) {
                statusLabel = 'Opened';
                statusColor =
                  'text-violet-300 bg-violet-500/15 border-violet-500/30';
              } else if (wasSkipped) {
                statusLabel = 'Skipped';
                statusColor =
                  'text-slate-300 bg-slate-500/15 border-slate-500/30';
              }

              return (
                <div
                  key={acc.normalizedUsername}
                  onClick={() => {
                    if (!isCompleted) {
                      onSelectTargetInBatch(acc.normalizedUsername);
                    }
                  }}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                    isCurrentTarget
                      ? 'bg-violet-500/15 border border-violet-500/40'
                      : isCompleted
                      ? 'opacity-55'
                      : 'hover:bg-slate-50 dark:hover:bg-[#1E2946]/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono tabular-nums text-slate-400 w-6">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-mono font-semibold truncate ${
                            isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          @{acc.username}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onOpenInInstagramApp(acc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-violet-700 dark:text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors cursor-pointer"
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>Open</span>
                    </button>
                    {!isCompleted ? (
                      <button
                        onClick={() => onMarkTargetUnfollowed(acc)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] cursor-pointer"
                      >
                        Unfollowed
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400 px-2">
                        Done
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
