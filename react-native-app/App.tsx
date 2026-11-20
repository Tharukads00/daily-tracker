import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
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

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalMode, setNewGoalMode] = useState<TrackingMode>('slider');

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food');

  const [activeGoalId, setActiveGoalId] = useState<string>('');
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

  // Material Design 3 Tonal Palette
  const palette = isDark
    ? {
        bg: '#111318',
        surface: '#1A1D24',
        subtle: '#1E222B',
        primaryContainer: '#004B73',
        onPrimaryContainer: '#CEE5FF',
        border: '#2B313E',
        text: '#E3E5EC',
        muted: '#9EA6B6',
        primary: '#8ACEFF',
        success: '#6DDBAC',
        danger: '#FFB4AB',
      }
    : {
        bg: '#F6F8FC',
        surface: '#FFFFFF',
        subtle: '#F0F4FA',
        primaryContainer: '#CEE5FF',
        onPrimaryContainer: '#001D32',
        border: '#DDE3EE',
        text: '#191C20',
        muted: '#515864',
        primary: '#00639B',
        success: '#0E7A56',
        danger: '#BA1A1A',
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

  const completedGoalsCount = useMemo(
    () => todayGoals.filter((g) => calcGoalPercent(g) >= 100).length,
    [todayGoals]
  );

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
    Toast.info('Goal saved', 1.5);
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
      `Logged ${minutes}m focus`,
      `Saved to ${linked?.title || 'Focus Session'}.`
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
  const remainingBudget = Number((state.settings.dailyBudgetCap - totalSpentToday).toFixed(2));

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
          <View style={[styles.progressRailBg, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.progressRailFill,
                {
                  backgroundColor: palette.primary,
                  width: `${((setupStep + 1) / 3) * 100}%`,
                },
              ]}
            />
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody}>
            <View style={styles.rowBetween}>
              <View style={styles.brandRow}>
                <View style={[styles.brandBadge, { backgroundColor: palette.primary }]}>
                  <Text style={styles.brandBadgeText}>D</Text>
                </View>
                <Text style={[styles.brand, { color: palette.text }]}>Daymark</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: palette.muted }}>
                Step {setupStep + 1} / 3
              </Text>
            </View>

            {setupStep === 0 && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, gap: 14 },
                ]}
              >
                <Text style={[styles.heroHeadline, { color: palette.text }]}>
                  Own your daily targets and budget offline.
                </Text>
                <Text style={{ color: palette.muted, lineHeight: 21, fontSize: 14 }}>
                  Simple daily goals, focused Pomodoro timer, and expense cap tracking stored privately on your phone.
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
                  { backgroundColor: palette.surface, borderColor: palette.border, gap: 12 },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 2 }]}>
                  Your Profile
                </Text>
                <TextInput
                  placeholder="Your name"
                  placeholderTextColor={palette.muted}
                  value={profileName}
                  onChangeText={setProfileName}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.subtle },
                  ]}
                />
                <TextInput
                  placeholder="Role (optional)"
                  placeholderTextColor={palette.muted}
                  value={profileRole}
                  onChangeText={setProfileRole}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.subtle },
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
                          backgroundColor:
                            profilePillar === pillar ? palette.primaryContainer : palette.subtle,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color:
                            profilePillar === pillar
                              ? palette.onPrimaryContainer
                              : palette.muted,
                        }}
                      >
                        {pillar}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.btnRow}>
                  <View style={{ flex: 1 }}>
                    <Button onPress={() => setSetupStep(0)}>Back</Button>
                  </View>
                  <View style={{ flex: 2 }}>
                    <Button type="primary" onPress={() => setSetupStep(2)}>
                      Continue
                    </Button>
                  </View>
                </View>
              </View>
            )}

            {setupStep === 2 && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, gap: 14 },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 2 }]}>
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
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.subtle },
                  ]}
                />
                <View style={styles.rowBetween}>
                  <Text style={{ color: palette.text, fontWeight: '500' }}>Dark Mode</Text>
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
                <View style={styles.btnRow}>
                  <View style={{ flex: 1 }}>
                    <Button onPress={() => setSetupStep(1)}>Back</Button>
                  </View>
                  <View style={{ flex: 2 }}>
                    <Button type="primary" onPress={completeNativeOnboarding}>
                      Launch Dashboard
                    </Button>
                  </View>
                </View>
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

        <View
          style={[
            styles.header,
            { backgroundColor: palette.surface, borderBottomColor: palette.border },
          ]}
        >
          <View style={styles.brandRow}>
            <View style={[styles.brandBadge, { backgroundColor: palette.primary }]}>
              <Text style={styles.brandBadgeText}>D</Text>
            </View>
            <Text style={[styles.brand, { color: palette.text }]}>Daymark</Text>
          </View>
          <TouchableOpacity
            style={[styles.themeToggleBtn, { borderColor: palette.border, backgroundColor: palette.subtle }]}
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
            <Text style={{ color: palette.text, fontSize: 12, fontWeight: '600' }}>
              {isDark ? 'Light' : 'Dark'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {tab === 'today' && (
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <View>
                <Text style={[styles.greetingTitle, { color: palette.text }]}>
                  Hello, {state.profile?.name || 'Explorer'}
                </Text>
                <Text style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>
                  {state.profile?.focusPillar}
                </Text>
              </View>

              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, gap: 12 },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={[styles.cardTitle, { color: palette.text, marginBottom: 0 }]}>
                    Daily Overview
                  </Text>
                  <Text style={[styles.kpiAccent, { color: avgGoalPercent >= 100 && todayGoals.length > 0 ? palette.success : palette.primary }]}>
                    {avgGoalPercent}%
                  </Text>
                </View>
                <Progress percent={avgGoalPercent} position="normal" />
                <View style={styles.statGrid}>
                  <View style={[styles.statTile, { backgroundColor: palette.subtle, borderColor: palette.border }]}>
                    <Text style={[styles.statLabel, { color: palette.muted }]}>Goals</Text>
                    <Text style={[styles.statValue, { color: palette.text }]}>
                      {completedGoalsCount}/{todayGoals.length}
                    </Text>
                  </View>
                  <View style={[styles.statTile, { backgroundColor: palette.subtle, borderColor: palette.border }]}>
                    <Text style={[styles.statLabel, { color: palette.muted }]}>Focus</Text>
                    <Text style={[styles.statValue, { color: palette.text }]}>
                      {totalMinutesToday}m
                    </Text>
                  </View>
                  <View style={[styles.statTile, { backgroundColor: palette.subtle, borderColor: palette.border }]}>
                    <Text style={[styles.statLabel, { color: palette.muted }]}>Spent</Text>
                    <Text
                      style={[
                        styles.statValue,
                        { color: totalSpentToday > state.settings.dailyBudgetCap ? palette.danger : palette.text },
                      ]}
                    >
                      {state.settings.currencySymbol}
                      {totalSpentToday.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>

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
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.subtle },
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
                          backgroundColor:
                            newGoalMode === m ? palette.primaryContainer : palette.subtle,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          textTransform: 'capitalize',
                          color: newGoalMode === m ? palette.onPrimaryContainer : palette.muted,
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

              {todayGoals.length === 0 ? (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: palette.surface, borderColor: palette.border, alignItems: 'center', paddingVertical: 28 },
                  ]}
                >
                  <Text style={{ fontWeight: '700', fontSize: 15, color: palette.text }}>
                    No targets yet today
                  </Text>
                  <Text style={{ fontSize: 12, color: palette.muted, marginTop: 4 }}>
                    Add your first daily goal above to get started.
                  </Text>
                </View>
              ) : (
                todayGoals.map((goal) => {
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
                        <Text style={[styles.goalTitle, { color: palette.text }]} numberOfLines={2}>
                          {goal.title}
                        </Text>
                        <Text
                          style={[
                            styles.monoBold,
                            { color: pct >= 100 ? palette.success : palette.primary },
                          ]}
                        >
                          {pct}%
                        </Text>
                      </View>
                      <Text style={[styles.metaText, { color: palette.muted }]}>
                        {goal.category} · {goal.trackingMode} · {goal.loggedMinutes}m
                      </Text>

                      {goal.trackingMode === 'slider' && (
                        <View style={{ marginTop: 10 }}>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={pct}
                            onChange={(val) =>
                              updateGoal({
                                ...goal,
                                progressPercent: Number(val),
                                currentValue: Number(val),
                              })
                            }
                          />
                        </View>
                      )}

                      {goal.trackingMode === 'counter' && (
                        <View style={[styles.rowBetween, { marginTop: 12 }]}>
                          <Text style={{ color: palette.muted, fontSize: 13 }}>
                            {goal.currentValue} / {goal.targetValue} {goal.unitLabel}
                          </Text>
                          <Stepper
                            min={0}
                            max={goal.targetValue * 2}
                            value={goal.currentValue}
                            onChange={(val) =>
                              updateGoal({ ...goal, currentValue: Number(val) || 0 })
                            }
                          />
                        </View>
                      )}

                      {goal.trackingMode === 'checklist' && (
                        <View style={{ marginTop: 10, gap: 8 }}>
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
                              <Text style={{ color: palette.text, fontSize: 13 }}>
                                {st.title} · {st.weight}x
                              </Text>
                            </Checkbox>
                          ))}
                        </View>
                      )}

                      {goal.trackingMode === 'timer' && (
                        <View style={{ marginTop: 10, gap: 10 }}>
                          <Progress percent={pct} position="normal" />
                          <Button
                            size="small"
                            onPress={() => {
                              setActiveGoalId(goal.id);
                              setTab('focus');
                            }}
                          >
                            Open Focus Timer
                          </Button>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {tab === 'focus' && (
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, alignItems: 'center', gap: 12 },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 0 }]}>
                  Focus Timer
                </Text>
                <Text style={[styles.timerDigits, { color: palette.text }]}>
                  {mins}:{secs}
                </Text>
                <View style={{ width: '100%', gap: 10 }}>
                  <Button type="primary" onPress={() => setTimerRunning((r) => !r)}>
                    {timerRunning ? 'Pause' : 'Start 25m Focus'}
                  </Button>
                  <View style={styles.btnRow}>
                    <View style={{ flex: 1 }}>
                      <Button
                        onPress={() => {
                          setTimerRunning(false);
                          setTimerSeconds(25 * 60);
                        }}
                      >
                        Reset
                      </Button>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button onPress={() => logWorkMinutes(15)}>+15m Log</Button>
                    </View>
                  </View>
                </View>
                <Text style={[styles.metaText, { color: palette.muted }]}>
                  Completed today: {totalMinutesToday}m
                </Text>
              </View>
            </ScrollView>
          )}

          {tab === 'budget' && (
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border, gap: 10 },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 0 }]}>
                  Daily Budget
                </Text>
                <View style={styles.statGrid}>
                  <View style={[styles.statTile, { backgroundColor: palette.subtle, borderColor: palette.border }]}>
                    <Text style={[styles.statLabel, { color: palette.muted }]}>Spent</Text>
                    <Text style={[styles.statValue, { color: palette.text }]}>
                      {state.settings.currencySymbol}
                      {totalSpentToday.toFixed(0)}
                    </Text>
                  </View>
                  <View style={[styles.statTile, { backgroundColor: palette.subtle, borderColor: palette.border }]}>
                    <Text style={[styles.statLabel, { color: palette.muted }]}>
                      {remainingBudget >= 0 ? 'Left' : 'Over'}
                    </Text>
                    <Text
                      style={[
                        styles.statValue,
                        { color: remainingBudget < 0 ? palette.danger : palette.success },
                      ]}
                    >
                      {state.settings.currencySymbol}
                      {Math.abs(remainingBudget).toFixed(0)}
                    </Text>
                  </View>
                  <View style={[styles.statTile, { backgroundColor: palette.subtle, borderColor: palette.border }]}>
                    <Text style={[styles.statLabel, { color: palette.muted }]}>Cap</Text>
                    <Text style={[styles.statValue, { color: palette.text }]}>
                      {state.settings.currencySymbol}
                      {state.settings.dailyBudgetCap}
                    </Text>
                  </View>
                </View>
                <Progress percent={budgetPct} position="normal" />
              </View>

              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Log Expense</Text>
                <TextInput
                  placeholder="Amount"
                  placeholderTextColor={palette.muted}
                  keyboardType="decimal-pad"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.subtle },
                  ]}
                />
                <TextInput
                  placeholder="Note (Lunch, Transport, Bills...)"
                  placeholderTextColor={palette.muted}
                  value={expenseNote}
                  onChangeText={setExpenseNote}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.subtle },
                  ]}
                />
                <View style={styles.modeRow}>
                  {['Food', 'Transport', 'Bills', 'Other'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setExpenseCategory(cat)}
                      style={[
                        styles.modeBtn,
                        {
                          borderColor: expenseCategory === cat ? palette.primary : palette.border,
                          backgroundColor:
                            expenseCategory === cat ? palette.primaryContainer : palette.subtle,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color:
                            expenseCategory === cat ? palette.onPrimaryContainer : palette.muted,
                        }}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button type="primary" onPress={addExpense}>
                  Save Expense
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
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontWeight: '600', color: palette.text }}>{exp.note}</Text>
                    <Text style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>
                      {exp.category}
                    </Text>
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
                <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 2 }]}>
                  Reminders & Alerts
                </Text>
                <View style={styles.rowBetween}>
                  <Text style={{ color: palette.text, flex: 1, paddingRight: 12 }}>
                    Daily scheduled reminders
                  </Text>
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
                  <Text style={{ color: palette.text, flex: 1, paddingRight: 12 }}>
                    100% Milestone alerts
                  </Text>
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
                  <Text style={{ color: palette.text, flex: 1, paddingRight: 12 }}>
                    Daily budget warnings
                  </Text>
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
                      'Daymark Reminder Active',
                      'Local Android push notifications are ready.'
                    )
                  }
                >
                  Test Notification
                </Button>
              </View>
            </ScrollView>
          )}
        </View>

        <View style={{ height: 58, borderTopWidth: 1, borderTopColor: palette.border }}>
          <TabBar
            barTintColor={palette.surface}
            tintColor={palette.primary}
            unselectedTintColor={palette.muted}
          >
            <TabBar.Item title="Home" selected={tab === 'today'} onPress={() => setTab('today')} />
            <TabBar.Item title="Focus" selected={tab === 'focus'} onPress={() => setTab('focus')} />
            <TabBar.Item title="Budget" selected={tab === 'budget'} onPress={() => setTab('budget')} />
            <TabBar.Item title="Settings" selected={tab === 'alerts'} onPress={() => setTab('alerts')} />
          </TabBar>
        </View>
      </SafeAreaView>
    </AntProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressRailBg: { height: 3, width: '100%' },
  progressRailFill: { height: 3 },
  header: {
    height: 54,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  brand: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  themeToggleBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 34,
    justifyContent: 'center',
  },
  content: { flex: 1 },
  scrollBody: { padding: 14, gap: 12, paddingBottom: 24 },
  greetingTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  heroHeadline: { fontSize: 24, fontWeight: '800', lineHeight: 30, letterSpacing: -0.4 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: '#001D32',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
    }),
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  kpiAccent: { fontSize: 20, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  goalTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 10, lineHeight: 20 },
  metaText: { fontSize: 12, marginTop: 6 },
  monoBold: { fontSize: 15, fontWeight: '700' },
  timerDigits: { fontSize: 44, fontWeight: '800', marginVertical: 8, letterSpacing: -1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btnRow: { flexDirection: 'row', gap: 10 },
  statGrid: { flexDirection: 'row', gap: 8 },
  statTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statLabel: { fontSize: 11, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 3 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    fontSize: 15,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
  },
});
