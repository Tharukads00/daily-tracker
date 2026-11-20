import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type TrackingMode = 'slider' | 'counter' | 'checklist' | 'timer';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Subtask {
  id: string;
  title: string;
  weight: number;
  completed: boolean;
}

export interface DailyGoal {
  id: string;
  dateKey: string;
  title: string;
  category: string;
  trackingMode: TrackingMode;
  progressPercent: number;
  currentValue: number;
  targetValue: number;
  unitLabel: string;
  targetMinutes: number;
  loggedMinutes: number;
  subtasks: Subtask[];
  milestoneNotified?: boolean;
}

export interface WorkSession {
  id: string;
  dateKey: string;
  goalId: string;
  goalTitle: string;
  durationMinutes: number;
  endedAt: string;
}

export interface ExpenseEntry {
  id: string;
  dateKey: string;
  amount: number;
  category: string;
  note: string;
  createdAt: string;
}

export interface AppSettings {
  themeMode: ThemeMode;
  currencySymbol: string;
  dailyBudgetCap: number;
  budgetWarningPercent: number;
  morningHour: number;
  morningMinute: number;
  eveningHour: number;
  eveningMinute: number;
  notificationsEnabled: boolean;
  celebrateMilestones: boolean;
  budgetWarningsEnabled: boolean;
}

export interface UserProfile {
  name: string;
  role: string;
  focusPillar: string;
  dailyFocusTargetMinutes: number;
  avatarColor: string;
  onboardingCompleted: boolean;
}

export interface OfflineState {
  profile: UserProfile;
  goals: DailyGoal[];
  sessions: WorkSession[];
  expenses: ExpenseEntry[];
  settings: AppSettings;
}

const STORAGE_KEY = '@daymark_offline_state_v1';

export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calcGoalPercent(goal: DailyGoal): number {
  if (goal.trackingMode === 'checklist' && goal.subtasks.length > 0) {
    const total = goal.subtasks.reduce((sum, s) => sum + Math.max(1, s.weight), 0);
    const done = goal.subtasks
      .filter((s) => s.completed)
      .reduce((sum, s) => sum + Math.max(1, s.weight), 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }
  if (goal.trackingMode === 'counter') {
    return Math.min(100, Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100));
  }
  if (goal.trackingMode === 'timer') {
    return Math.min(100, Math.round((goal.loggedMinutes / Math.max(1, goal.targetMinutes)) * 100));
  }
  return Math.min(100, Math.max(0, Math.round(goal.progressPercent)));
}

export const INITIAL_STATE: OfflineState = {
  profile: {
    name: '',
    role: 'Daily Achiever',
    focusPillar: 'Work & Projects',
    dailyFocusTargetMinutes: 150,
    avatarColor: '#00639B',
    onboardingCompleted: false,
  },
  goals: [],
  sessions: [],
  expenses: [],
  settings: {
    themeMode: 'system',
    currencySymbol: '$',
    dailyBudgetCap: 45,
    budgetWarningPercent: 80,
    morningHour: 8,
    morningMinute: 30,
    eveningHour: 20,
    eveningMinute: 30,
    notificationsEnabled: true,
    celebrateMilestones: true,
    budgetWarningsEnabled: true,
  },
};

export async function loadLocalData(): Promise<OfflineState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as OfflineState;
    }
  } catch {
    // fallback to clean initial state
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
  return INITIAL_STATE;
}

export async function saveLocalData(state: OfflineState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function configureAndroidNotifications(): Promise<boolean> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daymark-reminders', {
      name: 'Daymark Goals & Budget Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 150, 200],
      lightColor: '#00639B',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

export async function scheduleDailyAndroidReminders(settings: AppSettings): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.notificationsEnabled) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daymark — Morning Check-in',
      body: `Review today’s targets and stay within your ${settings.currencySymbol}${settings.dailyBudgetCap} daily budget cap.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.morningHour,
      minute: settings.morningMinute,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daymark — Unfinished Goals Check',
      body: 'Log remaining work completed today to protect your daily goal streak.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.eveningHour,
      minute: settings.eveningMinute,
    },
  });
}

export async function fireInstantAndroidAlert(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
