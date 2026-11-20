import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonBase,
  CssBaseline,
  Fab,
  IconButton,
  Snackbar,
  ThemeProvider,
} from '@mui/material';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';
import { AnimatePresence, motion } from 'motion/react';
import type {
  DailyGoal,
  DaymarkStoreState,
  ExpenseEntry,
  FocusPillar,
  LocalAuthRegistry,
  LocalUserAccount,
  NavTab,
  NotificationRecord,
  NotificationType,
  UserProfile,
  UserSettings,
  WorkSession,
} from './types/daymark';
import {
  calculateGoalProgress,
  computeDailySummaries,
  computeStreaks,
  formatCurrency,
  formatHeaderDate,
  getRecentDateKeys,
  toDateKey,
} from './utils/dateUtils';
import { normalizeUsername } from './utils/profileUtils';
import {
  buildLocalAccountFromProfile,
  createEmptyState,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  deleteUserState,
  loadLocalAuthRegistry,
  loadUserState,
  saveLocalAuthRegistry,
  saveUserState,
  validateImportedSnapshot,
} from './storage/offlineDb';
import {
  dispatchDeviceNotification,
  getNotificationPermission,
  requestNotificationPermission,
  type BrowserNotificationPermission,
} from './services/notifications';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { buildDaymarkMuiTheme } from './theme/muiTheme';
import { TodayView } from './components/TodayView';
import { FocusView } from './components/FocusView';
import { BudgetView } from './components/BudgetView';
import { AlertsSettingsView } from './components/AlertsSettingsView';
import { GoalDrawer } from './components/GoalDrawer';
import { ExpenseDrawer } from './components/ExpenseDrawer';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ProfileDrawer } from './components/ProfileDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FirebaseProvider, useFirebaseAuth } from './firebase/FirebaseProvider';
import {
  deleteExpenseFromCloud,
  deleteGoalFromCloud,
  deleteNotificationFromCloud,
  deleteSessionFromCloud,
  ensureUserAccountDoc,
  seedCloudFromLocalState,
  subscribeUserCloudData,
  syncExpenseToCloud,
  syncGoalToCloud,
  syncNotificationToCloud,
  syncSessionToCloud,
  syncUserAccountToCloud,
} from './firebase/firestoreSync';

interface ToastState {
  open: boolean;
  severity: 'success' | 'info' | 'warning' | 'error';
  title: string;
  body?: string;
}

interface DaymarkInnerProps {
  store: DaymarkStoreState;
  setStore: React.Dispatch<React.SetStateAction<DaymarkStoreState>>;
  registry: LocalAuthRegistry;
  onActivateLocalAccount: (accountId: string) => Promise<void>;
  onCreateLocalAccount: (payload: {
    profile: UserProfile;
    settings: UserSettings;
    pinHash?: string;
    switchImmediately: boolean;
  }) => Promise<LocalUserAccount>;
  onSignOutLocalAccount: () => void;
  onDeleteLocalAccount: (accountId: string) => Promise<void>;
  onUpdateActiveLocalPin: (pinHash: string | undefined) => void;
  isDark: boolean;
}

