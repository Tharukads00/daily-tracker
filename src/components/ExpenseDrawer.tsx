import React, { useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { ExpenseCategory, ExpenseEntry } from '../types/daymark';
import { formatCurrency } from '../utils/dateUtils';
import { ExpenseCategoryIcon } from './MaterialIcons';

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
  const [amountInput, setAmountInput] = useState<string>('');
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
      setAmountInput(String(editingExpense.amount));
      setCategory(editingExpense.category);
      setNote(editingExpense.note);
    } else {
      setAmountInput('');
      setCategory('Food');
      setNote('');
    }
  }, [open, editingExpense]);

  const parsedAmount = parseFloat(amountInput);
  const numericAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const projectedTotal =
    todaySpent - (editingExpense ? editingExpense.amount : 0) + numericAmount;
  const projectedRemaining = dailyBudgetCap - projectedTotal;

  const handleSubmit = () => {
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    const entry: ExpenseEntry = editingExpense
      ? {
          ...editingExpense,
          amount: Number(numericAmount.toFixed(2)),
          category,
          note: note.trim() || `${category} expense`,
        }
      : {
          id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dateKey,
          amount: Number(numericAmount.toFixed(2)),
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
      anchor={isMobile ? 'bottom' : 'right'}
      slotProps={{
        paper: {
          sx: isMobile
            ? {
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                maxHeight: '86vh',
              }
            : {
                width: 420,
                borderTopLeftRadius: 24,
                borderBottomLeftRadius: 24,
              },
        },
      }}
    >
      <div className="flex flex-col h-full max-h-[86vh] md:max-h-screen">
        {/* Header */}
        <div className="px-5 pt-3 pb-3 border-b border-[#DDE3EE] dark:border-[#2B313E]">
          {isMobile && (
            <div className="w-10 h-1 rounded-full bg-[#C4CBD8] dark:bg-[#3F4756] mx-auto mb-3" />
          )}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
              {editingExpense ? 'Edit Expense' : 'Log Daily Expense'}
            </h2>
            <IconButton onClick={onClose} aria-label="Close drawer" size="small">
              <CloseRoundedIcon />
            </IconButton>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="space-y-2.5">
            <TextField
              fullWidth
              type="number"
              label="Amount"
              placeholder="0.00"
              value={amountInput}
              error={Boolean(error)}
              helperText={error || undefined}
              onChange={(e) => {
                setAmountInput(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <span className="font-mono font-semibold">{currencySymbol}</span>
                    </InputAdornment>
                  ),
                },
                htmlInput: { min: 0.01, step: 'any' },
              }}
            />

            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setAmountInput(String(preset));
                    setError('');
                  }}
                  sx={{ fontFamily: '"JetBrains Mono", monospace', minHeight: 38 }}
                >
                  +{currencySymbol}
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Interactive Icon Category Grid */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#515864] dark:text-[#9EA6B6]">
              Category
            </div>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer ${
                      selected
                        ? 'border-[#00639B] dark:border-[#8ACEFF] bg-[#CEE5FF]/60 dark:bg-[#004B73]/60'
                        : 'border-[#DDE3EE] dark:border-[#2B313E] bg-[#F9FBFE] dark:bg-[#151820]'
                    }`}
                  >
                    <ExpenseCategoryIcon category={cat} />
                    <span className="text-xs font-semibold text-[#191C20] dark:text-[#E3E5EC]">
                      {cat}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <TextField
            fullWidth
            label="Note (optional)"
            placeholder="e.g., Lunch, bus fare, groceries"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />

          {/* Budget Impact Summary */}
          <div className="p-4 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#515864] dark:text-[#9EA6B6]">
              <span>Projected daily spend</span>
              <span className="font-mono tabular-nums font-semibold text-[#191C20] dark:text-[#E3E5EC]">
                {formatCurrency(projectedTotal, currencySymbol)} /{' '}
                {formatCurrency(dailyBudgetCap, currencySymbol)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#515864] dark:text-[#9EA6B6]">Budget impact</span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  projectedRemaining < 0
                    ? 'text-[#BA1A1A] dark:text-[#FFB4AB]'
                    : projectedTotal / Math.max(1, dailyBudgetCap) >= 0.8
                      ? 'text-[#A15C00] dark:text-[#FFB951]'
                      : 'text-[#0E7A56] dark:text-[#6DDBAC]'
                }`}
              >
                {projectedRemaining < 0
                  ? `${formatCurrency(Math.abs(projectedRemaining), currencySymbol)} over cap`
                  : `${formatCurrency(projectedRemaining, currencySymbol)} left`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 pb-safe border-t border-[#DDE3EE] dark:border-[#2B313E] flex items-center gap-3">
          <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ flex: 2 }}>
            {editingExpense ? 'Update Expense' : 'Save Expense'}
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
