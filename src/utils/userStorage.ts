/**
 * Email-scoped storage utility.
 * Ensures all application data (profile, stats, mistakes, notes, mock tests,
 * daily study logs, timetables, exam configs, scans, flashcards, prompt history)
 * is stored and isolated per user Email ID.
 */

export interface SavedEmailAccount {
  email: string;
  displayName: string;
  lastUsed: number;
}

const ACTIVE_EMAIL_KEY = 'studybot_active_email';
const SAVED_ACCOUNTS_KEY = 'studybot_saved_accounts';
const LEGACY_CLEANUP_KEY = 'studybot_legacy_unscoped_cleaned_v1';

/**
 * Normalizes an email address into a canonical lowercase string.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Converts an email address (or fallback identifier) into a safe Firestore document ID.
 */
export function emailToFirestoreKey(emailOrUid?: string | null): string {
  const norm = normalizeEmail(emailOrUid);
  if (!norm) return '';
  // Firestore document IDs cannot contain forward slashes
  return norm.replace(/\//g, '_');
}

/**
 * Reads the currently signed-in user's normalized email ID.
 */
export function getActiveEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    const direct = localStorage.getItem(ACTIVE_EMAIL_KEY);
    if (direct) {
      const norm = normalizeEmail(direct);
      if (norm) return norm;
    }
    const savedUser = localStorage.getItem('studybot_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.email) {
        return normalizeEmail(parsed.email);
      }
    }
  } catch {}
  return '';
}

/**
 * Updates the active user email ID in localStorage and registers it in the known accounts list.
 */
export function setActiveEmail(email: string | null, displayName?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const norm = normalizeEmail(email);
    if (norm) {
      localStorage.setItem(ACTIVE_EMAIL_KEY, norm);
      registerEmailAccount(norm, displayName);
    } else {
      localStorage.removeItem(ACTIVE_EMAIL_KEY);
    }
  } catch {}
}

/**
 * Registers an email account in the device's recent accounts directory for easy switching.
 */
export function registerEmailAccount(email: string, displayName?: string | null): void {
  if (typeof window === 'undefined') return;
  const norm = normalizeEmail(email);
  if (!norm || !norm.includes('@')) return;
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    const list: SavedEmailAccount[] = raw ? JSON.parse(raw) : [];
    const existing = list.find((a) => normalizeEmail(a.email) === norm);
    const name =
      displayName && displayName.trim() && displayName !== 'Student'
        ? displayName.trim()
        : existing?.displayName || norm.split('@')[0];

    const updated: SavedEmailAccount[] = [
      { email: norm, displayName: name, lastUsed: Date.now() },
      ...list.filter((a) => normalizeEmail(a.email) !== norm),
    ].slice(0, 10);

    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * Returns the list of email accounts that have signed in on this browser.
 */
export function getSavedEmailAccounts(): SavedEmailAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Builds the email-scoped localStorage key, e.g. `studybot_stats::user@example.com`
 */
export function getScopedKey(baseKey: string, emailOverride?: string | null): string {
  const email = normalizeEmail(emailOverride ?? getActiveEmail());
  const scope = email || 'guest';
  return `${baseKey}::${scope}`;
}

/**
 * Reads an email-scoped item from localStorage.
 */
export function getUserItem(baseKey: string, emailOverride?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const email = normalizeEmail(emailOverride ?? getActiveEmail());
    if (!email) return null;
    return localStorage.getItem(getScopedKey(baseKey, email));
  } catch {
    return null;
  }
}

/**
 * Writes an email-scoped item to localStorage.
 */
export function setUserItem(baseKey: string, value: string, emailOverride?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const email = normalizeEmail(emailOverride ?? getActiveEmail());
    if (!email) return;
    localStorage.setItem(getScopedKey(baseKey, email), value);
  } catch {}
}

/**
 * Removes an email-scoped item from localStorage.
 */
export function removeUserItem(baseKey: string, emailOverride?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const email = normalizeEmail(emailOverride ?? getActiveEmail());
    if (!email) return;
    localStorage.removeItem(getScopedKey(baseKey, email));
  } catch {}
}

/**
 * Clears all localStorage keys belonging ONLY to the specified (or currently active) email ID.
 * Does not touch data belonging to other email IDs.
 */
export function clearUserScopedData(emailOverride?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const email = normalizeEmail(emailOverride ?? getActiveEmail());
    if (!email) return;
    const suffix = `::${email}`;
    Object.keys(localStorage).forEach((k) => {
      if (k.endsWith(suffix)) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
}

/**
 * One-time cleanup of old global un-scoped `studybot_*` keys so that only
 * email-scoped keys (`studybot_*::email@domain.com`) are used.
 */
export function cleanLegacyUnscopedKeysOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(LEGACY_CLEANUP_KEY) === 'true') return;
    const preservedGlobals = new Set([
      'studybot_user',
      ACTIVE_EMAIL_KEY,
      SAVED_ACCOUNTS_KEY,
      LEGACY_CLEANUP_KEY,
      'studybot_data_purged_v3',
    ]);
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('studybot_') && !k.includes('::') && !preservedGlobals.has(k)) {
        localStorage.removeItem(k);
      }
    });
    localStorage.setItem(LEGACY_CLEANUP_KEY, 'true');
  } catch {}
}
