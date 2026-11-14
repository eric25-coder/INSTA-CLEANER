import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CompletedAccountRecord } from '../types/instagram';

interface HistoryViewProps {
  completedRecords: CompletedAccountRecord[];
  onRestoreAccount: (normalizedUsername: string) => Promise<void>;
  onClearAllHistory: () => Promise<void>;
  onExportHistoryCsv: () => void;
  onExportHistoryJson: () => void;
  onRestoreHistoryFromFile: (file: File) => Promise<void>;
}

type HistorySortMode = 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc';
type DateRangeFilter = 'all' | 'today' | '7d' | '30d' | 'custom';

export const HistoryView: React.FC<HistoryViewProps> = ({
  completedRecords,
  onRestoreAccount,
  onClearAllHistory,
  onExportHistoryCsv,
  onExportHistoryJson,
  onRestoreHistoryFromFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<HistorySortMode>('date-desc');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all');
  const [customDate, setCustomDate] = useState('');
  const [copiedUser, setCopiedUser] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase().replace(/^@/, '');
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    const list = completedRecords.filter((rec) => {
      if (dateRangeFilter === 'today' && rec.completedDate !== todayIso) {
        return false;
      }
      if (dateRangeFilter === '7d') {
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        if (rec.completedDate < cutoff) return false;
      }
      if (dateRangeFilter === '30d') {
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        if (rec.completedDate < cutoff) return false;
      }
      if (dateRangeFilter === 'custom' && customDate) {
        if (rec.completedDate !== customDate) return false;
      }

      if (!query) return true;
      return (
        rec.normalizedUsername.includes(query) ||
        rec.username.toLowerCase().includes(query) ||
        rec.completedDate.includes(query)
      );
    });

    list.sort((a, b) => {
      if (sortMode === 'date-desc') {
        return b.completedAt.localeCompare(a.completedAt);
      }
      if (sortMode === 'date-asc') {
        return a.completedAt.localeCompare(b.completedAt);
      }
      if (sortMode === 'alpha-asc') {
        return a.normalizedUsername.localeCompare(b.normalizedUsername);
      }
      if (sortMode === 'alpha-desc') {
        return b.normalizedUsername.localeCompare(a.normalizedUsername);
      }
      return 0;
    });

    return list;
  }, [completedRecords, customDate, dateRangeFilter, searchQuery, sortMode]);

  const handleCopy = async (username: string) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUser(username);
      setTimeout(() => setCopiedUser(null), 1600);
    } catch {
      // Ignore
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onRestoreHistoryFromFile(file);
      setRestoreFeedback(`Successfully restored completion records from ${file.name}.`);
      setTimeout(() => setRestoreFeedback(null), 4000);
    } catch (err) {
      setRestoreFeedback(
        err instanceof Error ? err.message : 'Failed to restore history file.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Export / Restore Actions */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Permanent IndexedDB Completion Log</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Completed Accounts History
            </h1>
            <p className="text-sm text-slate-600 dark:text-[#9CA3AF] max-w-2xl">
              Every account listed here is permanently excluded from your active unfollow queue—even when you refresh, restart your device, or import an updated Instagram ZIP export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onExportHistoryCsv}
              disabled={completedRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] disabled:opacity-40 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV ({completedRecords.length})</span>
            </button>

            <button
              onClick={onExportHistoryJson}
              disabled={completedRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileJson className="w-3.5 h-3.5 text-violet-400" />
              <span>Export JSON</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#1E2946] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restore JSON</span>
            </button>
          </div>
        </div>

        {restoreFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {restoreFeedback}
          </div>
        )}
      </div>

      {/* Search, Date Filter & Sort Toolbar */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] p-5 space-y-4 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search completed usernames..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Pills + Custom Date Picker */}
          <div className="lg:col-span-5 flex flex-wrap items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
            {(
              [
                { id: 'all', label: 'All Dates' },
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7D' },
                { id: '30d', label: 'Last 30D' },
              ] as Array<{ id: DateRangeFilter; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setDateRangeFilter(opt.id);
                  setCustomDate('');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  dateRangeFilter === opt.id
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white'
                    : 'bg-slate-100 dark:bg-[#11182B] text-slate-600 dark:text-[#9CA3AF] hover:text-white border border-slate-200 dark:border-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateRangeFilter(e.target.value ? 'custom' : 'all');
              }}
              aria-label="Filter by date"
              className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white cursor-pointer"
            />
          </div>

          {/* Sort Mode & Clear History */}
          <div className="lg:col-span-3 flex items-center justify-end gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as HistorySortMode)}
                aria-label="Sort completed history"
                className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="date-desc">Newest Completed</option>
                <option value="date-asc">Oldest Completed</option>
                <option value="alpha-asc">Username (A → Z)</option>
                <option value="alpha-desc">Username (Z → A)</option>
              </select>
            </div>

            {completedRecords.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Clear History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Clear History Confirmation Dialog */}
        {showClearConfirm && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                Confirm Clearing Permanent Unfollowed History?
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                This will remove all {completedRecords.length} completed records and return those accounts to your active Remaining Non-Followers list.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={async () => {
                  await onClearAllHistory();
                  setShowClearConfirm(false);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer whitespace-nowrap"
              >
                Yes, Clear All History
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History List Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171F35] overflow-hidden shadow-lg">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              {completedRecords.length === 0
                ? 'Your Completed Accounts History is currently empty'
                : 'No completed accounts match your filter'}
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF] max-w-md mx-auto">
              {completedRecords.length === 0
                ? 'Mark accounts as unfollowed in the Dashboard, Non-Followers, or Unfollow Manager views to permanently record them here.'
                : 'Try selecting "All Dates" or clearing your search query.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-500 dark:text-[#9CA3AF] bg-slate-50/50 dark:bg-[#11182B]">
                  <th className="py-3.5 pl-5 pr-3">Username</th>
                  <th className="py-3.5 px-3">Instagram Link</th>
                  <th className="py-3.5 px-3">Date Completed</th>
                  <th className="py-3.5 px-3">Time Completed</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Undo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-sm">
                {filteredRecords.map((rec) => (
                  <tr
                    key={rec.normalizedUsername}
                    className="hover:bg-slate-50 dark:hover:bg-[#1E2946]/50 transition-colors"
                  >
                    <td className="py-3.5 pl-5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          @{rec.username}
                        </span>
                        <button
                          onClick={() => handleCopy(rec.username)}
                          title="Copy username"
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {copiedUser === rec.username ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <a
                        href={rec.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap"
                      >
                        <span>{rec.profileUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>

                    <td className="py-3.5 px-3 font-mono tabular-nums text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {rec.completedDate}
                    </td>

                    <td className="py-3.5 px-3 font-mono tabular-nums text-xs text-slate-500 dark:text-[#9CA3AF] whitespace-nowrap">
                      {rec.completedTime}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Completed</span>
                      </span>
                    </td>

                    <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onRestoreAccount(rec.normalizedUsername)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Undo</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
