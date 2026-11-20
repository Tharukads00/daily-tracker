import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Progress,
  Segmented,
  Select,
} from 'antd';
import {
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { DailyGoal, WorkSession } from '../types/daymark';
import {
  formatDurationMinutes,
  formatTimeFromISO,
} from '../utils/dateUtils';

interface FocusViewProps {
  dateKey: string;
  goals: DailyGoal[];
  sessions: WorkSession[];
  activeGoalId: string | null;
  onSelectGoalId: (goalId: string | null) => void;
  onLogWorkSession: (session: Omit<WorkSession, 'id'>) => void;
  onDeleteSession: (sessionId: string) => void;
}

type TimerPreset = 'pomodoro' | 'deep' | 'custom';

export const FocusView: React.FC<FocusViewProps> = ({
  dateKey,
  goals,
  sessions,
  activeGoalId,
  onSelectGoalId,
  onLogWorkSession,
  onDeleteSession,
}) => {
  const dayGoals = useMemo(
    () => goals.filter((g) => g.dateKey === dateKey),
    [goals, dateKey]
  );

  const daySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.dateKey === dateKey)
        .sort((a, b) => b.endedAt.localeCompare(a.endedAt)),
    [sessions, dateKey]
  );

  const selectedGoal = useMemo(() => {
    if (activeGoalId) {
      const match = dayGoals.find((g) => g.id === activeGoalId);
      if (match) return match;
    }
    return dayGoals[0] || null;
  }, [dayGoals, activeGoalId]);

  const [preset, setPreset] = useState<TimerPreset>('pomodoro');
  const [customMinutes, setCustomMinutes] = useState<number>(30);
  const [isBreakPhase, setIsBreakPhase] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [sessionNote, setSessionNote] = useState('');

  const endTimestampRef = useRef<number | null>(null);
  const startedAtRef = useRef<string | null>(null);

  const totalPhaseSeconds = useMemo(() => {
    if (isBreakPhase) {
      return (preset === 'deep' ? 10 : 5) * 60;
    }
    if (preset === 'pomodoro') return 25 * 60;
    if (preset === 'deep') return 50 * 60;
    return Math.max(1, customMinutes) * 60;
  }, [preset, customMinutes, isBreakPhase]);

  useEffect(() => {
    if (!isRunning) {
      setRemainingSeconds(totalPhaseSeconds);
    }
  }, [totalPhaseSeconds, isRunning]);

  const finishWorkPhase = (loggedMins: number) => {
    setIsRunning(false);
    endTimestampRef.current = null;
    if (!isBreakPhase && loggedMins >= 1) {
      const nowIso = new Date().toISOString();
      onLogWorkSession({
        dateKey,
        goalId: selectedGoal?.id || 'general-focus',
        goalTitle: selectedGoal?.title || 'Focused Work Block',
        mode: preset,
        durationMinutes: loggedMins,
        startedAt:
          startedAtRef.current ||
          new Date(Date.now() - loggedMins * 60_000).toISOString(),
        endedAt: nowIso,
        note: sessionNote.trim() || undefined,
      });
      setSessionNote('');
      setIsBreakPhase(true);
    } else {
      setIsBreakPhase(false);
    }
    startedAtRef.current = null;
  };

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      if (!endTimestampRef.current) return;
      const secsLeft = Math.max(
        0,
        Math.ceil((endTimestampRef.current - Date.now()) / 1000)
      );
      setRemainingSeconds(secsLeft);
      if (secsLeft <= 0) {
        const plannedMinutes = Math.round(totalPhaseSeconds / 60);
        finishWorkPhase(plannedMinutes);
      }
    };
    const interval = window.setInterval(tick, 500);
    tick();
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, totalPhaseSeconds, isBreakPhase, selectedGoal, preset, dateKey, sessionNote]);

  const handleToggleRun = () => {
    if (isRunning) {
      setIsRunning(false);
      endTimestampRef.current = null;
      return;
    }
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }
    endTimestampRef.current = Date.now() + remainingSeconds * 1000;
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    endTimestampRef.current = null;
    startedAtRef.current = null;
    setRemainingSeconds(totalPhaseSeconds);
  };

  const handleCompleteEarly = () => {
    const elapsedSeconds = totalPhaseSeconds - remainingSeconds;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    finishWorkPhase(elapsedMinutes);
  };

  const handleQuickLogMinutes = (minutes: number) => {
    const now = Date.now();
    onLogWorkSession({
      dateKey,
      goalId: selectedGoal?.id || 'general-focus',
      goalTitle: selectedGoal?.title || 'Offline Work Session',
      mode: 'custom',
      durationMinutes: minutes,
      startedAt: new Date(now - minutes * 60_000).toISOString(),
      endedAt: new Date(now).toISOString(),
      note: sessionNote.trim() || 'Quick logged work',
    });
    setSessionNote('');
  };

  const progressPct = Math.min(
    100,
    Math.max(
      0,
      Math.round(((totalPhaseSeconds - remainingSeconds) / Math.max(1, totalPhaseSeconds)) * 100)
    )
  );

  const minsDisplay = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const secsDisplay = String(remainingSeconds % 60).padStart(2, '0');
  const totalMinutesToday = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Focus Timer Card */}
      <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-[#111827] dark:text-[#F3F6FA]">
              {isBreakPhase ? 'Recovery Break' : 'Focus & Pomodoro Timer'}
            </h1>
            <p className="text-xs text-[#525B6B] dark:text-[#94A3B8] mt-0.5">
              Completed sessions sync locally and advance your linked target goal.
            </p>
          </div>
          {isBreakPhase && (
            <Button size="small" onClick={() => setIsBreakPhase(false)}>
              Skip Break
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <Segmented
            block
            size="large"
            disabled={isRunning}
            value={preset}
            onChange={(val) => {
              setIsBreakPhase(false);
              setPreset(val as TimerPreset);
            }}
            options={[
              { label: 'Pomodoro 25m', value: 'pomodoro' },
              { label: 'Deep Work 50m', value: 'deep' },
              { label: 'Custom', value: 'custom' },
            ]}
          />

          {preset === 'custom' && !isBreakPhase && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                Custom work session duration
              </span>
              <InputNumber
                min={1}
                max={180}
                disabled={isRunning}
                value={customMinutes}
                onChange={(val) => setCustomMinutes(Number(val) || 15)}
                addonAfter="min"
              />
            </div>
          )}
        </div>

        {/* Linked Daily Goal Selector */}
        <div>
          <label className="block text-xs font-medium text-[#525B6B] dark:text-[#94A3B8] mb-1.5">
            Linked daily goal
          </label>
          <Select
            size="large"
            className="w-full"
            value={selectedGoal?.id}
            placeholder="Select a daily target goal (or run general focus)"
            onChange={(val) => onSelectGoalId(val)}
            allowClear
            options={dayGoals.map((g) => ({
              label: `${g.title} (${g.category})`,
              value: g.id,
            }))}
          />
        </div>

        {/* Circular Live Countdown Ring */}
        <div className="flex flex-col items-center py-2">
          <Progress
            type="circle"
            percent={progressPct}
            size={210}
            strokeWidth={8}
            strokeColor={isBreakPhase ? '#10B981' : '#1677FF'}
            format={() => (
              <div className="flex flex-col items-center">
                <span className="font-mono text-4xl font-bold tabular-nums text-[#111827] dark:text-[#F3F6FA]">
                  {minsDisplay}:{secsDisplay}
                </span>
                <span className="text-xs text-[#525B6B] dark:text-[#94A3B8] mt-1">
                  {isBreakPhase
                    ? 'Break time'
                    : isRunning
                      ? 'In progress'
                      : 'Ready to start'}
                </span>
              </div>
            )}
          />
        </div>

        {/* Optional Work Note */}
        <Input
          size="large"
          placeholder="Optional note on what you’re completing in this block..."
          value={sessionNote}
          onChange={(e) => setSessionNote(e.target.value)}
        />

        {/* Primary Timer Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="primary"
            size="large"
            onClick={handleToggleRun}
            icon={isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            className="min-h-[48px] flex-[2] min-w-[140px]"
          >
            {isRunning ? 'Pause Timer' : 'Start Focus'}
          </Button>
          <Button
            size="large"
            onClick={handleReset}
            icon={<RotateCcw className="w-4 h-4" />}
            className="min-h-[48px] flex-1"
          >
            Reset
          </Button>
          {!isBreakPhase && remainingSeconds < totalPhaseSeconds && (
            <Button
              size="large"
              onClick={handleCompleteEarly}
              icon={<CheckCircle2 className="w-4 h-4" />}
              className="min-h-[48px] flex-1"
            >
              Log Elapsed
            </Button>
          )}
        </div>

        {/* Quick Offline Work Logger */}
        <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#222C3E] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
            Worked offline without timer? Quick log:
          </span>
          <div className="flex items-center gap-2">
            {[15, 30, 45].map((mins) => (
              <Button
                key={mins}
                size="small"
                onClick={() => handleQuickLogMinutes(mins)}
                className="min-h-[36px] font-mono tabular-nums"
              >
                +{mins}m
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Work Completed Today Log */}
      <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#F3F6FA]">
              Work Completed
            </h2>
            <p className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
              {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'} logged
            </p>
          </div>
          <span className="font-mono text-xl font-bold tabular-nums text-[#1677FF]">
            {formatDurationMinutes(totalMinutesToday)}
          </span>
        </div>

        {daySessions.length === 0 ? (
          <div className="py-8">
            <Empty
              description={
                <span className="text-sm text-[#525B6B] dark:text-[#94A3B8]">
                  No work sessions recorded yet for this date.
                </span>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] dark:divide-[#222C3E]">
            {daySessions.map((session) => (
              <div
                key={session.id}
                className="py-3.5 first:pt-1 last:pb-0 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#111827] dark:text-[#F3F6FA] truncate">
                    {session.goalTitle}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#525B6B] dark:text-[#94A3B8] mt-0.5">
                    <span className="capitalize">{session.mode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatTimeFromISO(session.endedAt)}
                    </span>
                  </div>
                  {session.note && (
                    <p className="text-xs text-[#525B6B] dark:text-[#94A3B8] mt-1">
                      {session.note}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono text-sm font-semibold tabular-nums text-[#111827] dark:text-[#F3F6FA] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#1677FF]" />
                    {session.durationMinutes}m
                  </span>
                  <Popconfirm
                    title="Remove this work session?"
                    okText="Remove"
                    okType="danger"
                    onConfirm={() => onDeleteSession(session.id)}
                  >
                    <button
                      type="button"
                      aria-label="Remove session"
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#525B6B] dark:text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