const DaymarkInner: React.FC<DaymarkInnerProps> = ({
  store,
  setStore,
  registry,
  onActivateLocalAccount,
  onCreateLocalAccount,
  onSignOutLocalAccount,
  onDeleteLocalAccount,
  onUpdateActiveLocalPin,
  isDark,
}) => {
  const { user, authReady, isSigningIn, signIn, signOut } = useFirebaseAuth();
  const isOnline = useOnlineStatus();
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    severity: 'info',
    title: '',
  });

  const showToast = useCallback(
    (severity: ToastState['severity'], title: string, body?: string) => {
      setToast({ open: true, severity, title, body });
    },
    []
  );

  const todayDateKey = toDateKey();
  const recentDateKeys = useMemo(() => getRecentDateKeys(7), []);

  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayDateKey);
  const [activeFocusGoalId, setActiveFocusGoalId] = useState<string | null>(null);

  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<DailyGoal | null>(null);

  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  const [permissionStatus, setPermissionStatus] = useState<BrowserNotificationPermission>(
    getNotificationPermission()
  );

  const summaries = useMemo(
    () =>
      computeDailySummaries(
        recentDateKeys,
        store.goals,
        store.sessions,
        store.expenses,
        store.settings.dailyBudgetCap,
        store.settings.dailyGoalSuccessThreshold
      ),
    [
      recentDateKeys,
      store.goals,
      store.sessions,
      store.expenses,
      store.settings.dailyBudgetCap,
      store.settings.dailyGoalSuccessThreshold,
    ]
  );

  const { goalStreak, dualWinStreak } = useMemo(() => computeStreaks(summaries), [summaries]);

  const unreadAlerts = useMemo(
    () => store.notifications.filter((n) => !n.read).length,
    [store.notifications]
  );

  const selectedDaySpent = useMemo(
    () =>
      Number(
        store.expenses
          .filter((e) => e.dateKey === selectedDateKey)
          .reduce((sum, e) => sum + e.amount, 0)
          .toFixed(2)
      ),
    [store.expenses, selectedDateKey]
  );

  // Attach real-time Firestore listeners ONLY when authReady && user is authenticated
  useEffect(() => {
    if (!authReady || !user) {
      setCloudReady(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const bootstrapCloud = async () => {
      setCloudSyncing(true);
      try {
        const defaultName = store.profile.name || user.displayName || 'Explorer';
        const initialProfile: UserProfile = {
          ...store.profile,
          name: defaultName,
        };
        const createdFresh = await ensureUserAccountDoc(
          user.uid,
          initialProfile,
          store.settings
        );

        if (createdFresh && !cancelled) {
          await seedCloudFromLocalState(user.uid, {
            ...store,
            profile: initialProfile,
          });
        }

        if (cancelled) return;

        unsubscribe = subscribeUserCloudData(user.uid, {
          onAccount: (profilePatch, settingsPatch) => {
            setStore((prev) => ({
              ...prev,
              profile: {
                ...prev.profile,
                ...profilePatch,
                avatarDataUrl: prev.profile.avatarDataUrl,
              },
              settings: { ...prev.settings, ...settingsPatch },
              lastSyncedAt: new Date().toISOString(),
            }));
          },
          onGoals: (cloudGoals) => {
            setStore((prev) => ({
              ...prev,
              goals: cloudGoals,
              lastSyncedAt: new Date().toISOString(),
            }));
          },
          onSessions: (cloudSessions) => {
            setStore((prev) => ({
              ...prev,
              sessions: cloudSessions,
              lastSyncedAt: new Date().toISOString(),
            }));
          },
          onExpenses: (cloudExpenses) => {
            setStore((prev) => ({
              ...prev,
              expenses: cloudExpenses,
              lastSyncedAt: new Date().toISOString(),
            }));
          },
          onNotifications: (cloudNotifications) => {
            setStore((prev) => ({
              ...prev,
              notifications: cloudNotifications,
              lastSyncedAt: new Date().toISOString(),
            }));
          },
        });
        setCloudReady(true);
      } catch (err) {
        console.error('Firebase sync initialization failed:', err);
        showToast('warning', 'Offline mode active', 'Could not reach cloud sync right now.');
      } finally {
        if (!cancelled) setCloudSyncing(false);
      }
    };

    void bootstrapCloud();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.uid]);

  const handleGoogleSignIn = async () => {
    const signedIn = await signIn();
    if (signedIn) {
      if (!registry.activeAccountId) {
        const displayName = signedIn.displayName || signedIn.email?.split('@')[0] || 'Explorer';
        const existingMatch = registry.accounts.find(
          (a) =>
            a.id === `google-${signedIn.uid}` ||
            (signedIn.email && a.username === normalizeUsername(signedIn.email.split('@')[0]))
        );
        if (existingMatch) {
          await onActivateLocalAccount(existingMatch.id);
        } else {
          await onCreateLocalAccount({
            profile: {
              ...DEFAULT_PROFILE,
              name: displayName,
              username: normalizeUsername(displayName, 'user'),
              email: signedIn.email || undefined,
              onboardingCompleted: true,
              createdAt: new Date().toISOString(),
            },
            settings: { ...store.settings },
            switchImmediately: true,
          });
        }
      }
      showToast('success', `Signed in as ${signedIn.email || signedIn.displayName}`);
    } else {
      showToast('info', 'Google sign-in was cancelled.');
    }
  };

  const handleGoogleSignOut = async () => {
    await signOut();
    showToast('info', 'Google cloud sync disconnected — local offline data stays active.');
  };

  const handleForceCloudSync = async () => {
    if (!user) return;
    setCloudSyncing(true);
    try {
      await seedCloudFromLocalState(user.uid, store);
      showToast('success', 'Cloud backup synced');
    } catch {
      showToast('error', 'Cloud sync failed. Check your connection.');
    } finally {
      setCloudSyncing(false);
    }
  };

  const triggerAlert = useCallback(
    (type: NotificationType, title: string, body: string) => {
      const record: NotificationRecord = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        title,
        body,
        triggeredAt: new Date().toISOString(),
        read: false,
      };

      setStore((prev) => ({
        ...prev,
        notifications: [record, ...prev.notifications].slice(0, 50),
      }));

      if (user && cloudReady) {
        void syncNotificationToCloud(user.uid, record).catch(() => {});
      }

      void dispatchDeviceNotification(title, body, `${type}-${Date.now()}`);

      const severity: ToastState['severity'] =
        type === 'milestone'
          ? 'success'
          : type === 'budget_exceeded'
            ? 'error'
            : type === 'budget_warning'
              ? 'warning'
              : 'info';
      showToast(severity, title, body);
    },
    [cloudReady, setStore, showToast, user]
  );

  // Local 30-second reminder scheduler
  useEffect(() => {
    const checkSchedules = () => {
      if (!store.settings.notificationsEnabled) return;
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const todayKey = toDateKey(now);
      const todayGoals = store.goals.filter((g) => g.dateKey === todayKey);

      if (
        store.settings.morningReminderTime &&
        currentHHMM === store.settings.morningReminderTime &&
        store.settings.lastMorningAlertDate !== todayKey
      ) {
        setStore((prev) => ({
          ...prev,
          settings: { ...prev.settings, lastMorningAlertDate: todayKey },
        }));
        triggerAlert(
          'reminder',
          'Morning target check-in',
          todayGoals.length > 0
            ? `You have ${todayGoals.length} daily goals queued today.`
            : 'Plan your daily targets and focus blocks for today.'
        );
      }

      if (
        store.settings.eveningReminderTime &&
        currentHHMM === store.settings.eveningReminderTime &&
        store.settings.lastEveningAlertDate !== todayKey
      ) {
        const unfinished = todayGoals.filter((g) => calculateGoalProgress(g) < 100);
        setStore((prev) => ({
          ...prev,
          settings: { ...prev.settings, lastEveningAlertDate: todayKey },
        }));
        if (unfinished.length > 0) {
          triggerAlert(
            'reminder',
            `${unfinished.length} daily ${unfinished.length === 1 ? 'goal' : 'goals'} unfinished`,
            `Finish "${unfinished[0].title}" to extend your streak.`
          );
        }
      }

      todayGoals.forEach((goal) => {
        if (
          goal.reminderTime &&
          goal.reminderTime === currentHHMM &&
          goal.reminderNotifiedDate !== todayKey &&
          calculateGoalProgress(goal) < 100
        ) {
          setStore((prev) => ({
            ...prev,
            goals: prev.goals.map((g) =>
              g.id === goal.id ? { ...g, reminderNotifiedDate: todayKey } : g
            ),
          }));
          triggerAlert(
            'reminder',
            `Goal reminder: ${goal.title}`,
            `Currently at ${calculateGoalProgress(goal)}%.`
          );
        }
      });
    };

    const timer = window.setInterval(checkSchedules, 30_000);
    return () => window.clearInterval(timer);
  }, [store.goals, store.settings, setStore, triggerAlert]);

  const handleUpdateSettings = (patch: Partial<UserSettings>) => {
    const nextSettings = { ...store.settings, ...patch };
    setStore((prev) => ({
      ...prev,
      settings: nextSettings,
    }));
    if (user && cloudReady) {
      void syncUserAccountToCloud(user.uid, store.profile, nextSettings).catch(() => {});
    }
  };

  const handleToggleQuickTheme = () => {
    handleUpdateSettings({ themeMode: isDark ? 'light' : 'dark' });
  };

  const checkMilestoneCelebration = (updatedGoal: DailyGoal, allNextGoals: DailyGoal[]) => {
    if (!store.settings.celebrateMilestones) return;
    const pct = calculateGoalProgress(updatedGoal);
    if (pct >= 100 && !updatedGoal.milestoneNotified) {
      const sameDayGoals = allNextGoals.filter((g) => g.dateKey === updatedGoal.dateKey);
      const allComplete =
        sameDayGoals.length > 0 &&
        sameDayGoals.every((g) => calculateGoalProgress(g) >= 100);

      if (allComplete) {
        triggerAlert(
          'milestone',
          'All daily goals completed!',
          `Finished all ${sameDayGoals.length} targets for ${formatHeaderDate(updatedGoal.dateKey)}.`
        );
      } else {
        triggerAlert(
          'milestone',
          `Completed: ${updatedGoal.title}`,
          'Target reached 100%.'
        );
      }
    }
  };

  const handleSaveGoal = (goal: DailyGoal) => {
    const exists = store.goals.some((g) => g.id === goal.id);
    const nextPct = calculateGoalProgress(goal);
    const finalized: DailyGoal = {
      ...goal,
      progressPercent: nextPct,
      completedAt: nextPct >= 100 ? goal.completedAt || new Date().toISOString() : undefined,
      milestoneNotified: nextPct >= 100 ? true : goal.milestoneNotified,
    };

    const nextGoals = exists
      ? store.goals.map((g) => (g.id === finalized.id ? finalized : g))
      : [finalized, ...store.goals];

    setStore((prev) => ({ ...prev, goals: nextGoals }));
    if (user && cloudReady) {
      void syncGoalToCloud(user.uid, finalized).catch(() => {});
    }
    showToast('success', exists ? 'Goal updated' : 'Daily goal created');
    if (nextPct >= 100 && !goal.milestoneNotified) {
      checkMilestoneCelebration(goal, nextGoals);
    }
  };

  const handleUpdateGoal = (updated: DailyGoal) => {
    const prevGoal = store.goals.find((g) => g.id === updated.id);
    const nextPct = calculateGoalProgress(updated);
    const justCompleted = nextPct >= 100 && !prevGoal?.milestoneNotified;

    const finalized: DailyGoal = {
      ...updated,
      progressPercent: nextPct,
      completedAt: nextPct >= 100 ? updated.completedAt || new Date().toISOString() : undefined,
      milestoneNotified: justCompleted ? true : updated.milestoneNotified,
    };

    const nextGoals = store.goals.map((g) => (g.id === finalized.id ? finalized : g));
    setStore((prev) => ({ ...prev, goals: nextGoals }));
    if (user && cloudReady) {
      void syncGoalToCloud(user.uid, finalized).catch(() => {});
    }

    if (justCompleted) {
      checkMilestoneCelebration({ ...updated, milestoneNotified: false }, nextGoals);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    setStore((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }));
    if (user && cloudReady) {
      void deleteGoalFromCloud(user.uid, goalId).catch(() => {});
    }
    showToast('info', 'Goal deleted');
  };

  const handleLogWorkSession = (sessionData: Omit<WorkSession, 'id'>) => {
    const newSession: WorkSession = {
      ...sessionData,
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    let completedGoalForAlert: DailyGoal | null = null;
    let updatedGoalForCloud: DailyGoal | null = null;
    const nextGoals = store.goals.map((g) => {
      if (g.id !== sessionData.goalId) return g;
      const nextLogged = g.loggedMinutes + sessionData.durationMinutes;
      const updated: DailyGoal = { ...g, loggedMinutes: nextLogged };
      const pct = calculateGoalProgress(updated);
      updated.progressPercent = pct;
      if (pct >= 100 && !g.milestoneNotified) {
        completedGoalForAlert = { ...updated, milestoneNotified: false };
        updated.milestoneNotified = true;
        updated.completedAt = new Date().toISOString();
      }
      updatedGoalForCloud = updated;
      return updated;
    });

    setStore((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      goals: nextGoals,
    }));

    if (user && cloudReady) {
      void syncSessionToCloud(user.uid, newSession).catch(() => {});
      if (updatedGoalForCloud) {
        void syncGoalToCloud(user.uid, updatedGoalForCloud).catch(() => {});
      }
    }

    triggerAlert(
      'timer',
      `Logged ${sessionData.durationMinutes}m focus`,
      `Saved to "${sessionData.goalTitle}".`
    );

    if (completedGoalForAlert) {
      checkMilestoneCelebration(completedGoalForAlert, nextGoals);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const target = store.sessions.find((s) => s.id === sessionId);
    let updatedGoalForCloud: DailyGoal | null = null;
    setStore((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== sessionId),
      goals: target
        ? prev.goals.map((g) => {
            if (g.id !== target.goalId) return g;
            const nextLogged = Math.max(0, g.loggedMinutes - target.durationMinutes);
            const updated = { ...g, loggedMinutes: nextLogged };
            updated.progressPercent = calculateGoalProgress(updated);
            updatedGoalForCloud = updated;
            return updated;
          })
        : prev.goals,
    }));
    if (user && cloudReady) {
      void deleteSessionFromCloud(user.uid, sessionId).catch(() => {});
      if (updatedGoalForCloud) {
        void syncGoalToCloud(user.uid, updatedGoalForCloud).catch(() => {});
      }
    }
    showToast('info', 'Work session removed');
  };

  const handleSaveExpense = (expense: ExpenseEntry) => {
    const exists = store.expenses.some((e) => e.id === expense.id);
    const nextExpenses = exists
      ? store.expenses.map((e) => (e.id === expense.id ? expense : e))
      : [expense, ...store.expenses];

    const dayTotal = Number(
      nextExpenses
        .filter((e) => e.dateKey === expense.dateKey)
        .reduce((sum, e) => sum + e.amount, 0)
        .toFixed(2)
    );

    const cap = store.settings.dailyBudgetCap;
    const warnPct = store.settings.budgetWarningPercent;
    const ratio = cap > 0 ? Math.round((dayTotal / cap) * 100) : 0;

    let nextSettings = store.settings;
    let budgetAlert: { type: NotificationType; title: string; body: string } | null = null;

    if (store.settings.budgetWarningsEnabled && expense.dateKey === todayDateKey) {
      if (dayTotal > cap && store.settings.lastBudgetExceedDate !== todayDateKey) {
        nextSettings = { ...store.settings, lastBudgetExceedDate: todayDateKey };
        budgetAlert = {
          type: 'budget_exceeded',
          title: 'Daily budget cap exceeded',
          body: `Today’s spend reached ${formatCurrency(dayTotal, store.settings.currencySymbol)} of ${formatCurrency(cap, store.settings.currencySymbol)}.`,
        };
      } else if (
        ratio >= warnPct &&
        dayTotal <= cap &&
        store.settings.lastBudgetWarnDate !== todayDateKey
      ) {
        nextSettings = { ...store.settings, lastBudgetWarnDate: todayDateKey };
        budgetAlert = {
          type: 'budget_warning',
          title: `Daily budget at ${ratio}%`,
          body: `${formatCurrency(cap - dayTotal, store.settings.currencySymbol)} remaining today.`,
        };
      }
    }

    setStore((prev) => ({
      ...prev,
      expenses: nextExpenses,
      settings: nextSettings,
    }));

    if (user && cloudReady) {
      void syncExpenseToCloud(user.uid, expense).catch(() => {});
    }

    showToast('success', exists ? 'Expense updated' : 'Expense saved');

    if (budgetAlert) {
      triggerAlert(budgetAlert.type, budgetAlert.title, budgetAlert.body);
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    setStore((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
    if (user && cloudReady) {
      void deleteExpenseFromCloud(user.uid, expenseId).catch(() => {});
    }
    showToast('info', 'Expense deleted');
  };

  const handleRequestNotificationPermission = async () => {
    const result = await requestNotificationPermission();
    setPermissionStatus(result);
    if (result === 'granted') {
      triggerAlert(
        'reminder',
        'Notifications enabled',
        'You will receive daily reminders, milestone alerts, and budget warnings.'
      );
    } else if (result === 'denied') {
      showToast('warning', 'Browser notifications blocked — in-app alerts remain active.');
    }
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daymark-backup-${todayDateKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Backup exported');
  };

  const handleImportBackup = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      const valid = validateImportedSnapshot(parsed);
      if (!valid) {
        showToast('error', 'Invalid Daymark backup file.');
        return;
      }
      setStore(valid);
      showToast('success', 'Backup restored');
    } catch {
      showToast('error', 'Could not read JSON backup file.');
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'today', label: 'Home', icon: <TrackChangesRoundedIcon sx={{ fontSize: 22 }} /> },
    { id: 'focus', label: 'Focus', icon: <TimerRoundedIcon sx={{ fontSize: 22 }} /> },
    { id: 'budget', label: 'Budget', icon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: 22 }} /> },
    {
      id: 'alerts',
      label: 'Settings',
      icon: <NotificationsRoundedIcon sx={{ fontSize: 22 }} />,
      badge: unreadAlerts > 0 ? unreadAlerts : undefined,
    },
  ];

  const handlePrimaryAction = () => {
    if (activeTab === 'budget') {
      setEditingExpense(null);
      setExpenseDrawerOpen(true);
    } else {
      setEditingGoal(null);
      setGoalDrawerOpen(true);
    }
  };

  const handleCompleteOnboarding = async (payload: {
    profile: UserProfile;
    settingsPatch: Partial<UserSettings>;
    pinHash?: string;
    isNewAccount: boolean;
  }) => {
    const nextSettings: UserSettings = {
      ...store.settings,
      ...payload.settingsPatch,
    };

    if (payload.isNewAccount || !registry.activeAccountId) {
      await onCreateLocalAccount({
        profile: payload.profile,
        settings: nextSettings,
        pinHash: payload.pinHash,
        switchImmediately: true,
      });
      setActiveTab('today');
    } else {
      setStore((prev) => ({
        ...prev,
        profile: payload.profile,
        settings: nextSettings,
      }));
      if (payload.pinHash) {
        onUpdateActiveLocalPin(payload.pinHash);
      }
    }

    if (user && cloudReady) {
      void syncUserAccountToCloud(user.uid, payload.profile, nextSettings).catch(() => {});
    }
    showToast('success', `Welcome to Daymark, ${payload.profile.name}!`);
  };

  const handleSignInLocalAccount = async (accountId: string) => {
    if (user) {
      await signOut().catch(() => {});
    }
    await onActivateLocalAccount(accountId);
    setActiveTab('today');
    const acc = registry.accounts.find((a) => a.id === accountId);
    showToast('success', `Signed in as ${acc?.name || 'Local User'}`);
  };

  const handleSwitchLocalAccount = async (accountId: string) => {
    if (user) {
      await signOut().catch(() => {});
    }
    await onActivateLocalAccount(accountId);
    setActiveTab('today');
    const acc = registry.accounts.find((a) => a.id === accountId);
    showToast('success', `Switched to ${acc?.name || 'Local User'}`);
  };

  const handleAddLocalAccountFromSettings = async (payload: {
    name: string;
    username: string;
    role: string;
    focusPillar: FocusPillar;
    pinHash?: string;
    switchImmediately: boolean;
  }) => {
    if (payload.switchImmediately && user) {
      await signOut().catch(() => {});
    }
    const created = await onCreateLocalAccount({
      profile: {
        ...DEFAULT_PROFILE,
        name: payload.name,
        username: payload.username,
        role: payload.role,
        focusPillar: payload.focusPillar,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
      },
      settings: { ...DEFAULT_SETTINGS, themeMode: store.settings.themeMode },
      pinHash: payload.pinHash,
      switchImmediately: payload.switchImmediately,
    });
    if (payload.switchImmediately) {
      setActiveTab('today');
      showToast('success', `Created & switched to ${created.name}`);
    } else {
      showToast('success', `Added local user ${created.name} (@${created.username})`);
    }
  };

  const handleSignOutLocal = async () => {
    if (user) {
      await signOut().catch(() => {});
    }
    onSignOutLocalAccount();
    setActiveTab('today');
    showToast('info', 'Signed out locally — your workspace is safely saved on this device.');
  };

  const handleDeleteLocalUser = async (accountId: string) => {
    const target = registry.accounts.find((a) => a.id === accountId);
    await onDeleteLocalAccount(accountId);
    showToast('info', `Removed local account ${target?.name || ''}`.trim());
  };

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setStore((prev) => ({
      ...prev,
      profile: updatedProfile,
    }));
    if (user && cloudReady) {
      void syncUserAccountToCloud(user.uid, updatedProfile, store.settings).catch(() => {});
    }
    showToast('success', 'Profile details updated');
  };

  const handleDismissProfileChecklist = () => {
    setStore((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        profileChecklistDismissed: true,
      },
    }));
  };

  const handleReplayOnboarding = () => {
    setStore((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        onboardingCompleted: false,
      },
    }));
  };

  const isReplayMode = Boolean(registry.activeAccountId && !store.profile.onboardingCompleted);

  if (!registry.activeAccountId || !store.profile.onboardingCompleted) {
    return (
      <>
        <OnboardingFlow
          initialProfile={isReplayMode ? store.profile : { ...DEFAULT_PROFILE }}
          settings={store.settings}
          isDark={isDark}
          isSigningIn={isSigningIn}
          localAccounts={registry.accounts}
          isReplayMode={isReplayMode}
          onSignInLocalAccount={(id) => void handleSignInLocalAccount(id)}
          onGoogleSignIn={handleGoogleSignIn}
          onUpdateSettingsPreview={handleUpdateSettings}
          onRequestNotificationPermission={handleRequestNotificationPermission}
          onComplete={(payload) => void handleCompleteOnboarding(payload)}
        />
        <Snackbar
          open={toast.open}
          autoHideDuration={3500}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={() => setToast((t) => ({ ...t, open: false }))}
            sx={{ width: '100%' }}
          >
            <strong>{toast.title}</strong>
            {toast.body ? ` — ${toast.body}` : ''}
          </Alert>
        </Snackbar>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#111318] text-[#191C20] dark:text-[#E3E5EC] transition-colors duration-150">
      {/* Desktop 3-Zone Material App Bar (>= 1024px) */}
      <header className="hidden lg:block sticky top-0 z-30 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-md border-b border-[#DDE3EE] dark:border-[#2B313E]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-xl bg-[#00639B] dark:bg-[#8ACEFF] text-white dark:text-[#003352] inline-flex items-center justify-center">
              <TrackChangesRoundedIcon sx={{ fontSize: 19 }} />
            </span>
            Daymark
          </button>

          <nav className="flex items-center gap-7" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'text-[#00639B] dark:text-[#8ACEFF]'
                      : 'text-[#515864] dark:text-[#9EA6B6] hover:text-[#191C20] dark:hover:text-[#E3E5EC]'
                  }`}
                >
                  {item.label}
                  {item.badge ? ` (${item.badge})` : ''}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-[15px] h-[3px] bg-[#00639B] dark:bg-[#8ACEFF] rounded-t-full" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="contained"
              onClick={handlePrimaryAction}
              startIcon={<AddRoundedIcon />}
            >
              {activeTab === 'budget' ? 'Log Expense' : 'New Goal'}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Material Top App Bar (< 1024px, 54px) */}
      <header className="lg:hidden sticky top-0 z-30 h-[54px] px-3.5 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-md border-b border-[#DDE3EE] dark:border-[#2B313E] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className="inline-flex items-center gap-2 font-display text-base font-extrabold tracking-tight whitespace-nowrap shrink-0"
        >
          <span className="w-7 h-7 rounded-xl bg-[#00639B] dark:bg-[#8ACEFF] text-white dark:text-[#003352] inline-flex items-center justify-center">
            <TrackChangesRoundedIcon sx={{ fontSize: 17 }} />
          </span>
          Daymark
        </button>

        <span className="text-xs font-medium text-[#515864] dark:text-[#9EA6B6] truncate">
          {formatHeaderDate(selectedDateKey)}
        </span>

        <IconButton
          onClick={handleToggleQuickTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          size="small"
          sx={{ mr: -0.5 }}
        >
          {isDark ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
        </IconButton>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-[#A15C00] text-white text-xs font-medium px-4 py-2 text-center flex items-center justify-center gap-2">
          <WifiOffRoundedIcon sx={{ fontSize: 16 }} />
          <span>Offline Mode — Saving locally on your device.</span>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-5 pb-28 lg:pb-12">
        {/* Desktop subtle date & theme utility line */}
        <div className="hidden lg:flex items-center justify-between mb-5 text-xs text-[#515864] dark:text-[#9EA6B6]">
          <span>{formatHeaderDate(selectedDateKey)}</span>
          <button
            type="button"
            onClick={handleToggleQuickTheme}
            className="inline-flex items-center gap-1.5 hover:text-[#191C20] dark:hover:text-[#E3E5EC] transition-colors cursor-pointer"
          >
            {isDark ? <LightModeRoundedIcon sx={{ fontSize: 16 }} /> : <DarkModeRoundedIcon sx={{ fontSize: 16 }} />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            {activeTab === 'today' && (
              <TodayView
                profile={store.profile}
                settings={store.settings}
                selectedDateKey={selectedDateKey}
                todayDateKey={todayDateKey}
                summaries={summaries}
                goals={store.goals}
                currencySymbol={store.settings.currencySymbol}
                dailyBudgetCap={store.settings.dailyBudgetCap}
                budgetWarningPercent={store.settings.budgetWarningPercent}
                goalStreak={goalStreak}
                dualWinStreak={dualWinStreak}
                onOpenProfile={() => setProfileDrawerOpen(true)}
                onDismissProfileChecklist={handleDismissProfileChecklist}
                onSelectDate={setSelectedDateKey}
                onOpenNewGoal={() => {
                  setEditingGoal(null);
                  setGoalDrawerOpen(true);
                }}
                onEditGoal={(goal) => {
                  setEditingGoal(goal);
                  setGoalDrawerOpen(true);
                }}
                onDeleteGoal={handleDeleteGoal}
                onUpdateGoal={handleUpdateGoal}
                onStartFocusForGoal={(goalId) => {
                  setActiveFocusGoalId(goalId);
                  setActiveTab('focus');
                }}
                onOpenQuickExpense={() => {
                  setEditingExpense(null);
                  setExpenseDrawerOpen(true);
                }}
              />
            )}

            {activeTab === 'focus' && (
              <FocusView
                dateKey={selectedDateKey}
                goals={store.goals}
                sessions={store.sessions}
                activeGoalId={activeFocusGoalId}
                onSelectGoalId={setActiveFocusGoalId}
                onLogWorkSession={handleLogWorkSession}
                onDeleteSession={handleDeleteSession}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetView
                selectedDateKey={selectedDateKey}
                summaries={summaries}
                expenses={store.expenses}
                currencySymbol={store.settings.currencySymbol}
                dailyBudgetCap={store.settings.dailyBudgetCap}
                budgetWarningPercent={store.settings.budgetWarningPercent}
                dualWinStreak={dualWinStreak}
                isDark={isDark}
                onUpdateBudgetCap={(cap) => handleUpdateSettings({ dailyBudgetCap: cap })}
                onUpdateCurrency={(symbol) => handleUpdateSettings({ currencySymbol: symbol })}
                onOpenNewExpense={() => {
                  setEditingExpense(null);
                  setExpenseDrawerOpen(true);
                }}
                onEditExpense={(exp) => {
                  setEditingExpense(exp);
                  setExpenseDrawerOpen(true);
                }}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsSettingsView
                profile={store.profile}
                settings={store.settings}
                notifications={store.notifications}
                permissionStatus={permissionStatus}
                lastSyncedAt={store.lastSyncedAt}
                cloudUserEmail={user?.email || null}
                cloudSyncing={cloudSyncing}
                isSigningIn={isSigningIn}
                localAccounts={registry.accounts}
                activeLocalAccountId={registry.activeAccountId}
                onGoogleSignIn={() => void handleGoogleSignIn()}
                onGoogleSignOut={() => void handleGoogleSignOut()}
                onForceCloudSync={() => void handleForceCloudSync()}
                onSaveProfile={handleSaveProfile}
                onEditProfile={() => setProfileDrawerOpen(true)}
                onReplayOnboarding={handleReplayOnboarding}
                onSignOutLocal={() => void handleSignOutLocal()}
                onSwitchLocalAccount={(id) => void handleSwitchLocalAccount(id)}
                onAddLocalAccount={(payload) => void handleAddLocalAccountFromSettings(payload)}
                onDeleteLocalAccount={(id) => void handleDeleteLocalUser(id)}
                onUpdateActiveLocalPin={(pinHash) => {
                  onUpdateActiveLocalPin(pinHash);
                  showToast('success', pinHash ? 'Local 4-digit PIN saved' : 'Local PIN removed');
                }}
                onUpdateSettings={handleUpdateSettings}
                onRequestPermission={handleRequestNotificationPermission}
                onSendTestAlert={() =>
                  triggerAlert(
                    'reminder',
                    'Daymark reminder active',
                    'Offline reminders are working on this device.'
                  )
                }
                onMarkAllRead={() => {
                  const unread = store.notifications.filter((n) => !n.read);
                  setStore((prev) => ({
                    ...prev,
                    notifications: prev.notifications.map((n) => ({ ...n, read: true })),
                  }));
                  if (user && cloudReady) {
                    unread.forEach((n) => {
                      void syncNotificationToCloud(user.uid, { ...n, read: true }).catch(() => {});
                    });
                  }
                }}
                onClearNotifications={() => {
                  const existingIds = store.notifications.map((n) => n.id);
                  setStore((prev) => ({ ...prev, notifications: [] }));
                  if (user && cloudReady) {
                    existingIds.forEach((id) => {
                      void deleteNotificationFromCloud(user.uid, id).catch(() => {});
                    });
                  }
                }}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onResetEmpty={() => {
                  setStore(createEmptyState(store.settings, store.profile));
                  showToast('success', 'Current user local data cleared');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Material Design 3 Floating Action Button (Thumb Zone) */}
      {(activeTab === 'today' || activeTab === 'budget') && (
        <div className="lg:hidden fixed right-4 bottom-[82px] z-40">
          <Fab
            color="primary"
            aria-label={activeTab === 'budget' ? 'Log expense' : 'Add daily goal'}
            onClick={handlePrimaryAction}
          >
            <AddRoundedIcon />
          </Fab>
        </div>
      )}

      {/* Mobile Material Design 3 Navigation Bar with Active Tonal Indicator Pill */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-md border-t border-[#DDE3EE] dark:border-[#2B313E] pb-safe"
      >
        <div className="grid grid-cols-4 h-[68px] items-center px-1">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <ButtonBase
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                }}
              >
                <span
                  className={`w-14 h-8 rounded-full inline-flex items-center justify-center transition-colors duration-200 ${
                    active
                      ? 'bg-[#CEE5FF] dark:bg-[#004B73] text-[#001D32] dark:text-[#CEE5FF]'
                      : 'text-[#515864] dark:text-[#9EA6B6]'
                  }`}
                >
                  {item.badge ? (
                    <Badge badgeContent={item.badge > 9 ? '9+' : item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </span>
                <span
                  className={`text-[11px] leading-none tracking-tight ${
                    active
                      ? 'font-bold text-[#191C20] dark:text-[#E3E5EC]'
                      : 'font-medium text-[#515864] dark:text-[#9EA6B6]'
                  }`}
                >
                  {item.label}
                </span>
              </ButtonBase>
            );
          })}
        </div>
      </nav>

      {/* Material 3 Bottom Sheet Drawers */}
      <GoalDrawer
        open={goalDrawerOpen}
        dateKey={selectedDateKey}
        editingGoal={editingGoal}
        onClose={() => setGoalDrawerOpen(false)}
        onSave={handleSaveGoal}
      />

      <ExpenseDrawer
        open={expenseDrawerOpen}
        dateKey={selectedDateKey}
        currencySymbol={store.settings.currencySymbol}
        todaySpent={selectedDaySpent}
        dailyBudgetCap={store.settings.dailyBudgetCap}
        editingExpense={editingExpense}
        onClose={() => setExpenseDrawerOpen(false)}
        onSave={handleSaveExpense}
      />

      <ProfileDrawer
        open={profileDrawerOpen}
        profile={store.profile}
        settings={store.settings}
        onClose={() => setProfileDrawerOpen(false)}
        onSave={handleSaveProfile}
        onReplayOnboarding={handleReplayOnboarding}
        onSignOutLocal={() => void handleSignOutLocal()}
      />

      {/* Material Design Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3400}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ width: '100%' }}
        >
          <strong>{toast.title}</strong>
          {toast.body ? ` — ${toast.body}` : ''}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default function App() {
  const [registry, setRegistry] = useState<LocalAuthRegistry>({
    accounts: [],
    activeAccountId: null,
  });
  const [store, setStore] = useState<DaymarkStoreState>(() => createEmptyState());
  const [hydrated, setHydrated] = useState(false);
  const [systemDark, setSystemDark] = useState(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      const reg = await loadLocalAuthRegistry();
      if (!mounted) return;
      setRegistry(reg);
      if (reg.activeAccountId) {
        const userState = await loadUserState(reg.activeAccountId);
        if (mounted) {
          setStore(userState);
        }
      } else {
        setStore(createEmptyState());
      }
      if (mounted) setHydrated(true);
    };
    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist active user's state & keep account card metadata in sync
  useEffect(() => {
    if (!hydrated || !registry.activeAccountId) return;
    const activeId = registry.activeAccountId;
    void saveUserState(activeId, store);

    setRegistry((prev) => {
      const idx = prev.accounts.findIndex((a) => a.id === activeId);
      if (idx === -1) return prev;
      const current = prev.accounts[idx];
      const nextUsername = normalizeUsername(
        store.profile.username || store.profile.name,
        current.username
      );
      const nextName = store.profile.name.trim() || current.name;
      const nextRole = store.profile.role.trim() || 'Daily Achiever';
      const changed =
        current.name !== nextName ||
        current.username !== nextUsername ||
        current.role !== nextRole ||
        current.focusPillar !== store.profile.focusPillar ||
        current.avatarStyle !== store.profile.avatarStyle ||
        current.avatarColor !== store.profile.avatarColor ||
        current.avatarDataUrl !== store.profile.avatarDataUrl;
      if (!changed) return prev;

      const updatedAccounts = prev.accounts.map((a) =>
        a.id === activeId
          ? {
              ...a,
              name: nextName,
              username: nextUsername,
              role: nextRole,
              focusPillar: store.profile.focusPillar,
              avatarStyle: store.profile.avatarStyle,
              avatarColor: store.profile.avatarColor,
              avatarDataUrl: store.profile.avatarDataUrl,
            }
          : a
      );
      const nextReg: LocalAuthRegistry = { ...prev, accounts: updatedAccounts };
      void saveLocalAuthRegistry(nextReg);
      return nextReg;
    });
  }, [store, hydrated, registry.activeAccountId]);

  const handleActivateLocalAccount = useCallback(async (accountId: string) => {
    const loaded = await loadUserState(accountId);
    const now = new Date().toISOString();
    setStore(loaded);
    setRegistry((prev) => {
      const nextReg: LocalAuthRegistry = {
        activeAccountId: accountId,
        accounts: prev.accounts.map((a) =>
          a.id === accountId ? { ...a, lastSignedInAt: now } : a
        ),
      };
      void saveLocalAuthRegistry(nextReg);
      return nextReg;
    });
  }, []);

  const handleCreateLocalAccount = useCallback(
    async (payload: {
      profile: UserProfile;
      settings: UserSettings;
      pinHash?: string;
      switchImmediately: boolean;
    }): Promise<LocalUserAccount> => {
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const freshState = createEmptyState(payload.settings, {
        ...payload.profile,
        onboardingCompleted: true,
      });
      const account = buildLocalAccountFromProfile(id, freshState.profile, payload.pinHash);
      await saveUserState(id, freshState);

      if (payload.switchImmediately) {
        setStore(freshState);
      }

      setRegistry((prev) => {
        const nextReg: LocalAuthRegistry = {
          accounts: [account, ...prev.accounts],
          activeAccountId: payload.switchImmediately ? id : prev.activeAccountId,
        };
        void saveLocalAuthRegistry(nextReg);
        return nextReg;
      });

      return account;
    },
    []
  );

  const handleSignOutLocalAccount = useCallback(() => {
    setRegistry((prev) => {
      const nextReg: LocalAuthRegistry = {
        ...prev,
        activeAccountId: null,
      };
      void saveLocalAuthRegistry(nextReg);
      return nextReg;
    });
    setStore((prev) => createEmptyState({ ...DEFAULT_SETTINGS, themeMode: prev.settings.themeMode }));
  }, []);

  const handleDeleteLocalAccount = useCallback(async (accountId: string) => {
    await deleteUserState(accountId);
    setRegistry((prev) => {
      const remaining = prev.accounts.filter((a) => a.id !== accountId);
      const nextActive = prev.activeAccountId === accountId ? null : prev.activeAccountId;
      const nextReg: LocalAuthRegistry = {
        accounts: remaining,
        activeAccountId: nextActive,
      };
      void saveLocalAuthRegistry(nextReg);
      return nextReg;
    });
  }, []);

  const handleUpdateActiveLocalPin = useCallback((pinHash: string | undefined) => {
    setRegistry((prev) => {
      if (!prev.activeAccountId) return prev;
      const nextReg: LocalAuthRegistry = {
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === prev.activeAccountId ? { ...a, pinHash } : a
        ),
      };
      void saveLocalAuthRegistry(nextReg);
      return nextReg;
    });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark =
    store.settings.themeMode === 'dark' ||
    (store.settings.themeMode === 'system' && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', isDark ? '#111318' : '#F6F8FC');
    }
  }, [isDark]);

  const muiTheme = useMemo(() => buildDaymarkMuiTheme(isDark), [isDark]);

  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          {hydrated ? (
            <DaymarkInner
              store={store}
              setStore={setStore}
              registry={registry}
              onActivateLocalAccount={handleActivateLocalAccount}
              onCreateLocalAccount={handleCreateLocalAccount}
              onSignOutLocalAccount={handleSignOutLocalAccount}
              onDeleteLocalAccount={handleDeleteLocalAccount}
              onUpdateActiveLocalPin={handleUpdateActiveLocalPin}
              isDark={isDark}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center bg-[#F6F8FC] dark:bg-[#111318]">
              <span className="font-display text-sm font-medium text-[#515864] dark:text-[#9EA6B6]">
                Loading Daymark...
              </span>
            </div>
          )}
        </ThemeProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
