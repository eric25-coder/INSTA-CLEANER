import { InstagramLaunchMethod } from '../types/instagram';
import { normalizeUsername } from './instagramParser';

export interface DevicePlatformInfo {
  isAndroid: boolean;
  isRedmiOrXiaomi: boolean;
  isIOS: boolean;
  isMobile: boolean;
  platformLabel: string;
}

export interface InstagramDeepLinkSet {
  username: string;
  isValidUsername: boolean;
  validationError: string | null;
  primaryHref: string;
  androidSchemeIntentUrl: string;
  androidHttpsIntentUrl: string;
  instagramUriScheme: string;
  universalAppLinkUrl: string;
  webProfileUrl: string;
  playStoreMarketUrl: string;
  playStoreWebUrl: string;
  appStoreWebUrl: string;
}

/**
 * Validates an Instagram username according to official Instagram handle rules:
 * - 1 to 30 characters
 * - Only letters, numbers, periods, and underscores
 * - Cannot have consecutive periods
 */
export function validateInstagramUsername(rawUsername: string): {
  isValid: boolean;
  cleanUsername: string;
  error: string | null;
} {
  const cleanUsername = normalizeUsername(rawUsername);
  if (!cleanUsername) {
    return {
      isValid: false,
      cleanUsername: '',
      error: 'Username is empty.',
    };
  }
  if (cleanUsername.length > 30) {
    return {
      isValid: false,
      cleanUsername,
      error: `Username "@${cleanUsername}" exceeds Instagram's 30-character limit.`,
    };
  }
  if (!/^[a-zA-Z0-9._]+$/.test(cleanUsername)) {
    return {
      isValid: false,
      cleanUsername,
      error: `Username "@${cleanUsername}" contains invalid characters.`,
    };
  }
  if (cleanUsername.includes('..')) {
    return {
      isValid: false,
      cleanUsername,
      error: `Username "@${cleanUsername}" contains consecutive periods.`,
    };
  }
  return {
    isValid: true,
    cleanUsername,
    error: null,
  };
}

/**
 * Detects Android (including Xiaomi / Redmi / POCO / MIUI / HyperOS), iOS, or Desktop
 */
