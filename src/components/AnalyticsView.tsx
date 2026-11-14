import React, { useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  TrendingUp,
  UserMinus,
  Users,
} from 'lucide-react';
import { CompletedAccountRecord } from '../types/instagram';

interface AnalyticsViewProps {
  totalIdentified: number;
  totalCompleted: number;
  totalRemaining: number;
  completionPercentage: number;
  totalFollowing: number;
  totalFollowers: number;
  totalMutuals: number;
  completedRecords: CompletedAccountRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  totalIdentified,
  totalCompleted,
  totalRemaining,
  completionPercentage,
  totalFollowing,
  totalFollowers,
  totalMutuals,
  completedRecords,
}) => {
  // Group completions by date (YYYY-MM-DD)
  const dailyStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of completedRecords) {
      const date = r.completedDate || r.completedAt.slice(0, 10);
      map.set(date, (map.get(date) || 0) + 1);
    }

    const sortedDates = Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningTotal = 0;
    return sortedDates.map((item) => {
      runningTotal += item.count;
      return {
        ...item,
        cumulative: runningTotal,
      };
    });
  }, [completedRecords]);

  const maxDailyCount = useMemo(
    () => Math.max(1, ...dailyStats.map((d) => d.count)),
    [dailyStats]
  );

  const maxCumulative = useMemo(
    () => Math.max(1, totalCompleted, ...dailyStats.map((d) => d.cumulative)),
    [dailyStats, totalCompleted]
  );

  const followBackRatio =
    totalFollowing > 0 ? ((totalMutuals / totalFollowing) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Unfollow Analytics & Progress Statistics
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Track your daily unfollowing activity, completion rate over time, and following composition.
        </p>
      </div>

      {/* 4 Primary Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Accounts Identified</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {totalIdentified.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Initial non-followers + historical records
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Accounts Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {totalCompleted.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Confirmed unfollowed in database
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Accounts Remaining</span>
            <UserMinus className="w-4 h-4 text-pink-500" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {totalRemaining.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Outstanding non-followers
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Percentage Completed</span>
            <TrendingUp className="w-4 h-4 text-fuchsia-500" />
          </div>
          <div className="mt-2.5 text-3xl font-bold font-mono tabular-nums text-fuchsia-600 dark:text-fuchsia-400">
            {completionPercentage.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Follow-back rate: {followBackRatio}%
          </div>
        </div>
      </div>

      {/* Following Composition & Task Progress Visual Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Account Relationship Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribution of Mutual Followers, Remaining Non-Followers, and Completed Unfollows
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Following: {totalFollowing} · Followers: {totalFollowers}
          </div>
        </div>

        {(() => {
          const totalPool = Math.max(1, totalMutuals + totalRemaining + totalCompleted);
          const mutualPct = (totalMutuals / totalPool) * 100;
          const completedPct = (totalCompleted / totalPool) * 100;
          const remainingPct = (totalRemaining / totalPool) * 100;

          return (
            <div className="space-y-3">
              <div className="h-5 w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${mutualPct}%` }}
                  title={`Mutual Followers: ${totalMutuals}`}
                />
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${completedPct}%` }}
                  title={`Completed Unfollows: ${totalCompleted}`}
                />
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-300"
                  style={{ width: `${remainingPct}%` }}
                  title={`Remaining Non-Followers: ${totalRemaining}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">
                    Mutual Followers (Sky)
                  </span>
                  <span className="font-mono font-bold tabular-nums text-sky-500">
                    {totalMutuals} ({mutualPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">
                    Unfollowed Completed (Emerald)
                  </span>
                  <span className="font-mono font-bold tabular-nums text-emerald-500">
                    {totalCompleted} ({completedPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">
                    Remaining Non-Followers (Pink)
                  </span>
                  <span className="font-mono font-bold tabular-nums text-pink-500">
                    {totalRemaining} ({remainingPct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Charts Grid: Daily Unfollowing Activity & Cumulative Progress Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Daily Unfollowing Activity Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-fuchsia-500" />
                  <span>Daily Unfollowing Activity</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Accounts marked as unfollowed per calendar day
                </p>
              </div>
            </div>

            {dailyStats.length === 0 ? (
              <div className="h-52 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400">
                Complete your first unfollow to populate daily activity bars.
              </div>
            ) : (
              <div className="h-56 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                {dailyStats.map((day) => {
                  const heightPercent = Math.max(
                    12,
                    Math.round((day.count / maxDailyCount) * 100)
                  );
                  return (
                    <div
                      key={day.date}
                      className="flex-1 min-w-[48px] h-full flex flex-col justify-end items-center gap-1.5"
                    >
                      <span className="text-xs font-mono font-bold tabular-nums text-fuchsia-600 dark:text-fuchsia-400">
                        {day.count}
                      </span>
                      <div
                        className="w-full max-w-[42px] rounded-t-md bg-gradient-to-t from-purple-600 to-pink-500 transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {day.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Total active unfollow days recorded: <span className="font-mono font-semibold">{dailyStats.length}</span>
          </div>
        </div>

        {/* Cumulative Progress Over Time Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Cumulative Progress Over Time</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total permanent unfollows accumulated across sessions
                </p>
              </div>
            </div>

            {dailyStats.length === 0 ? (
              <div className="h-52 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400">
                Cumulative growth curve will appear once accounts are marked completed.
              </div>
            ) : (
              <div className="h-56 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                {dailyStats.map((day) => {
                  const heightPercent = Math.max(
                    12,
                    Math.round((day.cumulative / maxCumulative) * 100)
                  );
                  return (
                    <div
                      key={day.date}
                      className="flex-1 min-w-[48px] h-full flex flex-col justify-end items-center gap-1.5"
                    >
                      <span className="text-xs font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {day.cumulative}
                      </span>
                      <div
                        className="w-full max-w-[42px] rounded-t-md bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {day.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Cumulative total: <span className="font-mono font-semibold">{totalCompleted}</span> completed unfollows
          </div>
        </div>
      </div>

      {/* Completion History by Date Breakdown Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-fuchsia-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Completion History by Date
            </h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {dailyStats.length} date entries
          </span>
        </div>

        {dailyStats.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No completion dates recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
                  <th className="py-3 pl-6 pr-3">Date</th>
                  <th className="py-3 px-3 text-right">Accounts Unfollowed on Date</th>
                  <th className="py-3 px-3 text-right">Cumulative Total</th>
                  <th className="py-3 pl-3 pr-6 text-right">Share of Total Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {[...dailyStats].reverse().map((row) => {
                  const share =
                    totalCompleted > 0
                      ? ((row.count / totalCompleted) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr
                      key={row.date}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-3 pl-6 pr-3 font-mono font-semibold text-slate-900 dark:text-white">
                        {row.date}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-fuchsia-600 dark:text-fuchsia-400 font-semibold">
                        +{row.count}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {row.cumulative}
                      </td>
                      <td className="py-3 pl-3 pr-6 text-right font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                        {share}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
