import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SelfImprovementRoundedIcon from '@mui/icons-material/SelfImprovementRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
  const canLogElapsed = !isBreakPhase && remainingSeconds < totalPhaseSeconds;

  const ringSize = 200;
  const ringStroke = 10;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc - (progressPct / 100) * ringCirc;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
      {/* Main Focus Timer Card */}
      <Card className="lg:col-span-7 p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-2xl inline-flex items-center justify-center shrink-0 ${
                isBreakPhase
                  ? 'bg-[#D3F4E5] dark:bg-[#0A3B2B] text-[#0E7A56] dark:text-[#6DDBAC]'
                  : 'bg-[#CEE5FF] dark:bg-[#004B73] text-[#00639B] dark:text-[#8ACEFF]'
              }`}
            >
              {isBreakPhase ? <SelfImprovementRoundedIcon /> : <TimerRoundedIcon />}
            </span>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-[#191C20] dark:text-[#E3E5EC]">
                {isBreakPhase ? 'Recovery Break' : 'Focus Timer'}
              </h1>
              <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
                {preset === 'pomodoro' && '25m focus · 5m break'}
                {preset === 'deep' && '50m deep focus · 10m break'}
                {preset === 'custom' && `${customMinutes}m custom focus`}
              </p>
            </div>
          </div>

          {isBreakPhase && (
            <Button size="small" variant="outlined" onClick={() => setIsBreakPhase(false)}>
              Skip Break
            </Button>
          )}
        </div>

        <ToggleButtonGroup
          exclusive
          fullWidth
          disabled={isRunning}
          value={preset}
          onChange={(_, val) => {
            if (val) {
              setIsBreakPhase(false);
              setPreset(val as TimerPreset);
            }
          }}
        >
          <ToggleButton value="pomodoro">25m Focus</ToggleButton>
          <ToggleButton value="deep">50m Deep</ToggleButton>
          <ToggleButton value="custom">Custom</ToggleButton>
        </ToggleButtonGroup>

        {preset === 'custom' && !isBreakPhase && (
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Custom minutes"
            disabled={isRunning}
            value={customMinutes}
            onChange={(e) => setCustomMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 15)))}
            slotProps={{ htmlInput: { min: 1, max: 180 } }}
          />
        )}

        <FormControl fullWidth size="small">
          <InputLabel id="focus-goal-select">Linked daily target</InputLabel>
          <Select
            labelId="focus-goal-select"
            label="Linked daily target"
            value={selectedGoal?.id || ''}
            onChange={(e) => onSelectGoalId(e.target.value ? String(e.target.value) : null)}
          >
            <MenuItem value="">General focus session</MenuItem>
            {dayGoals.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.title} · {g.category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Animated Material Countdown Ring */}
        <div className="flex flex-col items-center py-2">
          <div className="relative w-[200px] h-[200px] flex items-center justify-center">
            <svg width={ringSize} height={ringSize} className="-rotate-90" aria-hidden="true">
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                className="stroke-[#E7EDF6] dark:stroke-[#272C37]"
                strokeWidth={ringStroke}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                className={
                  isBreakPhase
                    ? 'stroke-[#0E7A56] dark:stroke-[#6DDBAC]'
                    : 'stroke-[#00639B] dark:stroke-[#8ACEFF]'
                }
                strokeWidth={ringStroke}
                strokeDasharray={ringCirc}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 300ms linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-4xl font-bold tabular-nums text-[#191C20] dark:text-[#E3E5EC]">
                {minsDisplay}:{secsDisplay}
              </span>
              <span className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-1">
                {isBreakPhase ? 'Take a breather' : isRunning ? 'Focusing' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        <TextField
          fullWidth
          size="small"
          placeholder="Optional note on work completed..."
          value={sessionNote}
          onChange={(e) => setSessionNote(e.target.value)}
        />

        {/* Primary Transport Actions */}
        <div className="space-y-2.5">
          <Button
            variant="contained"
            size="large"
            fullWidth
            color={isBreakPhase ? 'success' : 'primary'}
            onClick={handleToggleRun}
            startIcon={isRunning ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
          >
            {isRunning ? 'Pause Timer' : 'Start Focus'}
          </Button>
          <div className={`grid gap-2.5 ${canLogElapsed ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Button variant="outlined" onClick={handleReset} startIcon={<ReplayRoundedIcon />}>
              Reset
            </Button>
            {canLogElapsed && (
              <Button
                variant="outlined"
                color="success"
                onClick={handleCompleteEarly}
                startIcon={<CheckCircleRoundedIcon />}
              >
                Log Elapsed
              </Button>
            )}
          </div>
        </div>

        {/* Quick Offline Minutes Logger */}
        <div className="pt-4 border-t border-[#DDE3EE] dark:border-[#2B313E] space-y-2">
          <div className="text-xs text-[#515864] dark:text-[#9EA6B6]">
            Worked offline? Quick-log minutes:
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[15, 30, 45].map((mins) => (
              <Button
                key={mins}
                variant="outlined"
                size="small"
                onClick={() => handleQuickLogMinutes(mins)}
                sx={{ fontFamily: '"JetBrains Mono", monospace', minHeight: 40 }}
              >
                +{mins}m
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Work Completed History Card */}
      <Card className="lg:col-span-5 p-5 sm:p-6 space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
              Work Completed
            </h2>
            <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
              {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'} logged
            </p>
          </div>
          <span className="font-mono text-lg font-bold tabular-nums text-[#00639B] dark:text-[#8ACEFF]">
            {formatDurationMinutes(totalMinutesToday)}
          </span>
        </div>

        {daySessions.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <span className="w-12 h-12 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B] text-[#515864] dark:text-[#9EA6B6] inline-flex items-center justify-center">
              <ScheduleRoundedIcon />
            </span>
            <p className="text-sm text-[#515864] dark:text-[#9EA6B6]">
              No work sessions recorded for this date yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#DDE3EE] dark:divide-[#2B313E]">
            {daySessions.map((session) => (
              <div
                key={session.id}
                className="py-3 first:pt-1 last:pb-0 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#191C20] dark:text-[#E3E5EC] leading-snug">
                    {session.goalTitle}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                    <span className="capitalize">{session.mode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatTimeFromISO(session.endedAt)}
                    </span>
                  </div>
                  {session.note && (
                    <p className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-1">
                      {session.note}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <span className="font-mono text-sm font-bold tabular-nums text-[#00639B] dark:text-[#8ACEFF] mr-1">
                    {session.durationMinutes}m
                  </span>
                  <IconButton
                    size="small"
                    aria-label="Remove session"
                    onClick={() => setConfirmDeleteId(session.id)}
                  >
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        open={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle className="font-display font-bold">Remove work session?</DialogTitle>
        <DialogContent>
          <p className="text-sm text-[#515864] dark:text-[#9EA6B6]">
            This will also subtract the minutes from the linked goal.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setConfirmDeleteId(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDeleteId) onDeleteSession(confirmDeleteId);
              setConfirmDeleteId(null);
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
