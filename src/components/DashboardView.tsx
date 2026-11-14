import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BarChart3,
  Check,
  CheckCircle2,
  CheckSquare,
  CloudUpload,
  ExternalLink,
  Filter,
  PieChart,
  Play,
  Search,
  ShieldCheck,
  Smartphone,
  Square,
  User,
  UserCheck,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  CompletedAccountRecord,
  InstagramAccount,
  NavigationTab,
  PrimaryZipRecord,
  ReconciliationSummary,
  StoragePersistenceInfo,
  StoredDataset,
} from '../types/instagram';
import { InstaCleanerLogo } from './InstaCleanerLogo';

interface DashboardViewProps {
  dataset: StoredDataset | null;
  primaryZip: PrimaryZipRecord | null;
  persistenceInfo: StoragePersistenceInfo;
  totalFollowing: number;
  totalFollowers: number;
  totalMutuals: number;
  totalNonFollowersIdentified: number;
  totalCompletedCount: number;
  remainingNonFollowers: InstagramAccount[];
  completionPercentage: number;
  recentCompletions: CompletedAccountRecord[];
  lastReconciliation: ReconciliationSummary | null;
  selectedUsernames: Set<string>;
  onToggleSelectAccount: (normalizedUsername: string) => void;
  onMarkCompleted: (account: InstagramAccount) => Promise<void>;
  onNavigate: (tab: NavigationTab) => void;
  onStartQuickBatch: () => void;
  onOpenInInstagramApp: (account: InstagramAccount) => void;
  openedProfilesSet: Set<string>;
}

const AVATAR_GRADIENTS = [
  'from-violet-600 to-fuchsia-500',
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-purple-600',
];

