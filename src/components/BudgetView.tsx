import React, { useMemo } from 'react';
import { Button, Empty, InputNumber, Popconfirm, Progress, Select } from 'antd';
import {
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
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
        label: `${d.dayShort} ${d.dayNum}`,
        spent: d.totalSpent,
        goalPct: d.avgGoalProgress,
        underBudget: d.underBudget,
        dualWin: d.dualWin,
      })),
    [summaries]
  );

  return (
    <div className="space-y-6">
      {/* Top Budget Cap Summary & Quick Controls */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F3F6FA]">
                Daily Expense Monitor
              </h1>
              <p className="text-sm text-[#525B6B] dark:text-[#94A3B8] mt-0.5">
                Compare daily spending against your cap to protect your Dual-Win streak.
              </p>
            </div>
            <Button
              type="primary"
              onClick={onOpenNewExpense}
              icon={<Plus className="w-4 h-4" />}
              className="min-h-[44px] whitespace-nowrap shrink-0"
            >
              Log Expense
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">Spent on date</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[#111827] dark:text-[#F3F6FA] mt-0.5">
                {formatCurrency(todaySpent, currencySymbol)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                {isOver ? 'Over cap' : 'Remaining cap'}
              </div>
              <div
                className={`font-mono text-2xl font-bold tabular-nums mt-0.5 ${
                  isOver
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : isWarn
                      ? 'text-[#D97706] dark:text-[#FBBF24]'
                      : 'text-[#10B981]'
                }`}
              >
                {formatCurrency(Math.abs(remaining), currencySymbol)}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">7-day total</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[#111827] dark:text-[#F3F6FA] mt-0.5">
                {formatCurrency(weeklySpent, currencySymbol)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Progress
              percent={Math.min(100, budgetRatio)}
              showInfo={false}
              strokeWidth={10}
              strokeColor={isOver ? '#DC2626' : isWarn ? '#D97706' : '#10B981'}
            />
            <div className="flex items-center justify-between text-xs text-[#525B6B] dark:text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                {isOver ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-[#10B981]" />
                )}
                {isOver
                  ? 'Daily budget cap exceeded'
                  : isWarn
                    ? `Past ${budgetWarningPercent}% warning threshold`
                    : 'Within daily spending target'}
              </span>
              <span className="font-mono tabular-nums">{budgetRatio}% of cap</span>
            </div>
          </div>
        </div>

        {/* Cap Configuration & Dual-Win Streak Card */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#111827] dark:text-[#F3F6FA]">
              Daily Budget Cap Settings
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#525B6B] dark:text-[#94A3B8] mb-1">
                  Daily cap
                </label>
                <InputNumber
                  size="large"
                  min={1}
                  max={1000000}
                  value={dailyBudgetCap}
                  onChange={(val) => onUpdateBudgetCap(Math.max(1, Number(val) || 1))}
                  prefix={currencySymbol}
                  className="w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-[#525B6B] dark:text-[#94A3B8] mb-1">
                  Currency
                </label>
                <Select
                  size="large"
                  value={currencySymbol}
                  onChange={onUpdateCurrency}
                  className="w-full"
                  options={CURRENCIES}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#222C3E] flex items-center justify-between">
            <div>
              <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                7-Day Dual-Win Score
              </div>
              <div className="font-mono text-lg font-bold tabular-nums text-[#10B981] mt-0.5">
                {dualWinDaysCount} / {summaries.length} days · {dualWinStreak}d streak
              </div>
            </div>
            <CheckCircle2 className="w-7 h-7 text-[#10B981] shrink-0" />
          </div>
        </div>
      </section>

      {/* 7-Day Daily Budget Cap vs Goal Streak Composed Chart */}
      <section className="rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#F3F6FA]">
              Daily Spend vs. Goal Completion (Last 7 Days)
            </h2>
            <p className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
              Bars show daily expenses vs. dashed cap line · Blue line tracks daily goal %
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#525B6B] dark:text-[#94A3B8]">
            <span>Emerald = Under cap</span>
            <span>Coral = Over cap</span>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#222C3E' : '#E5E7EB'}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: isDark ? '#94A3B8' : '#525B6B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="spend"
                tick={{ fill: isDark ? '#94A3B8' : '#525B6B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${currencySymbol}${v}`}
              />
              <YAxis
                yAxisId="goal"
                orientation="right"
                domain={[0, 100]}
                tick={{ fill: isDark ? '#94A3B8' : '#525B6B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#131A26' : '#FFFFFF',
                  borderColor: isDark ? '#222C3E' : '#E5E7EB',
                  borderRadius: 12,
                  color: isDark ? '#F3F6FA' : '#111827',
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
                stroke="#D97706"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <Bar yAxisId="spend" dataKey="spent" radius={[8, 8, 0, 0]} maxBarSize={34}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.underBudget ? '#10B981' : '#DC2626'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="goal"
                type="monotone"
                dataKey="goalPct"
                stroke={isDark ? '#4096FF' : '#1677FF'}
                strokeWidth={2.5}
                dot={{ r: 4, fill: isDark ? '#4096FF' : '#1677FF' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 7-Day Dual-Win Comparison Strip */}
        <div className="grid grid-cols-7 gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#222C3E]">
          {summaries.map((d) => (
            <div key={d.dateKey} className="text-center space-y-0.5">
              <div className="text-[11px] text-[#525B6B] dark:text-[#94A3B8]">
                {d.dayShort}
              </div>
              <div
                className={`text-xs font-mono font-semibold tabular-nums ${
                  d.dualWin
                    ? 'text-[#10B981]'
                    : !d.underBudget
                      ? 'text-[#DC2626] dark:text-[#F87171]'
                      : 'text-[#525B6B] dark:text-[#94A3B8]'
                }`}
              >
                {d.dualWin ? 'Win' : !d.underBudget ? 'Over' : `${d.avgGoalProgress}%`}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Split: Category Breakdown + Chronological Expense List */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#F3F6FA]">
            Category Breakdown
          </h2>

          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-[#525B6B] dark:text-[#94A3B8] py-4">
              Log an expense to inspect category distribution.
            </p>
          ) : (
            <div className="space-y-3.5">
              {categoryBreakdown.map((item) => {
                const share =
                  todaySpent > 0 ? Math.round((item.amount / todaySpent) * 100) : 0;
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#111827] dark:text-[#F3F6FA]">
                        {item.category}
                      </span>
                      <span className="font-mono tabular-nums text-[#525B6B] dark:text-[#94A3B8]">
                        {formatCurrency(item.amount, currencySymbol)} · {share}%
                      </span>
                    </div>
                    <Progress percent={share} showInfo={false} strokeColor="#1677FF" size="small" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#F3F6FA]">
              Expenses Logged
            </h2>
            <span className="text-xs font-mono tabular-nums text-[#525B6B] dark:text-[#94A3B8]">
              {dayExpenses.length} {dayExpenses.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {dayExpenses.length === 0 ? (
            <div className="py-8">
              <Empty
                description={
                  <span className="text-sm text-[#525B6B] dark:text-[#94A3B8]">
                    No expenses recorded for this date.
                  </span>
                }
              >
                <Button type="primary" onClick={onOpenNewExpense} className="min-h-[44px]">
                  Log first expense
                </Button>
              </Empty>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#222C3E]">
              {dayExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="py-3.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#111827] dark:text-[#F3F6FA] truncate">
                      {exp.note}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#525B6B] dark:text-[#94A3B8] mt-0.5">
                      <span>{exp.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatTimeFromISO(exp.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-mono text-sm font-bold tabular-nums text-[#111827] dark:text-[#F3F6FA] mr-1">
                      {formatCurrency(exp.amount, currencySymbol)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditExpense(exp)}
                      aria-label={`Edit ${exp.note}`}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#525B6B] dark:text-[#94A3B8] hover:text-[#1677FF] transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <Popconfirm
                      title="Delete this expense?"
                      okText="Delete"
                      okType="danger"
                      onConfirm={() => onDeleteExpense(exp.id)}
                    >
                      <button
                        type="button"
                        aria-label={`Delete ${exp.note}`}
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
        </div>
      </section>
    </div>
  );
};
