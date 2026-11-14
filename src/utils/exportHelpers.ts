import {
  CompletedAccountRecord,
  FullDatabaseBackup,
  InstagramAccount,
} from '../types/instagram';

function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function triggerFileDownload(
  content: string | Blob,
  fileName: string,
  mimeType = 'text/csv;charset=utf-8;'
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Exports a list of Non-Follower accounts (either All Non-Followers or Remaining Only) to CSV
 */
export function exportAccountsToCsv(
  accounts: InstagramAccount[],
  completedSet: Set<string>,
  completedMap: Map<string, CompletedAccountRecord>,
  fileNamePrefix: string
): void {
  const headers = [
    'Username',
    'Normalized Username',
    'Instagram Profile URL',
    'Status',
    'Followed Timestamp',
    'Completed Date',
    'Completed Time',
  ];

  const rows = accounts.map((acc) => {
    const isDone = completedSet.has(acc.normalizedUsername);
    const comp = completedMap.get(acc.normalizedUsername);
    const followedDate = acc.timestamp
      ? new Date(acc.timestamp * 1000).toISOString().slice(0, 10)
      : '';
    return [
      acc.username,
      acc.normalizedUsername,
      acc.profileUrl,
      isDone ? 'Completed' : 'Remaining',
      followedDate,
      comp?.completedDate || '',
      comp?.completedTime || '',
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(csv, `${fileNamePrefix}_${dateStamp}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exports Completed Accounts (Unfollowed History) to CSV
 */
export function exportCompletedHistoryToCsv(records: CompletedAccountRecord[]): void {
  const headers = [
    'Username',
    'Normalized Username',
    'Instagram Profile URL',
    'Date Completed',
    'Time Completed',
    'ISO Timestamp',
    'Status',
  ];

  const sorted = [...records].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  );

  const rows = sorted.map((r) =>
    [
      r.username,
      r.normalizedUsername,
      r.profileUrl,
      r.completedDate,
      r.completedTime,
      r.completedAt,
      r.status,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    csv,
    `instagram_unfollowed_history_${dateStamp}.csv`,
    'text/csv;charset=utf-8;'
  );
}

/**
 * Exports Complete Unfollowing History as portable JSON
 */
export function exportCompletedHistoryToJson(records: CompletedAccountRecord[]): void {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const payload = {
    appName: 'Instagram Unfollow Manager',
    type: 'completion_history_export',
    exportedAt: new Date().toISOString(),
    totalCompleted: records.length,
    completedAccounts: records,
  };
  triggerFileDownload(
    JSON.stringify(payload, null, 2),
    `instagram_completion_history_${dateStamp}.json`,
    'application/json'
  );
}

/**
 * Exports Full Local Database Backup as JSON
 */
export function downloadFullDatabaseBackupJson(backup: FullDatabaseBackup): void {
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    JSON.stringify(backup, null, 2),
    `instagram_unfollow_manager_backup_${dateStamp}.json`,
    'application/json'
  );
}
