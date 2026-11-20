import React, { useMemo, useRef, useState } from 'react';
import {
  Button,
  ButtonBase,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import { motion, AnimatePresence } from 'motion/react';
import type {
  AvatarStyle,
  FocusPillar,
  LocalUserAccount,
  ThemeMode,
  UserProfile,
  UserSettings,
} from '../types/daymark';
import { formatCurrency, formatDurationMinutes } from '../utils/dateUtils';
import {
  computeProfileCompletion,
  hashLocalPin,
  normalizeUsername,
  verifyLocalPin,
} from '../utils/profileUtils';
import { ProfileAvatar } from './ProfileAvatar';

const HERO_IMAGE = '/src/assets/images/onboarding_focus_hero_1795155436944.jpg';
const BALANCE_IMAGE = '/src/assets/images/onboarding_balance_visual_1795155452637.jpg';

interface OnboardingFlowProps {
  initialProfile: UserProfile;
  settings: UserSettings;
  isDark: boolean;
  isSigningIn?: boolean;
  localAccounts: LocalUserAccount[];
  isReplayMode?: boolean;
  onSignInLocalAccount: (accountId: string) => void;
  onGoogleSignIn?: () => Promise<void>;
  onUpdateSettingsPreview: (patch: Partial<UserSettings>) => void;
  onRequestNotificationPermission: () => Promise<void>;
  onComplete: (payload: {
    profile: UserProfile;
    settingsPatch: Partial<UserSettings>;
    pinHash?: string;
    isNewAccount: boolean;
  }) => void;
}

const ROLE_PRESETS = ['Engineer', 'Student', 'Founder', 'Designer', 'Freelancer'];

const FOCUS_PILLARS: { id: FocusPillar; subtitle: string }[] = [
  { id: 'Work & Projects', subtitle: 'Daily deliverables & sprints' },
  { id: 'Study & Learning', subtitle: 'Reading, exams & skills' },
  { id: 'Health & Routine', subtitle: 'Workouts & daily habits' },
  { id: 'Financial Discipline', subtitle: 'Expenses & budget streaks' },
];

const CURRENCIES = [
  { label: 'USD ($)', value: '$' },
  { label: 'LKR (Rs)', value: 'Rs ' },
  { label: 'EUR (€)', value: '€' },
  { label: 'GBP (£)', value: '£' },
  { label: 'INR (₹)', value: '₹' },
  { label: 'AUD (A$)', value: 'A$' },
];

const AVATAR_SWATCHES = ['#00639B', '#0E7A56', '#5944A6', '#4E6075', '#A15C00'];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialProfile,
  settings,
  isDark,
  isSigningIn = false,
  localAccounts,
  isReplayMode = false,
  onSignInLocalAccount,
  onGoogleSignIn,
  onUpdateSettingsPreview,
  onRequestNotificationPermission,
  onComplete,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'quick'>(() =>
    !isReplayMode && localAccounts.length > 0 ? 'signin' : 'quick'
  );
  const [step, setStep] = useState<number>(isReplayMode ? 1 : 0);

  // Local sign-in state
  const [selectedLoginId, setSelectedLoginId] = useState<string | null>(
    localAccounts[0]?.id ?? null
  );
  const [loginPin, setLoginPin] = useState('');
  const [loginPinError, setLoginPinError] = useState('');

  // Quick Enter & Wizard profile fields
  const [name, setName] = useState(initialProfile.name || '');
  const [username, setUsername] = useState(initialProfile.username || '');
  const [usernameTouched, setUsernameTouched] = useState(Boolean(initialProfile.username));
  const [role, setRole] = useState(
    initialProfile.role && initialProfile.role !== 'Daily Achiever' ? initialProfile.role : ''
  );
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [email, setEmail] = useState(initialProfile.email || '');
  const [location, setLocation] = useState(initialProfile.location || '');
  const [focusPillar, setFocusPillar] = useState<FocusPillar>(initialProfile.focusPillar);
  const [dailyFocusTargetMinutes, setDailyFocusTargetMinutes] = useState<number>(
    initialProfile.dailyFocusTargetMinutes || 150
  );
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(initialProfile.avatarStyle || 'art');
  const [avatarColor, setAvatarColor] = useState<string>(initialProfile.avatarColor || '#00639B');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(
    initialProfile.avatarDataUrl
  );
  const [avatarCustomized, setAvatarCustomized] = useState<boolean>(
    Boolean(initialProfile.avatarCustomized)
  );
  const [useLocalPin, setUseLocalPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [dailyBudgetCap, setDailyBudgetCap] = useState<number>(settings.dailyBudgetCap || 45);
  const [currencySymbol, setCurrencySymbol] = useState<string>(settings.currencySymbol || '$');
  const [morningReminderTime, setMorningReminderTime] = useState<string>(
    settings.morningReminderTime || '08:30'
  );
  const [eveningReminderTime, setEveningReminderTime] = useState<string>(
    settings.eveningReminderTime || '20:30'
  );
  const [nameError, setNameError] = useState('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [balanceImgFailed, setBalanceImgFailed] = useState(false);
  const [alertsRequested, setAlertsRequested] = useState(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveUsername = useMemo(() => {
    if (usernameTouched && username.trim()) return normalizeUsername(username, 'user');
    if (name.trim()) return normalizeUsername(name, 'user');
    return '';
  }, [name, username, usernameTouched]);

  const draftProfile: UserProfile = useMemo(
    () => ({
      name: name.trim(),
      username: effectiveUsername,
      role: role.trim() || 'Daily Achiever',
      bio: bio.trim() || undefined,
      email: email.trim() || undefined,
      location: location.trim() || undefined,
      focusPillar,
      dailyFocusTargetMinutes,
      avatarStyle,
      avatarColor,
      avatarDataUrl,
      avatarCustomized,
      dailyTargetsConfigured: step >= 2,
      onboardingCompleted: true,
      createdAt: initialProfile.createdAt || new Date().toISOString(),
    }),
    [
      avatarColor,
      avatarCustomized,
      avatarDataUrl,
      avatarStyle,
      bio,
      dailyFocusTargetMinutes,
      effectiveUsername,
      email,
      focusPillar,
      initialProfile.createdAt,
      location,
      name,
      role,
      step,
    ]
  );

  const completionPreview = useMemo(
    () =>
      computeProfileCompletion(draftProfile, {
        ...settings,
        dailyBudgetCap,
        currencySymbol,
      }),
    [currencySymbol, dailyBudgetCap, draftProfile, settings]
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarDataUrl(reader.result);
        setAvatarStyle('photo');
        setAvatarCustomized(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const validateNewPin = (): boolean => {
    if (!useLocalPin) {
      setPinError('');
      return true;
    }
    if (!/^\d{4}$/.test(newPin.trim())) {
      setPinError('Enter a 4-digit passcode (numbers only).');
      return false;
    }
    setPinError('');
    return true;
  };

  const handleQuickEnter = () => {
    if (!name.trim()) {
      setNameError('Enter your name to quick-enter Daymark.');
      return;
    }
    if (!validateNewPin()) return;
    setNameError('');

    onComplete({
      profile: {
        ...draftProfile,
        name: name.trim(),
        username: effectiveUsername || normalizeUsername(name.trim(), 'user'),
        dailyTargetsConfigured: false,
        profileChecklistDismissed: false,
        onboardingCompleted: true,
      },
      settingsPatch: {
        dailyBudgetCap: Math.max(1, dailyBudgetCap),
        currencySymbol,
        morningReminderTime,
        eveningReminderTime,
      },
      pinHash: useLocalPin ? hashLocalPin(newPin.trim()) : undefined,
      isNewAccount: !isReplayMode,
    });
  };

  const handleNext = () => {
    if (step === 0) {
      if (name.trim() && !validateNewPin()) return;
      setNameError('');
      setStep(1);
      return;
    }
    if (step === 1 && !name.trim()) {
      setNameError('Enter your name to personalize Daymark.');
      return;
    }
    if (step === 1 && !validateNewPin()) return;
    setNameError('');
    setStep((s) => Math.min(3, s + 1));
  };

  const handleFinishWizard = () => {
    if (!validateNewPin()) return;
    const finalName = name.trim() || 'Explorer';
    const finalUsername = effectiveUsername || normalizeUsername(finalName, 'user');
    onComplete({
      profile: {
        ...draftProfile,
        name: finalName,
        username: finalUsername,
        role: role.trim() || 'Daily Achiever',
        dailyTargetsConfigured: true,
        profileChecklistDismissed: false,
        onboardingCompleted: true,
      },
      settingsPatch: {
        dailyBudgetCap: Math.max(1, dailyBudgetCap),
        currencySymbol,
        morningReminderTime,
        eveningReminderTime,
      },
      pinHash: useLocalPin ? hashLocalPin(newPin.trim()) : undefined,
      isNewAccount: !isReplayMode,
    });
  };

  const handleAttemptLocalSignIn = (account: LocalUserAccount) => {
    if (!account.pinHash) {
      onSignInLocalAccount(account.id);
      return;
    }
    setSelectedLoginId(account.id);
    setLoginPin('');
    setLoginPinError('');
  };

  const handleConfirmPinLogin = () => {
    const target = localAccounts.find((a) => a.id === selectedLoginId);
    if (!target) return;
    if (!verifyLocalPin(loginPin, target.pinHash)) {
      setLoginPinError('Incorrect 4-digit passcode. Try again.');
      return;
    }
    setLoginPinError('');
    onSignInLocalAccount(target.id);
  };

  const selectedLockedAccount = localAccounts.find(
    (a) => a.id === selectedLoginId && Boolean(a.pinHash)
  );

  const stepLabels = ['Sign In', 'Profile', 'Targets', 'Ready'];

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#111318] text-[#191C20] dark:text-[#E3E5EC] flex flex-col">
      {/* Compact M3 Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-md border-b border-[#DDE3EE] dark:border-[#2B313E]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 rounded-xl bg-[#00639B] dark:bg-[#8ACEFF] text-white dark:text-[#003352] inline-flex items-center justify-center">
              <TrackChangesRoundedIcon sx={{ fontSize: 18 }} />
            </span>
            <span className="font-display text-base sm:text-lg font-extrabold tracking-tight">
              Daymark
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#515864] dark:text-[#9EA6B6]">
            {step === 0 ? (
              <span className="font-medium">
                {authMode === 'signin' && localAccounts.length > 0
                  ? 'Local Accounts'
                  : 'Quick Enter'}
              </span>
            ) : (
              <>
                <span className="font-mono tabular-nums font-bold text-[#00639B] dark:text-[#8ACEFF]">
                  {step}/{stepLabels.length - 1}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium">{stepLabels[step]}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              size="small"
              onClick={() =>
                onUpdateSettingsPreview({ themeMode: isDark ? 'light' : 'dark' })
              }
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
            </IconButton>
          </div>
        </div>
        {step > 0 && (
          <LinearProgress
            variant="determinate"
            value={(step / (stepLabels.length - 1)) * 100}
            sx={{ height: 3, borderRadius: 0 }}
          />
        )}
      </header>

      <main className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-6 py-5 sm:py-8 pb-safe">
        <div className="w-full max-w-5xl">
          <AnimatePresence mode="wait">
            {/* STEP 0: INITIAL MOBILE LOGIN + QUICK ENTER */}
            {step === 0 && (
              <motion.section
                key={`step-0-${authMode}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-stretch"
              >
                {/* Left Visual Panel */}
                <div className="lg:col-span-6 relative rounded-3xl overflow-hidden border border-[#DDE3EE] dark:border-[#2B313E] bg-[#1A1D24] min-h-[168px] sm:min-h-[240px] lg:min-h-[520px] flex flex-col justify-end">
                  {!heroImgFailed ? (
                    <img
                      src={HERO_IMAGE}
                      alt="Minimalist desk workspace with timer and notebook"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#003352] via-[#00639B] to-[#0E7A56]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <div className="relative z-10 p-5 sm:p-8 space-y-2 text-white">
                    <p className="text-xs font-medium text-white/80">
                      Offline-First Daily Goals, Focus & Budget
                    </p>
                    <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-white">
                      {authMode === 'signin' && localAccounts.length > 0
                        ? 'Choose your profile to continue.'
                        : 'Start fresh in seconds with Quick Enter.'}
                    </h1>
                  </div>
                </div>

                {/* Right Interactive Login / Quick Enter Panel */}
                <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-[#1A1D24] border border-[#DDE3EE] dark:border-[#2B313E] p-5 sm:p-7 flex flex-col justify-between gap-5">
                  {localAccounts.length > 0 && (
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      size="small"
                      value={authMode}
                      onChange={(_, val) => {
                        if (val) {
                          setAuthMode(val as 'signin' | 'quick');
                          setLoginPinError('');
                        }
                      }}
                    >
                      <ToggleButton value="signin">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <LoginRoundedIcon sx={{ fontSize: 16 }} />
                          Local Users ({localAccounts.length})
                        </span>
                      </ToggleButton>
                      <ToggleButton value="quick">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <PersonAddAlt1RoundedIcon sx={{ fontSize: 16 }} />
                          Add Local User
                        </span>
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}

                  {authMode === 'signin' && localAccounts.length > 0 ? (
                    /* RETURNING LOCAL ACCOUNTS SIGN IN */
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div>
                          <h2 className="font-display text-xl font-bold">Welcome back</h2>
                          <p className="text-xs sm:text-sm text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                            Tap a local profile to open its private offline workspace.
                          </p>
                        </div>

                        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-0.5">
                          {localAccounts.map((acc) => {
                            const isSelected = selectedLoginId === acc.id && Boolean(acc.pinHash);
                            return (
                              <ButtonBase
                                key={acc.id}
                                onClick={() => handleAttemptLocalSignIn(acc)}
                                sx={{
                                  width: '100%',
                                  borderRadius: 4,
                                  textAlign: 'left',
                                  p: 1.5,
                                  border: '1px solid',
                                  borderColor: isSelected ? 'primary.main' : 'divider',
                                  bgcolor: isSelected ? 'action.selected' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 1.5,
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <ProfileAvatar
                                    profile={{
                                      name: acc.name,
                                      avatarStyle: acc.avatarStyle,
                                      avatarColor: acc.avatarColor,
                                      avatarDataUrl: acc.avatarDataUrl,
                                    }}
                                    size="md"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-display text-sm font-bold truncate">
                                      {acc.name}
                                    </div>
                                    <div className="text-xs text-[#515864] dark:text-[#9EA6B6] truncate">
                                      @{acc.username} · {acc.role}
                                    </div>
                                  </div>
                                </div>

                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#00639B] dark:text-[#8ACEFF] shrink-0">
                                  {acc.pinHash ? (
                                    <>
                                      <LockRoundedIcon sx={{ fontSize: 15 }} />
                                      PIN
                                    </>
                                  ) : (
                                    <>
                                      Enter
                                      <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                                    </>
                                  )}
                                </span>
                              </ButtonBase>
                            );
                          })}
                        </div>

                        {/* Inline 4-digit PIN Unlock when a protected user is selected */}
                        {selectedLockedAccount && (
                          <div className="p-3.5 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B] space-y-2.5">
                            <div className="text-xs font-semibold">
                              Enter 4-digit passcode for {selectedLockedAccount.name}
                            </div>
                            <div className="flex items-center gap-2">
                              <TextField
                                size="small"
                                type="password"
                                placeholder="••••"
                                value={loginPin}
                                error={Boolean(loginPinError)}
                                helperText={loginPinError || undefined}
                                onChange={(e) => {
                                  setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                                  if (loginPinError) setLoginPinError('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleConfirmPinLogin();
                                }}
                                slotProps={{
                                  htmlInput: { inputMode: 'numeric', maxLength: 4 },
                                }}
                                sx={{ flex: 1 }}
                              />
                              <Button
                                variant="contained"
                                onClick={handleConfirmPinLogin}
                                disabled={loginPin.length < 4}
                              >
                                Unlock
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-[#DDE3EE] dark:border-[#2B313E]">
                        <Button
                          variant="outlined"
                          size="large"
                          fullWidth
                          onClick={() => setAuthMode('quick')}
                          startIcon={<PersonAddAlt1RoundedIcon />}
                        >
                          Add Another Local User
                        </Button>
                        {onGoogleSignIn && (
                          <Button
                            variant="text"
                            size="medium"
                            fullWidth
                            disabled={isSigningIn}
                            onClick={() => void onGoogleSignIn()}
                            startIcon={<CloudDoneRoundedIcon />}
                          >
                            {isSigningIn ? 'Signing in...' : 'Sign in with Google Cloud'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* QUICK ENTER + PROFILE COMPLETION PREVIEW */
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3.5">
                        <div>
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00639B] dark:text-[#8ACEFF] mb-0.5">
                            <BoltRoundedIcon sx={{ fontSize: 16 }} />
                            Quick Enter · Offline Ready
                          </div>
                          <h2 className="font-display text-xl font-bold">
                            {localAccounts.length > 0 ? 'Add a new local user' : 'Create your profile'}
                          </h2>
                          <p className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                            Enter your name to start immediately — finish remaining profile tasks anytime.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <TextField
                            fullWidth
                            size="small"
                            label="Full name"
                            placeholder="e.g., Rukshan"
                            value={name}
                            error={Boolean(nameError)}
                            helperText={nameError || undefined}
                            onChange={(e) => {
                              setName(e.target.value);
                              if (nameError) setNameError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleQuickEnter();
                            }}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label="Username"
                            placeholder="rukshan"
                            value={usernameTouched ? username : effectiveUsername}
                            onChange={(e) => {
                              setUsernameTouched(true);
                              setUsername(e.target.value);
                            }}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">@</InputAdornment>
                                ),
                              },
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-[#515864] dark:text-[#9EA6B6]">
                            Primary focus
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {FOCUS_PILLARS.map((item) => {
                              const selected = focusPillar === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setFocusPillar(item.id)}
                                  className={`min-h-[44px] px-3 py-2 rounded-2xl border text-left transition-all cursor-pointer ${
                                    selected
                                      ? 'border-[#00639B] dark:border-[#8ACEFF] bg-[#CEE5FF]/55 dark:bg-[#004B73]/55'
                                      : 'border-[#DDE3EE] dark:border-[#2B313E]'
                                  }`}
                                >
                                  <div className="text-xs font-semibold truncate">{item.id}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Optional Local 4-Digit Passcode */}
                        <div className="p-3 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <LockRoundedIcon
                                sx={{ fontSize: 17 }}
                                className="text-[#00639B] dark:text-[#8ACEFF] shrink-0"
                              />
                              <span className="text-xs font-semibold truncate">
                                Protect with 4-digit local PIN (optional)
                              </span>
                            </div>
                            <Switch
                              size="small"
                              checked={useLocalPin}
                              onChange={(e) => {
                                setUseLocalPin(e.target.checked);
                                setPinError('');
                              }}
                            />
                          </div>
                          {useLocalPin && (
                            <TextField
                              fullWidth
                              size="small"
                              type="password"
                              label="4-digit passcode"
                              placeholder="1234"
                              value={newPin}
                              error={Boolean(pinError)}
                              helperText={pinError || 'Required when switching back to this local profile.'}
                              onChange={(e) => {
                                setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                                if (pinError) setPinError('');
                              }}
                              slotProps={{
                                htmlInput: { inputMode: 'numeric', maxLength: 4 },
                              }}
                            />
                          )}
                        </div>

                        {/* Compact Profile Completion Task Preview */}
                        <div className="p-3 rounded-2xl border border-[#DDE3EE] dark:border-[#2B313E] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold flex items-center gap-1.5">
                              <AccountCircleRoundedIcon
                                sx={{ fontSize: 16 }}
                                className="text-[#00639B] dark:text-[#8ACEFF]"
                              />
                              Profile completion task
                            </span>
                            <span className="font-mono tabular-nums font-bold text-[#00639B] dark:text-[#8ACEFF]">
                              {completionPreview.percent}%
                            </span>
                          </div>
                          <LinearProgress
                            variant="determinate"
                            value={completionPreview.percent}
                            sx={{ height: 6 }}
                          />
                          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                            {completionPreview.tasks.slice(0, 3).map((task) => (
                              <span
                                key={task.id}
                                className={`inline-flex items-center gap-1 text-[11px] ${
                                  task.completed
                                    ? 'text-[#0E7A56] dark:text-[#6DDBAC] font-semibold'
                                    : 'text-[#515864] dark:text-[#9EA6B6]'
                                }`}
                              >
                                {task.completed ? (
                                  <CheckCircleRoundedIcon sx={{ fontSize: 13 }} />
                                ) : (
                                  <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 13 }} />
                                )}
                                {task.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button
                          variant="contained"
                          size="large"
                          fullWidth
                          onClick={handleQuickEnter}
                          startIcon={<BoltRoundedIcon />}
                        >
                          Quick Enter App
                        </Button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Button
                            variant="outlined"
                            size="medium"
                            fullWidth
                            onClick={handleNext}
                            endIcon={<ArrowForwardRoundedIcon />}
                          >
                            Full Setup
                          </Button>
                          {onGoogleSignIn && (
                            <Button
                              variant="outlined"
                              size="medium"
                              fullWidth
                              disabled={isSigningIn}
                              onClick={() => void onGoogleSignIn()}
                              startIcon={<CloudDoneRoundedIcon />}
                            >
                              {isSigningIn ? 'Signing in...' : 'Google Sign In'}
                            </Button>
                          )}
                        </div>
                        <p className="text-center text-[11px] text-[#515864] dark:text-[#9EA6B6] flex items-center justify-center gap-1 pt-0.5">
                          <VerifiedUserRoundedIcon sx={{ fontSize: 14, color: '#0E7A56' }} />
                          Fresh clean workspace · Zero sample data
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {/* STEP 1: COMPLETE PROFILE DETAILS */}
            {step === 1 && (
              <motion.section
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
              >
                <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#1A1D24] border border-[#DDE3EE] dark:border-[#2B313E] p-6 flex flex-col items-center justify-center text-center gap-3.5">
                  <ProfileAvatar
                    profile={{ name: name || 'You', avatarStyle, avatarColor, avatarDataUrl }}
                    size="xl"
                  />
                  <div>
                    <h2 className="font-display text-xl font-bold">{name.trim() || 'Your Profile'}</h2>
                    <p className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                      @{effectiveUsername || 'username'} · {role.trim() || 'Daily Achiever'}
                    </p>
                  </div>
                  <div className="w-full pt-3 border-t border-[#DDE3EE] dark:border-[#2B313E] space-y-3">
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      value={avatarStyle}
                      onChange={(_, val) => {
                        if (val) {
                          setAvatarStyle(val as AvatarStyle);
                          setAvatarCustomized(true);
                        }
                      }}
                    >
                      <ToggleButton value="art">Art</ToggleButton>
                      <ToggleButton value="monogram">Initials</ToggleButton>
                      <ToggleButton value="photo">Photo</ToggleButton>
                    </ToggleButtonGroup>

                    {avatarStyle === 'monogram' && (
                      <div className="flex items-center justify-center gap-2.5">
                        {AVATAR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            aria-label={`Select color ${swatch}`}
                            onClick={() => {
                              setAvatarColor(swatch);
                              setAvatarCustomized(true);
                            }}
                            style={{ backgroundColor: swatch }}
                            className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                              avatarColor === swatch
                                ? 'ring-2 ring-offset-2 ring-[#00639B] dark:ring-[#8ACEFF] dark:ring-offset-[#1A1D24] scale-110'
                                : ''
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {avatarStyle === 'photo' && (
                      <div>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => photoInputRef.current?.click()}
                          startIcon={<PhotoCameraRoundedIcon />}
                        >
                          {avatarDataUrl ? 'Change Photo' : 'Upload Photo'}
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

                <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#1A1D24] border border-[#DDE3EE] dark:border-[#2B313E] p-6 sm:p-8 flex flex-col justify-between gap-5">
                  <div className="space-y-4">
                    <div>
                      <h1 className="font-display text-2xl font-bold">Complete your profile</h1>
                      <p className="text-xs sm:text-sm text-[#515864] dark:text-[#9EA6B6] mt-1">
                        Fill your details now or update them anytime inside Settings.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        fullWidth
                        size="small"
                        label="Full name"
                        placeholder="e.g., Rukshan"
                        value={name}
                        error={Boolean(nameError)}
                        helperText={nameError || undefined}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (nameError) setNameError('');
                        }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Username"
                        value={usernameTouched ? username : effectiveUsername}
                        onChange={(e) => {
                          setUsernameTouched(true);
                          setUsername(e.target.value);
                        }}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">@</InputAdornment>,
                          },
                        }}
                      />
                    </div>

                    <div>
                      <TextField
                        fullWidth
                        size="small"
                        label="Role or title"
                        placeholder="e.g., Mobile Developer, Student"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {ROLE_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setRole(preset)}
                            className={`min-h-[32px] px-3 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                              role === preset
                                ? 'bg-[#CEE5FF] dark:bg-[#004B73] border-[#00639B] dark:border-[#8ACEFF] text-[#001D32] dark:text-[#CEE5FF]'
                                : 'border-[#DDE3EE] dark:border-[#2B313E] text-[#515864] dark:text-[#9EA6B6]'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <TextField
                      fullWidth
                      size="small"
                      label="Short bio or daily motto (optional)"
                      placeholder="e.g., Building daily momentum one focus block at a time"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        fullWidth
                        size="small"
                        label="Email (optional)"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="City / Location (optional)"
                        placeholder="e.g., Colombo"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button variant="outlined" size="large" onClick={() => setStep(0)} startIcon={<ArrowBackRoundedIcon />}>
                      Back
                    </Button>
                    <Button variant="contained" size="large" onClick={handleNext} endIcon={<ArrowForwardRoundedIcon />} sx={{ flex: 1 }}>
                      Continue
                    </Button>
                  </div>
                </div>
              </motion.section>
            )}

            {/* STEP 2: DAILY TARGETS & BUDGET */}
            {step === 2 && (
              <motion.section
                key="step-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
              >
                <div className="lg:col-span-5 relative rounded-3xl overflow-hidden border border-[#DDE3EE] dark:border-[#2B313E] bg-[#1A1D24] min-h-[160px] lg:min-h-[450px] flex flex-col justify-end">
                  {!balanceImgFailed ? (
                    <img
                      src={BALANCE_IMAGE}
                      alt="Timer and minimalist ledger"
                      referrerPolicy="no-referrer"
                      onError={() => setBalanceImgFailed(true)}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#004B73] to-[#1A1D24]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="relative z-10 p-5 sm:p-6 text-white space-y-1">
                    <div className="text-xs text-white/80">Daily Calibration</div>
                    <h2 className="font-display text-xl font-bold text-white">
                      Pair your focus hours with a realistic spending cap.
                    </h2>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#1A1D24] border border-[#DDE3EE] dark:border-[#2B313E] p-6 sm:p-8 flex flex-col justify-between gap-5">
                  <div className="space-y-4">
                    <div>
                      <h1 className="font-display text-2xl font-bold">Tune your daily targets</h1>
                      <p className="text-xs sm:text-sm text-[#515864] dark:text-[#9EA6B6] mt-1">
                        Adjust anytime from Budget or Settings.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Daily focus goal</span>
                        <span className="font-mono tabular-nums font-bold text-[#00639B] dark:text-[#8ACEFF]">
                          {formatDurationMinutes(dailyFocusTargetMinutes)} / day
                        </span>
                      </div>
                      <Slider
                        min={30}
                        max={480}
                        step={15}
                        value={dailyFocusTargetMinutes}
                        onChange={(_, val) => setDailyFocusTargetMinutes(Number(val))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <TextField
                        fullWidth
                        type="number"
                        label="Daily budget cap"
                        value={dailyBudgetCap}
                        onChange={(e) => setDailyBudgetCap(Math.max(1, Number(e.target.value) || 1))}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">{currencySymbol}</InputAdornment>
                            ),
                          },
                          htmlInput: { min: 1 },
                        }}
                      />
                      <FormControl fullWidth>
                        <InputLabel id="onboard-currency">Currency</InputLabel>
                        <Select
                          labelId="onboard-currency"
                          label="Currency"
                          value={currencySymbol}
                          onChange={(e) => setCurrencySymbol(String(e.target.value))}
                        >
                          {CURRENCIES.map((c) => (
                            <MenuItem key={c.value} value={c.value}>
                              {c.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <TextField
                        fullWidth
                        type="time"
                        label="Morning check-in"
                        value={morningReminderTime}
                        onChange={(e) => setMorningReminderTime(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        fullWidth
                        type="time"
                        label="Evening alert"
                        value={eveningReminderTime}
                        onChange={(e) => setEveningReminderTime(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-[#515864] dark:text-[#9EA6B6]">
                        Appearance
                      </div>
                      <ToggleButtonGroup
                        exclusive
                        fullWidth
                        value={settings.themeMode}
                        onChange={(_, val) => {
                          if (val) onUpdateSettingsPreview({ themeMode: val as ThemeMode });
                        }}
                      >
                        <ToggleButton value="light">Light</ToggleButton>
                        <ToggleButton value="dark">Dark</ToggleButton>
                        <ToggleButton value="system">System</ToggleButton>
                      </ToggleButtonGroup>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button variant="outlined" size="large" onClick={() => setStep(1)} startIcon={<ArrowBackRoundedIcon />}>
                      Back
                    </Button>
                    <Button variant="contained" size="large" onClick={handleNext} endIcon={<ArrowForwardRoundedIcon />} sx={{ flex: 1 }}>
                      Review
                    </Button>
                  </div>
                </div>
              </motion.section>
            )}

            {/* STEP 3: READY */}
            {step === 3 && (
              <motion.section
                key="step-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="max-w-xl mx-auto rounded-3xl bg-white dark:bg-[#1A1D24] border border-[#DDE3EE] dark:border-[#2B313E] p-6 sm:p-9 space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <ProfileAvatar
                    profile={{ name: name || 'Explorer', avatarStyle, avatarColor, avatarDataUrl }}
                    size="xl"
                  />
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7A56] dark:text-[#6DDBAC]">
                      <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                      Profile {completionPreview.percent}% complete
                    </div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold">
                      Welcome, {name.trim() || 'Explorer'}
                    </h1>
                    <p className="text-sm text-[#515864] dark:text-[#9EA6B6]">
                      @{effectiveUsername || 'user'} · {role.trim() || 'Daily Achiever'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 py-4 border-y border-[#DDE3EE] dark:border-[#2B313E]">
                  <div>
                    <div className="text-xs text-[#515864] dark:text-[#9EA6B6]">Focus</div>
                    <div className="font-mono text-base font-bold tabular-nums mt-0.5">
                      {formatDurationMinutes(dailyFocusTargetMinutes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#515864] dark:text-[#9EA6B6]">Budget cap</div>
                    <div className="font-mono text-base font-bold tabular-nums mt-0.5">
                      {formatCurrency(dailyBudgetCap, currencySymbol)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#515864] dark:text-[#9EA6B6]">Alerts</div>
                    <div className="font-mono text-sm font-bold tabular-nums mt-0.5">
                      {morningReminderTime} / {eveningReminderTime}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B]">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-[#CEE5FF] dark:bg-[#004B73] text-[#00639B] dark:text-[#8ACEFF] flex items-center justify-center shrink-0">
                      <NotificationsActiveRoundedIcon fontSize="small" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold">Enable reminders</div>
                      <div className="text-xs text-[#515864] dark:text-[#9EA6B6]">
                        Unfinished goals, milestones & budget alerts.
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={alertsRequested}
                    onClick={async () => {
                      await onRequestNotificationPermission();
                      setAlertsRequested(true);
                    }}
                  >
                    {alertsRequested ? 'Enabled' : 'Allow'}
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outlined" size="large" onClick={() => setStep(2)} startIcon={<ArrowBackRoundedIcon />}>
                    Back
                  </Button>
                  <Button variant="contained" size="large" onClick={handleFinishWizard} sx={{ flex: 1 }}>
                    Launch Dashboard
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
