import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DaySummary,
  ExpenseCategory,
  ExpenseEntry,
} from '../types/daymark';
import { formatCurrency, formatTimeFromISO } from '../utils/dateUtils';
import { ExpenseCategoryIcon } from './MaterialIcons';

interface BudgetViewProps {
  selectedDateKey: string;
  summaries: DaySummary[];
  expenses: ExpenseEntry[];
  currencySymbol: string;
  dailyBudgetCap: number;
  budgetWarningPercent: number;
  dualWinStreak: number;
  isDark: boolean;
  onUpdateBudgetCap: (cap: number) => void;
  onUpdateCurrency: (symbol: string) => void;
  onOpenNewExpense: () => void;
  onEditExpense: (expense: ExpenseEntry) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const CURRENCIES = [
  { label: 'USD ($)', value: '$' },
  { label: 'LKR (Rs)', value: 'Rs ' },
  { label: 'EUR (€)', value: '€' },
  { label: 'GBP (£)', value: '£' },
  { label: 'INR (₹)', value: '₹' },
  { label: 'AUD (A$)', value: 'A$' },
];

const CATEGORY_ORDER: ExpenseCategory[] = [
  'Food',
  'Transport',
  'Work',
  'Bills',
  'Health',
  'Personal',
];

export const BudgetView: React.FC<BudgetViewProps> = ({
  selectedDateKey,
  summaries,
  expenses,
  currencySymbol,
  dailyBudgetCap,
  budgetWarningPercent,
  dualWinStreak,
  isDark,
  onUpdateBudgetCap,
  onUpdateCurrency,
  onOpenNewExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 520 : false
  );
  const [confirmDeleteExp, setConfirmDeleteExp] = useState<ExpenseEntry | null>(null);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 520);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const dayExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.dateKey === selectedDateKey)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [expenses, selectedDateKey]
  );

  const todaySpent = useMemo(
    () => Number(dayExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)),
    [dayExpenses]
  );

  const weeklySpent = useMemo(
    () => Number(summaries.reduce((sum, d) => sum + d.totalSpent, 0).toFixed(2)),
    [summaries]
  );

  const dualWinDaysCount = useMemo(
    () => summaries.filter((d) => d.dualWin).length,
    [summaries]
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const exp of dayExpenses) {
      map.set(exp.category, (map.get(exp.category) || 0) + exp.amount);
    }
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      amount: Number((map.get(cat) || 0).toFixed(2)),
    }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [dayExpenses]);

  const budgetRatio =
    dailyBudgetCap > 0 ? Math.round((todaySpent / dailyBudgetCap) * 100) : 0;
  const remaining = dailyBudgetCap - todaySpent;
  const isOver = remaining < 0;
  const isWarn = !isOver && budgetRatio >= budgetWarningPercent;

  const chartData = useMemo(
    () =>
      summaries.map((d) => ({
        label: isNarrow ? d.dayShort.slice(0, 2) : `${d.dayShort} ${d.dayNum}`,
        spent: d.totalSpent,
        goalPct: d.avgGoalProgress,
        underBudget: d.underBudget,
        dualWin: d.dualWin,
      })),
    [summaries, isNarrow]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Spending Overview & Budget Cap */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        <Card className="lg:col-span-7 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-[#D3F4E5] dark:bg-[#0A3B2B] text-[#0E7A56] dark:text-[#6DDBAC] inline-flex items-center justify-center shrink-0">
                <AccountBalanceWalletRoundedIcon />
              </span>
              <div>
                <h1 className="font-display text-lg sm:text-xl font-bold text-[#191C20] dark:text-[#E3E5EC]">
                  Daily Budget
                </h1>
                <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
                  Stay under cap to keep your Dual-Win streak.
                </p>
              </div>
            </div>
            <Button
              variant="contained"
              size="small"
              onClick={onOpenNewExpense}
              startIcon={<AddRoundedIcon />}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Log Expense
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-1">
            <div>
              <div className="text-[11px] sm:text-xs text-[#515864] dark:text-[#9EA6B6]">Spent</div>
              <div className="font-mono text-base sm:text-2xl font-bold tabular-nums mt-0.5 truncate">
                {formatCurrency(todaySpent, currencySymbol)}
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs text-[#515864] dark:text-[#9EA6B6]">
                {isOver ? 'Over cap' : 'Remaining'}
              </div>
              <div
                className={`font-mono text-base sm:text-2xl font-bold tabular-nums mt-0.5 truncate ${
                  isOver
                    ? 'text-[#BA1A1A] dark:text-[#FFB4AB]'
                    : isWarn
                      ? 'text-[#A15C00] dark:text-[#FFB951]'
                      : 'text-[#0E7A56] dark:text-[#6DDBAC]'
                }`}
              >
                {formatCurrency(Math.abs(remaining), currencySymbol)}
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs text-[#515864] dark:text-[#9EA6B6]">7-day</div>
              <div className="font-mono text-base sm:text-2xl font-bold tabular-nums mt-0.5 truncate">
                {formatCurrency(weeklySpent, currencySymbol)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <LinearProgress
              variant="determinate"
              value={Math.min(100, budgetRatio)}
              color={isOver ? 'error' : isWarn ? 'warning' : 'success'}
              sx={{ height: 9 }}
            />
            <div className="flex items-center justify-between text-xs text-[#515864] dark:text-[#9EA6B6]">
              <span className="inline-flex items-center gap-1.5">
                {isOver ? (
                  <WarningAmberRoundedIcon sx={{ fontSize: 16 }} className="text-[#BA1A1A] dark:text-[#FFB4AB]" />
                ) : (
                  <TrendingDownRoundedIcon sx={{ fontSize: 16 }} className="text-[#0E7A56] dark:text-[#6DDBAC]" />
                )}
                {isOver
                  ? 'Daily cap exceeded'
                  : isWarn
                    ? `Past ${budgetWarningPercent}% warning`
                    : 'Within daily spending cap'}
              </span>
              <span className="font-mono tabular-nums">{budgetRatio}%</span>
            </div>
          </div>
        </Card>

        {/* Cap & Currency Settings Card */}
        <Card className="lg:col-span-5 p-4 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#191C20] dark:text-[#E3E5EC]">
              Daily Cap & Currency
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                size="small"
                type="number"
                label="Daily cap"
                value={dailyBudgetCap}
                onChange={(e) => onUpdateBudgetCap(Math.max(1, Number(e.target.value) || 1))}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">{currencySymbol}</InputAdornment>
                    ),
                  },
                  htmlInput: { min: 1 },
                }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel id="budget-currency-label">Currency</InputLabel>
                <Select
                  labelId="budget-currency-label"
                  label="Currency"
                  value={currencySymbol}
                  onChange={(e) => onUpdateCurrency(String(e.target.value))}
                >
                  {CURRENCIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>

          <div className="pt-3 border-t border-[#DDE3EE] dark:border-[#2B313E] flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-[#515864] dark:text-[#9EA6B6]">7-Day Dual-Win Score</div>
              <div className="font-mono text-base font-bold tabular-nums text-[#0E7A56] dark:text-[#6DDBAC] mt-0.5">
                {dualWinDaysCount}/{summaries.length} days · {dualWinStreak}d streak
              </div>
            </div>
            <CheckCircleRoundedIcon className="text-[#0E7A56] dark:text-[#6DDBAC]" />
          </div>
        </Card>
      </section>

      {/* 7-Day Spend vs Goal Progress Chart */}
      <Card className="p-4 sm:p-6 space-y-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
              Spend vs. Goal Progress
            </h2>
            <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
              Bars = spend vs. dashed cap · Line = daily goal %
            </p>
          </div>
        </div>

        <div className="h-[210px] sm:h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: isNarrow ? 6 : 8, left: isNarrow ? -18 : -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#2B313E' : '#DDE3EE'}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: isDark ? '#9EA6B6' : '#515864', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="spend"
                width={isNarrow ? 44 : 52}
                tick={{ fill: isDark ? '#9EA6B6' : '#515864', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${currencySymbol}${v}`}
              />
              <YAxis
                yAxisId="goal"
                orientation="right"
                domain={[0, 100]}
                hide={isNarrow}
                tick={{ fill: isDark ? '#9EA6B6' : '#515864', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1A1D24' : '#FFFFFF',
                  borderColor: isDark ? '#2B313E' : '#DDE3EE',
                  borderRadius: 14,
                  color: isDark ? '#E3E5EC' : '#191C20',
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  const num = Number(value) || 0;
                  if (name === 'spent') {
                    return [formatCurrency(num, currencySymbol), 'Spent'];
                  }
                  return [`${num}%`, 'Goal Progress'];
                }}
              />
              <ReferenceLine
                yAxisId="spend"
                y={dailyBudgetCap}
                stroke={isDark ? '#FFB951' : '#A15C00'}
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <Bar yAxisId="spend" dataKey="spent" radius={[8, 8, 0, 0]} maxBarSize={28}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={
                      entry.underBudget
                        ? isDark
                          ? '#6DDBAC'
                          : '#0E7A56'
                        : isDark
                          ? '#FFB4AB'
                          : '#BA1A1A'
                    }
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="goal"
                type="monotone"
                dataKey="goalPct"
                stroke={isDark ? '#8ACEFF' : '#00639B'}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: isDark ? '#8ACEFF' : '#00639B' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Bottom Split: Expenses List + Category Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        <Card className="lg:col-span-7 p-4 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base sm:text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
              Expenses
            </h2>
            <span className="text-xs font-mono tabular-nums text-[#515864] dark:text-[#9EA6B6]">
              {dayExpenses.length} {dayExpenses.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {dayExpenses.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2.5">
              <span className="w-12 h-12 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B] text-[#515864] dark:text-[#9EA6B6] inline-flex items-center justify-center">
                <ReceiptLongRoundedIcon />
              </span>
              <p className="text-sm text-[#515864] dark:text-[#9EA6B6]">
                No expenses logged for this date yet.
              </p>
              <Button variant="contained" size="small" onClick={onOpenNewExpense} startIcon={<AddRoundedIcon />}>
                Log Expense
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#DDE3EE] dark:divide-[#2B313E]">
              {dayExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ExpenseCategoryIcon category={exp.category} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#191C20] dark:text-[#E3E5EC] truncate">
                        {exp.note}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                        <span>{exp.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatTimeFromISO(exp.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="font-mono text-sm font-bold tabular-nums mr-1">
                      {formatCurrency(exp.amount, currencySymbol)}
                    </span>
                    <IconButton
                      size="small"
                      onClick={() => onEditExpense(exp)}
                      aria-label={`Edit ${exp.note}`}
                    >
                      <EditRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setConfirmDeleteExp(exp)}
                      aria-label={`Delete ${exp.note}`}
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5 p-4 sm:p-6 space-y-3.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
            By Category
          </h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-[#515864] dark:text-[#9EA6B6] py-3">
              Category totals appear automatically as you log expenses.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((item) => {
                const share =
                  todaySpent > 0 ? Math.round((item.amount / todaySpent) * 100) : 0;
                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#191C20] dark:text-[#E3E5EC]">
                        {item.category}
                      </span>
                      <span className="font-mono tabular-nums text-[#515864] dark:text-[#9EA6B6]">
                        {formatCurrency(item.amount, currencySymbol)} · {share}%
                      </span>
                    </div>
                    <LinearProgress variant="determinate" value={share} sx={{ height: 6 }} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <Dialog
        open={Boolean(confirmDeleteExp)}
        onClose={() => setConfirmDeleteExp(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle className="font-display font-bold">Delete expense?</DialogTitle>
        <DialogContent>
          <p className="text-sm text-[#515864] dark:text-[#9EA6B6]">
            Remove “{confirmDeleteExp?.note}” from your daily budget?
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setConfirmDeleteExp(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDeleteExp) onDeleteExpense(confirmDeleteExp.id);
              setConfirmDeleteExp(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
