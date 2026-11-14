import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  CheckSquare,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Layers,
  Search,
  Smartphone,
  Square,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CompletedAccountRecord,
  InstagramAccount,
} from '../types/instagram';

interface NonFollowersViewProps {
  allNonFollowers: InstagramAccount[];
  remainingNonFollowers: InstagramAccount[];
  completedSet: Set<string>;
  completedMap: Map<string, CompletedAccountRecord>;
  selectedUsernames: Set<string>;
  hideCompletedAccounts: boolean;
  openedProfilesSet: Set<string>;
  onToggleSelectAccount: (normalizedUsername: string) => void;
  onSelectMultipleAccounts: (normalizedUsernames: string[]) => void;
  onClearSelection: () => void;
  onToggleHideCompleted: (hide: boolean) => void;
  onMarkCompleted: (account: InstagramAccount) => Promise<void>;
  onMarkBulkCompleted: (accounts: InstagramAccount[]) => Promise<void>;
  onUndoCompleted: (normalizedUsername: string) => Promise<void>;
  onStartBatchWithSelected: () => void;
  onOpenInInstagramApp: (account: InstagramAccount) => void;
  onExportRemainingCsv: () => void;
  onExportAllNonFollowersCsv: () => void;
}

type StatusFilter = 'all' | 'pending' | 'opened' | 'selected';
type SortMode = 'alpha-asc' | 'alpha-desc' | 'oldest' | 'newest';

const AVATAR_GRADIENTS = [
  'from-violet-600 to-fuchsia-600',
  'from-pink-600 to-rose-500',
  'from-blue-600 to-indigo-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-cyan-600 to-blue-600',
];

