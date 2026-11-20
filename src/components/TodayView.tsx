import React, { useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Empty,
  InputNumber,
  Popconfirm,
  Progress,
  Segmented,
  Slider,
} from 'antd';
import {
  CheckCircle2,
  Clock,
  Flame,
  Minus,
  Pencil,
  Play,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { DailyGoal, DaySummary, UserProfile } from '../types/daymark';
import {
  calculateGoalProgress,
  formatCurrency,
  formatDurationMinutes,
} from '../utils/dateUtils';
import { ProfileAvatar } from './ProfileAvatar';

interface TodayViewProps {
  profile: UserProfile;
  selectedDateKey: string;
  todayDateKey: string;
  summaries: DaySummary[];
  goals: DailyGoal[];
  currencySymbol: string;
  dailyBudgetCap: number;
  budgetWarningPercent: number;
  goalStreak: number;
  dualWinStreak: number;
  onOpenProfile: () => void;
  onSelectDate: (dateKey: string) => void;
  onOpenNewGoal: () => void;
  onEditGoal: (goal: DailyGoal) => void;
  onDeleteGoal: (goalId: string) => void;
  onUpdateGoal: (updated: DailyGoal) => void;
  onStartFocusForGoal: (goalId: string) => void;
  onOpenQuickExpense: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  profile,
  selectedDateKey,
  todayDateKey,
  summaries,
  goals,
  currencySymbol,
  dailyBudgetCap,
  budgetWarningPercent,
  goalStreak,
  dualWinStreak,
  onOpenProfile,
  onSelectDate,
  onOpenNewGoal,
  onEditGoal,
  onDeleteGoal,
  onUpdateGoal,
  onStartFocusForGoal,
  onOpenQuickExpense,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'done'>('all');

  const selectedSummary = useMemo(
    () =>
      summaries.find((s) => s.dateKey === selectedDateKey) || {
        dateKey: selectedDateKey,
        dayShort: '',
        dayNum: '',
        avgGoalProgress: 0,
        completedGoalsCount: 0,
        totalGoalsCount: 0,
        totalMinutesWorked: 0,
        totalSpent: 0,
        budgetCap: dailyBudgetCap,
        goalMet: false,
        underBudget: true,
        dualWin: false,
      },
    [summaries, selectedDateKey, dailyBudgetCap]
  );

  const dayGoals = useMemo(
    () => goals.filter((g) => g.dateKey === selectedDateKey),
    [goals, selectedDateKey]
  );

  const filteredGoals = useMemo(() => {
    return dayGoals.filter((g) => {
      const pct = calculateGoalProgress(g);
      if (filterStatus === 'active') return pct < 100;
      if (filterStatus === 'done') return pct >= 100;
      return true;
    });
  }, [dayGoals, filterStatus]);

  const budgetRatio =
    dailyBudgetCap > 0 ? Math.round((selectedSummary.totalSpent / dailyBudgetCap) * 100) : 0;
  const remainingBudget = dailyBudgetCap - selectedSummary.totalSpent;
  const isOverBudget = remainingBudget < 0;
  const isBudgetWarn = !isOverBudget && budgetRatio >= budgetWarningPercent;

  const handleSliderChange = (goal: DailyGoal, value: number) => {
    onUpdateGoal({
      ...goal,
      progressPercent: value,
      currentValue: value,
    });
  };

  const handleCounterChange = (goal: DailyGoal, nextVal: number) => {
    const safeVal = Math.max(0, Math.min(goal.targetValue * 2, nextVal));
    const nextGoal: DailyGoal = {
      ...goal,
      currentValue: safeVal,
    };
    nextGoal.progressPercent = calculateGoalProgress(nextGoal);
    onUpdateGoal(nextGoal);
  };

  const handleToggleSubtask = (goal: DailyGoal, subtaskId: string) => {
    const updatedSubtasks = goal.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    const nextGoal: DailyGoal = {
      ...goal,
      subtasks: updatedSubtasks,
    };
    nextGoal.progressPercent = calculateGoalProgress(nextGoal);
    onUpdateGoal(nextGoal);
  };

  const greetingLabel = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-6">
      {/* Personalized Profile Greeting Bar */}
      <section className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Open personal profile"
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1677FF] cursor-pointer shrink-0"
          >
            <ProfileAvatar profile={profile} size="md" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F3F6FA] truncate">
              {greetingLabel}, {profile.name || 'Explorer'}
            </h1>
            <p className="text-xs text-[#525B6B] dark:text-[#94A3B8] truncate">
              {profile.role} · {profile.focusPillar} · Target{' '}
              <span className="font-mono tabular-nums">
                {formatDurationMinutes(profile.dailyFocusTargetMinutes)}
              </span>
              /day
            </p>
          </div>
        </div>
        <Button size="small" onClick={onOpenProfile} className="min-h-[38px] shrink-0">
          Profile
        </Button>
      </section>

      {/* 7-Day Horizontal Interactive Date Scroller */}
      <section aria-label="Select date">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {summaries.map((day) => {
            const isSelected = day.dateKey === selectedDateKey;
            const isToday = day.dateKey === todayDateKey;
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => onSelectDate(day.dateKey)}
                className={`min-w-[60px] min-h-[64px] flex-1 flex flex-col items-center justify-center rounded-2xl border transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#1677FF] border-[#1677FF] text-white shadow-sm'
                    : 'bg-white dark:bg-[#131A26] border-[#E5E7EB] dark:border-[#222C3E] text-[#111827] dark:text-[#F3F6FA] hover:border-[#1677FF]/50'
                }`}
              >
                <span
                  className={`text-[11px] font-medium ${
                    isSelected ? 'text-white/85' : 'text-[#525B6B] dark:text-[#94A3B8]'
                  }`}
                >
                  {isToday ? 'Today' : day.dayShort}
                </span>
                <span className="font-mono text-base font-semibold tabular-nums mt-0.5">
                  {day.dayNum}
                </span>
                <span
                  className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                    isSelected
                      ? 'text-white/90'
                      : day.dualWin
                        ? 'text-[#10B981]'
                        : 'text-[#525B6B] dark:text-[#94A3B8]'
                  }`}
                >
                  {day.avgGoalProgress}%
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Focal Hero Split: Daily Target Progress Ring + Daily Budget vs Goal Streak */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="shrink-0">
            <Progress
              type="dashboard"
              percent={selectedSummary.avgGoalProgress}
              size={132}
              strokeWidth={10}
              strokeColor={selectedSummary.avgGoalProgress >= 100 ? '#10B981' : '#1677FF'}
              format={(pct) => (
                <div className="flex flex-col items-center">
                  <span className="font-mono text-2xl font-bold tabular-nums text-[#111827] dark:text-[#F3F6FA]">
                    {pct}%
                  </span>
                  <span className="text-[11px] text-[#525B6B] dark:text-[#94A3B8]">
                    daily target
                  </span>
                </div>
              )}
            />
          </div>

          <div className="flex-1 w-full space-y-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F3F6FA]">
                Daily Target Progress
              </h2>
              <p className="text-sm text-[#525B6B] dark:text-[#94A3B8] mt-1">
                {selectedSummary.completedGoalsCount} of {selectedSummary.totalGoalsCount} goals
                finished · {formatDurationMinutes(selectedSummary.totalMinutesWorked)} focused work
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB] dark:border-[#222C3E]">
              <div>
                <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">Work completed</div>
                <div className="font-mono text-lg font-semibold tabular-nums text-[#111827] dark:text-[#F3F6FA] mt-0.5">
                  {formatDurationMinutes(selectedSummary.totalMinutesWorked)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">Goal streak</div>
                <div className="font-mono text-lg font-semibold tabular-nums text-[#111827] dark:text-[#F3F6FA] mt-0.5 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#1677FF]" />
                  {goalStreak} {goalStreak === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Budget Cap vs Dual-Win Streak Card */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-[#525B6B] dark:text-[#94A3B8]">
                Daily Budget Cap vs. Streak
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[#111827] dark:text-[#F3F6FA] mt-1">
                {formatCurrency(selectedSummary.totalSpent, currencySymbol)}
                <span className="text-sm font-normal text-[#525B6B] dark:text-[#94A3B8]">
                  {' '}
                  / {formatCurrency(dailyBudgetCap, currencySymbol)}
                </span>
              </div>
            </div>
            <Button
              size="middle"
              onClick={onOpenQuickExpense}
              icon={<Wallet className="w-4 h-4" />}
              className="min-h-[40px] whitespace-nowrap shrink-0"
            >
              Log Spend
            </Button>
          </div>

          <div className="space-y-2">
            <Progress
              percent={Math.min(100, budgetRatio)}
              showInfo={false}
              strokeWidth={10}
              strokeColor={
                isOverBudget ? '#DC2626' : isBudgetWarn ? '#D97706' : '#10B981'
              }
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-medium ${
                  isOverBudget
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : isBudgetWarn
                      ? 'text-[#D97706] dark:text-[#FBBF24]'
                      : 'text-[#10B981]'
                }`}
              >
                {isOverBudget
                  ? `Over cap by ${formatCurrency(Math.abs(remainingBudget), currencySymbol)}`
                  : isBudgetWarn
                    ? `Approaching cap · ${formatCurrency(remainingBudget, currencySymbol)} left`
                    : `On budget · ${formatCurrency(remainingBudget, currencySymbol)} left`}
              </span>
              <span className="font-mono tabular-nums text-[#525B6B] dark:text-[#94A3B8]">
                {budgetRatio}%
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#222C3E] flex items-center justify-between text-xs">
            <span className="text-[#525B6B] dark:text-[#94A3B8]">
              Dual-Win streak (Goals + Budget)
            </span>
            <span className="font-mono font-semibold tabular-nums text-[#10B981]">
              {dualWinStreak} {dualWinStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>
      </section>

      {/* Goals Toolbar & List */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#F3F6FA]">
              Target Goals
            </h2>
            <span className="text-xs font-mono tabular-nums text-[#525B6B] dark:text-[#94A3B8]">
              {dayGoals.length} scheduled
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Segmented
              value={filterStatus}
              onChange={(val) => setFilterStatus(val as 'all' | 'active' | 'done')}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Done', value: 'done' },
              ]}
            />
            <Button
              type="primary"
              onClick={onOpenNewGoal}
              icon={<Plus className="w-4 h-4" />}
              className="min-h-[44px] whitespace-nowrap shrink-0"
            >
              New Goal
            </Button>
          </div>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] py-12 px-4">
            <Empty
              description={
                <span className="text-sm text-[#525B6B] dark:text-[#94A3B8]">
                  {dayGoals.length === 0
                    ? 'No daily targets logged for this date yet.'
                    : 'No goals match the selected filter.'}
                </span>
              }
            >
              {dayGoals.length === 0 && (
                <Button type="primary" onClick={onOpenNewGoal} className="min-h-[44px]">
                  Add your first daily target
                </Button>
              )}
            </Empty>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredGoals.map((goal) => {
              const pct = calculateGoalProgress(goal);
              const isDone = pct >= 100;
              return (
                <article
                  key={goal.id}
                  className="rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 flex flex-col justify-between gap-4 transition-colors"
                >
                  {/* Goal Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isDone && (
                          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                        )}
                        <h3 className="font-display text-base font-semibold text-[#111827] dark:text-[#F3F6FA] truncate">
                          {goal.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-[#525B6B] dark:text-[#94A3B8]">
                        <span>{goal.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{goal.trackingMode}</span>
                        {goal.loggedMinutes > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatDurationMinutes(goal.loggedMinutes)} logged
                            </span>
                          </>
                        )}
                        {goal.reminderTime && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              Alert {goal.reminderTime}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`font-mono text-base font-bold tabular-nums mr-1 ${
                          isDone
                            ? 'text-[#10B981]'
                            : 'text-[#111827] dark:text-[#F3F6FA]'
                        }`}
                      >
                        {pct}%
                      </span>
                      <button
                        type="button"
                        onClick={() => onEditGoal(goal)}
                        aria-label={`Edit ${goal.title}`}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#525B6B] dark:text-[#94A3B8] hover:text-[#1677FF] transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <Popconfirm
                        title="Delete this goal?"
                        okText="Delete"
                        okType="danger"
                        onConfirm={() => onDeleteGoal(goal.id)}
                      >
                        <button
                          type="button"
                          aria-label={`Delete ${goal.title}`}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#525B6B] dark:text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Popconfirm>
                    </div>
                  </div>

                  {/* Dynamic Work Logging Controls by Mode */}
                  {goal.trackingMode === 'slider' && (
                    <div className="space-y-1.5">
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={pct}
                        onChange={(val) => handleSliderChange(goal, val)}
                      />
                      <div className="flex items-center justify-between text-xs text-[#525B6B] dark:text-[#94A3B8]">
                        <span>Drag to update work completed</span>
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() => handleSliderChange(goal, 100)}
                            className="text-[#1677FF] font-medium hover:underline"
                          >
                            Mark 100%
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {goal.trackingMode === 'counter' && (
                    <div className="space-y-3">
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor={isDone ? '#10B981' : '#1677FF'}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-mono tabular-nums text-[#525B6B] dark:text-[#94A3B8]">
                          {goal.currentValue} / {goal.targetValue} {goal.unitLabel}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleCounterChange(goal, goal.currentValue - 1)}
                            icon={<Minus className="w-4 h-4" />}
                            aria-label="Decrease count"
                            className="min-w-[44px] min-h-[44px]"
                          />
                          <InputNumber
                            min={0}
                            max={goal.targetValue * 2}
                            value={goal.currentValue}
                            onChange={(val) => handleCounterChange(goal, Number(val) || 0)}
                            className="w-20 font-mono"
                            size="large"
                          />
                          <Button
                            type="primary"
                            onClick={() => handleCounterChange(goal, goal.currentValue + 1)}
                            icon={<Plus className="w-4 h-4" />}
                            aria-label="Increase count"
                            className="min-w-[44px] min-h-[44px]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {goal.trackingMode === 'checklist' && (
                    <div className="space-y-2.5">
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor={isDone ? '#10B981' : '#1677FF'}
                      />
                      <div className="divide-y divide-[#E5E7EB] dark:divide-[#222C3E]">
                        {goal.subtasks.map((st) => (
                          <div
                            key={st.id}
                            className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 min-h-[40px]"
                          >
                            <Checkbox
                              checked={st.completed}
                              onChange={() => handleToggleSubtask(goal, st.id)}
                            >
                              <span
                                className={`text-sm ${
                                  st.completed
                                    ? 'line-through text-[#525B6B] dark:text-[#94A3B8]'
                                    : 'text-[#111827] dark:text-[#F3F6FA]'
                                }`}
                              >
                                {st.title}
                              </span>
                            </Checkbox>
                            <span className="text-xs font-mono tabular-nums text-[#525B6B] dark:text-[#94A3B8] shrink-0">
                              wt {st.weight}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {goal.trackingMode === 'timer' && (
                    <div className="space-y-2.5">
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor={isDone ? '#10B981' : '#1677FF'}
                      />
                      <div className="flex items-center justify-between text-xs text-[#525B6B] dark:text-[#94A3B8]">
                        <span className="font-mono tabular-nums flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDurationMinutes(goal.loggedMinutes)} /{' '}
                          {formatDurationMinutes(goal.targetMinutes)} target
                        </span>
                        <span className="font-mono tabular-nums">
                          {Math.max(0, goal.targetMinutes - goal.loggedMinutes)}m left
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer Action: Launch Pomodoro / Focus Timer bound to this Goal */}
                  <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#222C3E] flex items-center justify-between gap-2">
                    <span className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                      {isDone ? 'Completed today' : 'Ready for focus block'}
                    </span>
                    <Button
                      size="middle"
                      onClick={() => onStartFocusForGoal(goal.id)}
                      icon={<Play className="w-3.5 h-3.5" />}
                      className="min-h-[40px] whitespace-nowrap shrink-0"
                    >
                      Start Focus
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
