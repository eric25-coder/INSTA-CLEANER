import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Copy,
  Download,
  ExternalLink,
  Search,
  Smartphone,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import {
  CompletedAccountRecord,
  InstagramAccount,
} from '../types/instagram';
import { exportAccountsToCsv } from '../utils/exportHelpers';

interface ConnectionsDirectoryViewProps {
  mode: 'following' | 'followers';
  accounts: InstagramAccount[];
  mutualSet: Set<string>;
  completedSet: Set<string>;
  completedMap: Map<string, CompletedAccountRecord>;
  openedProfilesSet: Set<string>;
  onOpenInInstagramApp: (account: InstagramAccount) => void;
  onMarkCompleted?: (account: InstagramAccount) => Promise<void>;
}

type RelationshipFilter = 'all' | 'mutual' | 'one-way';
type SortOption = 'alpha-asc' | 'alpha-desc' | 'newest' | 'oldest';

export const ConnectionsDirectoryView: React.FC<
  ConnectionsDirectoryViewProps
> = ({
  mode,
  accounts,
  mutualSet,
  completedSet,
  completedMap,
  openedProfilesSet,
  onOpenInInstagramApp,
  onMarkCompleted,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [relFilter, setRelFilter] = useState<RelationshipFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('alpha-asc');
  const [page, setPage] = useState(1);
  const [copiedUser, setCopiedUser] = useState<string | null>(null);
  const pageSize = 50;

  const activeAccounts = useMemo(() => {
    if (mode === 'following') {
      return accounts.filter((acc) => !completedSet.has(acc.normalizedUsername));
    }
    return accounts;
  }, [accounts, completedSet, mode]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^@/, '');
    const list = activeAccounts.filter((acc) => {
      const isMutual = mutualSet.has(acc.normalizedUsername);
      if (relFilter === 'mutual' && !isMutual) return false;
      if (relFilter === 'one-way' && isMutual) return false;
      if (
        q &&
        !acc.normalizedUsername.includes(q) &&
        !acc.username.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortOption === 'alpha-asc') {
        return a.normalizedUsername.localeCompare(b.normalizedUsername);
      }
      if (sortOption === 'alpha-desc') {
        return b.normalizedUsername.localeCompare(a.normalizedUsername);
      }
      if (sortOption === 'newest') {
        return (b.timestamp || 0) - (a.timestamp || 0);
      }
      if (sortOption === 'oldest') {
        return (a.timestamp || 0) - (b.timestamp || 0);
      }
      return 0;
    });

    return list;
  }, [activeAccounts, mutualSet, relFilter, searchQuery, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, safePage]);

  const mutualCount = useMemo(
    () => activeAccounts.filter((a) => mutualSet.has(a.normalizedUsername)).length,
    [activeAccounts, mutualSet]
  );
  const oneWayCount = activeAccounts.length - mutualCount;

  const handleCopy = async (username: string) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUser(username);
      setTimeout(() => setCopiedUser(null), 1600);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#242F4D] bg-white dark:bg-[#171F35] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-500 dark:text-violet-400 mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>
                {mode === 'following'
                  ? 'connections/followers_and_following/following.json'
                  : 'connections/followers_and_following/followers_1.json'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === 'following' ? 'Following Accounts' : 'Followers Directory'}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {mode === 'following'
                ? `All ${accounts.length.toLocaleString()} accounts you follow (${mutualCount.toLocaleString()} mutuals, ${oneWayCount.toLocaleString()} not following back).`
                : `All ${accounts.length.toLocaleString()} accounts following you (${mutualCount.toLocaleString()} mutuals, ${oneWayCount.toLocaleString()} followers you don't follow back).`}
            </p>
          </div>

          <button
            onClick={() =>
              exportAccountsToCsv(
                filteredAccounts,
                completedSet,
                completedMap,
                mode === 'following' ? 'insta_cleaner_following' : 'insta_cleaner_followers'
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-[#263252] hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4 text-violet-400" />
            <span>Export {mode === 'following' ? 'Following' : 'Followers'} CSV</span>
          </button>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-[#242F4D] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search usernames..."
              className="w-full pl-10 pr-9 py-2 rounded-xl text-sm bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-[#263252] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="md:col-span-4 flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-[#263252]">
            <button
              onClick={() => {
                setRelFilter('all');
                setPage(1);
              }}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                relFilter === 'all'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({accounts.length})
            </button>
            <button
              onClick={() => {
                setRelFilter('mutual');
                setPage(1);
              }}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                relFilter === 'mutual'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mutuals ({mutualCount})
            </button>
            <button
              onClick={() => {
                setRelFilter('one-way');
                setPage(1);
              }}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                relFilter === 'one-way'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {mode === 'following'
                ? `Non-Followers (${oneWayCount})`
                : `Fans Only (${oneWayCount})`}
            </button>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value as SortOption);
                setPage(1);
              }}
              aria-label="Sort accounts"
              className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-[#263252] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="alpha-asc">Alphabetical (A → Z)</option>
              <option value="alpha-desc">Alphabetical (Z → A)</option>
              <option value="newest">Date Added (Newest)</option>
              <option value="oldest">Date Added (Oldest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Account Cards List */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#242F4D] bg-white dark:bg-[#171F35] overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-200 dark:divide-[#242F4D]">
          {visible.map((acc) => {
            const isMutual = mutualSet.has(acc.normalizedUsername);
            const isCompleted = completedSet.has(acc.normalizedUsername);
            const wasOpened = openedProfilesSet.has(acc.normalizedUsername);
            const dateStr = acc.timestamp
              ? new Date(acc.timestamp * 1000).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recorded in Export';

            return (
              <div
                key={acc.normalizedUsername}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#1D2742] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-xs font-bold font-mono text-white shrink-0 shadow-xs">
                    {acc.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenInInstagramApp(acc)}
                        className="text-sm font-bold font-mono text-slate-900 dark:text-white hover:text-violet-400 truncate cursor-pointer text-left"
                      >
                        @{acc.username}
                      </button>
                      <button
                        onClick={() => handleCopy(acc.username)}
                        title="Copy username"
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {copiedUser === acc.username ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={acc.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open web URL"
                        className="p-1 text-slate-400 hover:text-violet-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                      {isMutual ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                          <UserCheck className="w-3 h-3" />
                          <span>Mutual Follower</span>
                        </span>
                      ) : mode === 'following' ? (
                        <span className="inline-flex items-center gap-1 text-pink-500 font-medium">
                          <UserMinus className="w-3 h-3" />
                          <span>Not Following You Back</span>
                        </span>
                      ) : (
                        <span className="text-sky-400 font-medium">
                          Follows You
                        </span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{dateStr}</span>
                      {wasOpened && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-violet-400 font-medium">
                            Opened in Instagram
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => onOpenInInstagramApp(acc)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Open in Instagram</span>
                  </button>

                  {mode === 'following' && !isMutual && onMarkCompleted && (
                    <>
                      {!isCompleted ? (
                        <button
                          onClick={() => onMarkCompleted(acc)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Unfollowed</span>
                        </button>
                      ) : (
                        <span className="text-xs font-mono text-emerald-400 px-2.5">
                          Unfollowed
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-[#242F4D] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#11182B] text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#11182B] text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
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
