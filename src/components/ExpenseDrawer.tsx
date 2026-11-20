import React, { useEffect, useState } from 'react';
import { Button, Drawer, Input, InputNumber, Select } from 'antd';
import type { ExpenseCategory, ExpenseEntry } from '../types/daymark';
import { formatCurrency } from '../utils/dateUtils';

interface ExpenseDrawerProps {
  open: boolean;
  dateKey: string;
  currencySymbol: string;
  todaySpent: number;
  dailyBudgetCap: number;
  editingExpense: ExpenseEntry | null;
  onClose: () => void;
  onSave: (expense: ExpenseEntry) => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transport',
  'Work',
  'Bills',
  'Health',
  'Personal',
];

const QUICK_AMOUNTS = [5, 10, 15, 25];

export const ExpenseDrawer: React.FC<ExpenseDrawerProps> = ({
  open,
  dateKey,
  currencySymbol,
  todaySpent,
  dailyBudgetCap,
  editingExpense,
  onClose,
  onSave,
}) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editingExpense) {
      setAmount(editingExpense.amount);
      setCategory(editingExpense.category);
      setNote(editingExpense.note);
    } else {
      setAmount(null);
      setCategory('Food');
      setNote('');
    }
  }, [open, editingExpense]);

  const numericAmount = amount && amount > 0 ? amount : 0;
  const projectedTotal =
    todaySpent - (editingExpense ? editingExpense.amount : 0) + numericAmount;
  const projectedRemaining = dailyBudgetCap - projectedTotal;

  const handleSubmit = () => {
    if (!amount || amount <= 0) {
      setError('Enter an expense amount greater than zero.');
      return;
    }

    const entry: ExpenseEntry = editingExpense
      ? {
          ...editingExpense,
          amount: Number(amount.toFixed(2)),
          category,
          note: note.trim() || `${category} expense`,
        }
      : {
          id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dateKey,
          amount: Number(amount.toFixed(2)),
          category,
          note: note.trim() || `${category} expense`,
          createdAt: new Date().toISOString(),
        };

    onSave(entry);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '78vh' : undefined}
      width={isMobile ? undefined : 420}
      title={
        <span className="font-display text-base font-semibold">
          {editingExpense ? 'Edit Expense' : 'Log Daily Expense'}
        </span>
      }
      footer={
        <div className="flex items-center gap-3 py-1">
          <Button onClick={onClose} className="min-h-[44px] flex-1">
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit} className="min-h-[44px] flex-[2]">
            {editingExpense ? 'Update Expense' : 'Save Expense'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {isMobile && (
          <div className="w-10 h-1 rounded-full bg-[#CBD5E1] dark:bg-[#334155] mx-auto -mt-2 mb-1" />
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Amount ({currencySymbol})</label>
          <InputNumber
            size="large"
            min={0.01}
            max={1000000}
            precision={2}
            prefix={currencySymbol}
            placeholder="0.00"
            value={amount}
            onChange={(val) => {
              setAmount(val);
              if (error) setError('');
            }}
            className="w-full font-mono"
            autoFocus
          />
          {error && <p className="mt-1.5 text-xs text-[#DC2626] dark:text-[#F87171]">{error}</p>}

          <div className="flex items-center gap-2 mt-2.5">
            {QUICK_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(preset);
                  setError('');
                }}
                className="min-h-[40px] flex-1 rounded-lg border border-[#E5E7EB] dark:border-[#222C3E] text-xs font-mono tabular-nums font-medium text-[#111827] dark:text-[#F3F6FA] hover:border-[#1677FF] transition-colors"
              >
                +{currencySymbol}
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Category</label>
          <Select
            size="large"
            value={category}
            onChange={(val) => setCategory(val)}
            className="w-full"
            options={EXPENSE_CATEGORIES.map((cat) => ({ label: cat, value: cat }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Note</label>
          <Input
            size="large"
            placeholder="e.g., Lunch, bus fare, groceries"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onPressEnter={handleSubmit}
          />
        </div>

        <div className="p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#222C3E] bg-[#F6F7F9] dark:bg-[#0B0F17] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#525B6B] dark:text-[#94A3B8]">
            <span>Projected daily spend</span>
            <span className="font-mono tabular-nums font-medium text-[#111827] dark:text-[#F3F6FA]">
              {formatCurrency(projectedTotal, currencySymbol)} /{' '}
              {formatCurrency(dailyBudgetCap, currencySymbol)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#525B6B] dark:text-[#94A3B8]">Budget impact</span>
            <span
              className={`font-mono tabular-nums font-semibold ${
                projectedRemaining < 0
                  ? 'text-[#DC2626] dark:text-[#F87171]'
                  : projectedTotal / Math.max(1, dailyBudgetCap) >= 0.8
                    ? 'text-[#D97706] dark:text-[#FBBF24]'
                    : 'text-[#10B981]'
              }`}
            >
              {projectedRemaining < 0
                ? `${formatCurrency(Math.abs(projectedRemaining), currencySymbol)} over cap`
                : `${formatCurrency(projectedRemaining, currencySymbol)} remaining`}
            </span>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
