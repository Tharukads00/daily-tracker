import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntApp, ConfigProvider, theme as antTheme } from 'antd';
import {
  Bell,
  Moon,
  Plus,
  Sun,
  Target,
  Timer,
  Wallet,
  WifiOff,
} from 'lucide-react';
import type {
  DailyGoal,
  DaymarkStoreState,
  ExpenseEntry,
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
import {
  createEmptyState,
  createSeedState,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  loadOfflineState,
  saveOfflineState,
  validateImportedSnapshot,
} from './storage/offlineDb';
import {
  dispatchDeviceNotification,
  getNotificationPermission,
  requestNotificationPermission,
  type BrowserNotificationPermission,
} from './services/notifications';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { TodayView } from './components/TodayView';
import { FocusView } from './components/FocusView';
import { BudgetView } from './components/BudgetView';
import { AlertsSettingsView } from './components/AlertsSettingsView';
import { GoalDrawer } from './components/GoalDrawer';
import { ExpenseDrawer } from './components/ExpenseDrawer';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ProfileDrawer } from './components/ProfileDrawer';

interface DaymarkInnerProps {
  store: DaymarkStoreState;
  setStore: React.Dispatch<React.SetStateAction<DaymarkStoreState>>;
  isDark: boolean;
}

const DaymarkInner: React.FC<DaymarkInnerProps> = ({ store, setStore, isDark }) => {
  const { message, notification: antNotification } = AntApp.useApp();
  const isOnline = useOnlineStatus();

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

      // Fire native browser/ServiceWorker push notification if granted
      void dispatchDeviceNotification(title, body, `${type}-${Date.now()}`);

      // Also display crisp in-app Ant Design toast so feedback is instant on every device
      if (type === 'milestone') {
        antNotification.success({ message: title, description: body, placement: 'topRight' });
      } else if (type === 'budget_exceeded') {
        antNotification.error({ message: title, description: body, placement: 'topRight' });
      } else if (type === 'budget_warning') {
        antNotification.warning({ message: title, description: body, placement: 'topRight' });
      } else {
        antNotification.info({ message: title, description: body, placement: 'topRight' });
      }
    },
    [antNotification, setStore]
  );

  // Background 30-second local scheduler for daily check-ins, unfinished goals & per-goal reminders
  useEffect(() => {
    const checkSchedules = () => {
      if (!store.settings.notificationsEnabled) return;
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const todayKey = toDateKey(now);
      const todayGoals = store.goals.filter((g) => g.dateKey === todayKey);

      // 1. Morning reminder
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
            ? `You have ${todayGoals.length} daily target goals queued. Keep spending under ${formatCurrency(store.settings.dailyBudgetCap, store.settings.currencySymbol)}.`
            : 'Plan your daily target goals and set your focus blocks for today.'
        );
      }

      // 2. Evening unfinished goal alert
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
            `${unfinished.length} daily ${unfinished.length === 1 ? 'goal' : 'goals'} still unfinished`,
            `Finish "${unfinished[0].title}" before midnight to extend your streak.`
          );
        }
      }

      // 3. Per-goal custom reminder times
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
            `Currently at ${calculateGoalProgress(goal)}% — log a quick focus block or progress update.`
          );
        }
      });
    };

    const timer = window.setInterval(checkSchedules, 30_000);
    return () => window.clearInterval(timer);
  }, [store.goals, store.settings, setStore, triggerAlert]);

  const handleUpdateSettings = (patch: Partial<UserSettings>) => {
    setStore((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
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
          'All daily target goals completed!',
          `You finished all ${sameDayGoals.length} targets for ${formatHeaderDate(updatedGoal.dateKey)}.`
        );
      } else {
        triggerAlert(
          'milestone',
          `Milestone reached: ${updatedGoal.title}`,
          'Goal hit 100% completion. Great consistency!'
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
    message.success(exists ? 'Goal updated' : 'Daily goal created');
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

    if (justCompleted) {
      checkMilestoneCelebration({ ...updated, milestoneNotified: false }, nextGoals);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    setStore((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }));
    message.info('Goal deleted');
  };

  const handleLogWorkSession = (sessionData: Omit<WorkSession, 'id'>) => {
    const newSession: WorkSession = {
      ...sessionData,
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    let completedGoalForAlert: DailyGoal | null = null;
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
      return updated;
    });

    setStore((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      goals: nextGoals,
    }));

    triggerAlert(
      'timer',
      `Logged ${sessionData.durationMinutes}m focused work`,
      `Synced locally to "${sessionData.goalTitle}".`
    );

    if (completedGoalForAlert) {
      checkMilestoneCelebration(completedGoalForAlert, nextGoals);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const target = store.sessions.find((s) => s.id === sessionId);
    setStore((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== sessionId),
      goals: target
        ? prev.goals.map((g) => {
            if (g.id !== target.goalId) return g;
            const nextLogged = Math.max(0, g.loggedMinutes - target.durationMinutes);
            const updated = { ...g, loggedMinutes: nextLogged };
            updated.progressPercent = calculateGoalProgress(updated);
            return updated;
          })
        : prev.goals,
    }));
    message.info('Work session removed');
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
          body: `Today’s spending reached ${formatCurrency(dayTotal, store.settings.currencySymbol)} against your ${formatCurrency(cap, store.settings.currencySymbol)} cap.`,
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
          body: `Only ${formatCurrency(cap - dayTotal, store.settings.currencySymbol)} left in today’s spending cap.`,
        };
      }
    }

    setStore((prev) => ({
      ...prev,
      expenses: nextExpenses,
      settings: nextSettings,
    }));

    message.success(exists ? 'Expense updated' : 'Expense logged locally');

    if (budgetAlert) {
      triggerAlert(budgetAlert.type, budgetAlert.title, budgetAlert.body);
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    setStore((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
    message.info('Expense deleted');
  };

  const handleRequestNotificationPermission = async () => {
    const result = await requestNotificationPermission();
    setPermissionStatus(result);
    if (result === 'granted') {
      triggerAlert(
        'reminder',
        'Push notifications enabled',
        'Daymark will remind you about daily targets, milestones, and budget limits.'
      );
    } else if (result === 'denied') {
      message.warning(
        'Browser notifications are blocked — in-app alerts remain active inside Daymark.'
      );
    }
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daymark-offline-backup-${todayDateKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Local backup exported');
  };

  const handleImportBackup = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      const valid = validateImportedSnapshot(parsed);
      if (!valid) {
        message.error('Invalid Daymark backup JSON file.');
        return;
      }
      setStore(valid);
      message.success('Local data restored from backup');
    } catch {
      message.error('Could not parse JSON backup file.');
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'today', label: 'Today', icon: <Target className="w-5 h-5" /> },
    { id: 'focus', label: 'Focus', icon: <Timer className="w-5 h-5" /> },
    { id: 'budget', label: 'Budget', icon: <Wallet className="w-5 h-5" /> },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell className="w-5 h-5" />,
      badge: unreadAlerts > 0 ? unreadAlerts : undefined,
    },
  ];

  const handlePrimaryDesktopCta = () => {
    if (activeTab === 'budget') {
      setEditingExpense(null);
      setExpenseDrawerOpen(true);
    } else {
      setEditingGoal(null);
      setGoalDrawerOpen(true);
    }
  };

  const handleCompleteOnboarding = (payload: {
    profile: UserProfile;
    settingsPatch: Partial<UserSettings>;
    startMode: 'sample' | 'fresh';
  }) => {
    const nextSettings: UserSettings = {
      ...store.settings,
      ...payload.settingsPatch,
    };

    if (payload.startMode === 'fresh') {
      setStore(createEmptyState(nextSettings, payload.profile));
    } else {
      const hasExistingData = store.goals.length > 0 || store.expenses.length > 0;
      if (hasExistingData) {
        setStore((prev) => ({
          ...prev,
          profile: payload.profile,
          settings: nextSettings,
        }));
      } else {
        const seeded = createSeedState();
        setStore({
          ...seeded,
          profile: payload.profile,
          settings: nextSettings,
        });
      }
    }
    message.success(`Welcome to Daymark, ${payload.profile.name}!`);
  };

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setStore((prev) => ({
      ...prev,
      profile: updatedProfile,
    }));
    message.success('Profile saved locally');
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

  // Show Initial Setup & Profile Creation screens before entering main dashboard
  if (!store.profile.onboardingCompleted) {
    return (
      <OnboardingFlow
        initialProfile={store.profile}
        settings={store.settings}
        isDark={isDark}
        onUpdateSettingsPreview={handleUpdateSettings}
        onRequestNotificationPermission={handleRequestNotificationPermission}
        onComplete={handleCompleteOnboarding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F6FA] transition-colors duration-150">
      {/* Desktop 3-Zone Top Bar (>= 1024px) */}
      <header className="hidden lg:block sticky top-0 z-30 bg-white/90 dark:bg-[#131A26]/90 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#222C3E]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="font-display text-lg font-extrabold tracking-tight text-[#111827] dark:text-[#F3F6FA] whitespace-nowrap shrink-0 cursor-pointer"
          >
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
                  className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'text-[#1677FF]'
                      : 'text-[#525B6B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F3F6FA]'
                  }`}
                >
                  {item.label}
                  {item.badge ? ` (${item.badge})` : ''}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-[15px] h-0.5 bg-[#1677FF] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrimaryDesktopCta}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#1677FF] hover:bg-[#0958D9] text-white text-sm font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'budget' ? 'Log Expense' : 'New Goal'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Top App Bar (< 1024px, 52px height) */}
      <header className="lg:hidden sticky top-0 z-30 h-[52px] px-4 bg-white/90 dark:bg-[#131A26]/90 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#222C3E] flex items-center justify-between gap-3">
        <span className="font-display text-base font-extrabold tracking-tight text-[#111827] dark:text-[#F3F6FA] whitespace-nowrap shrink-0">
          Daymark
        </span>

        <span className="text-xs font-medium text-[#525B6B] dark:text-[#94A3B8] truncate">
          {formatHeaderDate(selectedDateKey)}
        </span>

        <button
          type="button"
          onClick={handleToggleQuickTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-[#111827] dark:text-[#F3F6FA]"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Offline Connectivity Banner (only rendered when actually offline) */}
      {!isOnline && (
        <div className="bg-[#D97706] text-white text-xs font-medium px-4 py-2 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline Mode — Changes are saving locally on your device.</span>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-24 lg:pb-12">
        {/* Desktop subtle contextual bar (date & quick theme toggle) */}
        <div className="hidden lg:flex items-center justify-between mb-5 text-xs text-[#525B6B] dark:text-[#94A3B8]">
          <span>{formatHeaderDate(selectedDateKey)} · Local Offline Sync Active</span>
          <button
            type="button"
            onClick={handleToggleQuickTheme}
            className="inline-flex items-center gap-1.5 hover:text-[#111827] dark:hover:text-[#F3F6FA] transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

        {activeTab === 'today' && (
          <TodayView
            profile={store.profile}
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
            onEditProfile={() => setProfileDrawerOpen(true)}
            onReplayOnboarding={handleReplayOnboarding}
            onUpdateSettings={handleUpdateSettings}
            onRequestPermission={handleRequestNotificationPermission}
            onSendTestAlert={() =>
              triggerAlert(
                'reminder',
                'Daymark test notification',
                'Offline reminder engine is active and syncing locally on your device.'
              )
            }
            onMarkAllRead={() =>
              setStore((prev) => ({
                ...prev,
                notifications: prev.notifications.map((n) => ({ ...n, read: true })),
              }))
            }
            onClearNotifications={() =>
              setStore((prev) => ({ ...prev, notifications: [] }))
            }
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetEmpty={() => {
              setStore(createEmptyState(store.settings, store.profile));
              message.success('Cleared all entries — ready for fresh tracking');
            }}
            onRestoreDemoData={() => {
              const seeded = createSeedState();
              setStore({
                ...seeded,
                profile: store.profile,
                settings: { ...seeded.settings, themeMode: store.settings.themeMode },
              });
              message.success('Restored 7-day sample dataset');
            }}
          />
        )}
      </main>

      {/* Mobile Fixed 4-Tab Bottom Navigation Bar (64px + safe-area, Thumb Zone) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131A26]/95 backdrop-blur-md border-t border-[#E5E7EB] dark:border-[#222C3E] pb-safe"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'text-[#1677FF]'
                    : 'text-[#525B6B] dark:text-[#94A3B8]'
                }`}
              >
                <span className="relative">
                  {item.icon}
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-medium tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Create / Edit Goal Bottom Sheet Drawer */}
      <GoalDrawer
        open={goalDrawerOpen}
        dateKey={selectedDateKey}
        editingGoal={editingGoal}
        onClose={() => setGoalDrawerOpen(false)}
        onSave={handleSaveGoal}
      />

      {/* Create / Edit Expense Bottom Sheet Drawer */}
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

      {/* Edit Personal Profile Drawer */}
      <ProfileDrawer
        open={profileDrawerOpen}
        profile={store.profile}
        onClose={() => setProfileDrawerOpen(false)}
        onSave={handleSaveProfile}
        onReplayOnboarding={handleReplayOnboarding}
      />
    </div>
  );
};

