import React, { useMemo, useState } from 'react';
import {
  Button,
  ButtonBase,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import { motion } from 'motion/react';
import type { DailyGoal, DaySummary, UserProfile, UserSettings } from '../types/daymark';
import {
  calculateGoalProgress,
  formatCurrency,
  formatDurationMinutes,
} from '../utils/dateUtils';
import { computeProfileCompletion } from '../utils/profileUtils';
import { ProfileAvatar } from './ProfileAvatar';
import { GoalCategoryIcon } from './MaterialIcons';

interface TodayViewProps {
  profile: UserProfile;
  settings: UserSettings;
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
  onDismissProfileChecklist: () => void;
  onSelectDate: (dateKey: string) => void;
  onOpenNewGoal: () => void;
  onEditGoal: (goal: DailyGoal) => void;
  onDeleteGoal: (goalId: string) => void;
  onUpdateGoal: (updated: DailyGoal) => void;
  onStartFocusForGoal: (goalId: string) => void;
  onOpenQuickExpense: () => void;
}

const ProgressRing: React.FC<{ percent: number; isDone: boolean }> = ({ percent, isDone }) => {
  const size = 96;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-[#DDE5F2] dark:stroke-[#272E3B]"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={
            isDone
              ? 'stroke-[#0E7A56] dark:stroke-[#6DDBAC]'
              : 'stroke-[#00639B] dark:stroke-[#8ACEFF]'
          }
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 320ms cubic-bezier(0.2, 0, 0, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-bold tabular-nums text-[#191C20] dark:text-[#E3E5EC]">
          {percent}%
        </span>
        <span className="text-[10px] font-medium text-[#515864] dark:text-[#9EA6B6]">
          today
        </span>
      </div>
    </div>
  );
};

export const TodayView: React.FC<TodayViewProps> = ({
  profile,
  settings,
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
  onDismissProfileChecklist,
  onSelectDate,
  onOpenNewGoal,
  onEditGoal,
  onDeleteGoal,
  onUpdateGoal,
  onStartFocusForGoal,
  onOpenQuickExpense,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'done'>('all');
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<DailyGoal | null>(null);

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

  const profileCompletion = useMemo(
    () => computeProfileCompletion(profile, settings),
    [profile, settings]
  );
  const showProfileTask =
    profileCompletion.percent < 100 && !profile.profileChecklistDismissed;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Simple Personal Greeting Row */}
      <section className="flex items-center justify-between gap-3">
        <ButtonBase
          onClick={onOpenProfile}
          sx={{ borderRadius: 4, p: 0.5, ml: -0.5, textAlign: 'left', minWidth: 0 }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ProfileAvatar profile={profile} size="md" />
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-[#191C20] dark:text-[#E3E5EC] truncate leading-tight">
                {greetingLabel}, {profile.name || 'Explorer'}
              </h1>
              <p className="text-xs text-[#515864] dark:text-[#9EA6B6] truncate mt-0.5">
                {profile.username ? `@${profile.username} · ` : ''}
                {profile.focusPillar} · Goal {formatDurationMinutes(profile.dailyFocusTargetMinutes)}
              </p>
            </div>
          </div>
        </ButtonBase>

        <div className="flex items-center gap-1 text-xs font-mono tabular-nums font-bold text-[#00639B] dark:text-[#8ACEFF] shrink-0">
          <LocalFireDepartmentRoundedIcon sx={{ fontSize: 18 }} />
          <span>{dualWinStreak}d</span>
        </div>
      </section>

      {/* Compact Profile Completion Task Card (Auto-hides at 100%) */}
      {showProfileTask && (
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-2xl bg-[#CEE5FF] dark:bg-[#004B73] text-[#00639B] dark:text-[#8ACEFF] inline-flex items-center justify-center shrink-0">
                <ManageAccountsRoundedIcon />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm sm:text-base font-bold text-[#191C20] dark:text-[#E3E5EC] truncate">
                    Complete your profile
                  </h2>
                  <span className="font-mono text-xs font-bold tabular-nums text-[#00639B] dark:text-[#8ACEFF]">
                    {profileCompletion.percent}%
                  </span>
                </div>
                <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
                  {profileCompletion.completedCount} of {profileCompletion.totalCount} quick details finished
                </p>
              </div>
            </div>
            <IconButton
              size="small"
              onClick={onDismissProfileChecklist}
              aria-label="Dismiss profile completion task"
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </div>

          <LinearProgress
            variant="determinate"
            value={profileCompletion.percent}
            sx={{ height: 6 }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {profileCompletion.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={onOpenProfile}
                  className={`inline-flex items-center gap-1 text-xs cursor-pointer transition-colors ${
                    task.completed
                      ? 'text-[#0E7A56] dark:text-[#6DDBAC] font-medium line-through opacity-80'
                      : 'text-[#191C20] dark:text-[#E3E5EC] font-semibold hover:text-[#00639B] dark:hover:text-[#8ACEFF]'
                  }`}
                >
                  {task.completed ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 15 }} />
                  ) : (
                    <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 15 }} />
                  )}
                  <span>{task.label}</span>
                </button>
              ))}
            </div>

            <Button
              size="small"
              variant="contained"
              onClick={onOpenProfile}
              endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />}
            >
              Finish Profile
            </Button>
          </div>
        </Card>
      )}

      {/* Clean Interactive 7-Day Strip */}
      <section aria-label="Select date">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {summaries.map((day) => {
            const isSelected = day.dateKey === selectedDateKey;
            const isToday = day.dateKey === todayDateKey;
            return (
              <ButtonBase
                key={day.dateKey}
                onClick={() => onSelectDate(day.dateKey)}
                sx={{
                  borderRadius: 4,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 62,
                  py: 1,
                  px: 0.5,
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'primary.main' : 'background.paper',
                  color: isSelected ? 'primary.contrastText' : 'text.primary',
                  transition: 'all 160ms ease',
                }}
              >
                <span className="text-[10px] sm:text-[11px] font-medium opacity-80 leading-none">
                  {isToday ? 'Now' : day.dayShort.slice(0, 3)}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold tabular-nums leading-none">
                  {day.dayNum}
                </span>
                <span
                  className={`w-4 h-1 rounded-full ${
                    isSelected
                      ? 'bg-white/80 dark:bg-[#003352]/80'
                      : day.dualWin
                        ? 'bg-[#0E7A56] dark:bg-[#6DDBAC]'
                        : day.avgGoalProgress > 0
                          ? 'bg-[#00639B] dark:bg-[#8ACEFF]'
                          : 'bg-[#DDE3EE] dark:bg-[#2B313E]'
                  }`}
                />
              </ButtonBase>
            );
          })}
        </div>
      </section>

      {/* Simple Unified Daily Summary & Budget Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        <Card className="lg:col-span-7 p-4 sm:p-6 flex items-center gap-4 sm:gap-6">
          <ProgressRing
            percent={selectedSummary.avgGoalProgress}
            isDone={selectedSummary.avgGoalProgress >= 100 && selectedSummary.totalGoalsCount > 0}
          />

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
                Daily Overview
              </h2>
              <p className="text-xs sm:text-sm text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                {selectedSummary.completedGoalsCount}/{selectedSummary.totalGoalsCount} goals done ·{' '}
                <span className="font-mono tabular-nums">
                  {formatDurationMinutes(selectedSummary.totalMinutesWorked)}
                </span>{' '}
                focus
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[#DDE3EE] dark:border-[#2B313E]">
              <div>
                <div className="text-[11px] text-[#515864] dark:text-[#9EA6B6]">Goal streak</div>
                <div className="font-mono text-sm sm:text-base font-bold tabular-nums mt-0.5">
                  {goalStreak} {goalStreak === 1 ? 'day' : 'days'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#515864] dark:text-[#9EA6B6]">Dual-Win</div>
                <div className="font-mono text-sm sm:text-base font-bold tabular-nums text-[#0E7A56] dark:text-[#6DDBAC] mt-0.5">
                  {dualWinStreak} {dualWinStreak === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-4 sm:p-6 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-2xl bg-[#D3F4E5] dark:bg-[#0A3B2B] text-[#0E7A56] dark:text-[#6DDBAC] inline-flex items-center justify-center shrink-0">
                <AccountBalanceWalletRoundedIcon fontSize="small" />
              </span>
              <div className="min-w-0">
                <div className="text-xs text-[#515864] dark:text-[#9EA6B6]">Today’s Spend</div>
                <div className="font-mono text-lg sm:text-xl font-bold tabular-nums truncate">
                  {formatCurrency(selectedSummary.totalSpent, currencySymbol)}
                  <span className="text-xs font-normal text-[#515864] dark:text-[#9EA6B6]">
                    {' '}
                    / {formatCurrency(dailyBudgetCap, currencySymbol)}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="outlined"
              size="small"
              onClick={onOpenQuickExpense}
              startIcon={<AddRoundedIcon />}
            >
              Spend
            </Button>
          </div>

          <div className="space-y-1.5">
            <LinearProgress
              variant="determinate"
              value={Math.min(100, budgetRatio)}
              color={isOverBudget ? 'error' : isBudgetWarn ? 'warning' : 'success'}
              sx={{ height: 8 }}
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-medium ${
                  isOverBudget
                    ? 'text-[#BA1A1A] dark:text-[#FFB4AB]'
                    : isBudgetWarn
                      ? 'text-[#A15C00] dark:text-[#FFB951]'
                      : 'text-[#0E7A56] dark:text-[#6DDBAC]'
                }`}
              >
                {isOverBudget
                  ? `Over by ${formatCurrency(Math.abs(remainingBudget), currencySymbol)}`
                  : `${formatCurrency(remainingBudget, currencySymbol)} left`}
              </span>
              <span className="font-mono tabular-nums text-[#515864] dark:text-[#9EA6B6]">
                {budgetRatio}%
              </span>
            </div>
          </div>
        </Card>
      </section>

      {/* Simple Target Goals Section */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
              Daily Targets
            </h2>
            <span className="text-xs font-mono tabular-nums text-[#515864] dark:text-[#9EA6B6]">
              {dayGoals.length}
            </span>
          </div>

          {dayGoals.length > 0 && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={filterStatus}
              onChange={(_, val) => {
                if (val) setFilterStatus(val as 'all' | 'active' | 'done');
              }}
            >
              <ToggleButton value="all" sx={{ minHeight: 32, py: 0.25, px: 1.5 }}>
                All
              </ToggleButton>
              <ToggleButton value="active" sx={{ minHeight: 32, py: 0.25, px: 1.5 }}>
                Active
              </ToggleButton>
              <ToggleButton value="done" sx={{ minHeight: 32, py: 0.25, px: 1.5 }}>
                Done
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </div>

        {filteredGoals.length === 0 ? (
          <Card className="p-8 sm:p-10 text-center flex flex-col items-center gap-3">
            <span className="w-14 h-14 rounded-2xl bg-[#CEE5FF] dark:bg-[#004B73] text-[#00639B] dark:text-[#8ACEFF] inline-flex items-center justify-center">
              <TrackChangesRoundedIcon sx={{ fontSize: 30 }} />
            </span>
            <div className="space-y-1 max-w-xs">
              <h3 className="font-display text-base font-bold text-[#191C20] dark:text-[#E3E5EC]">
                {dayGoals.length === 0 ? 'Ready for a fresh day' : 'No goals match this filter'}
              </h3>
              <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
                {dayGoals.length === 0
                  ? 'Add your first target with a slider, counter, checklist, or focus timer.'
                  : 'Switch filter above to view your other targets.'}
              </p>
            </div>
            {dayGoals.length === 0 && (
              <Button
                variant="contained"
                onClick={onOpenNewGoal}
                startIcon={<AddRoundedIcon />}
                sx={{ mt: 1 }}
              >
                Add Daily Target
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
            {filteredGoals.map((goal) => {
              const pct = calculateGoalProgress(goal);
              const isDone = pct >= 100;
              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  <Card className="p-4 sm:p-5 h-full flex flex-col justify-between gap-3.5">
                    {/* Goal Header with Material Category Icon */}
                    <div className="flex items-start gap-3">
                      <GoalCategoryIcon category={goal.category} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-[15px] font-semibold text-[#191C20] dark:text-[#E3E5EC] leading-snug line-clamp-2 flex items-center gap-1.5">
                            {isDone && (
                              <CheckCircleRoundedIcon
                                sx={{ fontSize: 17 }}
                                className="text-[#0E7A56] dark:text-[#6DDBAC] shrink-0"
                              />
                            )}
                            <span>{goal.title}</span>
                          </h3>
                          <span
                            className={`font-mono text-sm font-bold tabular-nums shrink-0 ${
                              isDone
                                ? 'text-[#0E7A56] dark:text-[#6DDBAC]'
                                : 'text-[#00639B] dark:text-[#8ACEFF]'
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                          <span>{goal.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{goal.trackingMode}</span>
                          {goal.loggedMinutes > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {formatDurationMinutes(goal.loggedMinutes)}
                              </span>
                            </>
                          )}
                          {goal.reminderTime && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">{goal.reminderTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Mode Controls */}
                    {goal.trackingMode === 'slider' && (
                      <div className="space-y-0.5">
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={pct}
                          valueLabelDisplay="auto"
                          valueLabelFormat={(v) => `${v}%`}
                          color={isDone ? 'success' : 'primary'}
                          onChange={(_, val) => handleSliderChange(goal, Number(val))}
                        />
                        {!isDone && (
                          <div className="flex justify-end">
                            <Button
                              size="small"
                              onClick={() => handleSliderChange(goal, 100)}
                              sx={{ minHeight: 30, py: 0, fontSize: '0.75rem' }}
                            >
                              Mark 100%
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {goal.trackingMode === 'counter' && (
                      <div className="space-y-2.5">
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={isDone ? 'success' : 'primary'}
                          sx={{ height: 7 }}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono tabular-nums text-[#515864] dark:text-[#9EA6B6]">
                            {goal.currentValue} / {goal.targetValue} {goal.unitLabel}
                          </span>
                          <div className="inline-flex items-center gap-1.5">
                            <IconButton
                              size="small"
                              onClick={() => handleCounterChange(goal, goal.currentValue - 1)}
                              aria-label="Decrease count"
                              sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                              <RemoveRoundedIcon fontSize="small" />
                            </IconButton>
                            <span className="min-w-[36px] text-center font-mono text-sm font-bold tabular-nums">
                              {goal.currentValue}
                            </span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleCounterChange(goal, goal.currentValue + 1)}
                              aria-label="Increase count"
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                '&:hover': { bgcolor: 'primary.dark' },
                              }}
                            >
                              <AddRoundedIcon fontSize="small" />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    )}

                    {goal.trackingMode === 'checklist' && (
                      <div className="space-y-1.5">
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={isDone ? 'success' : 'primary'}
                          sx={{ height: 7 }}
                        />
                        <div className="divide-y divide-[#DDE3EE] dark:divide-[#2B313E]">
                          {goal.subtasks.map((st) => (
                            <div
                              key={st.id}
                              onClick={() => handleToggleSubtask(goal, st.id)}
                              className="py-1.5 flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Checkbox
                                  size="small"
                                  checked={st.completed}
                                  color={isDone ? 'success' : 'primary'}
                                  sx={{ p: 0.5 }}
                                />
                                <span
                                  className={`text-sm leading-snug truncate ${
                                    st.completed
                                      ? 'line-through text-[#515864] dark:text-[#9EA6B6]'
                                      : 'text-[#191C20] dark:text-[#E3E5EC]'
                                  }`}
                                >
                                  {st.title}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono tabular-nums text-[#515864] dark:text-[#9EA6B6] shrink-0">
                                {st.weight}x
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {goal.trackingMode === 'timer' && (
                      <div className="space-y-2">
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={isDone ? 'success' : 'primary'}
                          sx={{ height: 7 }}
                        />
                        <div className="flex items-center justify-between text-xs text-[#515864] dark:text-[#9EA6B6]">
                          <span className="font-mono tabular-nums inline-flex items-center gap-1">
                            <ScheduleRoundedIcon sx={{ fontSize: 15 }} />
                            {formatDurationMinutes(goal.loggedMinutes)} /{' '}
                            {formatDurationMinutes(goal.targetMinutes)}
                          </span>
                          <span className="font-mono tabular-nums">
                            {Math.max(0, goal.targetMinutes - goal.loggedMinutes)}m left
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Clean Action Footer */}
                    <div className="pt-2.5 border-t border-[#DDE3EE] dark:border-[#2B313E] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5">
                        <IconButton
                          size="small"
                          onClick={() => onEditGoal(goal)}
                          aria-label={`Edit ${goal.title}`}
                        >
                          <EditRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setConfirmDeleteGoal(goal)}
                          aria-label={`Delete ${goal.title}`}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </div>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onStartFocusForGoal(goal.id)}
                        startIcon={<PlayArrowRoundedIcon />}
                      >
                        Focus
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Goal Confirmation Dialog */}
      <Dialog
        open={Boolean(confirmDeleteGoal)}
        onClose={() => setConfirmDeleteGoal(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle className="font-display font-bold">Delete goal?</DialogTitle>
        <DialogContent>
          <p className="text-sm text-[#515864] dark:text-[#9EA6B6]">
            Remove “{confirmDeleteGoal?.title}” from your daily targets?
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setConfirmDeleteGoal(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDeleteGoal) onDeleteGoal(confirmDeleteGoal.id);
              setConfirmDeleteGoal(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
