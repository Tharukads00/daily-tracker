import type {
  DaymarkStoreState,
  LocalAuthRegistry,
  LocalUserAccount,
  UserProfile,
  UserSettings,
} from '../types/daymark';
import { normalizeUsername } from '../utils/profileUtils';

const DB_NAME = 'daymark_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const LEGACY_SNAPSHOT_KEY = 'primary_state';
const LEGACY_LS_KEY = 'daymark_local_state_v1';
const REGISTRY_KEY = 'local_auth_registry_v1';
const REGISTRY_LS_KEY = 'daymark_local_auth_registry_v1';

const userSnapshotKey = (accountId: string) => `user_state_${accountId}`;
const userLsKey = (accountId: string) => `daymark_local_state_${accountId}`;

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  username: '',
  role: 'Daily Achiever',
  bio: '',
  email: '',
  phone: '',
  location: '',
  focusPillar: 'Work & Projects',
  dailyFocusTargetMinutes: 150,
  avatarStyle: 'art',
  avatarColor: '#00639B',
  avatarCustomized: false,
  dailyTargetsConfigured: false,
  profileChecklistDismissed: false,
  onboardingCompleted: false,
  createdAt: new Date().toISOString(),
};

export const DEFAULT_SETTINGS: UserSettings = {
  themeMode: 'light',
  currencySymbol: '$',
  dailyBudgetCap: 45,
  budgetWarningPercent: 80,
  dailyGoalSuccessThreshold: 80,
  notificationsEnabled: true,
  morningReminderTime: '08:30',
  eveningReminderTime: '20:30',
  celebrateMilestones: true,
  budgetWarningsEnabled: true,
};

export function createEmptyState(
  currentSettings?: UserSettings,
  currentProfile?: UserProfile
): DaymarkStoreState {
  return {
    profile: currentProfile
      ? { ...DEFAULT_PROFILE, ...currentProfile }
      : { ...DEFAULT_PROFILE, createdAt: new Date().toISOString() },
    goals: [],
    sessions: [],
    expenses: [],
    notifications: [],
    settings: currentSettings ? { ...DEFAULT_SETTINGS, ...currentSettings } : { ...DEFAULT_SETTINGS },
    lastSyncedAt: new Date().toISOString(),
  };
}

export function buildLocalAccountFromProfile(
  id: string,
  profile: UserProfile,
  pinHash?: string
): LocalUserAccount {
  const now = new Date().toISOString();
  return {
    id,
    username: normalizeUsername(profile.username || profile.name, 'user'),
    name: profile.name.trim() || 'Explorer',
    role: profile.role.trim() || 'Daily Achiever',
    focusPillar: profile.focusPillar,
    avatarStyle: profile.avatarStyle,
    avatarColor: profile.avatarColor,
    avatarDataUrl: profile.avatarDataUrl,
    pinHash,
    createdAt: profile.createdAt || now,
    lastSignedInAt: now,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open error'));
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDatabase();
    const record = await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record;
  } catch {
    return undefined;
  }
}

async function idbPut<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Fallback mirror in localStorage already handles persistence
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}

function hydrateState(record: DaymarkStoreState): DaymarkStoreState {
  return {
    ...record,
    profile: { ...DEFAULT_PROFILE, ...(record.profile || {}) },
    settings: { ...DEFAULT_SETTINGS, ...(record.settings || {}) },
    goals: Array.isArray(record.goals) ? record.goals : [],
    sessions: Array.isArray(record.sessions) ? record.sessions : [],
    expenses: Array.isArray(record.expenses) ? record.expenses : [],
    notifications: Array.isArray(record.notifications) ? record.notifications : [],
  };
}

