import React, { useEffect, useState } from 'react';
import { Button, Drawer, Input, InputNumber, Segmented, Select } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
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

const MODE_OPTIONS = [
  { label: 'Slider %', value: 'slider' },
  { label: 'Counter', value: 'counter' },
  { label: 'Checklist', value: 'checklist' },
  { label: 'Timer', value: 'timer' },
];

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
      setError('Add at least one weighted sub-task for a checklist goal.');
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
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '86vh' : undefined}
      width={isMobile ? undefined : 440}
      title={
        <span className="font-display text-base font-semibold">
          {editingGoal ? 'Edit Daily Target' : 'New Daily Target'}
        </span>
      }
      footer={
        <div className="flex items-center gap-3 py-1">
          <Button onClick={onClose} className="min-h-[44px] flex-1">
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit} className="min-h-[44px] flex-[2]">
            {editingGoal ? 'Save Changes' : 'Create Goal'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {isMobile && (
          <div className="w-10 h-1 rounded-full bg-[#CBD5E1] dark:bg-[#334155] mx-auto -mt-2 mb-1" />
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[#111827] dark:text-[#F3F6FA]">
            Goal title
          </label>
          <Input
            size="large"
            placeholder="e.g., Finish mobile offline module"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            onPressEnter={handleSubmit}
          />
          {error && <p className="mt-1.5 text-xs text-[#DC2626] dark:text-[#F87171]">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#111827] dark:text-[#F3F6FA]">
              Category
            </label>
            <Select
              size="large"
              value={category}
              onChange={(val) => setCategory(val)}
              className="w-full"
              options={CATEGORIES.map((c) => ({ label: c, value: c }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#111827] dark:text-[#F3F6FA]">
              Reminder time (optional)
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full h-[40px] px-3 rounded-[10px] border border-[#D9D9D9] dark:border-[#2C374B] bg-white dark:bg-[#131A26] text-sm text-[#111827] dark:text-[#F3F6FA] tabular-nums focus:outline-none focus:border-[#1677FF]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[#111827] dark:text-[#F3F6FA]">
            Work measurement mode
          </label>
          <Segmented
            block
            size="large"
            value={trackingMode}
            onChange={(val) => setTrackingMode(val as GoalTrackingMode)}
            options={MODE_OPTIONS}
          />
          <p className="mt-1.5 text-xs text-[#525B6B] dark:text-[#94A3B8]">
            {trackingMode === 'slider' && 'Drag a 0–100% slider as you make progress.'}
            {trackingMode === 'counter' && 'Track concrete numeric targets (pages, reps, tasks).'}
            {trackingMode === 'checklist' && 'Break work into sub-tasks weighted by effort.'}
            {trackingMode === 'timer' && 'Measure progress directly via Focus & Pomodoro minutes.'}
          </p>
        </div>

        {trackingMode === 'counter' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Target count</label>
              <InputNumber
                size="large"
                min={1}
                max={10000}
                value={targetValue}
                onChange={(val) => setTargetValue(Number(val) || 1)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Unit label</label>
              <Input
                size="large"
                placeholder="pages, km, tasks"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
              />
            </div>
          </div>
        )}

        {trackingMode === 'timer' && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Target focus duration (minutes)</label>
            <InputNumber
              size="large"
              min={5}
              max={600}
              step={5}
              value={targetMinutes}
              onChange={(val) => setTargetMinutes(Number(val) || 25)}
              className="w-full"
              addonAfter="min"
            />
          </div>
        )}

        {trackingMode === 'checklist' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Weighted sub-tasks</label>
              <span className="text-xs text-[#525B6B] dark:text-[#94A3B8] tabular-nums">
                Total weight: {subtasks.reduce((sum, s) => sum + s.weight, 0)}
              </span>
            </div>

            <div className="space-y-2">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#222C3E] bg-[#F6F7F9] dark:bg-[#0B0F17]"
                >
                  <span className="flex-1 text-sm truncate text-[#111827] dark:text-[#F3F6FA]">
                    {st.title}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-[#525B6B] dark:text-[#94A3B8]">
                    {st.weight}x
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${st.title}`}
                    onClick={() => setSubtasks((prev) => prev.filter((item) => item.id !== st.id))}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#525B6B] hover:text-[#DC2626] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                size="large"
                placeholder="Add sub-task..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onPressEnter={handleAddSubtask}
                className="flex-1"
              />
              <InputNumber
                size="large"
                min={1}
                max={10}
                value={newSubtaskWeight}
                onChange={(val) => setNewSubtaskWeight(Number(val) || 1)}
                className="w-20"
                prefix="w:"
              />
              <Button
                size="large"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleAddSubtask}
                aria-label="Add sub-task"
                className="min-w-[44px]"
              />
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
