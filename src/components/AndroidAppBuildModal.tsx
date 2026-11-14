import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  GitBranch,
  Smartphone,
  Terminal,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { triggerFileDownload } from '../utils/exportHelpers';
import { InstaCleanerLogo } from './InstaCleanerLogo';

export const GITHUB_ACTIONS_WORKFLOW_YAML = `name: Build Android APK & AAB (Insta Cleaner)

on:
  push:
    branches:
      - main
      - master
    tags:
      - 'v*'
  pull_request:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build-android:
    name: Build Native Android APK & Web Bundle
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Setup Java JDK 21 (Temurin)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install NPM Dependencies & Build Web Assets
        run: |
          npm install
          npm run build

      - name: Initialize & Sync Capacitor Android Platform
        run: |
          if [ ! -d "android" ]; then
            npx cap add android
          fi
          npx cap sync android

      - name: Configure AndroidManifest.xml Instagram Deep-Link Queries
        run: |
          MANIFEST_FILE="android/app/src/main/AndroidManifest.xml"
          if [ -f "$MANIFEST_FILE" ] && ! grep -q "com.instagram.android" "$MANIFEST_FILE"; then
            sed -i 's|</manifest>|  <queries>\\n    <package android:name="com.instagram.android" />\\n    <intent>\\n      <action android:name="android.intent.action.VIEW" />\\n      <data android:scheme="instagram" />\\n    </intent>\\n  </queries>\\n</manifest>|g' "$MANIFEST_FILE"
          fi

      - name: Build Android Debug & Release APK
        working-directory: android
        run: |
          chmod +x gradlew
          ./gradlew assembleDebug assembleRelease bundleRelease --no-daemon

      - name: Upload Android APK Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: Insta-Cleaner-Android-Builds
          path: |
            android/app/build/outputs/apk/debug/*.apk
            android/app/build/outputs/apk/release/*.apk
            android/app/build/outputs/bundle/release/*.aab`;

interface PWAInstallButtonProps {
  onOpenAndroidBuildModal: () => void;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenAndroidBuildModal,
  compact = false,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (isInstalled) {
    return (
      <button
        onClick={onOpenAndroidBuildModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
        title="Android App & GitHub Actions Workflow"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className={compact ? 'hidden sm:inline' : ''}>Android CI/APK</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      {isInstallable && (
        <button
          onClick={install}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] shadow-md transition-all cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Android App</span>
        </button>
      )}
      <button
        onClick={onOpenAndroidBuildModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 transition-colors cursor-pointer whitespace-nowrap"
        title="Install Android App & View GitHub Actions APK Workflow"
      >
        <Smartphone className="w-3.5 h-3.5 text-pink-400" />
        <span className={compact ? 'hidden md:inline' : ''}>
          {isInstallable ? 'APK & GitHub Actions' : 'Android App / APK'}
        </span>
      </button>
    </div>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-5 left-5 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 border border-amber-300/40 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-xl">
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
      <span>Offline Mode — Local IndexedDB & Locked Primary ZIP Active</span>
    </div>
  );
};

interface AndroidAppBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAppBuildModal: React.FC<AndroidAppBuildModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);

  if (!isOpen) return null;

  const handleCopyWorkflow = async () => {
    try {
      await navigator.clipboard.writeText(GITHUB_ACTIONS_WORKFLOW_YAML);
      setCopiedWorkflow(true);
      setTimeout(() => setCopiedWorkflow(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadWorkflow = () => {
    const blob = new Blob([GITHUB_ACTIONS_WORKFLOW_YAML], {
      type: 'text/yaml;charset=utf-8',
    });
    triggerFileDownload(blob, 'build-android-apk.yml', 'text/yaml');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#11182B] text-white shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-[#1E1B4B] via-[#171F35] to-[#3B0764]/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <InstaCleanerLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">
                  Insta Cleaner — Android App & GitHub Actions CI/CD
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  com.instacleaner.unfollowmanager
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Install directly on Android right now or build native signed Android APKs & AAB bundles via GitHub Actions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Option 1: Instant Android PWA Installation */}
          <div className="rounded-2xl border border-violet-500/30 bg-[#171F35] p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-400">
                  <Smartphone className="w-4 h-4" />
                  <span>1. Instant Android Home-Screen App (Offline-Capable PWA)</span>
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Runs in standalone full-screen Android mode with offline Service Worker caching, persistent IndexedDB ZIP storage, and native <code className="font-mono text-violet-300">com.instagram.android</code> intent launching.
                </p>
              </div>

              {isInstalled ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Installed on Device</span>
                </span>
              ) : isInstallable ? (
                <button
                  onClick={install}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] shadow-lg cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Android App Now</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 shrink-0">
                  {isIOS
                    ? 'Safari → Share → Add to Home Screen'
                    : 'Chrome Menu (⋮) → Install App / Add to Home Screen'}
                </span>
              )}
            </div>
          </div>

          {/* Option 2: Native Capacitor Android APK + GitHub Actions Workflow */}
          <div className="rounded-2xl border border-white/10 bg-[#171F35] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <GitBranch className="w-4 h-4" />
                  <span>
                    2. GitHub Actions Native Android APK & AAB Workflow (.github/workflows/build-android-apk.yml)
                  </span>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Configured in your project at <code className="font-mono text-white">.github/workflows/build-android-apk.yml</code> and <code className="font-mono text-white">capacitor.config.ts</code>. Every push to GitHub automatically compiles <code className="font-mono text-emerald-300">Insta-Cleaner-v3.0.0-debug.apk</code> and <code className="font-mono text-emerald-300">release.aab</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyWorkflow}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-[#11182B] hover:bg-white/10 border border-white/10 cursor-pointer"
                >
                  {copiedWorkflow ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied YAML</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-violet-400" />
                      <span>Copy Workflow</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadWorkflow}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Download .yml</span>
                </button>
              </div>
            </div>

            {/* Local CLI Commands */}
            <div className="p-3.5 rounded-xl bg-[#0B1020] border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-300">
                <Terminal className="w-3.5 h-3.5" />
                <span>Local Android Studio / Gradle Commands (also in package.json):</span>
              </div>
              <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto">
                npm run android:init   # Initialize Capacitor Android project{'\n'}
                npm run android:sync   # Build Vite bundle & sync to Android{'\n'}
                npm run android:apk    # Compile Debug APK via Gradle
              </pre>
            </div>

            {/* Workflow YAML Preview */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-[#9CA3AF]">
                /.github/workflows/build-android-apk.yml
              </div>
              <pre className="p-4 rounded-xl bg-[#0B1020] border border-white/10 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60">
                {GITHUB_ACTIONS_WORKFLOW_YAML}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0B1020] flex items-center justify-between text-xs text-[#9CA3AF]">
          <span>Package ID: com.instacleaner.unfollowmanager</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/15 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
