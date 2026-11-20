import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Button,
  Checkbox,
  Progress,
  Provider as AntProvider,
  Slider,
  Stepper,
  Switch,
  TabBar,
  Toast,
} from '@ant-design/react-native';
import {
  calcGoalPercent,
  configureAndroidNotifications,
  fireInstantAndroidAlert,
  INITIAL_STATE,
  loadLocalData,
  saveLocalData,
  scheduleDailyAndroidReminders,
  todayKey,
  type DailyGoal,
  type OfflineState,
  type TrackingMode,
} from './src/offlineEngine';

type TabName = 'today' | 'focus' | 'budget' | 'alerts';

export default function App() {
  const systemScheme = useColorScheme();
  const [state, setState] = useState<OfflineState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<TabName>('today');
  const [setupStep, setSetupStep] = useState<number>(0);
  const [profileName, setProfileName] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [profilePillar, setProfilePillar] = useState('Work & Projects');
  const [setupBudgetInput, setSetupBudgetInput] = useState('45');

  // New goal inputs
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalMode, setNewGoalMode] = useState<TrackingMode>('slider');

  // New expense inputs
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food');

  // Pomodoro timer state
  const [activeGoalId, setActiveGoalId] = useState<string>('g-2');
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = todayKey();

  useEffect(() => {
    loadLocalData().then((loaded) => {
      setState(loaded);
      setHydrated(true);
      configureAndroidNotifications().then((granted) => {
        if (granted) {
          void scheduleDailyAndroidReminders(loaded.settings);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveLocalData(state);
  }, [state, hydrated]);

  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          logWorkMinutes(25);
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  const isDark =
    state.settings.themeMode === 'dark' ||
    (state.settings.themeMode === 'system' && systemScheme === 'dark');

  const palette = isDark
    ? {
        bg: '#0B0F17',
        surface: '#131A26',
        border: '#222C3E',
        text: '#F3F6FA',
        muted: '#94A3B8',
        primary: '#4096FF',
      }
    : {
        bg: '#F6F7F9',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        muted: '#525B6B',
        primary: '#1677FF',
      };

  const todayGoals = useMemo(
    () => state.goals.filter((g) => g.dateKey === today),
    [state.goals, today]
  );

  const todayExpenses = useMemo(
    () => state.expenses.filter((e) => e.dateKey === today),
    [state.expenses, today]
  );

  const avgGoalPercent = useMemo(() => {
    if (!todayGoals.length) return 0;
    return Math.round(
      todayGoals.reduce((sum, g) => sum + calcGoalPercent(g), 0) / todayGoals.length
    );
  }, [todayGoals]);

  const totalSpentToday = useMemo(
    () => Number(todayExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)),
    [todayExpenses]
  );

  const totalMinutesToday = useMemo(
    () =>
      state.sessions
        .filter((s) => s.dateKey === today)
        .reduce((sum, s) => sum + s.durationMinutes, 0),
    [state.sessions, today]
  );

  const updateGoal = (updated: DailyGoal) => {
    const pct = calcGoalPercent(updated);
    const shouldCelebrate =
      pct >= 100 && !updated.milestoneNotified && state.settings.celebrateMilestones;

    const finalized: DailyGoal = {
      ...updated,
      progressPercent: pct,
      milestoneNotified: shouldCelebrate ? true : updated.milestoneNotified,
    };

    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === finalized.id ? finalized : g)),
    }));

    if (shouldCelebrate) {
      Toast.success(`Completed: ${finalized.title}`, 2);
      void fireInstantAndroidAlert(
        'Daily Target Completed!',
        `${finalized.title} reached 100%.`
      );
    }
  };

  const addNewGoal = () => {
    const trimmed = newGoalTitle.trim();
    if (!trimmed) return;
    const created: DailyGoal = {
      id: `g-${Date.now()}`,
      dateKey: today,
      title: trimmed,
      category: 'Personal',
      trackingMode: newGoalMode,
      progressPercent: 0,
      currentValue: 0,
      targetValue: newGoalMode === 'counter' ? 10 : 100,
      unitLabel: newGoalMode === 'counter' ? 'units' : '%',
      targetMinutes: 60,
      loggedMinutes: 0,
      subtasks:
        newGoalMode === 'checklist'
          ? [
              { id: `s-${Date.now()}-1`, title: 'Main milestone', weight: 3, completed: false },
              { id: `s-${Date.now()}-2`, title: 'Final review', weight: 1, completed: false },
            ]
          : [],
    };
    setState((prev) => ({ ...prev, goals: [created, ...prev.goals] }));
    setNewGoalTitle('');
    Toast.info('Goal saved offline', 1.5);
  };

  const logWorkMinutes = (minutes: number) => {
    const linked = todayGoals.find((g) => g.id === activeGoalId) || todayGoals[0];
    setState((prev) => ({
      ...prev,
      sessions: [
        {
          id: `sess-${Date.now()}`,
          dateKey: today,
          goalId: linked?.id || 'general',
          goalTitle: linked?.title || 'Focus Session',
          durationMinutes: minutes,
          endedAt: new Date().toISOString(),
        },
        ...prev.sessions,
      ],
      goals: prev.goals.map((g) =>
        linked && g.id === linked.id
          ? {
              ...g,
              loggedMinutes: g.loggedMinutes + minutes,
              progressPercent: calcGoalPercent({
                ...g,
                loggedMinutes: g.loggedMinutes + minutes,
              }),
            }
          : g
      ),
    }));
    void fireInstantAndroidAlert(
      `Logged ${minutes}m focused work`,
      `Synced offline to ${linked?.title || 'Focus Session'}.`
    );
  };

  const addExpense = () => {
    const parsed = parseFloat(expenseAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    const nextTotal = totalSpentToday + parsed;
    const cap = state.settings.dailyBudgetCap;

    setState((prev) => ({
      ...prev,
      expenses: [
        {
          id: `e-${Date.now()}`,
          dateKey: today,
          amount: Number(parsed.toFixed(2)),
          category: expenseCategory,
          note: expenseNote.trim() || expenseCategory,
          createdAt: new Date().toISOString(),
        },
        ...prev.expenses,
      ],
    }));
    setExpenseAmount('');
    setExpenseNote('');

    if (state.settings.budgetWarningsEnabled) {
      if (nextTotal > cap) {
        void fireInstantAndroidAlert(
          'Daily Budget Cap Exceeded',
          `Spent ${state.settings.currencySymbol}${nextTotal.toFixed(2)} of ${state.settings.currencySymbol}${cap}.`
        );
      } else if ((nextTotal / Math.max(1, cap)) * 100 >= state.settings.budgetWarningPercent) {
        void fireInstantAndroidAlert(
          'Approaching Daily Budget Cap',
          `${state.settings.currencySymbol}${(cap - nextTotal).toFixed(2)} remaining today.`
        );
      }
    }
  };

  const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const secs = String(timerSeconds % 60).padStart(2, '0');
  const budgetPct = Math.min(
    100,
    Math.round((totalSpentToday / Math.max(1, state.settings.dailyBudgetCap)) * 100)
  );

  const completeNativeOnboarding = () => {
    const cap = Math.max(1, parseFloat(setupBudgetInput) || state.settings.dailyBudgetCap);
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        name: profileName.trim() || 'Explorer',
        role: profileRole.trim() || 'Daily Achiever',
        focusPillar: profilePillar,
        onboardingCompleted: true,
      },
      settings: {
        ...prev.settings,
        dailyBudgetCap: cap,
      },
    }));
  };

  if (!state.profile?.onboardingCompleted) {
    return (
      <AntProvider
        theme={{
          brand_primary: palette.primary,
          fill_base: palette.surface,
          fill_body: palette.bg,
          color_text_base: palette.text,
          border_color_base: palette.border,
        }}
      >
        <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <ScrollView contentContainerStyle={styles.scrollBody}>
            <Text style={[styles.brand, { color: palette.primary, marginBottom: 4 }]}>
              Daymark · Step {setupStep + 1} of 3
            </Text>

            {setupStep === 0 && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, gap: 12 },
                ]}
              >
                <Text style={[styles.timerDigits, { fontSize: 26, color: palette.text }]}>
                  Own your daily targets and budget offline.
                </Text>
                <Text style={{ color: palette.muted, lineHeight: 20 }}>
                  Track daily goals with sliders, counters, weighted checklists, and Pomodoro focus
                  blocks while monitoring daily expenses against your cap.
                </Text>
                <Button type="primary" onPress={() => setSetupStep(1)}>
                  Create Your Profile
                </Button>
              </View>
            )}

            {setupStep === 1 && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, gap: 10 },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Personalize Your Profile
                </Text>
                <TextInput
                  placeholder="Your name (e.g., Rukshan)"
                  placeholderTextColor={palette.muted}
                  value={profileName}
                  onChangeText={setProfileName}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg },
                  ]}
                />
                <TextInput
                  placeholder="Role or focus (e.g., Engineer, Student)"
                  placeholderTextColor={palette.muted}
                  value={profileRole}
                  onChangeText={setProfileRole}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg },
                  ]}
                />
                <View style={styles.modeRow}>
                  {['Work & Projects', 'Study & Learning'].map((pillar) => (
                    <TouchableOpacity
                      key={pillar}
                      onPress={() => setProfilePillar(pillar)}
                      style={[
                        styles.modeBtn,
                        {
                          borderColor: profilePillar === pillar ? palette.primary : palette.border,
                          backgroundColor: profilePillar === pillar ? palette.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: profilePillar === pillar ? '#FFFFFF' : palette.muted,
                        }}
                      >
                        {pillar}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button type="primary" onPress={() => setSetupStep(2)}>
                  Continue
                </Button>
              </View>
            )}

            {setupStep === 2 && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, gap: 12 },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Daily Budget Cap & Theme
                </Text>
                <TextInput
                  placeholder="Daily budget cap (e.g., 45)"
                  placeholderTextColor={palette.muted}
                  keyboardType="decimal-pad"
                  value={setupBudgetInput}
                  onChangeText={setSetupBudgetInput}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg },
                  ]}
                />
                <View style={styles.rowBetween}>
                  <Text style={{ color: palette.text }}>Dark Mode</Text>
                  <Switch
                    checked={isDark}
                    onChange={(checked) =>
                      setState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, themeMode: checked ? 'dark' : 'light' },
                      }))
                    }
                  />
                </View>
                <Button type="primary" onPress={completeNativeOnboarding}>
                  Launch Dashboard
                </Button>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </AntProvider>
    );
  }

  return (
    <AntProvider
      theme={{
        brand_primary: palette.primary,
        fill_base: palette.surface,
        fill_body: palette.bg,
        color_text_base: palette.text,
        border_color_base: palette.border,
      }}
    >
      <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: palette.surface, borderBottomColor: palette.border },
          ]}
        >
          <Text style={[styles.brand, { color: palette.text }]}>Daymark</Text>
          <TouchableOpacity
            onPress={() =>
              setState((prev) => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  themeMode: isDark ? 'light' : 'dark',
                },
              }))
            }
          >
            <Text style={{ color: palette.primary, fontWeight: '600' }}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {tab === 'today' && (
            <ScrollView contentContainerStyle={styles.scrollBody}>
              {/* Personalized Greeting */}
              <View style={{ marginBottom: 2 }}>
                <Text style={[styles.cardTitle, { color: palette.text, marginBottom: 2 }]}>
                  Welcome, {state.profile?.name || 'Explorer'}
                </Text>
                <Text style={{ fontSize: 12, color: palette.muted }}>
                  {state.profile?.role || 'Daily Achiever'} · {state.profile?.focusPillar}
                </Text>
              </View>

              {/* Daily Pulse & Budget vs Streak Summary */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.cardTitle, { color: palette.text }]}>
                  Daily Target Progress — {avgGoalPercent}%
                </Text>
                <Progress percent={avgGoalPercent} position="normal" />
                <Text style={[styles.metaText, { color: palette.muted }]}>
                  {totalMinutesToday}m work completed · Spend {state.settings.currencySymbol}
                  {totalSpentToday.toFixed(2)} / {state.settings.currencySymbol}
                  {state.settings.dailyBudgetCap}
                </Text>
              </View>

              {/* Quick Create Goal */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Add Daily Target</Text>
                <TextInput
                  placeholder="Target title..."
                  placeholderTextColor={palette.muted}
                  value={newGoalTitle}
                  onChangeText={setNewGoalTitle}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg },
                  ]}
                />
                <View style={styles.modeRow}>
                  {(['slider', 'counter', 'checklist', 'timer'] as TrackingMode[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setNewGoalMode(m)}
                      style={[
                        styles.modeBtn,
                        {
                          borderColor: newGoalMode === m ? palette.primary : palette.border,
                          backgroundColor: newGoalMode === m ? palette.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: newGoalMode === m ? '#FFFFFF' : palette.muted,
                        }}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button type="primary" onPress={addNewGoal}>
                  Add Goal
                </Button>
              </View>

              {/* Daily Goals List */}
              {todayGoals.map((goal) => {
                const pct = calcGoalPercent(goal);
                return (
                  <View
                    key={goal.id}
                    style={[
                      styles.card,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={[styles.goalTitle, { color: palette.text }]}>{goal.title}</Text>
                      <Text style={[styles.monoBold, { color: pct >= 100 ? '#10B981' : palette.primary }]}>
                        {pct}%
                      </Text>
                    </View>
                    <Text style={[styles.metaText, { color: palette.muted }]}>
                      {goal.category} · {goal.trackingMode} · {goal.loggedMinutes}m logged
                    </Text>

                    {goal.trackingMode === 'slider' && (
                      <View style={{ marginTop: 10 }}>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={pct}
                          onChange={(val) =>
                            updateGoal({ ...goal, progressPercent: Number(val), currentValue: Number(val) })
                          }
                        />
                      </View>
                    )}

                    {goal.trackingMode === 'counter' && (
                      <View style={[styles.rowBetween, { marginTop: 10 }]}>
                        <Text style={{ color: palette.muted }}>
                          {goal.currentValue} / {goal.targetValue} {goal.unitLabel}
                        </Text>
                        <Stepper
                          min={0}
                          max={goal.targetValue * 2}
                          value={goal.currentValue}
                          onChange={(val) => updateGoal({ ...goal, currentValue: Number(val) || 0 })}
                        />
                      </View>
                    )}

                    {goal.trackingMode === 'checklist' && (
                      <View style={{ marginTop: 8, gap: 6 }}>
                        {goal.subtasks.map((st) => (
                          <Checkbox
                            key={st.id}
                            checked={st.completed}
                            onChange={(e) =>
                              updateGoal({
                                ...goal,
                                subtasks: goal.subtasks.map((item) =>
                                  item.id === st.id ? { ...item, completed: e.target.checked } : item
                                ),
                              })
                            }
                          >
                            <Text style={{ color: palette.text }}>
                              {st.title} (wt {st.weight})
                            </Text>
                          </Checkbox>
                        ))}
                      </View>
                    )}

                    {goal.trackingMode === 'timer' && (
                      <View style={{ marginTop: 10 }}>
                        <Progress percent={pct} position="normal" />
                        <Button
                          size="small"
                          style={{ marginTop: 10 }}
                          onPress={() => {
                            setActiveGoalId(goal.id);
                            setTab('focus');
                          }}
                        >
                          Open Pomodoro Timer
                        </Button>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {tab === 'focus' && (
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, alignItems: 'center' },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Pomodoro Work Timer
                </Text>
                <Text style={[styles.timerDigits, { color: palette.text }]}>
                  {mins}:{secs}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <Button type="primary" onPress={() => setTimerRunning((r) => !r)}>
                    {timerRunning ? 'Pause' : 'Start 25m'}
                  </Button>
                  <Button
                    onPress={() => {
                      setTimerRunning(false);
                      setTimerSeconds(25 * 60);
                    }}
                  >
                    Reset
                  </Button>
                  <Button onPress={() => logWorkMinutes(15)}>+15m Log</Button>
                </View>
                <Text style={[styles.metaText, { color: palette.muted, marginTop: 14 }]}>
                  Work completed today: {totalMinutesToday} minutes
                </Text>
              </View>
            </ScrollView>
          )}

          {tab === 'budget' && (
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Daily Budget Cap vs. Goal Progress
                </Text>
                <Text style={[styles.timerDigits, { fontSize: 28, color: palette.text }]}>
                  {state.settings.currencySymbol}
                  {totalSpentToday.toFixed(2)} / {state.settings.currencySymbol}
                  {state.settings.dailyBudgetCap}
                </Text>
                <Progress percent={budgetPct} position="normal" />
                <Text
                  style={{
                    marginTop: 8,
                    fontWeight: '600',
                    color:
                      totalSpentToday > state.settings.dailyBudgetCap ? '#DC2626' : '#10B981',
                  }}
                >
                  {totalSpentToday > state.settings.dailyBudgetCap
                    ? 'Over daily budget cap'
                    : `Under budget · Today goal progress: ${avgGoalPercent}%`}
                </Text>
              </View>

              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Log Expense</Text>
                <TextInput
                  placeholder="Amount (e.g. 12.50)"
                  placeholderTextColor={palette.muted}
                  keyboardType="decimal-pad"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg },
                  ]}
                />
                <TextInput
                  placeholder="Note (Lunch, Transport, Bills...)"
                  placeholderTextColor={palette.muted}
                  value={expenseNote}
                  onChangeText={setExpenseNote}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg },
                  ]}
                />
                <Button type="primary" onPress={addExpense}>
                  Save Expense Offline
                </Button>
              </View>

              {todayExpenses.map((exp) => (
                <View
                  key={exp.id}
                  style={[
                    styles.card,
                    styles.rowBetween,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                >
                  <View>
                    <Text style={{ fontWeight: '600', color: palette.text }}>{exp.note}</Text>
                    <Text style={{ fontSize: 12, color: palette.muted }}>{exp.category}</Text>
                  </View>
                  <Text style={[styles.monoBold, { color: palette.text }]}>
                    {state.settings.currencySymbol}
                    {exp.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          {tab === 'alerts' && (
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, gap: 14 },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Android Push Notification Rules
                </Text>
                <View style={styles.rowBetween}>
                  <Text style={{ color: palette.text }}>Daily scheduled reminders</Text>
                  <Switch
                    checked={state.settings.notificationsEnabled}
                    onChange={(checked) => {
                      const nextSettings = { ...state.settings, notificationsEnabled: checked };
                      setState((prev) => ({ ...prev, settings: nextSettings }));
                      void scheduleDailyAndroidReminders(nextSettings);
                    }}
                  />
                </View>
                <View style={styles.rowBetween}>
                  <Text style={{ color: palette.text }}>100% Milestone alerts</Text>
                  <Switch
                    checked={state.settings.celebrateMilestones}
                    onChange={(checked) =>
                      setState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, celebrateMilestones: checked },
                      }))
                    }
                  />
                </View>
                <View style={styles.rowBetween}>
                  <Text style={{ color: palette.text }}>Daily budget limit warnings</Text>
                  <Switch
                    checked={state.settings.budgetWarningsEnabled}
                    onChange={(checked) =>
                      setState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, budgetWarningsEnabled: checked },
                      }))
                    }
                  />
                </View>
                <Button
                  type="primary"
                  onPress={() =>
                    void fireInstantAndroidAlert(
                      'Daymark Test Alert',
                      'Local Android push notifications are active offline.'
                    )
                  }
                >
                  Send Test Android Notification
                </Button>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Bottom Navigation */}
        <View style={{ height: 56 }}>
          <TabBar
            barTintColor={palette.surface}
            tintColor={palette.primary}
            unselectedTintColor={palette.muted}
          >
            <TabBar.Item title="Today" selected={tab === 'today'} onPress={() => setTab('today')} />
            <TabBar.Item title="Focus" selected={tab === 'focus'} onPress={() => setTab('focus')} />
            <TabBar.Item title="Budget" selected={tab === 'budget'} onPress={() => setTab('budget')} />
            <TabBar.Item title="Alerts" selected={tab === 'alerts'} onPress={() => setTab('alerts')} />
          </TabBar>
        </View>
      </SafeAreaView>
    </AntProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 54,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontSize: 18, fontWeight: '800' },
  content: { flex: 1 },
  scrollBody: { padding: 16, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  goalTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  metaText: { fontSize: 12, marginTop: 6 },
  monoBold: { fontSize: 15, fontWeight: '700' },
  timerDigits: { fontSize: 42, fontWeight: '800', marginVertical: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
});
