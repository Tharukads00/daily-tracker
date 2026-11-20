import React, { useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import PlusOneRoundedIcon from '@mui/icons-material/PlusOneRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import type {
  DailyGoal,
  GoalCategory,
  GoalTrackingMode,
  SubtaskItem,
} from '../types/daymark';
import { calculateGoalProgress } from '../utils/dateUtils';

interface GoalDrawerProps {
  open: boolean;
  dateKey: string;
  editingGoal: DailyGoal | null;
  onClose: () => void;
  onSave: (goal: DailyGoal) => void;
}

const CATEGORIES: GoalCategory[] = ['Work', 'Study', 'Health', 'Personal', 'Finance'];

export const GoalDrawer: React.FC<GoalDrawerProps> = ({
  open,
  dateKey,
  editingGoal,
  onClose,
  onSave,
}) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('Work');
  const [trackingMode, setTrackingMode] = useState<GoalTrackingMode>('slider');
  const [targetValue, setTargetValue] = useState<number>(10);
  const [unitLabel, setUnitLabel] = useState('tasks');
  const [targetMinutes, setTargetMinutes] = useState<number>(60);
  const [reminderTime, setReminderTime] = useState<string>('');
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskWeight, setNewSubtaskWeight] = useState<number>(2);
  const [error, setError] = useState('');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editingGoal) {
      setTitle(editingGoal.title);
      setCategory(editingGoal.category);
      setTrackingMode(editingGoal.trackingMode);
      setTargetValue(editingGoal.targetValue || 10);
      setUnitLabel(editingGoal.unitLabel || 'units');
      setTargetMinutes(editingGoal.targetMinutes || 60);
      setReminderTime(editingGoal.reminderTime || '');
      setSubtasks(editingGoal.subtasks.length ? editingGoal.subtasks : []);
    } else {
      setTitle('');
      setCategory('Work');
      setTrackingMode('slider');
      setTargetValue(10);
      setUnitLabel('units');
      setTargetMinutes(60);
      setReminderTime('');
      setSubtasks([
        { id: `st-${Date.now()}-1`, title: 'Core deliverable', weight: 3, completed: false },
        { id: `st-${Date.now()}-2`, title: 'Review & wrap-up', weight: 1, completed: false },
      ]);
    }
    setNewSubtaskTitle('');
    setNewSubtaskWeight(2);
  }, [open, editingGoal]);

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: trimmed,
        weight: Math.max(1, Math.min(10, newSubtaskWeight || 1)),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
    setNewSubtaskWeight(2);
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Enter a clear title for your daily goal.');
      return;
    }
    if (trackingMode === 'checklist' && subtasks.length === 0) {
      setError('Add at least one weighted sub-task.');
      return;
    }

    const base: DailyGoal = editingGoal
      ? {
          ...editingGoal,
          title: trimmed,
          category,
          trackingMode,
          targetValue: Math.max(1, targetValue || 1),
          unitLabel: unitLabel.trim() || 'units',
          targetMinutes: Math.max(5, targetMinutes || 25),
          subtasks: trackingMode === 'checklist' ? subtasks : editingGoal.subtasks,
          reminderTime: reminderTime || undefined,
        }
      : {
          id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dateKey,
          title: trimmed,
          category,
          trackingMode,
          progressPercent: 0,
          currentValue: 0,
          targetValue: Math.max(1, targetValue || 1),
          unitLabel: unitLabel.trim() || 'units',
          targetMinutes: Math.max(5, targetMinutes || 25),
          loggedMinutes: 0,
          subtasks: trackingMode === 'checklist' ? subtasks : [],
          reminderTime: reminderTime || undefined,
          createdAt: new Date().toISOString(),
        };

    base.progressPercent = calculateGoalProgress(base);
    onSave(base);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor={isMobile ? 'bottom' : 'right'}
      slotProps={{
        paper: {
          sx: isMobile
            ? {
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                maxHeight: '88vh',
              }
            : {
                width: 440,
                borderTopLeftRadius: 24,
                borderBottomLeftRadius: 24,
              },
        },
      }}
    >
      <div className="flex flex-col h-full max-h-[88vh] md:max-h-screen">
        {/* Header */}
        <div className="px-5 pt-3 pb-3 border-b border-[#DDE3EE] dark:border-[#2B313E]">
          {isMobile && (
            <div className="w-10 h-1 rounded-full bg-[#C4CBD8] dark:bg-[#3F4756] mx-auto mb-3" />
          )}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
              {editingGoal ? 'Edit Daily Target' : 'New Daily Target'}
            </h2>
            <IconButton onClick={onClose} aria-label="Close drawer" size="small">
              <CloseRoundedIcon />
            </IconButton>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <TextField
            fullWidth
            label="Goal title"
            placeholder="e.g., Finish mobile offline module"
            value={title}
            error={Boolean(error && !title.trim())}
            helperText={error && !title.trim() ? error : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormControl fullWidth>
              <InputLabel id="goal-category-label">Category</InputLabel>
              <Select
                labelId="goal-category-label"
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Reminder"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#515864] dark:text-[#9EA6B6]">
              Tracking method
            </div>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={trackingMode}
              onChange={(_, val) => {
                if (val) setTrackingMode(val as GoalTrackingMode);
              }}
            >
              <ToggleButton value="slider" sx={{ px: 1 }}>
                <span className="inline-flex items-center gap-1 text-xs">
                  <TuneRoundedIcon sx={{ fontSize: 16 }} />
                  Slider
                </span>
              </ToggleButton>
              <ToggleButton value="counter" sx={{ px: 1 }}>
                <span className="inline-flex items-center gap-1 text-xs">
                  <PlusOneRoundedIcon sx={{ fontSize: 16 }} />
                  Count
                </span>
              </ToggleButton>
              <ToggleButton value="checklist" sx={{ px: 1 }}>
                <span className="inline-flex items-center gap-1 text-xs">
                  <ChecklistRoundedIcon sx={{ fontSize: 16 }} />
                  Steps
                </span>
              </ToggleButton>
              <ToggleButton value="timer" sx={{ px: 1 }}>
                <span className="inline-flex items-center gap-1 text-xs">
                  <TimerRoundedIcon sx={{ fontSize: 16 }} />
                  Timer
                </span>
              </ToggleButton>
            </ToggleButtonGroup>
            <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
              {trackingMode === 'slider' && 'Slide 0–100% as you progress.'}
              {trackingMode === 'counter' && 'Count numeric units like pages, tasks, or sets.'}
              {trackingMode === 'checklist' && 'Complete weighted sub-tasks toward 100%.'}
              {trackingMode === 'timer' && 'Track progress automatically via Focus sessions.'}
            </p>
          </div>

          {trackingMode === 'counter' && (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                fullWidth
                type="number"
                label="Target count"
                value={targetValue}
                onChange={(e) => setTargetValue(Math.max(1, Number(e.target.value) || 1))}
                slotProps={{ htmlInput: { min: 1, max: 10000 } }}
              />
              <TextField
                fullWidth
                label="Unit label"
                placeholder="pages, km, tasks"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
              />
            </div>
          )}

          {trackingMode === 'timer' && (
            <TextField
              fullWidth
              type="number"
              label="Target focus minutes"
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(Math.max(5, Number(e.target.value) || 25))}
              slotProps={{ htmlInput: { min: 5, max: 600, step: 5 } }}
            />
          )}

          {trackingMode === 'checklist' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#515864] dark:text-[#9EA6B6]">
                <span className="font-semibold">Weighted sub-tasks</span>
                <span className="font-mono tabular-nums">
                  Total weight: {subtasks.reduce((sum, s) => sum + s.weight, 0)}
                </span>
              </div>

              {error && subtasks.length === 0 && (
                <p className="text-xs text-[#BA1A1A] dark:text-[#FFB4AB]">{error}</p>
              )}

              <div className="space-y-2">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B]"
                  >
                    <span className="flex-1 text-sm truncate text-[#191C20] dark:text-[#E3E5EC]">
                      {st.title}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-[#515864] dark:text-[#9EA6B6]">
                      {st.weight}x
                    </span>
                    <IconButton
                      size="small"
                      aria-label={`Remove ${st.title}`}
                      onClick={() => setSubtasks((prev) => prev.filter((item) => item.id !== st.id))}
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <TextField
                  size="small"
                  placeholder="Add sub-task..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubtask();
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Wt"
                  value={newSubtaskWeight}
                  onChange={(e) => setNewSubtaskWeight(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  sx={{ width: 68 }}
                  slotProps={{ htmlInput: { min: 1, max: 10 } }}
                />
                <IconButton
                  color="primary"
                  onClick={handleAddSubtask}
                  aria-label="Add sub-task"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <AddRoundedIcon />
                </IconButton>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 pb-safe border-t border-[#DDE3EE] dark:border-[#2B313E] flex items-center gap-3">
          <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ flex: 2 }}>
            {editingGoal ? 'Save Changes' : 'Create Goal'}
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
