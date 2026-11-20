import type {
  DailyGoal,
  DaymarkStoreState,
  ExpenseEntry,
  NotificationRecord,
  UserProfile,
  UserSettings,
  WorkSession,
} from '../types/daymark';
import { offsetDateKey, toDateKey } from '../utils/dateUtils';

const DB_NAME = 'daymark_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const SNAPSHOT_KEY = 'primary_state';
const LS_KEY = 'daymark_local_state_v1';

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  role: 'Daily Achiever',
  focusPillar: 'Work & Projects',
  dailyFocusTargetMinutes: 150,
  avatarStyle: 'art',
  avatarColor: '#1677FF',
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

export function createSeedState(): DaymarkStoreState {
  const now = new Date();
  const today = toDateKey(now);
  const d1 = offsetDateKey(now, -1);
  const d2 = offsetDateKey(now, -2);
  const d3 = offsetDateKey(now, -3);
  const d4 = offsetDateKey(now, -4);
  const d5 = offsetDateKey(now, -5);
  const d6 = offsetDateKey(now, -6);

  const goals: DailyGoal[] = [
    // Today's goals showcasing all 3+ work logging modes
    {
      id: 'goal-today-1',
      dateKey: today,
      title: 'Ship sprint API & offline sync tests',
      category: 'Work',
      trackingMode: 'checklist',
      progressPercent: 60,
      currentValue: 0,
      targetValue: 100,
      unitLabel: '%',
      targetMinutes: 90,
      loggedMinutes: 50,
      reminderTime: '17:00',
      subtasks: [
        { id: 'st-1', title: 'Finalize local storage schema', weight: 3, completed: true },
        { id: 'st-2', title: 'Write unit tests for budget triggers', weight: 3, completed: true },
        { id: 'st-3', title: 'Audit dark-mode contrast on Android', weight: 2, completed: false },
        { id: 'st-4', title: 'Document release notes', weight: 2, completed: false },
      ],
      createdAt: new Date(now.getTime() - 4 * 3600_000).toISOString(),
    },
    {
      id: 'goal-today-2',
      dateKey: today,
      title: 'Deep Focus Study Block',
      category: 'Study',
      trackingMode: 'timer',
      progressPercent: 56,
      currentValue: 0,
      targetValue: 90,
      unitLabel: 'min',
      targetMinutes: 90,
      loggedMinutes: 50,
      reminderTime: '19:30',
      subtasks: [],
      createdAt: new Date(now.getTime() - 3 * 3600_000).toISOString(),
    },
    {
      id: 'goal-today-3',
      dateKey: today,
      title: 'Read technical architecture pages',
      category: 'Study',
      trackingMode: 'counter',
      progressPercent: 70,
      currentValue: 14,
      targetValue: 20,
      unitLabel: 'pages',
      targetMinutes: 40,
      loggedMinutes: 25,
      subtasks: [],
      createdAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
    },
    {
      id: 'goal-today-4',
      dateKey: today,
      title: 'Evening mobility & core workout',
      category: 'Health',
      trackingMode: 'slider',
      progressPercent: 45,
      currentValue: 45,
      targetValue: 100,
      unitLabel: '%',
      targetMinutes: 30,
      loggedMinutes: 15,
      reminderTime: '20:00',
      subtasks: [],
      createdAt: new Date(now.getTime() - 1 * 3600_000).toISOString(),
    },
    // Recent 6-day historical records for authentic Budget vs. Streak comparison
    {
      id: 'goal-d1-1',
      dateKey: d1,
      title: 'Complete UI component polish',
      category: 'Work',
      trackingMode: 'slider',
      progressPercent: 100,
      currentValue: 100,
      targetValue: 100,
      unitLabel: '%',
      targetMinutes: 120,
      loggedMinutes: 120,
      subtasks: [],
      completedAt: new Date(now.getTime() - 24 * 3600_000).toISOString(),
      milestoneNotified: true,
      createdAt: new Date(now.getTime() - 30 * 3600_000).toISOString(),
    },
    {
      id: 'goal-d1-2',
      dateKey: d1,
      title: '5km outdoor tempo run',
      category: 'Health',
      trackingMode: 'counter',
      progressPercent: 100,
      currentValue: 5,
      targetValue: 5,
      unitLabel: 'km',
      targetMinutes: 30,
      loggedMinutes: 30,
      subtasks: [],
      completedAt: new Date(now.getTime() - 22 * 3600_000).toISOString(),
      milestoneNotified: true,
      createdAt: new Date(now.getTime() - 30 * 3600_000).toISOString(),
    },
    {
      id: 'goal-d2-1',
      dateKey: d2,
      title: 'System design practice problems',
      category: 'Study',
      trackingMode: 'counter',
      progressPercent: 90,
      currentValue: 9,
      targetValue: 10,
      unitLabel: 'tasks',
      targetMinutes: 90,
      loggedMinutes: 85,
      subtasks: [],
      createdAt: new Date(now.getTime() - 52 * 3600_000).toISOString(),
    },
    {
      id: 'goal-d3-1',
      dateKey: d3,
      title: 'Client deliverable milestone',
      category: 'Work',
      trackingMode: 'slider',
      progressPercent: 85,
      currentValue: 85,
      targetValue: 100,
      unitLabel: '%',
      targetMinutes: 100,
      loggedMinutes: 90,
      subtasks: [],
      createdAt: new Date(now.getTime() - 76 * 3600_000).toISOString(),
    },
    {
      id: 'goal-d4-1',
      dateKey: d4,
      title: 'Weekly meal prep & budget audit',
      category: 'Finance',
      trackingMode: 'slider',
      progressPercent: 60,
      currentValue: 60,
      targetValue: 100,
      unitLabel: '%',
      targetMinutes: 60,
      loggedMinutes: 40,
      subtasks: [],
      createdAt: new Date(now.getTime() - 100 * 3600_000).toISOString(),
    },
    {
      id: 'goal-d5-1',
      dateKey: d5,
      title: 'Finish React performance chapter',
      category: 'Study',
      trackingMode: 'slider',
      progressPercent: 100,
      currentValue: 100,
      targetValue: 100,
      unitLabel: '%',
      targetMinutes: 75,
      loggedMinutes: 75,
      subtasks: [],
      completedAt: new Date(now.getTime() - 120 * 3600_000).toISOString(),
      milestoneNotified: true,
      createdAt: new Date(now.getTime() - 125 * 3600_000).toISOString(),
    },
    {
      id: 'goal-d6-1',
      dateKey: d6,
      title: 'Morning focus sprint',
      category: 'Work',
      trackingMode: 'slider',
      progressPercent: 95,
      currentValue: 95,
      targetValue: 100,
      unitLabel: '%',
      targetMinutes: 90,
      loggedMinutes: 85,
      subtasks: [],
      createdAt: new Date(now.getTime() - 148 * 3600_000).toISOString(),
    },
  ];

  const sessions: WorkSession[] = [
    {
      id: 'sess-1',
      dateKey: today,
      goalId: 'goal-today-1',
      goalTitle: 'Ship sprint API & offline sync tests',
      mode: 'deep',
      durationMinutes: 50,
      startedAt: new Date(now.getTime() - 3.5 * 3600_000).toISOString(),
      endedAt: new Date(now.getTime() - 2.6 * 3600_000).toISOString(),
      note: 'Completed IndexedDB adapter and local sync tests',
    },
    {
      id: 'sess-2',
      dateKey: today,
      goalId: 'goal-today-2',
      goalTitle: 'Deep Focus Study Block',
      mode: 'pomodoro',
      durationMinutes: 25,
      startedAt: new Date(now.getTime() - 2.1 * 3600_000).toISOString(),
      endedAt: new Date(now.getTime() - 1.7 * 3600_000).toISOString(),
      note: 'Reviewed offline-first cache strategies',
    },
    {
      id: 'sess-3',
      dateKey: today,
      goalId: 'goal-today-2',
      goalTitle: 'Deep Focus Study Block',
      mode: 'pomodoro',
      durationMinutes: 25,
      startedAt: new Date(now.getTime() - 1.4 * 3600_000).toISOString(),
      endedAt: new Date(now.getTime() - 1.0 * 3600_000).toISOString(),
      note: 'Built notification scheduler prototype',
    },
    {
      id: 'sess-d1',
      dateKey: d1,
      goalId: 'goal-d1-1',
      goalTitle: 'Complete UI component polish',
      mode: 'deep',
      durationMinutes: 120,
      startedAt: new Date(now.getTime() - 28 * 3600_000).toISOString(),
      endedAt: new Date(now.getTime() - 26 * 3600_000).toISOString(),
    },
  ];

  const expenses: ExpenseEntry[] = [
    {
      id: 'exp-today-1',
      dateKey: today,
      amount: 14.5,
      category: 'Food',
      note: 'Lunch bowl & iced coffee',
      createdAt: new Date(now.getTime() - 3 * 3600_000).toISOString(),
    },
    {
      id: 'exp-today-2',
      dateKey: today,
      amount: 8.75,
      category: 'Transport',
      note: 'Metro pass top-up',
      createdAt: new Date(now.getTime() - 5 * 3600_000).toISOString(),
    },
    {
      id: 'exp-today-3',
      dateKey: today,
      amount: 6.2,
      category: 'Personal',
      note: 'Notebook & fine-tip pens',
      createdAt: new Date(now.getTime() - 1.2 * 3600_000).toISOString(),
    },
    // Historical daily spend to illustrate Budget Cap vs. Streak
    {
      id: 'exp-d1-1',
      dateKey: d1,
      amount: 34.0,
      category: 'Food',
      note: 'Groceries & coffee',
      createdAt: new Date(now.getTime() - 26 * 3600_000).toISOString(),
    },
    {
      id: 'exp-d2-1',
      dateKey: d2,
      amount: 39.5,
      category: 'Work',
      note: 'Coworking day pass & lunch',
      createdAt: new Date(now.getTime() - 50 * 3600_000).toISOString(),
    },
    {
      id: 'exp-d3-1',
      dateKey: d3,
      amount: 54.0,
      category: 'Bills',
      note: 'Mobile data plan & dinner',
      createdAt: new Date(now.getTime() - 74 * 3600_000).toISOString(),
    },
    {
      id: 'exp-d4-1',
      dateKey: d4,
      amount: 48.2,
      category: 'Food',
      note: 'Weekend groceries',
      createdAt: new Date(now.getTime() - 98 * 3600_000).toISOString(),
    },
    {
      id: 'exp-d5-1',
      dateKey: d5,
      amount: 29.0,
      category: 'Transport',
      note: 'Fuel & snacks',
      createdAt: new Date(now.getTime() - 122 * 3600_000).toISOString(),
    },
    {
      id: 'exp-d6-1',
      dateKey: d6,
      amount: 31.8,
      category: 'Health',
      note: 'Gym smoothies & supplements',
      createdAt: new Date(now.getTime() - 146 * 3600_000).toISOString(),
    },
  ];

  const notifications: NotificationRecord[] = [
    {
      id: 'notif-seed-1',
      type: 'reminder',
      title: 'Morning target check-in',
      body: 'You have 4 daily goals scheduled today. Stay under $45.00 to keep your Dual-Win streak alive.',
      triggeredAt: new Date(now.getTime() - 4.5 * 3600_000).toISOString(),
      read: true,
    },
    {
      id: 'notif-seed-2',
      type: 'milestone',
      title: 'Yesterday’s goals completed',
      body: '100% of daily targets hit while spending $34.00 / $45.00. Dual-Win streak extended!',
      triggeredAt: new Date(now.getTime() - 21 * 3600_000).toISOString(),
      read: false,
    },
  ];

  return {
    profile: { ...DEFAULT_PROFILE, createdAt: now.toISOString() },
    goals,
    sessions,
    expenses,
    notifications,
    settings: { ...DEFAULT_SETTINGS },
    lastSyncedAt: now.toISOString(),
  };
}