export async function loadLocalAuthRegistry(): Promise<LocalAuthRegistry> {
  const fromIdb = await idbGet<LocalAuthRegistry>(REGISTRY_KEY);
  if (fromIdb && Array.isArray(fromIdb.accounts)) {
    return {
      accounts: fromIdb.accounts,
      activeAccountId: fromIdb.activeAccountId ?? null,
    };
  }

  try {
    const raw = localStorage.getItem(REGISTRY_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalAuthRegistry;
      if (parsed && Array.isArray(parsed.accounts)) {
        return {
          accounts: parsed.accounts,
          activeAccountId: parsed.activeAccountId ?? null,
        };
      }
    }
  } catch {
    // Continue to legacy migration check
  }

  // Seamless migration if a single legacy user already completed onboarding before multi-user support
  const legacy = await loadLegacyOfflineState();
  if (legacy && legacy.profile.onboardingCompleted) {
    const migratedId = `local-${Date.now()}`;
    const username = normalizeUsername(legacy.profile.username || legacy.profile.name, 'user');
    const migratedProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      ...legacy.profile,
      username,
    };
    const migratedState: DaymarkStoreState = {
      ...legacy,
      profile: migratedProfile,
    };
    const account = buildLocalAccountFromProfile(migratedId, migratedProfile);
    const registry: LocalAuthRegistry = {
      accounts: [account],
      activeAccountId: migratedId,
    };
    await saveUserState(migratedId, migratedState);
    await saveLocalAuthRegistry(registry);
    return registry;
  }

  return { accounts: [], activeAccountId: null };
}

export async function saveLocalAuthRegistry(registry: LocalAuthRegistry): Promise<void> {
  try {
    localStorage.setItem(REGISTRY_LS_KEY, JSON.stringify(registry));
  } catch {
    // Ignore storage quota issues
  }
  await idbPut(REGISTRY_KEY, registry);
}

async function loadLegacyOfflineState(): Promise<DaymarkStoreState | null> {
  const fromIdb = await idbGet<DaymarkStoreState>(LEGACY_SNAPSHOT_KEY);
  if (fromIdb && Array.isArray(fromIdb.goals) && fromIdb.settings) {
    return hydrateState(fromIdb);
  }
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DaymarkStoreState;
      if (parsed && Array.isArray(parsed.goals) && parsed.settings) {
        return hydrateState(parsed);
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

export async function loadUserState(accountId: string): Promise<DaymarkStoreState> {
  const fromIdb = await idbGet<DaymarkStoreState>(userSnapshotKey(accountId));
  if (fromIdb && Array.isArray(fromIdb.goals) && fromIdb.settings) {
    return hydrateState(fromIdb);
  }

  try {
    const raw = localStorage.getItem(userLsKey(accountId));
    if (raw) {
      const parsed = JSON.parse(raw) as DaymarkStoreState;
      if (parsed && Array.isArray(parsed.goals) && parsed.settings) {
        return hydrateState(parsed);
      }
    }
  } catch {
    // Initialize clean state below
  }

  return createEmptyState();
}

export async function saveUserState(
  accountId: string,
  state: DaymarkStoreState
): Promise<void> {
  const stamped: DaymarkStoreState = {
    ...state,
    lastSyncedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(userLsKey(accountId), JSON.stringify(stamped));
  } catch {
    // Ignore storage quota issues
  }

  await idbPut(userSnapshotKey(accountId), stamped);
}

export async function deleteUserState(accountId: string): Promise<void> {
  try {
    localStorage.removeItem(userLsKey(accountId));
  } catch {
    // Ignore
  }
  await idbDelete(userSnapshotKey(accountId));
}

export function validateImportedSnapshot(data: unknown): DaymarkStoreState | null {
  if (!data || typeof data !== 'object') return null;
  const candidate = data as Partial<DaymarkStoreState>;
  if (
    !Array.isArray(candidate.goals) ||
    !Array.isArray(candidate.sessions) ||
    !Array.isArray(candidate.expenses) ||
    !candidate.settings ||
    typeof candidate.settings !== 'object'
  ) {
    return null;
  }
  return {
    profile: { ...DEFAULT_PROFILE, ...(candidate.profile || {}), onboardingCompleted: true },
    goals: candidate.goals,
    sessions: candidate.sessions,
    expenses: candidate.expenses,
    notifications: Array.isArray(candidate.notifications) ? candidate.notifications : [],
    settings: { ...DEFAULT_SETTINGS, ...candidate.settings },
    lastSyncedAt: new Date().toISOString(),
  };
}
