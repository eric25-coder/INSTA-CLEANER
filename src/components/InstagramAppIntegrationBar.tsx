import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { InstagramAccount, InstagramLaunchMethod } from '../types/instagram';
import {
  detectDevicePlatform,
  InstagramDeepLinkSet,
} from '../utils/instagramAppLauncher';

interface InstagramAppReturnBarProps {
  lastOpenedAccount: InstagramAccount | null;
  nextRemainingAccount: InstagramAccount | null;
  currentBatchNumber: number;
  totalBatches: number;
  returnedFromAppRecently: boolean;
  onMarkLastOpenedUnfollowed: (account: InstagramAccount) => Promise<void>;
  onMarkAndOpenNextInApp: (
    completedAccount: InstagramAccount,
    nextAccount: InstagramAccount | null
  ) => Promise<void>;
  onAdvanceToNextAccount: () => void;
  onReopenInInstagramApp: (account: InstagramAccount) => void;
  onDismissBar: () => void;
}

export const InstagramAppReturnBar: React.FC<InstagramAppReturnBarProps> = ({
  lastOpenedAccount,
  nextRemainingAccount,
  currentBatchNumber,
  totalBatches,
  returnedFromAppRecently,
  onMarkLastOpenedUnfollowed,
  onMarkAndOpenNextInApp,
  onAdvanceToNextAccount,
  onReopenInInstagramApp,
  onDismissBar,
}) => {
  if (!lastOpenedAccount) return null;

  const device = detectDevicePlatform();

  return (
    <div
      className={`mb-6 rounded-xl border p-4 sm:p-5 transition-all ${
        returnedFromAppRecently
          ? 'border-fuchsia-500 bg-gradient-to-r from-purple-950/50 via-fuchsia-950/40 to-pink-950/50 shadow-md'
          : 'border-fuchsia-500/30 bg-fuchsia-500/5 dark:bg-slate-900/90'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-fuchsia-600 dark:text-fuchsia-400">
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {returnedFromAppRecently
                  ? 'Returned from Instagram App — Confirm Unfollow'
                  : 'Last Account Opened in Instagram App'}
              </span>
            </span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400">
              Batch #{currentBatchNumber} of {totalBatches}
            </span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {device.platformLabel}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
              @{lastOpenedAccount.username}
            </span>
            <button
              onClick={() => onReopenInInstagramApp(lastOpenedAccount)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3 h-3" />
              <span>Re-Open in Instagram App</span>
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            Did you manually tap <strong>Unfollow</strong> on{' '}
            <span className="font-mono font-semibold">@{lastOpenedAccount.username}</span>{' '}
            inside the Instagram app? Confirm below to permanently record it and move to the next account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* 1. Mark as Unfollowed */}
          <button
            onClick={() => onMarkLastOpenedUnfollowed(lastOpenedAccount)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Check className="w-4 h-4" />
            <span>Mark @{lastOpenedAccount.username} Unfollowed</span>
          </button>

          {/* 2. Mark Unfollowed & Open Next directly in Instagram App */}
          {nextRemainingAccount &&
            nextRemainingAccount.normalizedUsername !==
              lastOpenedAccount.normalizedUsername && (
              <button
                onClick={() =>
                  onMarkAndOpenNextInApp(lastOpenedAccount, nextRemainingAccount)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  Mark Done & Open Next (@{nextRemainingAccount.username}) in App
                </span>
              </button>
            )}

          {/* 3. Return / Skip to Next Account */}
          <button
            onClick={onAdvanceToNextAccount}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Next Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onDismissBar}
            title="Dismiss banner"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface InstagramAppFallbackModalProps {
  fallbackLinks: InstagramDeepLinkSet | null;
  invalidUsernameError: string | null;
  currentLaunchMethod: InstagramLaunchMethod;
  onSelectLaunchMethod: (method: InstagramLaunchMethod) => void;
  onClose: () => void;
}

export const InstagramAppFallbackModal: React.FC<
  InstagramAppFallbackModalProps
> = ({
  fallbackLinks,
  invalidUsernameError,
  currentLaunchMethod,
  onSelectLaunchMethod,
  onClose,
}) => {
  if (!fallbackLinks && !invalidUsernameError) return null;

  const device = detectDevicePlatform();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0">
              {invalidUsernameError ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Smartphone className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {invalidUsernameError
                  ? 'Invalid or Unavailable Instagram Username'
                  : 'Open Profile in Official Instagram App'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {invalidUsernameError
                  ? 'Profile destination could not be launched'
                  : `Target profile: @${fallbackLinks?.username} · ${device.platformLabel}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {invalidUsernameError ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300">
            {invalidUsernameError}
          </div>
        ) : (
          fallbackLinks && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                The Instagram mobile app did not automatically intercept the link (it may not be installed on this device, or your browser asked for confirmation). Choose how you want to open{' '}
                <span className="font-mono font-bold text-fuchsia-500">
                  @{fallbackLinks.username}
                </span>
                :
              </p>

              <div className="space-y-2.5">
                {/* Option 1: Android Explicit Package Intent (Best for Android & Redmi/Xiaomi) */}
                <a
                  href={fallbackLinks.androidSchemeIntentUrl}
                  target="_top"
                  onClick={onClose}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>
                      Open in Instagram Android App (Intent: com.instagram.android)
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </a>

                {/* Option 2: Direct instagram:// URI Scheme */}
                <a
                  href={fallbackLinks.instagramUriScheme}
                  target="_top"
                  onClick={onClose}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-fuchsia-500 shrink-0" />
                    <span>
                      Launch via Direct App URI (instagram://user?username={fallbackLinks.username})
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </a>

                {/* Option 3: Android Universal App Link (_u route) */}
                <a
                  href={fallbackLinks.universalAppLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>
                      Open via Instagram App Link (instagram.com/_u/{fallbackLinks.username})
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>

                {/* Option 4: Install Official Instagram App */}
                <a
                  href={
                    device.isIOS
                      ? fallbackLinks.appStoreWebUrl
                      : fallbackLinks.playStoreWebUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 shrink-0" />
                    <span>
                      Instagram Not Installed? Install from{' '}
                      {device.isIOS ? 'App Store' : 'Google Play Store'}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>

                {/* Option 5: Fallback to Web Browser */}
                <a
                  href={fallbackLinks.webProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span>Open Profile in Web Browser Instead ({fallbackLinks.webProfileUrl})</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              {/* Default Launch Preference Selector */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Preferred Launch Mode:
                </span>
                <select
                  value={currentLaunchMethod}
                  onChange={(e) =>
                    onSelectLaunchMethod(e.target.value as InstagramLaunchMethod)
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <option value="auto-native">Auto Native App (Android Intent / iOS URI)</option>
                  <option value="android-intent">Android / Redmi Intent (com.instagram.android)</option>
                  <option value="instagram-scheme">Direct URI (instagram://user?username=...)</option>
                  <option value="android-applink">Android App Link (instagram.com/_u/...)</option>
                  <option value="web-fallback">Web Browser (instagram.com/...)</option>
                </select>
              </div>
            </div>
          )
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
