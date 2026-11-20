import type { DailyGoal, DaySummary, ExpenseEntry, WorkSession } from '../types/daymark';

export function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function offsetDateKey(baseDate: Date, offsetDays: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return toDateKey(d);
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getRecentDateKeys(count: number = 7): string[] {
  const today = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(offsetDateKey(today, -i));
  }
  return keys;
}

export function formatHeaderDate(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const todayKey = toDateKey();
  const label = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return dateKey === todayKey ? `Today · ${label}` : label;
}

export function formatShortDay(dateKey: string): { dayShort: string; dayNum: string } {
  const d = parseDateKey(dateKey);
  return {
    dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: String(d.getDate()),
  };
}

export function formatDurationMinutes(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function formatTimeFromISO(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatCurrency(amount: number, symbol: string): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateGoalProgress(goal: DailyGoal): number {
  if (goal.trackingMode === 'checklist') {
    if (!goal.subtasks.length) return goal.progressPercent;
    const totalWeight = goal.subtasks.reduce((sum, s) => sum + Math.max(1, s.weight), 0);
    const doneWeight = goal.subtasks
      .filter((s) => s.completed)
      .reduce((sum, s) => sum + Math.max(1, s.weight), 0);
    return totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;
  }
  if (goal.trackingMode === 'counter') {
    if (goal.targetValue <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((goal.currentValue / goal.targetValue) * 100)));
  }
  if (goal.trackingMode === 'timer') {
    if (goal.targetMinutes <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((goal.loggedMinutes / goal.targetMinutes) * 100)));
  }
  return Math.min(100, Math.max(0, Math.round(goal.progressPercent)));
}

export function computeDailySummaries(
  dateKeys: string[],
  goals: DailyGoal[],
  sessions: WorkSession[],
  expenses: ExpenseEntry[],
  dailyBudgetCap: number,
  goalSuccessThreshold: number
): DaySummary[] {
  return dateKeys.map((dateKey) => {
    const dayGoals = goals.filter((g) => g.dateKey === dateKey);
    const daySessions = sessions.filter((s) => s.dateKey === dateKey);
    const dayExpenses = expenses.filter((e) => e.dateKey === dateKey);

    const avgGoalProgress =
      dayGoals.length > 0
        ? Math.round(
            dayGoals.reduce((sum, g) => sum + calculateGoalProgress(g), 0) / dayGoals.length
          )
        : 0;
    const completedGoalsCount = dayGoals.filter((g) => calculateGoalProgress(g) >= 100).length;
    const totalMinutesWorked = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalSpent = Number(
      dayExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)
    );

    const goalMet = dayGoals.length > 0 && avgGoalProgress >= goalSuccessThreshold;
    const underBudget = totalSpent <= dailyBudgetCap;
    const dualWin = goalMet && underBudget;
    const { dayShort, dayNum } = formatShortDay(dateKey);

    return {
      dateKey,
      dayShort,
      dayNum,
      avgGoalProgress,
      completedGoalsCount,
      totalGoalsCount: dayGoals.length,
      totalMinutesWorked,
      totalSpent,
      budgetCap: dailyBudgetCap,
      goalMet,
      underBudget,
      dualWin,
    };
  });
}

export function computeStreaks(summaries: DaySummary[]): {
  goalStreak: number;
  dualWinStreak: number;
} {
  // Count consecutive days ending at today (or yesterday if today isn't finished yet)
  const calc = (predicate: (s: DaySummary) => boolean) => {
    if (summaries.length === 0) return 0;
    let streak = 0;
    const lastIdx = summaries.length - 1;
    let startIdx = lastIdx;
    if (!predicate(summaries[lastIdx]) && lastIdx > 0) {
      startIdx = lastIdx - 1;
    }
    for (let i = startIdx; i >= 0; i--) {
      if (predicate(summaries[i])) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  };

  return {
    goalStreak: calc((s) => s.goalMet),
    dualWinStreak: calc((s) => s.dualWin),
  };
}