function getAccountCategoryLabel(username: string): string {
  const lower = username.toLowerCase();
  if (lower.includes('photo') || lower.includes('film') || lower.includes('cinema'))
    return 'Photography & Visuals';
  if (lower.includes('arch') || lower.includes('design') || lower.includes('studio'))
    return 'Architecture & Design';
  if (lower.includes('fit') || lower.includes('run') || lower.includes('athletic'))
    return 'Fitness & Health';
  if (lower.includes('roast') || lower.includes('coffee') || lower.includes('kitchen'))
    return 'Food & Specialty Coffee';
  if (lower.includes('tech') || lower.includes('code') || lower.includes('ai'))
    return 'Technology & Engineering';
  if (lower.includes('travel') || lower.includes('alpine') || lower.includes('coastal'))
    return 'Travel & Lifestyle';
  return 'Creator & Lifestyle';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  totalFollowing,
  totalFollowers,
  totalMutuals,
  totalNonFollowersIdentified,
  totalCompletedCount,
  remainingNonFollowers,
  completionPercentage,
  lastReconciliation,
  selectedUsernames,
  onToggleSelectAccount,
  onMarkCompleted,
  onNavigate,
  onStartQuickBatch,
  onOpenInInstagramApp,
  openedProfilesSet,
}) => {
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D'>('7D');
  const [inlineSearch, setInlineSearch] = useState('');
  const [inlineFilter, setInlineFilter] = useState<'all' | 'pending' | 'opened'>('all');
  const [inlineSort, setInlineSort] = useState<'alpha-asc' | 'alpha-desc' | 'oldest'>('alpha-asc');

  // Filter and sort the inline Non-Followers preview list on Dashboard
  const previewNonFollowers = useMemo(() => {
    const q = inlineSearch.trim().toLowerCase().replace(/^@/, '');
    const filtered = remainingNonFollowers.filter((acc) => {
      const isOpened = openedProfilesSet.has(acc.normalizedUsername);
      if (inlineFilter === 'pending' && isOpened) return false;
      if (inlineFilter === 'opened' && !isOpened) return false;
      if (q && !acc.normalizedUsername.includes(q) && !acc.username.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (inlineSort === 'alpha-asc') return a.normalizedUsername.localeCompare(b.normalizedUsername);
      if (inlineSort === 'alpha-desc') return b.normalizedUsername.localeCompare(a.normalizedUsername);
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    return filtered.slice(0, 8);
  }, [remainingNonFollowers, openedProfilesSet, inlineSearch, inlineFilter, inlineSort]);

  // Circular Progress Ring Geometry
  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const clampedPercent = Math.min(100, Math.max(0, completionPercentage));
  const strokeDashoffset =
    ringCircumference - (clampedPercent / 100) * ringCircumference;

  const mutualPercent =
    totalFollowing > 0 ? Math.round((totalMutuals / totalFollowing) * 100) : 0;
  const nonFollowerPercent =
    totalFollowing > 0
      ? Math.round((totalNonFollowersIdentified / totalFollowing) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Hero & Glassmorphic Brand Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome Back!
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-[#94A3B8]">
            Manage your Instagram following efficiently.
          </p>
        </div>

        {/* Sleek Glassmorphic Feature Card */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-[#1E1B4B]/90 via-[#2E1065]/85 to-[#4C1D95]/80 px-5 py-3.5 shadow-lg flex items-center gap-4">
          <InstaCleanerLogo size="md" />
          <div className="pr-2">
            <div className="text-sm font-bold text-white">
              Cleaner. Smarter. More Organized.
            </div>
            <div className="text-xs text-purple-200/80">
              Take control of your following list.
            </div>
          </div>
        </div>
      </div>

      {/* Automatic Reconciliation Notice if a new ZIP was imported */}
      {lastReconciliation && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>{lastReconciliation.sourceLabel}</strong> reconciled: Excluded{' '}
              <strong className="text-emerald-400">
                {lastReconciliation.alreadyCompletedRecognized}
              </strong>{' '}
              completed accounts, leaving{' '}
              <strong className="text-violet-400">
                {lastReconciliation.outstandingRemaining}
              </strong>{' '}
              remaining non-followers.
            </span>
          </div>
          <button
            onClick={() => onNavigate('non-followers')}
            className="text-xs font-semibold text-violet-400 hover:underline whitespace-nowrap cursor-pointer"
          >
            View All Non-Followers →
          </button>
        </div>
      )}

      {/* 6 Signature Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Followers */}
        <div
          onClick={() => onNavigate('followers')}
          className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-[#23194F] via-[#1A163B] to-[#14142B] p-4 shadow-md hover:border-violet-500/50 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300">
            <Users className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
              {totalFollowers.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-300">
              Total Followers
            </div>
          </div>
          <div className="mt-2.5 text-[11px] font-mono text-emerald-400">
            ↑ Active Followers List
          </div>
        </div>

        {/* 2. Total Following */}
        <div
          onClick={() => onNavigate('following')}
          className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-[#12264E] via-[#111E3D] to-[#11172D] p-4 shadow-md hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <User className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
              {totalFollowing.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-300">
              Total Following
            </div>
          </div>
          <div className="mt-2.5 text-[11px] font-mono text-sky-400">
            {mutualPercent}% Follow Back Rate
          </div>
        </div>

        {/* 3. Not Following You Back */}
        <div
          onClick={() => onNavigate('non-followers')}
          className="rounded-2xl border border-pink-500/25 bg-gradient-to-br from-[#461638] via-[#31132C] to-[#1C1224] p-4 shadow-md hover:border-pink-500/50 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-300">
            <XCircle className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
              {totalNonFollowersIdentified.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-300">
              Not Following You Back
            </div>
          </div>
          <div className="mt-2.5 text-[11px] font-mono text-pink-400">
            {nonFollowerPercent}% of Following
          </div>
        </div>

        {/* 4. Mutual Followers */}
        <div
          onClick={() => onNavigate('following')}
          className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-[#103B34] via-[#102A28] to-[#0E1B22] p-4 shadow-md hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
              {totalMutuals.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-300">
              Mutual Followers
            </div>
          </div>
          <div className="mt-2.5 text-[11px] font-mono text-emerald-400">
            ↑ Mutual Connections
          </div>
        </div>

        {/* 5. Successfully Unfollowed */}
        <div
          onClick={() => onNavigate('history')}
          className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-[#472912] via-[#311E12] to-[#1D1618] p-4 shadow-md hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
              {totalCompletedCount.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-300">
              Unfollowed
            </div>
          </div>
          <div className="mt-2.5 text-[11px] font-mono text-emerald-400">
            ↑ Saved in History
          </div>
        </div>

        {/* 6. Accounts Remaining */}
        <div
          onClick={() => onNavigate('batch')}
          className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#0F394C] via-[#10283A] to-[#0E1A2B] p-4 shadow-md hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
            <PieChart className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
              {remainingNonFollowers.length.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-300">
              Remaining
            </div>
          </div>
          <div className="mt-2.5 text-[11px] font-mono text-cyan-300">
            {clampedPercent.toFixed(0)}% Task Complete
          </div>
        </div>
      </div>

      {/* Middle Row: Unfollow Progress (Circular Ring) & Account Overview Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 5 Cols: Unfollow Progress Card with Circular Progress Indicator */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#242F4D] bg-white dark:bg-[#171F35] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Unfollow Progress
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-[#94A3B8]">
              IndexedDB Synced
            </span>
          </div>

          <div className="my-4 flex flex-col sm:flex-row items-center justify-around gap-6">
            {/* SVG Circular Donut Progress Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                <defs>
                  <linearGradient id="instaProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
                <circle
                  cx="64"
                  cy="64"
                  r={ringRadius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-200 dark:text-[#232F4E]"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={ringRadius}
                  fill="transparent"
                  stroke="url(#instaProgressGrad)"
                  strokeWidth="12"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  {Math.round(clampedPercent)}%
                </span>
                <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Complete
                </span>
              </div>
            </div>

            {/* Completed & Remaining Legend + Mini Progress Bar */}
            <div className="flex-1 w-full space-y-4 sm:border-l sm:border-slate-200 dark:sm:border-[#242F4D] sm:pl-6">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono font-bold tabular-nums text-emerald-400">
                    {totalCompletedCount.toLocaleString()}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">
                    Completed
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <span className="w-3.5 h-3.5 rounded-full bg-sky-400 inline-block shrink-0" />
                  <span className="font-mono font-bold tabular-nums text-sky-400">
                    {remainingNonFollowers.length.toLocaleString()}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">
                    Remaining
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-[#232F4E] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                    style={{ width: `${Math.max(6, clampedPercent)}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  {totalCompletedCount + remainingNonFollowers.length} total non-followers tracked
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Account Overview Multi-Series Visual Area Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#242F4D] bg-white dark:bg-[#171F35] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Account Overview
            </h2>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-[#242F4D]">
              {(['7D', '30D', '90D'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setChartRange(range)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    chartRange === range
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Legend Column */}
            <div className="sm:col-span-4 space-y-3 text-xs">
              <div className="flex items-center justify-between sm:justify-start gap-2.5">
                <span className="w-3 h-3 rounded-full bg-violet-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300">Followers</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white ml-auto">
                  {totalFollowers}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-2.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300">Following</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white ml-auto">
                  {totalFollowing}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-2.5">
                <span className="w-3 h-3 rounded-full bg-pink-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300">Non-Followers</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white ml-auto">
                  {remainingNonFollowers.length}
                </span>
              </div>
            </div>

            {/* Smooth SVG Area Chart */}
            <div className="sm:col-span-8 h-40 w-full">
              <svg
                viewBox="0 0 420 140"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="followingArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="followersArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="nonFollowersArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#EC4899" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                <line x1="0" y1="25" x2="420" y2="25" stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
                <line x1="0" y1="65" x2="420" y2="65" stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
                <line x1="0" y1="105" x2="420" y2="105" stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
                <line x1="0" y1="132" x2="420" y2="132" stroke="rgba(148,163,184,0.2)" />

                {/* Following Wave */}
                <path
                  d={
                    chartRange === '7D'
                      ? 'M0,55 C45,35 85,20 130,38 C175,56 215,30 265,42 C315,54 365,24 420,34 L420,132 L0,132 Z'
                      : chartRange === '30D'
                      ? 'M0,48 C50,28 90,45 140,30 C190,15 230,48 280,35 C330,22 375,40 420,28 L420,132 L0,132 Z'
                      : 'M0,60 C55,40 95,25 145,42 C195,58 240,28 290,38 C340,48 380,30 420,32 L420,132 L0,132 Z'
                  }
                  fill="url(#followingArea)"
                />
                <path
                  d={
                    chartRange === '7D'
                      ? 'M0,55 C45,35 85,20 130,38 C175,56 215,30 265,42 C315,54 365,24 420,34'
                      : chartRange === '30D'
                      ? 'M0,48 C50,28 90,45 140,30 C190,15 230,48 280,35 C330,22 375,40 420,28'
                      : 'M0,60 C55,40 95,25 145,42 C195,58 240,28 290,38 C340,48 380,30 420,32'
                  }
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                />

                {/* Followers Wave */}
                <path
                  d="M0,78 C50,68 95,82 145,64 C195,46 240,58 290,72 C340,86 380,68 420,70 L420,132 L0,132 Z"
                  fill="url(#followersArea)"
                />
                <path
                  d="M0,78 C50,68 95,82 145,64 C195,46 240,58 290,72 C340,86 380,68 420,70"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="2.5"
                />

                {/* Non-Followers Wave */}
                <path
                  d="M0,98 C55,92 100,104 155,82 C210,60 250,88 305,96 C355,104 385,90 420,92 L420,132 L0,132 Z"
                  fill="url(#nonFollowersArea)"
                />
                <path
                  d="M0,98 C55,92 100,104 155,82 C210,60 250,88 305,96 C355,104 385,90 420,92"
                  fill="none"
                  stroke="#EC4899"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Non-Followers Interactive List (8 Cols) & Quick Actions Card (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Cols: Non-Followers Preview Panel matching template */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-[#242F4D] bg-white dark:bg-[#171F35] p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Panel Header with Inline Search, Filter & Sort */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#242F4D]">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Non-Followers
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    These are the accounts you follow but they do not follow you back.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Inline Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={inlineSearch}
                    onChange={(e) => setInlineSearch(e.target.value)}
                    placeholder="Search accounts..."
                    className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#11182B] border border-slate-200 dark:border-[#263252] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 w-40 sm:w-44"
                  />
                </div>

                {/* Filter Button */}
                <button
                  onClick={() =>
                    setInlineFilter((prev) =>
                      prev === 'all' ? 'pending' : prev === 'pending' ? 'opened' : 'all'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-[#263252] text-slate-700 dark:text-slate-200 hover:border-violet-500/50 cursor-pointer whitespace-nowrap"
                >
                  <Filter className="w-3.5 h-3.5 text-violet-400" />
                  <span>
                    {inlineFilter === 'all'
                      ? 'Filter: All'
                      : inlineFilter === 'pending'
                      ? 'Filter: Pending'
                      : 'Filter: Opened'}
                  </span>
                </button>

                {/* Sort Button */}
                <button
                  onClick={() =>
                    setInlineSort((prev) =>
                      prev === 'alpha-asc'
                        ? 'alpha-desc'
                        : prev === 'alpha-desc'
                        ? 'oldest'
                        : 'alpha-asc'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-[#263252] text-slate-700 dark:text-slate-200 hover:border-violet-500/50 cursor-pointer whitespace-nowrap"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-violet-400" />
                  <span>
                    {inlineSort === 'alpha-asc'
                      ? 'Sort: A–Z'
                      : inlineSort === 'alpha-desc'
                      ? 'Sort: Z–A'
                      : 'Sort: Oldest'}
                  </span>
                </button>
              </div>
            </div>

            {/* Account Rows */}
            {previewNonFollowers.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  No matching pending non-followers
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Try clearing your search filter or view all accounts.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-[#242F4D] max-h-[320px] overflow-y-auto pr-1">
                {previewNonFollowers.map((acc, idx) => {
                  const wasOpened = openedProfilesSet.has(acc.normalizedUsername);
                  const isSelected = selectedUsernames.has(acc.normalizedUsername);
                  const avatarGradient =
                    AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

                  return (
                    <div
                      key={acc.normalizedUsername}
                      className="py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-[#1C2540]/60 px-2 rounded-xl transition-colors"
                    >
                      {/* Avatar + Username + Category Subtitle */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-xs font-bold font-mono text-white shrink-0 shadow-xs`}
                        >
                          {acc.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => onOpenInInstagramApp(acc)}
                            className="text-sm font-bold text-slate-900 dark:text-white hover:text-violet-400 truncate block text-left cursor-pointer"
                          >
                            {acc.username}
                          </button>
                          <div className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                            {getAccountCategoryLabel(acc.username)}
                          </div>
                        </div>
                      </div>

                      {/* Controls: External Web Icon, Open in Instagram Button, Status, Complete & Checkbox */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <a
                          href={acc.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open web URL"
                          className="p-1.5 text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => onOpenInInstagramApp(acc)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Open in Instagram</span>
                        </button>

                        <button
                          onClick={() => onMarkCompleted(acc)}
                          title="Click to mark as unfollowed"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>{wasOpened ? 'Opened · Mark Done' : 'Pending'}</span>
                        </button>

                        <button
                          onClick={() => onToggleSelectAccount(acc.normalizedUsername)}
                          aria-label={`Select ${acc.username}`}
                          className="p-1 text-slate-400 hover:text-violet-400 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-violet-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 mt-2 border-t border-slate-200 dark:border-[#242F4D] flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
            <span>
              Showing {previewNonFollowers.length} of {remainingNonFollowers.length} remaining non-followers
            </span>
            <button
              onClick={() => onNavigate('non-followers')}
              className="font-semibold text-violet-400 hover:underline cursor-pointer"
            >
              Open Full Non-Followers Manager →
            </button>
          </div>
        </div>

        {/* Right 4 Cols: Quick Actions Card matching template */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-[#242F4D] bg-white dark:bg-[#171F35] p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Quick Actions
              </h2>
            </div>

            <div className="space-y-3">
              {/* 1. Start Unfollow Session */}
              <button
                onClick={onStartQuickBatch}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Unfollow Session</span>
              </button>

              {/* 2. View Completed */}
              <button
                onClick={() => onNavigate('history')}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E2744] hover:bg-slate-200 dark:hover:bg-[#263154] border border-slate-200 dark:border-[#2E3B63] transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4 text-violet-400" />
                <span>View Completed ({totalCompletedCount})</span>
              </button>

              {/* 3. Import New ZIP */}
              <button
                onClick={() => onNavigate('import')}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E2744] hover:bg-slate-200 dark:hover:bg-[#263154] border border-slate-200 dark:border-[#2E3B63] transition-colors cursor-pointer"
              >
                <CloudUpload className="w-4 h-4 text-sky-400" />
                <span>Import New ZIP</span>
              </button>

              {/* 4. View Analytics */}
              <button
                onClick={() => onNavigate('analytics')}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E2744] hover:bg-slate-200 dark:hover:bg-[#263154] border border-slate-200 dark:border-[#2E3B63] transition-colors cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-pink-400" />
                <span>View Analytics</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#242F4D] text-xs text-slate-500 dark:text-[#94A3B8] flex items-center justify-between">
            <span>All unfollows saved locally</span>
            <span className="font-mono text-emerald-400 font-semibold">v3.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