export function detectDevicePlatform(): DevicePlatformInfo {
  if (typeof navigator === 'undefined') {
    return {
      isAndroid: false,
      isRedmiOrXiaomi: false,
      isIOS: false,
      isMobile: false,
      platformLabel: 'Desktop',
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isRedmiOrXiaomi =
    isAndroid && /Redmi|Xiaomi|Mi\s|MIX|POCO|MIUI|HyperOS|M20|M21|220|230|240/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS || /Mobile/i.test(ua);

  const platformLabel = isRedmiOrXiaomi
    ? 'Android (Xiaomi / Redmi Optimized)'
    : isAndroid
    ? 'Android Device'
    : isIOS
    ? 'iOS Device'
    : 'Desktop / Web';

  return {
    isAndroid,
    isRedmiOrXiaomi,
    isIOS,
    isMobile,
    platformLabel,
  };
}

/**
 * Builds all supported Android Intents, Deep Links, and App Links for an Instagram username
 */
export function buildInstagramDeepLinks(
  rawUsername: string,
  preferredMethod: InstagramLaunchMethod = 'auto-native'
): InstagramDeepLinkSet {
  const validation = validateInstagramUsername(rawUsername);
  const u = validation.cleanUsername || 'instagram';

  const webProfileUrl = `https://www.instagram.com/${u}/`;
  const universalAppLinkUrl = `https://www.instagram.com/_u/${u}/`;
  const instagramUriScheme = `instagram://user?username=${encodeURIComponent(u)}`;

  const playStoreWebUrl =
    'https://play.google.com/store/apps/details?id=com.instagram.android';
  const playStoreMarketUrl = 'market://details?id=com.instagram.android';
  const appStoreWebUrl = 'https://apps.apple.com/app/instagram/id389801252';

  // Explicit Android Intent using instagram://user?username=USERNAME targeting com.instagram.android
  // This forces Android & Redmi/MIUI to open the installed Instagram app directly on the profile screen
  // instead of opening a Chrome browser tab.
  const androidSchemeIntentUrl = `intent://user?username=${encodeURIComponent(
    u
  )}#Intent;scheme=instagram;package=com.instagram.android;S.browser_fallback_url=${encodeURIComponent(
    playStoreWebUrl
  )};end`;

  // Alternative Android HTTPS App-Link Intent targeting com.instagram.android
  const androidHttpsIntentUrl = `intent://instagram.com/_u/${encodeURIComponent(
    u
  )}/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(
    webProfileUrl
  )};end`;

  const device = detectDevicePlatform();

  let primaryHref = instagramUriScheme;
  if (preferredMethod === 'android-intent') {
    primaryHref = androidSchemeIntentUrl;
  } else if (preferredMethod === 'instagram-scheme') {
    primaryHref = instagramUriScheme;
  } else if (preferredMethod === 'android-applink') {
    primaryHref = universalAppLinkUrl;
  } else if (preferredMethod === 'web-fallback') {
    primaryHref = webProfileUrl;
  } else {
    // 'auto-native' mode:
    if (device.isAndroid) {
      // On Android (including Redmi/Xiaomi), explicit package intent directly opens com.instagram.android
      primaryHref = androidSchemeIntentUrl;
    } else if (device.isIOS) {
      primaryHref = instagramUriScheme;
    } else {
      // On desktop or unknown devices, try instagram:// scheme first and let app-detection offer fallback if not installed
      primaryHref = instagramUriScheme;
    }
  }

  return {
    username: u,
    isValidUsername: validation.isValid,
    validationError: validation.error,
    primaryHref,
    androidSchemeIntentUrl,
    androidHttpsIntentUrl,
    instagramUriScheme,
    universalAppLinkUrl,
    webProfileUrl,
    playStoreMarketUrl,
    playStoreWebUrl,
    appStoreWebUrl,
  };
}

/**
 * Triggers a URI or Android Intent via a synthetic anchor click without using window.open
 */
export function triggerDeepLinkHref(href: string, newTab = false): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  if (newTab) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  } else {
    anchor.target = '_top';
  }
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Attempts to launch the selected Instagram profile directly inside the installed Instagram app.
 * Detects whether the Instagram app opened (via visibilitychange / blur).
 * If Instagram is not detected within the timeout window, invokes onAppNotDetected so the UI can show
 * install / fallback options.
 */
export function launchProfileInInstagramApp(params: {
  username: string;
  preferredMethod?: InstagramLaunchMethod;
  onLaunched?: (links: InstagramDeepLinkSet) => void;
  onInvalidUsername?: (error: string) => void;
  onAppNotDetected?: (links: InstagramDeepLinkSet) => void;
}): void {
  const {
    username,
    preferredMethod = 'auto-native',
    onLaunched,
    onInvalidUsername,
    onAppNotDetected,
  } = params;

  const links = buildInstagramDeepLinks(username, preferredMethod);

  if (!links.isValidUsername) {
    if (onInvalidUsername) {
      onInvalidUsername(
        links.validationError || `Invalid Instagram username: "${username}"`
      );
    }
    return;
  }

  if (onLaunched) {
    onLaunched(links);
  }

  // If user explicitly chose web browser fallback, open in new tab directly
  if (preferredMethod === 'web-fallback') {
    triggerDeepLinkHref(links.webProfileUrl, true);
    return;
  }

  let appWasOpened = false;

  const handleVisibilityOrBlur = () => {
    if (document.hidden || !document.hasFocus()) {
      appWasOpened = true;
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityOrBlur);
  window.addEventListener('blur', handleVisibilityOrBlur);
  window.addEventListener('pagehide', handleVisibilityOrBlur);

  // Launch the primary deep link / Android Intent
  triggerDeepLinkHref(links.primaryHref, false);

  // Check after 1700ms whether the OS switched focus to the native Instagram app
  setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibilityOrBlur);
    window.removeEventListener('blur', handleVisibilityOrBlur);
    window.removeEventListener('pagehide', handleVisibilityOrBlur);

    if (!appWasOpened && !document.hidden) {
      if (onAppNotDetected) {
        onAppNotDetected(links);
      }
    }
  }, 1700);
}
