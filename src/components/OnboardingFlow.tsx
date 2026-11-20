import React, { useRef, useState } from 'react';
import { Button, Input, InputNumber, Segmented, Select, Slider } from 'antd';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Camera,
  CheckCircle2,
  Moon,
  ShieldCheck,
  Sun,
  Target,
  Timer,
  Wallet,
} from 'lucide-react';
import type {
  AvatarStyle,
  FocusPillar,
  ThemeMode,
  UserProfile,
  UserSettings,
} from '../types/daymark';
import { formatCurrency, formatDurationMinutes } from '../utils/dateUtils';
import { ProfileAvatar } from './ProfileAvatar';

const HERO_IMAGE = '/src/assets/images/onboarding_focus_hero_1795155436944.jpg';
const BALANCE_IMAGE = '/src/assets/images/onboarding_balance_visual_1795155452637.jpg';

interface OnboardingFlowProps {
  initialProfile: UserProfile;
  settings: UserSettings;
  isDark: boolean;
  onUpdateSettingsPreview: (patch: Partial<UserSettings>) => void;
  onRequestNotificationPermission: () => Promise<void>;
  onComplete: (payload: {
    profile: UserProfile;
    settingsPatch: Partial<UserSettings>;
    startMode: 'sample' | 'fresh';
  }) => void;
}

const ROLE_PRESETS = ['Software Engineer', 'Student', 'Founder', 'Designer', 'Freelancer'];

const FOCUS_PILLARS: { id: FocusPillar; subtitle: string }[] = [
  { id: 'Work & Projects', subtitle: 'Ship daily deliverables & sprints' },
  { id: 'Study & Learning', subtitle: 'Deep reading, exams & skill hours' },
  { id: 'Health & Routine', subtitle: 'Workouts, mobility & daily consistency' },
  { id: 'Financial Discipline', subtitle: 'Expense control & budget streaks' },
];

const CURRENCIES = [
  { label: 'USD ($)', value: '$' },
  { label: 'LKR (Rs)', value: 'Rs ' },
  { label: 'EUR (€)', value: '€' },
  { label: 'GBP (£)', value: '£' },
  { label: 'INR (₹)', value: '₹' },
  { label: 'AUD (A$)', value: 'A$' },
];

