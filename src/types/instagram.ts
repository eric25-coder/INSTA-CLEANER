export interface RawInstagramStringData {
  href?: string;
  value?: string;
  timestamp?: number;
}

export interface RawInstagramEntry {
  title?: string;
  media_list_data?: unknown[];
  string_list_data?: RawInstagramStringData[];
}

export interface RawFollowingJson {
  relationships_following?: RawInstagramEntry[];
}

export interface InstagramAccount {
  username: string; // Display username (original casing or clean handle)
  normalizedUsername: string; // Lowercase, trimmed, stripped of '@'
  profileUrl: string; // https://www.instagram.com/USERNAME/
  timestamp?: number; // Unix timestamp when followed/follower added
}

export interface CompletedAccountRecord {
  username: string;
  normalizedUsername: string;
  profileUrl: string;
  completedAt: string; // Full ISO timestamp
  completedDate: string; // YYYY-MM-DD
  completedTime: string; // HH:MM:SS
  status: 'completed';
}

export interface StoredDataset {
  id: 'current_dataset';
  followers: InstagramAccount[];
  following: InstagramAccount[];
  lastImportDate: string; // ISO date string
  sourceLabel: string; // e.g. "connections/followers_and_following (Embedded ZIP)"
  importedFiles: string[];
  isEmbeddedDefault?: boolean;
}

export type BatchSizeOption = 10 | 20 | 25 | 50 | 100;

export type InstagramLaunchMethod =
  | 'auto-native' // Automatically uses Android Intent on Android/Redmi, instagram:// on iOS/Mobile
  | 'android-intent' // Explicit intent://user?username=...#Intent;scheme=instagram;package=com.instagram.android;end
  | 'instagram-scheme' // instagram://user?username=USERNAME
  | 'android-applink' // https://www.instagram.com/_u/USERNAME/
  | 'web-fallback'; // https://www.instagram.com/USERNAME/

export type AccentColorOption = 'violet' | 'pink' | 'cyan' | 'emerald';

export interface BatchSessionState {
  id: 'active_batch';
  batchSize: BatchSizeOption;
  queueUsernames: string[]; // All accounts originally queued in this batch run (normalized)
  currentBatchIndex: number; // 0-indexed batch number
  currentPointerNormalized: string | null; // Currently focused username in the active batch
  lastOpenedUsername: string | null; // Last account launched in Instagram app
  lastOpenedAt: string | null; // ISO timestamp when launched in Instagram app
  status: 'idle' | 'running' | 'paused' | 'completed';
  startedAt: string | null;
  undoStack: CompletedAccountRecord[]; // Recent completions in this session that can be undone
  openedProfiles: string[]; // Usernames whose profile link was opened
  skippedProfiles?: string[]; // Usernames skipped during session
}

export interface AppSettings {
  id: 'user_settings';
  theme: 'dark' | 'light';
  accentColor?: AccentColorOption;
  defaultBatchSize: BatchSizeOption;
  hideCompletedAccounts: boolean;
  autoBackup: boolean;
  lastAutoBackupAt: string | null;
  instagramLaunchMethod?: InstagramLaunchMethod;
}

export interface PrimaryZipMetadata {
  id: 'primary_zip';
  fileName: string;
  importedAt: string; // ISO date string of original import
  fileSize: number; // Size in bytes
  isLocked: boolean; // True once saved ("PRIMARY ZIP SAVED – LOCKED")
  followersCount: number;
  followingCount: number;
  nonFollowersCount: number;
  extractedFiles: string[];
  isUserUploaded: boolean; // True if uploaded by user, false if auto-initialized from embedded archive
}

export interface PrimaryZipRecord extends PrimaryZipMetadata {
  zipBlob: Blob;
  followers: InstagramAccount[];
  following: InstagramAccount[];
}

export interface StoragePersistenceInfo {
  isPersisted: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
  recoveryPerformed: boolean;
  recoveryMessage: string | null;
  corruptionDetected: boolean;
  corruptionMessage: string | null;
}

export interface ReconciliationSummary {
  importedAt: string;
  sourceLabel: string;
  isPrimaryLockInitial: boolean;
  keptOriginalPrimaryLocked: boolean;
  totalFollowers: number;
  totalFollowing: number;
  followersDelta: number;
  followingDelta: number;
  totalMutuals: number;
  totalNonFollowersInExport: number;
  alreadyCompletedRecognized: number;
  outstandingRemaining: number;
}

export interface FullDatabaseBackup {
  version: number;
  exportedAt: string;
  appName: 'Instagram Unfollow Manager';
  completedAccounts: CompletedAccountRecord[];
  dataset: StoredDataset | null;
  primaryZipMetadata: PrimaryZipMetadata | null;
  primaryZipBase64?: string | null;
  settings: AppSettings;
  batchSession: BatchSessionState | null;
}

export type NavigationTab =
  | 'dashboard'
  | 'non-followers'
  | 'following'
  | 'followers'
  | 'batch'
  | 'history'
  | 'import'
  | 'analytics'
  | 'settings';


