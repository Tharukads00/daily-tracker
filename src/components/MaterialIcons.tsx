import React from 'react';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import type { ExpenseCategory, GoalCategory } from '../types/daymark';

const GOAL_META: Record<
  GoalCategory,
  { icon: React.ReactNode; bg: string; color: string }
> = {
  Work: {
    icon: <WorkOutlineRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#CEE5FF] dark:bg-[#004B73]',
    color: 'text-[#00639B] dark:text-[#8ACEFF]',
  },
  Study: {
    icon: <SchoolRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#E6DEFF] dark:bg-[#3A2E66]',
    color: 'text-[#5944A6] dark:text-[#CBBEFF]',
  },
  Health: {
    icon: <FavoriteRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#D3F4E5] dark:bg-[#0A3B2B]',
    color: 'text-[#0E7A56] dark:text-[#6DDBAC]',
  },
  Personal: {
    icon: <PersonRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#FFE6C4] dark:bg-[#472B00]',
    color: 'text-[#A15C00] dark:text-[#FFB951]',
  },
  Finance: {
    icon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#D6F3EE] dark:bg-[#0D3C36]',
    color: 'text-[#0D6E62] dark:text-[#6EE0D0]',
  },
};

const EXPENSE_META: Record<
  ExpenseCategory,
  { icon: React.ReactNode; bg: string; color: string }
> = {
  Food: {
    icon: <RestaurantRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#FFE6C4] dark:bg-[#472B00]',
    color: 'text-[#A15C00] dark:text-[#FFB951]',
  },
  Transport: {
    icon: <DirectionsBusRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#CEE5FF] dark:bg-[#004B73]',
    color: 'text-[#00639B] dark:text-[#8ACEFF]',
  },
  Work: {
    icon: <WorkOutlineRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#E6DEFF] dark:bg-[#3A2E66]',
    color: 'text-[#5944A6] dark:text-[#CBBEFF]',
  },
  Bills: {
    icon: <ReceiptLongRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#FFDAD6] dark:bg-[#5C1414]',
    color: 'text-[#BA1A1A] dark:text-[#FFB4AB]',
  },
  Health: {
    icon: <LocalHospitalRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#D3F4E5] dark:bg-[#0A3B2B]',
    color: 'text-[#0E7A56] dark:text-[#6DDBAC]',
  },
  Personal: {
    icon: <ShoppingBagRoundedIcon sx={{ fontSize: 19 }} />,
    bg: 'bg-[#D8E3F2] dark:bg-[#364152]',
    color: 'text-[#394A60] dark:text-[#D8E3F2]',
  },
};

export const GoalCategoryIcon: React.FC<{ category: GoalCategory }> = ({ category }) => {
  const item = GOAL_META[category] || GOAL_META.Work;
  return (
    <span
      className={`w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}
      aria-hidden="true"
    >
      {item.icon}
    </span>
  );
};

export const ExpenseCategoryIcon: React.FC<{ category: ExpenseCategory }> = ({ category }) => {
  const item = EXPENSE_META[category] || EXPENSE_META.Food;
  return (
    <span
      className={`w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}
      aria-hidden="true"
    >
      {item.icon}
    </span>
  );
};