const AVATAR_SWATCHES = ['#1677FF', '#0F766E', '#1D4ED8', '#475569', '#B45309'];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialProfile,
  settings,
  isDark,
  onUpdateSettingsPreview,
  onRequestNotificationPermission,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(0); // 0: Welcome, 1: Profile, 2: Targets & Budget, 3: Ready
  const [name, setName] = useState(initialProfile.name || '');
  const [role, setRole] = useState(
    initialProfile.role && initialProfile.role !== 'Daily Achiever' ? initialProfile.role : ''
  );
  const [focusPillar, setFocusPillar] = useState<FocusPillar>(initialProfile.focusPillar);
  const [dailyFocusTargetMinutes, setDailyFocusTargetMinutes] = useState<number>(
    initialProfile.dailyFocusTargetMinutes || 150
  );
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(initialProfile.avatarStyle || 'art');
  const [avatarColor, setAvatarColor] = useState<string>(initialProfile.avatarColor || '#1677FF');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(
    initialProfile.avatarDataUrl
  );
  const [dailyBudgetCap, setDailyBudgetCap] = useState<number>(settings.dailyBudgetCap || 45);
  const [currencySymbol, setCurrencySymbol] = useState<string>(settings.currencySymbol || '$');
  const [morningReminderTime, setMorningReminderTime] = useState<string>(
    settings.morningReminderTime || '08:30'
  );
  const [eveningReminderTime, setEveningReminderTime] = useState<string>(
    settings.eveningReminderTime || '20:30'
  );
  const [startMode, setStartMode] = useState<'sample' | 'fresh'>('sample');
  const [nameError, setNameError] = useState('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [balanceImgFailed, setBalanceImgFailed] = useState(false);
  const [alertsRequested, setAlertsRequested] = useState(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarDataUrl(reader.result);
        setAvatarStyle('photo');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      setNameError('Enter your first name so Daymark can personalize your daily dashboard.');
      return;
    }
    setNameError('');
    setStep((s) => Math.min(3, s + 1));
  };

  const handleFinish = (skipWithDefaults = false) => {
    const finalName = skipWithDefaults ? name.trim() || 'Explorer' : name.trim() || 'Explorer';
    const finalRole = role.trim() || 'Daily Achiever';
    onComplete({
      profile: {
        name: finalName,
        role: finalRole,
        focusPillar,
        dailyFocusTargetMinutes,
        avatarStyle,
        avatarColor,
        avatarDataUrl,
        onboardingCompleted: true,
        createdAt: initialProfile.createdAt || new Date().toISOString(),
      },
      settingsPatch: {
        dailyBudgetCap: Math.max(1, dailyBudgetCap),
        currencySymbol,
        morningReminderTime,
        eveningReminderTime,
      },
      startMode: skipWithDefaults ? 'sample' : startMode,
    });
  };

  const stepLabels = ['Welcome', 'Profile', 'Daily Setup', 'Ready'];

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F6FA] flex flex-col">
      {/* Compact Top Bar */}
      <header className="w-full border-b border-[#E5E7EB] dark:border-[#222C3E] bg-white/90 dark:bg-[#131A26]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <span className="font-display text-lg font-extrabold tracking-tight text-[#111827] dark:text-[#F3F6FA]">
            Daymark
          </span>

          {/* Clean Numeric Step Indicator */}
          <div className="flex items-center gap-2 text-xs text-[#525B6B] dark:text-[#94A3B8]">
            <span className="font-mono tabular-nums font-semibold text-[#1677FF]">
              {step + 1} / {stepLabels.length}
            </span>
            <span aria-hidden="true">·</span>
            <span>{stepLabels[step]}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateSettingsPreview({ themeMode: isDark ? 'light' : 'dark' })
              }
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#525B6B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F3F6FA] transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {step < 3 && (
              <button
                type="button"
                onClick={() => handleFinish(true)}
                className="min-h-[40px] px-2 text-xs font-medium text-[#525B6B] dark:text-[#94A3B8] hover:text-[#1677FF] transition-colors whitespace-nowrap cursor-pointer"
              >
                Skip
              </button>
            )}
          </div>
        </div>

        {/* Thin Continuous Progress Rail */}
        <div className="h-[3px] w-full bg-[#E5E7EB] dark:bg-[#222C3E]">
          <div
            className="h-full bg-[#1677FF] transition-all duration-300"
            style={{ width: `${((step + 1) / stepLabels.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-5xl">
          <AnimatePresence mode="wait">
            {/* STEP 0: WELCOME SCREEN */}
            {step === 0 && (
              <motion.section
                key="step-0"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch"
              >
                {/* Left Visual Frame */}
                <div className="lg:col-span-7 relative rounded-3xl overflow-hidden border border-[#E5E7EB] dark:border-[#222C3E] bg-[#131A26] min-h-[240px] sm:min-h-[340px] lg:min-h-[480px] flex flex-col justify-end">
                  {!heroImgFailed ? (
                    <img
                      src={HERO_IMAGE}
                      alt="Minimalist architectural desk with notebook and timer"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1677FF]/40" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative z-10 p-6 sm:p-8 space-y-2 text-white">
                    <p className="text-xs font-medium text-white/80">
                      Offline-First Android Companion · Private Local Storage
                    </p>
                    <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight text-white">
                      Own your daily targets and your daily budget.
                    </h1>
                  </div>
                </div>

                {/* Right Value & CTA Panel */}
                <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-6 sm:p-8 flex flex-col justify-between gap-6">
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-xl font-bold text-[#111827] dark:text-[#F3F6FA]">
                        Built for focused days
                      </h2>
                      <p className="text-sm text-[#525B6B] dark:text-[#94A3B8] mt-1">
                        Set up your personal profile in under a minute. Everything stays stored
                        offline on your device.
                      </p>
                    </div>

                    <div className="space-y-4 pt-1">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#1677FF]/15 text-[#1677FF] flex items-center justify-center shrink-0">
                          <Target className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#111827] dark:text-[#F3F6FA]">
                            Flexible Goal Progress
                          </div>
                          <p className="text-xs text-[#525B6B] dark:text-[#94A3B8] mt-0.5">
                            Track work via sliders, unit counters, weighted checklists, or timed
                            blocks.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#1677FF]/15 text-[#1677FF] flex items-center justify-center shrink-0">
                          <Timer className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#111827] dark:text-[#F3F6FA]">
                            Pomodoro & Work Logs
                          </div>
                          <p className="text-xs text-[#525B6B] dark:text-[#94A3B8] mt-0.5">
                            Measure real minutes invested and sync them automatically to each goal.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#10B981] flex items-center justify-center shrink-0">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#111827] dark:text-[#F3F6FA]">
                            Daily Budget Cap vs. Streak
                          </div>
                          <p className="text-xs text-[#525B6B] dark:text-[#94A3B8] mt-0.5">
                            Log daily expenses alongside goals and protect your Dual-Win streak.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Button
                      type="primary"
                      size="large"
                      block
                      onClick={handleNext}
                      className="min-h-[48px] font-medium"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        Create Your Profile <ArrowRight className="w-4 h-4" />
                      </span>
                    </Button>
                    <p className="text-center text-xs text-[#525B6B] dark:text-[#94A3B8] flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                      No account required · Syncs locally offline
                    </p>
                  </div>
                </div>
              </motion.section>
            )}

            {/* STEP 1: CREATE PERSONAL PROFILE */}
            {step === 1 && (
              <motion.section
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
              >
                {/* Live Identity Card Preview */}
                <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-4">
                  <ProfileAvatar
                    profile={{
                      name: name || 'Your Name',
                      avatarStyle,
                      avatarColor,
                      avatarDataUrl,
                    }}
                    size="xl"
                  />

                  <div className="space-y-1">
                    <h2 className="font-display text-xl font-bold text-[#111827] dark:text-[#F3F6FA]">
                      {name.trim() || 'Your Profile'}
                    </h2>
                    <p className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                      {role.trim() || 'Daily Achiever'} · {focusPillar}
                    </p>
                  </div>

                  <div className="w-full pt-3 space-y-3 border-t border-[#E5E7EB] dark:border-[#222C3E]">
                    <div className="text-xs font-medium text-[#525B6B] dark:text-[#94A3B8]">
                      Avatar style
                    </div>
                    <Segmented
                      block
                      value={avatarStyle}
                      onChange={(val) => setAvatarStyle(val as AvatarStyle)}
                      options={[
                        { label: 'Editorial', value: 'art' },
                        { label: 'Initials', value: 'monogram' },
                        { label: 'Photo', value: 'photo' },
                      ]}
                    />

                    {avatarStyle === 'monogram' && (
                      <div className="flex items-center justify-center gap-2.5 pt-1">
                        {AVATAR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            aria-label={`Select swatch ${swatch}`}
                            onClick={() => setAvatarColor(swatch)}
                            style={{ backgroundColor: swatch }}
                            className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                              avatarColor === swatch
                                ? 'ring-2 ring-offset-2 ring-[#1677FF] dark:ring-offset-[#131A26] scale-110'
                                : ''
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {avatarStyle === 'photo' && (
                      <div className="pt-1">
                        <Button
                          onClick={() => photoInputRef.current?.click()}
                          icon={<Camera className="w-4 h-4" />}
                          className="min-h-[42px]"
                        >
                          {avatarDataUrl ? 'Change Photo' : 'Upload Local Photo'}
                        </Button>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Inputs */}
                <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-6 sm:p-8 flex flex-col justify-between gap-6">
                  <div className="space-y-5">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F3F6FA]">
                        Make Daymark yours
                      </h1>
                      <p className="text-sm text-[#525B6B] dark:text-[#94A3B8] mt-1">
                        Tell us what to call you and what matters most in your daily routine.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5">Your name</label>
                      <Input
                        size="large"
                        placeholder="e.g., Rukshan"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) setNameError('');
                        }}
                        onPressEnter={handleNext}
                        autoFocus
                      />
                      {nameError && (
                        <p className="mt-1.5 text-xs text-[#DC2626] dark:text-[#F87171]">
                          {nameError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Role or headline (optional)
                      </label>
                      <Input
                        size="large"
                        placeholder="e.g., Mobile Developer, University Student"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {ROLE_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setRole(preset)}
                            className={`min-h-[34px] px-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                              role === preset
                                ? 'bg-[#1677FF] border-[#1677FF] text-white'
                                : 'border-[#E5E7EB] dark:border-[#222C3E] text-[#525B6B] dark:text-[#94A3B8] hover:border-[#1677FF]'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Primary focus pillar</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {FOCUS_PILLARS.map((item) => {
                          const selected = focusPillar === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFocusPillar(item.id)}
                              className={`min-h-[58px] p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                selected
                                  ? 'border-[#1677FF] bg-[#EFF6FF] dark:bg-[#1677FF]/15'
                                  : 'border-[#E5E7EB] dark:border-[#222C3E] hover:border-[#1677FF]/60'
                              }`}
                            >
                              <div className="text-sm font-semibold text-[#111827] dark:text-[#F3F6FA]">
                                {item.id}
                              </div>
                              <div className="text-xs text-[#525B6B] dark:text-[#94A3B8] mt-0.5">
                                {item.subtitle}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      size="large"
                      onClick={() => setStep(0)}
                      icon={<ArrowLeft className="w-4 h-4" />}
                      className="min-h-[48px]"
                    >
                      Back
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleNext}
                      className="min-h-[48px] flex-1 font-medium"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        Continue to Daily Targets <ArrowRight className="w-4 h-4" />
                      </span>
                    </Button>
                  </div>
                </div>
              </motion.section>
            )}

            {/* STEP 2: DAILY TARGETS, BUDGET CAP & THEME */}
            {step === 2 && (
              <motion.section
                key="step-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
              >
                {/* Left Visual Companion */}
                <div className="lg:col-span-5 relative rounded-3xl overflow-hidden border border-[#E5E7EB] dark:border-[#222C3E] bg-[#131A26] min-h-[200px] lg:min-h-[460px] flex flex-col justify-end">
                  {!balanceImgFailed ? (
                    <img
                      src={BALANCE_IMAGE}
                      alt="Mechanical desk timer, ledger, and minimalist wallet"
                      referrerPolicy="no-referrer"
                      onError={() => setBalanceImgFailed(true)}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1E293B] to-[#0F172A]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative z-10 p-6 text-white space-y-1.5">
                    <div className="text-xs text-white/80">Daily Calibration</div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                      Pair your focus hours with a realistic spending cap.
                    </h2>
                  </div>
                </div>

                {/* Right Preferences Form */}
                <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-6 sm:p-8 flex flex-col justify-between gap-6">
                  <div className="space-y-5">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F3F6FA]">
                        Tune your daily targets
                      </h1>
                      <p className="text-sm text-[#525B6B] dark:text-[#94A3B8] mt-1">
                        You can update any of these anytime from Budget or Alerts.
                      </p>
                    </div>

                    {/* Daily Focus Target */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Daily focused work target</span>
                        <span className="font-mono tabular-nums font-semibold text-[#1677FF]">
                          {formatDurationMinutes(dailyFocusTargetMinutes)} / day
                        </span>
                      </div>
                      <Slider
                        min={30}
                        max={480}
                        step={15}
                        value={dailyFocusTargetMinutes}
                        onChange={(val) => setDailyFocusTargetMinutes(val)}
                      />
                    </div>

                    {/* Budget Cap & Currency */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Daily budget cap</label>
                        <InputNumber
                          size="large"
                          min={1}
                          max={1000000}
                          prefix={currencySymbol}
                          value={dailyBudgetCap}
                          onChange={(val) => setDailyBudgetCap(Math.max(1, Number(val) || 1))}
                          className="w-full font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Currency</label>
                        <Select
                          size="large"
                          value={currencySymbol}
                          onChange={(val) => setCurrencySymbol(val)}
                          className="w-full"
                          options={CURRENCIES}
                        />
                      </div>
                    </div>

                    {/* Morning & Evening Reminder Times */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#525B6B] dark:text-[#94A3B8] mb-1.5">
                          Morning check-in
                        </label>
                        <input
                          type="time"
                          value={morningReminderTime}
                          onChange={(e) => setMorningReminderTime(e.target.value)}
                          className="w-full h-[44px] px-3 rounded-xl border border-[#D9D9D9] dark:border-[#2C374B] bg-white dark:bg-[#0B0F17] text-sm font-mono tabular-nums text-[#111827] dark:text-[#F3F6FA]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#525B6B] dark:text-[#94A3B8] mb-1.5">
                          Evening alert
                        </label>
                        <input
                          type="time"
                          value={eveningReminderTime}
                          onChange={(e) => setEveningReminderTime(e.target.value)}
                          className="w-full h-[44px] px-3 rounded-xl border border-[#D9D9D9] dark:border-[#2C374B] bg-white dark:bg-[#0B0F17] text-sm font-mono tabular-nums text-[#111827] dark:text-[#F3F6FA]"
                        />
                      </div>
                    </div>

                    {/* Live Theme Picker */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[#525B6B] dark:text-[#94A3B8]">
                        Preferred appearance
                      </label>
                      <Segmented
                        block
                        size="large"
                        value={settings.themeMode}
                        onChange={(val) =>
                          onUpdateSettingsPreview({ themeMode: val as ThemeMode })
                        }
                        options={[
                          { label: 'Light', value: 'light' },
                          { label: 'Dark', value: 'dark' },
                          { label: 'System', value: 'system' },
                        ]}
                      />
                    </div>

                    {/* Starting Workspace Choice */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[#525B6B] dark:text-[#94A3B8]">
                        Initial workspace data
                      </label>
                      <Segmented
                        block
                        value={startMode}
                        onChange={(val) => setStartMode(val as 'sample' | 'fresh')}
                        options={[
                          { label: 'Guided 7-Day Sample', value: 'sample' },
                          { label: 'Start Blank Slate', value: 'fresh' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      size="large"
                      onClick={() => setStep(1)}
                      icon={<ArrowLeft className="w-4 h-4" />}
                      className="min-h-[48px]"
                    >
                      Back
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleNext}
                      className="min-h-[48px] flex-1 font-medium"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        Review Profile <ArrowRight className="w-4 h-4" />
                      </span>
                    </Button>
                  </div>
                </div>
              </motion.section>
            )}

            {/* STEP 3: READY TO LAUNCH CONFIRMATION */}
            {step === 3 && (
              <motion.section
                key="step-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl mx-auto rounded-3xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-6 sm:p-10 space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <ProfileAvatar
                    profile={{
                      name: name || 'Explorer',
                      avatarStyle,
                      avatarColor,
                      avatarDataUrl,
                    }}
                    size="xl"
                  />
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10B981]">
                      <CheckCircle2 className="w-4 h-4" />
                      Profile configured locally
                    </div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111827] dark:text-[#F3F6FA]">
                      Welcome, {name.trim() || 'Explorer'}
                    </h1>
                    <p className="text-sm text-[#525B6B] dark:text-[#94A3B8]">
                      {role.trim() || 'Daily Achiever'} · {focusPillar}
                    </p>
                  </div>
                </div>

                {/* Structured Setup Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-y border-[#E5E7EB] dark:border-[#222C3E]">
                  <div>
                    <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">Daily focus goal</div>
                    <div className="font-mono text-lg font-bold tabular-nums text-[#111827] dark:text-[#F3F6FA] mt-0.5">
                      {formatDurationMinutes(dailyFocusTargetMinutes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">Daily budget cap</div>
                    <div className="font-mono text-lg font-bold tabular-nums text-[#111827] dark:text-[#F3F6FA] mt-0.5">
                      {formatCurrency(dailyBudgetCap, currencySymbol)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">Daily alerts</div>
                    <div className="font-mono text-lg font-bold tabular-nums text-[#111827] dark:text-[#F3F6FA] mt-0.5">
                      {morningReminderTime} · {eveningReminderTime}
                    </div>
                  </div>
                </div>

                {/* Optional Notification Permission CTA */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#F6F7F9] dark:bg-[#0B0F17] border border-[#E5E7EB] dark:border-[#222C3E]">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-[#1677FF] shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-[#111827] dark:text-[#F3F6FA]">
                        Enable device reminder alerts
                      </div>
                      <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                        Get notified for unfinished goals, 100% milestones, and budget limits.
                      </div>
                    </div>
                  </div>
                  <Button
                    disabled={alertsRequested}
                    onClick={async () => {
                      await onRequestNotificationPermission();
                      setAlertsRequested(true);
                    }}
                    className="min-h-[40px]"
                  >
                    {alertsRequested ? 'Configured' : 'Enable Alerts'}
                  </Button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    size="large"
                    onClick={() => setStep(2)}
                    icon={<ArrowLeft className="w-4 h-4" />}
                    className="min-h-[48px]"
                  >
                    Back
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => handleFinish(false)}
                    className="min-h-[48px] flex-1 font-medium"
                  >
                    Launch My Dashboard
                  </Button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
