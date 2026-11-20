export type GoalTrackingMode = 'slider' | 'counter' | 'checklist' | 'timer';

export type GoalCategory = 'Work' | 'Study' | 'Health' | 'Personal' | 'Finance';

export type ExpenseCategory = 'Food' | 'Transport' | 'Work' | 'Bills' | 'Health' | 'Personal';

export type ThemeMode = 'light' | 'dark' | 'system';

export type NavTab = 'today' | 'focus' | 'budget' | 'alerts';

export interface SubtaskItem {
  id: string;
  title: string;
  weight: number;
  completed: boolean;
}

export interface DailyGoal {
  id: string;
  dateKey: string; // YYYY-MM-DD
  title: string;
  category: GoalCategory;
  trackingMode: GoalTrackingMode;
  progressPercent: number; // 0-100
  currentValue: number;
  targetValue: number;
  unitLabel: string;
  targetMinutes: number;
  loggedMinutes: number;
  subtasks: SubtaskItem[];
  reminderTime?: string; // HH:mm
  completedAt?: string;
  milestoneNotified?: boolean;
  reminderNotifiedDate?: string;
  createdAt: string;
}

export interface WorkSession {
  id: string;
  dateKey: string;
  goalId: string;
  goalTitle: string;
  mode: 'pomodoro' | 'deep' | 'custom';
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
  note?: string;
}

export interface ExpenseEntry {
  id: string;
  dateKey: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
  createdAt: string;
}

export type NotificationType =
  | 'reminder'
  | 'milestone'
  | 'budget_warning'
  | 'budget_exceeded'
  | 'timer';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  triggeredAt: string;
  read: boolean;
}

export interface UserSettings {
  themeMode: ThemeMode;
  currencySymbol: string;
  dailyBudgetCap: number;
  budgetWarningPercent: number; // e.g., 80
  dailyGoalSuccessThreshold: number; // e.g., 80
  notificationsEnabled: boolean;
  morningReminderTime: string; // HH:mm
  eveningReminderTime: string; // HH:mm
  celebrateMilestones: boolean;
  budgetWarningsEnabled: boolean;
  lastMorningAlertDate?: string;
  lastEveningAlertDate?: string;
  lastBudgetWarnDate?: string;
  lastBudgetExceedDate?: string;
}

export type FocusPillar =
  | 'Work & Projects'
  | 'Study & Learning'
  | 'Health & Routine'
  | 'Financial Discipline';

export type AvatarStyle = 'art' | 'monogram' | 'photo';

export interface UserProfile {
  name: string;
  username?: string;
  role: string;
  bio?: string;
  email?: string;
  phone?: string;
  location?: string;
  focusPillar: FocusPillar;
  dailyFocusTargetMinutes: number;
  avatarStyle: AvatarStyle;
  avatarColor: string;
  avatarDataUrl?: string;
  avatarCustomized?: boolean;
  dailyTargetsConfigured?: boolean;
  profileChecklistDismissed?: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface LocalUserAccount {
  id: string;
  username: string;
  name: string;
  role: string;
  focusPillar: FocusPillar;
  avatarStyle: AvatarStyle;
  avatarColor: string;
  avatarDataUrl?: string;
  pinHash?: string;
  createdAt: string;
  lastSignedInAt: string;
}

export interface LocalAuthRegistry {
  accounts: LocalUserAccount[];
  activeAccountId: string | null;
}

export interface ProfileCompletionTask {
  id: 'identity' | 'role_bio' | 'contact' | 'avatar' | 'targets';
  label: string;
  description: string;
  completed: boolean;
}

export interface DaymarkStoreState {
  profile: UserProfile;
  goals: DailyGoal[];
  sessions: WorkSession[];
  expenses: ExpenseEntry[];
  notifications: NotificationRecord[];
  settings: UserSettings;
  lastSyncedAt: string;
}

export interface DaySummary {
  dateKey: string;
  dayShort: string;
  dayNum: string;
  avgGoalProgress: number;
  completedGoalsCount: number;
  totalGoalsCount: number;
  totalMinutesWorked: number;
  totalSpent: number;
  budgetCap: number;
  goalMet: boolean;
  underBudget: boolean;
  dualWin: boolean;
}