export function createEmptyState(
  currentSettings?: UserSettings,
  currentProfile?: UserProfile
): DaymarkStoreState {
  return {
    profile: currentProfile
      ? { ...currentProfile }
      : { ...DEFAULT_PROFILE, createdAt: new Date().toISOString() },
    goals: [],
    sessions: [],
    expenses: [],
    notifications: [],
    settings: currentSettings ? { ...currentSettings } : { ...DEFAULT_SETTINGS },
    lastSyncedAt: new Date().toISOString(),
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

export async function loadOfflineState(): Promise<DaymarkStoreState> {
  try {
    const db = await openDatabase();
    const record = await new Promise<DaymarkStoreState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SNAPSHOT_KEY);
      req.onsuccess = () => resolve(req.result as DaymarkStoreState | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (record && Array.isArray(record.goals) && record.settings) {
      return {
        ...record,
        profile: { ...DEFAULT_PROFILE, ...(record.profile || {}) },
        settings: { ...DEFAULT_SETTINGS, ...record.settings },
      };
    }
  } catch {
    // Fallback to localStorage below
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DaymarkStoreState;
      if (parsed && Array.isArray(parsed.goals) && parsed.settings) {
        return {
          ...parsed,
          profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        };
      }
    }
  } catch {
    // Seed fresh data below
  }

  const seeded = createSeedState();
  await saveOfflineState(seeded);
  return seeded;
}

export async function saveOfflineState(state: DaymarkStoreState): Promise<void> {
  const stamped: DaymarkStoreState = {
    ...state,
    lastSyncedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(stamped));
  } catch {
    // Ignore storage quota issues in private browsing
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(stamped, SNAPSHOT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // localStorage mirror already persisted
  }
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