function getAvatarGradient(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export const NonFollowersView: React.FC<NonFollowersViewProps> = ({
  remainingNonFollowers,
  completedSet,
  selectedUsernames,
  openedProfilesSet,
  onToggleSelectAccount,
  onSelectMultipleAccounts,
  onClearSelection,
  onMarkCompleted,
  onMarkBulkCompleted,
  onStartBatchWithSelected,
  onOpenInInstagramApp,
  onExportRemainingCsv,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('alpha-asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedUsername, setCopiedUsername] = useState<string | null>(null);
  const [confirmBulkComplete, setConfirmBulkComplete] = useState(false);

  // Permanently exclude any account marked done (completedSet) from the active Non-Followers list
  const activeNonFollowers = useMemo(
    () =>
      remainingNonFollowers.filter(
        (acc) => !completedSet.has(acc.normalizedUsername)
      ),
    [remainingNonFollowers, completedSet]
  );

  const pendingCount = useMemo(
    () =>
      activeNonFollowers.filter(
        (a) => !openedProfilesSet.has(a.normalizedUsername)
      ).length,
    [activeNonFollowers, openedProfilesSet]
  );

  const openedCount = useMemo(
    () =>
      activeNonFollowers.filter((a) =>
        openedProfilesSet.has(a.normalizedUsername)
      ).length,
    [activeNonFollowers, openedProfilesSet]
  );

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.trim().toLowerCase().replace(/^@/, '');

    const list = activeNonFollowers.filter((acc) => {
      const isSelected = selectedUsernames.has(acc.normalizedUsername);
      const wasOpened = openedProfilesSet.has(acc.normalizedUsername);

      if (statusFilter === 'pending' && wasOpened) return false;
      if (statusFilter === 'opened' && !wasOpened) return false;
      if (statusFilter === 'selected' && !isSelected) return false;

      if (
        query &&
        !acc.normalizedUsername.includes(query) &&
        !acc.username.toLowerCase().includes(query)
      ) {
        return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortMode === 'alpha-asc') {
        return a.normalizedUsername.localeCompare(b.normalizedUsername);
      }
      if (sortMode === 'alpha-desc') {
        return b.normalizedUsername.localeCompare(a.normalizedUsername);
      }
      if (sortMode === 'oldest') {
        return (a.timestamp || 0) - (b.timestamp || 0);
      }
      if (sortMode === 'newest') {
        return (b.timestamp || 0) - (a.timestamp || 0);
      }
      return 0;
    });

    return list;
  }, [
    activeNonFollowers,
    openedProfilesSet,
    searchQuery,
    selectedUsernames,
    sortMode,
    statusFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const visibleAccounts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safePage, pageSize]);

  const handleCopy = async (username: string) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUsername(username);
      setTimeout(() => setCopiedUsername(null), 1600);
    } catch {
      // Ignore
    }
  };

  const handleSelectAllVisible = () => {
    const visibleUsernames = visibleAccounts.map((a) => a.normalizedUsername);
    onSelectMultipleAccounts(visibleUsernames);
  };

  const handleSelectAllNonFollowers = () => {
    const allRemainingUsernames = activeNonFollowers.map(
      (a) => a.normalizedUsername
    );
    onSelectMultipleAccounts(allRemainingUsernames);
  };

  const selectedRemainingAccounts = useMemo(
    () =>
      activeNonFollowers.filter((a) =>
        selectedUsernames.has(a.normalizedUsername)
      ),
    [activeNonFollowers, selectedUsernames]
  );

  const allVisibleSelected = useMemo(() => {
    return (
      visibleAccounts.length > 0 &&
      visibleAccounts.every((a) => selectedUsernames.has(a.normalizedUsername))
    );
  }, [visibleAccounts, selectedUsernames]);

  return (
    <div className="space-y-6">
      {/* Header & Primary Export Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Non-Followers List ({activeNonFollowers.length.toLocaleString()})
          </h1>
          <p className="text-sm text-slate-600 dark:text-[#9CA3AF]">
            Accounts you follow that do not follow you back. Marking an account as done permanently removes it from your active list.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onExportRemainingCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#171F35] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#1E2946] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-violet-400" />
            <span>Export Non-Followers CSV ({activeNonFollowers.length})</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & Sort Controls Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-5 space-y-4 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search usernames..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs: All Active, Pending, Opened in App, Selected */}
          <div className="lg:col-span-5 flex flex-wrap items-center p-1 rounded-xl bg-slate-100 dark:bg-[#11182B] border border-slate-200/60 dark:border-white/10 gap-1">
            <button
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({activeNonFollowers.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('pending');
                setCurrentPage(1);
              }}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => {
                setStatusFilter('opened');
                setCurrentPage(1);
              }}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'opened'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Opened ({openedCount})
            </button>
            <button
              onClick={() => {
                setStatusFilter('selected');
                setCurrentPage(1);
              }}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'selected'
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Selected ({selectedRemainingAccounts.length})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortMode}
              onChange={(e) => {
                setSortMode(e.target.value as SortMode);
                setCurrentPage(1);
              }}
              aria-label="Sort non-followers"
              className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="alpha-asc">Sort Alphabetically (A → Z)</option>
              <option value="alpha-desc">Sort Alphabetically (Z → A)</option>
              <option value="newest">Date Followed (Newest First)</option>
              <option value="oldest">Date Followed (Oldest First)</option>
            </select>
          </div>
        </div>

        {/* Select All Toolbar */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectAllVisible}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <CheckSquare className="w-3.5 h-3.5 text-violet-400" />
              <span>Select Page ({visibleAccounts.length})</span>
            </button>

            <button
              onClick={handleSelectAllNonFollowers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <CheckSquare className="w-3.5 h-3.5 text-pink-400" />
              <span>Select All ({activeNonFollowers.length})</span>
            </button>

            {selectedRemainingAccounts.length > 0 && (
              <button
                onClick={onClearSelection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Selection ({selectedRemainingAccounts.length})</span>
              </button>
            )}
          </div>

          <div className="text-xs text-emerald-400 font-medium">
            Accounts marked Done are permanently removed from this list
          </div>
        </div>

        {/* Active Selection Action Bar */}
        {selectedRemainingAccounts.length > 0 && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-900/30 via-purple-900/25 to-pink-900/30 border border-violet-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
              <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                {selectedRemainingAccounts.length}
              </span>{' '}
              account{selectedRemainingAccounts.length === 1 ? '' : 's'} selected for batch session or permanent removal.
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={onStartBatchWithSelected}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  Start Unfollow Session ({selectedRemainingAccounts.length})
                </span>
              </button>

              {!confirmBulkComplete ? (
                <button
                  onClick={() => setConfirmBulkComplete(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Done & Remove Permanently</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={async () => {
                      await onMarkBulkCompleted(selectedRemainingAccounts);
                      setConfirmBulkComplete(false);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer whitespace-nowrap"
                  >
                    Confirm Remove ({selectedRemainingAccounts.length})
                  </button>
                  <button
                    onClick={() => setConfirmBulkComplete(false)}
                    className="px-2.5 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Accounts List Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-[#9CA3AF]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (allVisibleSelected) {
                  onClearSelection();
                } else {
                  handleSelectAllVisible();
                }
              }}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-violet-400 cursor-pointer"
            >
              {allVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-violet-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All on Page</span>
            </button>
            <span>·</span>
            <div>
              Showing{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {filteredAndSorted.length === 0
                  ? 0
                  : (safePage - 1) * pageSize + 1}
              </span>
              –
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {Math.min(safePage * pageSize, filteredAndSorted.length)}
              </span>{' '}
              of{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {filteredAndSorted.length}
              </span>{' '}
              accounts
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Rows per page"
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#11182B] text-slate-900 dark:text-white font-mono text-xs border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        {filteredAndSorted.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Filter className="w-10 h-10 text-violet-400/60 mx-auto" />
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              No matching accounts found
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF] max-w-md mx-auto">
              {searchQuery
                ? `No usernames matched "${searchQuery}". Try clearing your search filter.`
                : statusFilter === 'selected'
                ? 'You have not selected any accounts yet. Use the checkboxes on account cards to select accounts.'
                : 'All non-followers in your current dataset have been marked done and permanently removed!'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {visibleAccounts.map((acc) => {
              const isSelected = selectedUsernames.has(acc.normalizedUsername);
              const wasOpened = openedProfilesSet.has(acc.normalizedUsername);
              const followedDateStr = acc.timestamp
                ? new Date(acc.timestamp * 1000).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Not Follow Back';

              return (
                <div
                  key={acc.normalizedUsername}
                  className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-violet-500/10'
                      : 'hover:bg-slate-50 dark:hover:bg-[#1E2946]/50'
                  }`}
                >
                  {/* Left: Checkbox + Avatar + Username + Link */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => onToggleSelectAccount(acc.normalizedUsername)}
                      aria-label={`Select ${acc.username}`}
                      className="p-1 text-slate-400 hover:text-violet-400 cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-violet-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(
                        acc.normalizedUsername
                      )} flex items-center justify-center text-white font-bold text-xs uppercase shrink-0 shadow-md ring-2 ring-white/10`}
                    >
                      {acc.username.slice(0, 2)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenInInstagramApp(acc)}
                          className="text-sm font-bold text-slate-900 dark:text-white hover:text-violet-400 truncate cursor-pointer text-left transition-colors"
                        >
                          {acc.username}
                        </button>
                        <button
                          onClick={() => handleCopy(acc.username)}
                          title="Copy username"
                          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedUsername === acc.username ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={acc.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open Instagram web URL"
                          className="p-1 text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[#9CA3AF] truncate">
                        Followed: {followedDateStr} · @{acc.normalizedUsername}
                      </div>
                    </div>
                  </div>

                  {/* Right: Open in Instagram + Status + Mark Done (Permanent Removal) */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:justify-end pl-9 sm:pl-0">
                    {/* Open in Instagram Button */}
                    <button
                      onClick={() => onOpenInInstagramApp(acc)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6]/80 to-[#6D28D9]/80 hover:from-[#8B5CF6] hover:to-[#6D28D9] border border-violet-400/30 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Open in Instagram</span>
                    </button>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                        wasOpened
                          ? 'text-violet-300 bg-violet-500/15 border-violet-500/30'
                          : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          wasOpened ? 'bg-violet-400' : 'bg-amber-400'
                        }`}
                      />
                      <span>{wasOpened ? 'Opened' : 'Pending'}</span>
                    </span>

                    {/* Mark Done & Permanently Remove */}
                    <button
                      onClick={() => onMarkCompleted(acc)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer whitespace-nowrap"
                      title="Mark Done and permanently remove from list"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-[#9CA3AF] font-mono tabular-nums">
              Page {safePage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[#11182B] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[#11182B] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