export default function App() {
  const [store, setStore] = useState<DaymarkStoreState>(() => ({
    profile: { ...DEFAULT_PROFILE },
    goals: [],
    sessions: [],
    expenses: [],
    notifications: [],
    settings: { ...DEFAULT_SETTINGS },
    lastSyncedAt: new Date().toISOString(),
  }));
  const [hydrated, setHydrated] = useState(false);
  const [systemDark, setSystemDark] = useState(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  // Hydrate offline IndexedDB / localStorage on mount
  useEffect(() => {
    let mounted = true;
    loadOfflineState().then((loaded) => {
      if (mounted) {
        setStore(loaded);
        setHydrated(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Persist every change locally to IndexedDB + localStorage mirror
  useEffect(() => {
    if (!hydrated) return;
    void saveOfflineState(store);
  }, [store, hydrated]);

  // Listen for OS dark mode preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark =
    store.settings.themeMode === 'dark' ||
    (store.settings.themeMode === 'system' && systemDark);

  // Sync `.dark` class on <html> and Android status bar theme-color
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', isDark ? '#0B0F17' : '#F6F7F9');
    }
  }, [isDark]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? '#4096FF' : '#1677FF',
          borderRadius: 12,
          fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
          colorBgContainer: isDark ? '#131A26' : '#FFFFFF',
          colorBgElevated: isDark ? '#182131' : '#FFFFFF',
          colorBorder: isDark ? '#222C3E' : '#E5E7EB',
        },
      }}
    >
      <AntApp>
        {hydrated ? (
          <DaymarkInner store={store} setStore={setStore} isDark={isDark} />
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9] dark:bg-[#0B0F17]">
            <span className="font-display text-sm font-medium text-[#525B6B] dark:text-[#94A3B8]">
              Loading local data...
            </span>
          </div>
        )}
      </AntApp>
    </ConfigProvider>
  );
}
