import JSZip from 'jszip';
import {
  InstagramAccount,
  RawInstagramEntry,
} from '../types/instagram';

/**
 * Normalizes an Instagram username to ensure consistent comparison and deduplication.
 */
export function normalizeUsername(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  // If a full URL was passed in, extract the username path segment
  if (cleaned.includes('instagram.com/')) {
    try {
      const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
      const segments = url.pathname
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
      // Handle https://www.instagram.com/_u/username/ format
      if (segments[0] === '_u' && segments[1]) {
        cleaned = segments[1];
      } else if (segments[0]) {
        cleaned = segments[0];
      }
    } catch {
      cleaned = cleaned.replace(/^https?:\/\/(www\.)?instagram\.com\/(_u\/)?/i, '');
    }
  }
  cleaned = cleaned
    .replace(/^@+/, '')
    .replace(/\/+$/, '')
    .split('?')[0]
    .trim()
    .toLowerCase();

  return cleaned;
}

/**
 * Builds canonical Instagram profile URL
 */
export function buildProfileUrl(username: string): string {
  const clean = normalizeUsername(username);
  return `https://www.instagram.com/${clean}/`;
}

/**
 * Extracts InstagramAccount items from an array of RawInstagramEntry or strings
 */
export function extractAccountsFromEntries(entries: unknown[]): InstagramAccount[] {
  const map = new Map<string, InstagramAccount>();

  for (const item of entries) {
    if (!item) continue;

    if (typeof item === 'string') {
      const norm = normalizeUsername(item);
      if (norm && !map.has(norm)) {
        map.set(norm, {
          username: item.trim().replace(/^@/, ''),
          normalizedUsername: norm,
          profileUrl: buildProfileUrl(norm),
        });
      }
      continue;
    }

    if (typeof item === 'object') {
      const entry = item as RawInstagramEntry & Record<string, unknown>;
      let rawUsername = '';
      let timestamp: number | undefined;

      // Check string_list_data first (standard Instagram JSON structure)
      if (Array.isArray(entry.string_list_data) && entry.string_list_data.length > 0) {
        const first = entry.string_list_data[0];
        if (first) {
          if (typeof first.value === 'string' && first.value.trim()) {
            rawUsername = first.value.trim();
          } else if (typeof first.href === 'string' && first.href.trim()) {
            rawUsername = normalizeUsername(first.href);
          }
          if (typeof first.timestamp === 'number') {
            timestamp = first.timestamp;
          }
        }
      }

      // In some newer Meta exports for following.json, `title` contains the username
      if (!rawUsername && typeof entry.title === 'string' && entry.title.trim()) {
        rawUsername = entry.title.trim();
      }

      // Support generic { username: "..." } objects
      if (!rawUsername && typeof entry.username === 'string' && entry.username.trim()) {
        rawUsername = entry.username.trim();
      }

      const norm = normalizeUsername(rawUsername);
      if (norm && !map.has(norm)) {
        map.set(norm, {
          username: rawUsername.includes('instagram.com') ? norm : rawUsername.replace(/^@/, ''),
          normalizedUsername: norm,
          profileUrl: buildProfileUrl(norm),
          timestamp,
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Parses a raw JSON text into InstagramAccount[] and detects if it is a followers or following list
 */
export function parseInstagramJsonContent(
  jsonText: string,
  fileNameHint = ''
): {
  type: 'followers' | 'following' | 'unknown';
  accounts: InstagramAccount[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(
      `Corrupted JSON in "${fileNameHint || 'uploaded file'}". Please ensure the file is a valid Instagram JSON export.`
    );
  }

  const lowerName = fileNameHint.toLowerCase();

  if (Array.isArray(parsed)) {
    const accounts = extractAccountsFromEntries(parsed);
    const inferredType = lowerName.includes('following')
      ? 'following'
      : lowerName.includes('follower')
      ? 'followers'
      : 'followers';
    return { type: inferredType, accounts };
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;

    if (Array.isArray(obj.relationships_following)) {
      return {
        type: 'following',
        accounts: extractAccountsFromEntries(obj.relationships_following),
      };
    }

    if (Array.isArray(obj.relationships_followers)) {
      return {
        type: 'followers',
        accounts: extractAccountsFromEntries(obj.relationships_followers),
      };
    }

    // Search any top-level array property
    for (const [key, val] of Object.entries(obj)) {
      if (Array.isArray(val)) {
        const accounts = extractAccountsFromEntries(val);
        if (accounts.length > 0) {
          const kLower = key.toLowerCase();
          const type =
            kLower.includes('following') || lowerName.includes('following')
              ? 'following'
              : kLower.includes('follower') || lowerName.includes('follower')
              ? 'followers'
              : 'unknown';
          return { type, accounts };
        }
      }
    }
  }

  throw new Error(
    `Unrecognized JSON structure in "${fileNameHint || 'file'}". Expected followers_1.json or following.json format.`
  );
}

/**
 * Parses an Instagram HTML export file (e.g., followers_1.html or following.html)
 */
export function parseInstagramHtmlContent(
  htmlText: string,
  fileNameHint = ''
): {
  type: 'followers' | 'following' | 'unknown';
  accounts: InstagramAccount[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const anchors = Array.from(doc.querySelectorAll('a'));
  const map = new Map<string, InstagramAccount>();

  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    const text = (a.textContent || '').trim();
    let candidate = '';

    if (href.includes('instagram.com/')) {
      candidate = normalizeUsername(href);
    } else if (text && /^[a-zA-Z0-9._]{1,30}$/.test(text)) {
      candidate = normalizeUsername(text);
    }

    if (candidate && !map.has(candidate)) {
      map.set(candidate, {
        username: text && !text.includes('http') ? text.replace(/^@/, '') : candidate,
        normalizedUsername: candidate,
        profileUrl: buildProfileUrl(candidate),
      });
    }
  }

  const lowerName = fileNameHint.toLowerCase();
  const titleText = (doc.title || '').toLowerCase();
  const type: 'followers' | 'following' | 'unknown' =
    lowerName.includes('following') || titleText.includes('following')
      ? 'following'
      : lowerName.includes('follower') || titleText.includes('follower')
      ? 'followers'
      : 'unknown';

  return {
    type,
    accounts: Array.from(map.values()),
  };
}

/**
 * Merges and deduplicates multiple InstagramAccount arrays
 */
export function mergeUniqueAccounts(lists: InstagramAccount[][]): InstagramAccount[] {
  const map = new Map<string, InstagramAccount>();
  for (const list of lists) {
    for (const acc of list) {
      if (!acc.normalizedUsername) continue;
      if (!map.has(acc.normalizedUsername)) {
        map.set(acc.normalizedUsername, acc);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Parses an uploaded Instagram ZIP archive or multiple JSON/HTML files.
 */
export async function parseUploadedInstagramFiles(
  files: File[],
  existingDataset?: { followers: InstagramAccount[]; following: InstagramAccount[] }
): Promise<{
  followers: InstagramAccount[];
  following: InstagramAccount[];
  sourceLabel: string;
  importedFiles: string[];
}> {
  if (!files || files.length === 0) {
    throw new Error('No files selected. Please upload your Instagram ZIP, JSON, or HTML export files.');
  }

  const followerLists: InstagramAccount[][] = [];
  const followingLists: InstagramAccount[][] = [];
  const importedFiles: string[] = [];

  for (const file of files) {
    const fileName = file.name;
    const lower = fileName.toLowerCase();

    if (lower.endsWith('.zip')) {
      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(file);
      } catch {
        throw new Error(
          `Invalid or corrupted ZIP archive "${fileName}". Please upload a valid Instagram data export ZIP.`
        );
      }

      const entries = Object.values(zip.files).filter((f) => !f.dir);
      let foundFollowerFiles = 0;
      let foundFollowingFiles = 0;

      for (const zipEntry of entries) {
        const entryPath = zipEntry.name;
        const entryLower = entryPath.toLowerCase();
        const baseName = entryLower.split('/').pop() || '';

        // Skip macOS metadata files
        if (entryLower.includes('__macosx') || baseName.startsWith('._')) {
          continue;
        }

        // Match followers_1.json, followers_2.json, followers.json, or HTML equivalents
        const isFollowersFile =
          /^followers(_\d+)?\.(json|html)$/.test(baseName) ||
          (entryLower.includes('followers_and_following') &&
            baseName.startsWith('followers') &&
            (baseName.endsWith('.json') || baseName.endsWith('.html')));

        // Match following.json, following_1.json, or HTML equivalents (exclude following_hashtags)
        const isFollowingFile =
          (/^following(_\d+)?\.(json|html)$/.test(baseName) ||
            (entryLower.includes('followers_and_following') &&
              baseName.startsWith('following') &&
              !baseName.includes('hashtag') &&
              (baseName.endsWith('.json') || baseName.endsWith('.html'))));

        if (isFollowersFile) {
          const content = await zipEntry.async('string');
          const parsed = baseName.endsWith('.json')
            ? parseInstagramJsonContent(content, entryPath)
            : parseInstagramHtmlContent(content, entryPath);
          followerLists.push(parsed.accounts);
          importedFiles.push(entryPath);
          foundFollowerFiles++;
        } else if (isFollowingFile) {
          const content = await zipEntry.async('string');
          const parsed = baseName.endsWith('.json')
            ? parseInstagramJsonContent(content, entryPath)
            : parseInstagramHtmlContent(content, entryPath);
          followingLists.push(parsed.accounts);
          importedFiles.push(entryPath);
          foundFollowingFiles++;
        }
      }

      if (foundFollowerFiles === 0 && foundFollowingFiles === 0) {
        throw new Error(
          `Could not find "connections/followers_and_following/followers_1.json" or "following.json" inside "${fileName}". Make sure you exported "Followers and following" from Instagram.`
        );
      }
      if (foundFollowerFiles === 0) {
        throw new Error(
          `Missing followers file (e.g. followers_1.json) inside "${fileName}". Both followers and following lists are needed for comparison.`
        );
      }
      if (foundFollowingFiles === 0) {
        throw new Error(
          `Missing following file (e.g. following.json) inside "${fileName}". Both followers and following lists are needed for comparison.`
        );
      }
    } else if (lower.endsWith('.json')) {
      const text = await file.text();
      const parsed = parseInstagramJsonContent(text, fileName);
      importedFiles.push(fileName);
      if (parsed.type === 'following') {
        followingLists.push(parsed.accounts);
      } else {
        followerLists.push(parsed.accounts);
      }
    } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      const text = await file.text();
      const parsed = parseInstagramHtmlContent(text, fileName);
      importedFiles.push(fileName);
      if (parsed.type === 'following') {
        followingLists.push(parsed.accounts);
      } else {
        followerLists.push(parsed.accounts);
      }
    } else {
      throw new Error(
        `Unsupported file format "${fileName}". Supported formats: Instagram .zip export, followers_1.json, following.json, or Instagram .html export files.`
      );
    }
  }

  const mergedFollowers =
    followerLists.length > 0
      ? mergeUniqueAccounts(followerLists)
      : existingDataset?.followers || [];

  const mergedFollowing =
    followingLists.length > 0
      ? mergeUniqueAccounts(followingLists)
      : existingDataset?.following || [];

  if (mergedFollowers.length === 0 && mergedFollowing.length === 0) {
    throw new Error('The imported export appears to be empty (0 followers and 0 following accounts found).');
  }

  return {
    followers: mergedFollowers,
    following: mergedFollowing,
    sourceLabel: files.length === 1 ? files[0].name : `${files.length} Instagram export files`,
    importedFiles,
  };
}

/**
 * Generates a downloadable Instagram ZIP archive from the embedded or current dataset
 * matching connections/followers_and_following/followers_1.json & following.json
 */
export async function generateInstagramZipArchive(
  followers: InstagramAccount[],
  following: InstagramAccount[]
): Promise<Blob> {
  const zip = new JSZip();

  const followersJson = followers.map((acc) => ({
    title: '',
    media_list_data: [],
    string_list_data: [
      {
        href: acc.profileUrl,
        value: acc.username,
        timestamp: acc.timestamp || Math.floor(Date.now() / 1000),
      },
    ],
  }));

  const followingJson = {
    relationships_following: following.map((acc) => ({
      title: '',
      media_list_data: [],
      string_list_data: [
        {
          href: acc.profileUrl,
          value: acc.username,
          timestamp: acc.timestamp || Math.floor(Date.now() / 1000),
        },
      ],
    })),
  };

  zip.file(
    'connections/followers_and_following/followers_1.json',
    JSON.stringify(followersJson, null, 2)
  );
  zip.file(
    'connections/followers_and_following/following.json',
    JSON.stringify(followingJson, null, 2)
  );

  return zip.generateAsync({ type: 'blob' });
}
