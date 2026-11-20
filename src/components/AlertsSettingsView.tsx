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
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import type {
  AvatarStyle,
  FocusPillar,
  LocalUserAccount,
  NotificationRecord,
  ThemeMode,
  UserProfile,
  UserSettings,
} from '../types/daymark';
import type { BrowserNotificationPermission } from '../services/notifications';
import { formatDurationMinutes, formatTimeFromISO } from '../utils/dateUtils';
import {
  computeProfileCompletion,
  hashLocalPin,
  normalizeUsername,
  verifyLocalPin,
} from '../utils/profileUtils';
import { PWAInstallButton } from './PWAInstallButton';
import { ProfileAvatar } from './ProfileAvatar';

interface AlertsSettingsViewProps {
  profile: UserProfile;
  settings: UserSettings;
  notifications: NotificationRecord[];
  permissionStatus: BrowserNotificationPermission;
  lastSyncedAt: string;
  cloudUserEmail: string | null;
  cloudSyncing: boolean;
  isSigningIn: boolean;
  localAccounts: LocalUserAccount[];
  activeLocalAccountId: string | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onForceCloudSync: () => void;
  onSaveProfile: (updated: UserProfile) => void;
  onEditProfile: () => void;
  onReplayOnboarding: () => void;
  onSignOutLocal: () => void;
  onSwitchLocalAccount: (accountId: string) => void;
  onAddLocalAccount: (payload: {
    name: string;
    username: string;
    role: string;
    focusPillar: FocusPillar;
    pinHash?: string;
    switchImmediately: boolean;
  }) => void;
  onDeleteLocalAccount: (accountId: string) => void;
  onUpdateActiveLocalPin: (pinHash: string | undefined) => void;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onRequestPermission: () => void;
  onSendTestAlert: () => void;
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonText: string) => void;
  onResetEmpty: () => void;
}

const RN_COMMANDS = `cd react-native-app
npm install
npx expo start --android
# Build installable Android APK:
npx eas build -p android --profile preview`;

const FOCUS_PILLARS: FocusPillar[] = [
  'Work & Projects',
  'Study & Learning',
  'Health & Routine',
  'Financial Discipline',
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

export const AlertsSettingsView: React.FC<AlertsSettingsViewProps> = ({
  profile,
  settings,
  notifications,
  permissionStatus,
  lastSyncedAt,
  cloudUserEmail,
  cloudSyncing,
  isSigningIn,
  localAccounts,
  activeLocalAccountId,
  onGoogleSignIn,
  onGoogleSignOut,
  onForceCloudSync,
  onSaveProfile,
  onEditProfile,
  onReplayOnboarding,
  onSignOutLocal,
  onSwitchLocalAccount,
  onAddLocalAccount,
  onDeleteLocalAccount,
  onUpdateActiveLocalPin,
  onUpdateSettings,
  onRequestPermission,
  onSendTestAlert,
  onMarkAllRead,
  onClearNotifications,
  onExportBackup,
  onImportBackup,
  onResetEmpty,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Inline Profile Details Editor state
  const [editingProfileInline, setEditingProfileInline] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftUsername, setDraftUsername] = useState(
    profile.username || normalizeUsername(profile.name, 'user')
  );
  const [draftRole, setDraftRole] = useState(profile.role);
  const [draftBio, setDraftBio] = useState(profile.bio || '');
  const [draftEmail, setDraftEmail] = useState(profile.email || '');
  const [draftPhone, setDraftPhone] = useState(profile.phone || '');
  const [draftLocation, setDraftLocation] = useState(profile.location || '');
  const [draftPillar, setDraftPillar] = useState<FocusPillar>(profile.focusPillar);
  const [draftFocusMinutes, setDraftFocusMinutes] = useState<number>(
    profile.dailyFocusTargetMinutes
  );
  const [draftAvatarStyle, setDraftAvatarStyle] = useState<AvatarStyle>(profile.avatarStyle);
  const [draftAvatarColor, setDraftAvatarColor] = useState<string>(profile.avatarColor);
  const [draftAvatarDataUrl, setDraftAvatarDataUrl] = useState<string | undefined>(
    profile.avatarDataUrl
  );
  const [draftAvatarCustomized, setDraftAvatarCustomized] = useState<boolean>(
    Boolean(profile.avatarCustomized)
  );
  const [profileError, setProfileError] = useState('');

  // Local PIN Dialog state
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [newPinValue, setNewPinValue] = useState('');
  const [pinDialogError, setPinDialogError] = useState('');

  // Add Local User Dialog state
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserHandle, setNewUserHandle] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserPillar, setNewUserPillar] = useState<FocusPillar>('Work & Projects');
  const [newUserUsePin, setNewUserUsePin] = useState(false);
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserError, setNewUserError] = useState('');

  // Switch Locked User PIN Verification Dialog
  const [switchTarget, setSwitchTarget] = useState<LocalUserAccount | null>(null);
  const [switchPin, setSwitchPin] = useState('');
  const [switchPinError, setSwitchPinError] = useState('');

  // Delete Local User Confirmation Dialog
  const [deleteTarget, setDeleteTarget] = useState<LocalUserAccount | null>(null);

  useEffect(() => {
    setDraftName(profile.name);
    setDraftUsername(profile.username || normalizeUsername(profile.name, 'user'));
    setDraftRole(profile.role);
    setDraftBio(profile.bio || '');
    setDraftEmail(profile.email || '');
    setDraftPhone(profile.phone || '');
    setDraftLocation(profile.location || '');
    setDraftPillar(profile.focusPillar);
    setDraftFocusMinutes(profile.dailyFocusTargetMinutes);
    setDraftAvatarStyle(profile.avatarStyle);
    setDraftAvatarColor(profile.avatarColor);
    setDraftAvatarDataUrl(profile.avatarDataUrl);
    setDraftAvatarCustomized(Boolean(profile.avatarCustomized));
  }, [profile]);

  const activeAccount = useMemo(
    () => localAccounts.find((a) => a.id === activeLocalAccountId) || null,
    [localAccounts, activeLocalAccountId]
  );

  const otherAccounts = useMemo(
    () => localAccounts.filter((a) => a.id !== activeLocalAccountId),
    [localAccounts, activeLocalAccountId]
  );

  const completion = useMemo(
    () => computeProfileCompletion(profile, settings),
    [profile, settings]
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftAvatarDataUrl(reader.result);
        setDraftAvatarStyle('photo');
        setDraftAvatarCustomized(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveInlineProfile = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setProfileError('Display name is required.');
      return;
    }
    setProfileError('');
    onSaveProfile({
      ...profile,
      name: trimmed,
      username: normalizeUsername(draftUsername || trimmed, 'user'),
      role: draftRole.trim() || 'Daily Achiever',
      bio: draftBio.trim() || undefined,
      email: draftEmail.trim() || undefined,
      phone: draftPhone.trim() || undefined,
      location: draftLocation.trim() || undefined,
      focusPillar: draftPillar,
      dailyFocusTargetMinutes: draftFocusMinutes,
      avatarStyle: draftAvatarStyle,
      avatarColor: draftAvatarColor,
      avatarDataUrl: draftAvatarDataUrl,
      avatarCustomized: draftAvatarCustomized,
      dailyTargetsConfigured: true,
      onboardingCompleted: true,
    });
    setEditingProfileInline(false);
  };

  const handleCreateLocalUser = (switchImmediately: boolean) => {
    const trimmed = newUserName.trim();
    if (!trimmed) {
      setNewUserError('Enter a name for the new local user.');
      return;
    }
    if (newUserUsePin && !/^\d{4}$/.test(newUserPin.trim())) {
      setNewUserError('Passcode must be exactly 4 digits.');
      return;
    }
    const handle = normalizeUsername(newUserHandle || trimmed, 'user');
    onAddLocalAccount({
      name: trimmed,
      username: handle,
      role: newUserRole.trim() || 'Daily Achiever',
      focusPillar: newUserPillar,
      pinHash: newUserUsePin ? hashLocalPin(newUserPin.trim()) : undefined,
      switchImmediately,
    });
    setAddUserOpen(false);
    setNewUserName('');
    setNewUserHandle('');
    setNewUserRole('');
    setNewUserPillar('Work & Projects');
    setNewUserUsePin(false);
    setNewUserPin('');
    setNewUserError('');
  };

  const handleRequestSwitchUser = (acc: LocalUserAccount) => {
    if (!acc.pinHash) {
      onSwitchLocalAccount(acc.id);
      return;
    }
    setSwitchTarget(acc);
    setSwitchPin('');
    setSwitchPinError('');
  };

  const handleConfirmSwitchPin = () => {
    if (!switchTarget) return;
    if (!verifyLocalPin(switchPin, switchTarget.pinHash)) {
      setSwitchPinError('Incorrect 4-digit passcode.');
      return;
    }
    const targetId = switchTarget.id;
    setSwitchTarget(null);
    setSwitchPin('');
    setSwitchPinError('');
    onSwitchLocalAccount(targetId);
  };

  const handleSavePin = () => {
    if (!/^\d{4}$/.test(newPinValue.trim())) {
      setPinDialogError('Enter exactly 4 digits.');
      return;
    }
    onUpdateActiveLocalPin(hashLocalPin(newPinValue.trim()));
    setPinDialogOpen(false);
    setNewPinValue('');
    setPinDialogError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportBackup(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(RN_COMMANDS);
      setCopiedCmd(true);
      window.setTimeout(() => setCopiedCmd(false), 1800);
    } catch {
      setCopiedCmd(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const showPermissionCta =
    permissionStatus !== 'granted' && permissionStatus !== 'unsupported';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
      {/* Left Column: Profile Details Editor, Local Users & Preferences */}
      <section className="lg:col-span-7 space-y-4 sm:space-y-6">
        {/* Card 1: Personal Profile & Full Inline Details Updating */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <ProfileAvatar
                profile={
                  editingProfileInline
                    ? {
                        name: draftName || 'You',
                        avatarStyle: draftAvatarStyle,
                        avatarColor: draftAvatarColor,
                        avatarDataUrl: draftAvatarDataUrl,
                      }
                    : profile
                }
                size="lg"
              />
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-xl font-bold truncate">
                  {profile.name || 'Explorer'}
                </h1>
                <p className="text-xs text-[#515864] dark:text-[#9EA6B6] truncate">
                  {profile.username ? `@${profile.username} · ` : ''}
                  {profile.role}
                </p>
                {profile.bio && !editingProfileInline && (
                  <p className="text-xs text-[#191C20] dark:text-[#E3E5EC] mt-1 line-clamp-2">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            <Button
              size="small"
              variant={editingProfileInline ? 'outlined' : 'contained'}
              onClick={() => setEditingProfileInline((v) => !v)}
              startIcon={<EditRoundedIcon sx={{ fontSize: 16 }} />}
            >
              {editingProfileInline ? 'Close' : 'Edit'}
            </Button>
          </div>

          {/* Profile Completion Progress & Task Checklist */}
          <div className="p-3.5 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Profile completion</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  completion.percent >= 100
                    ? 'text-[#0E7A56] dark:text-[#6DDBAC]'
                    : 'text-[#00639B] dark:text-[#8ACEFF]'
                }`}
              >
                {completion.percent}% ({completion.completedCount}/{completion.totalCount})
              </span>
            </div>
            <LinearProgress
              variant="determinate"
              value={completion.percent}
              color={completion.percent >= 100 ? 'success' : 'primary'}
              sx={{ height: 6 }}
            />
            <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 pt-0.5">
              {completion.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setEditingProfileInline(true)}
                  className={`inline-flex items-center gap-1 text-xs cursor-pointer ${
                    task.completed
                      ? 'text-[#0E7A56] dark:text-[#6DDBAC] font-medium'
                      : 'text-[#515864] dark:text-[#9EA6B6] font-semibold hover:text-[#00639B] dark:hover:text-[#8ACEFF]'
                  }`}
                >
                  {task.completed ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 14 }} />
                  )}
                  {task.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Details Row when not editing inline */}
          {!editingProfileInline ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <div className="text-[#515864] dark:text-[#9EA6B6]">Focus Pillar</div>
                  <div className="font-semibold mt-0.5 truncate">{profile.focusPillar}</div>
                </div>
                <div>
                  <div className="text-[#515864] dark:text-[#9EA6B6]">Daily Focus Goal</div>
                  <div className="font-mono font-bold tabular-nums text-[#00639B] dark:text-[#8ACEFF] mt-0.5">
                    {formatDurationMinutes(profile.dailyFocusTargetMinutes)}
                  </div>
                </div>
                <div>
                  <div className="text-[#515864] dark:text-[#9EA6B6]">Location / Contact</div>
                  <div className="font-semibold mt-0.5 truncate">
                    {profile.location || profile.email || profile.phone || 'Not added yet'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#DDE3EE] dark:border-[#2B313E]">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setEditingProfileInline(true)}
                  startIcon={<EditRoundedIcon sx={{ fontSize: 16 }} />}
                >
                  Update Profile Details
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setNewPinValue('');
                    setPinDialogError('');
                    setPinDialogOpen(true);
                  }}
                  startIcon={
                    activeAccount?.pinHash ? (
                      <LockRoundedIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <LockOpenRoundedIcon sx={{ fontSize: 16 }} />
                    )
                  }
                >
                  {activeAccount?.pinHash ? 'Manage Local PIN' : 'Set Local PIN'}
                </Button>
                <Button size="small" onClick={onEditProfile}>
                  Quick Sheet
                </Button>
                <Button size="small" onClick={onReplayOnboarding}>
                  Setup Wizard
                </Button>
              </div>
            </div>
          ) : (
            /* FULL INLINE PROFILE DETAILS FORM */
            <div className="space-y-4 pt-2 border-t border-[#DDE3EE] dark:border-[#2B313E]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={draftAvatarStyle}
                  onChange={(_, val) => {
                    if (val) {
                      setDraftAvatarStyle(val as AvatarStyle);
                      setDraftAvatarCustomized(true);
                    }
                  }}
                >
                  <ToggleButton value="art">Art</ToggleButton>
                  <ToggleButton value="monogram">Initials</ToggleButton>
                  <ToggleButton value="photo">Photo</ToggleButton>
                </ToggleButtonGroup>

                {draftAvatarStyle === 'monogram' && (
                  <div className="flex items-center gap-2">
                    {AVATAR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        aria-label={`Select color ${swatch}`}
                        onClick={() => {
                          setDraftAvatarColor(swatch);
                          setDraftAvatarCustomized(true);
                        }}
                        style={{ backgroundColor: swatch }}
                        className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                          draftAvatarColor === swatch
                            ? 'ring-2 ring-offset-2 ring-[#00639B] dark:ring-[#8ACEFF] dark:ring-offset-[#1A1D24] scale-110'
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                )}

                {draftAvatarStyle === 'photo' && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => photoInputRef.current?.click()}
                      startIcon={<PhotoCameraRoundedIcon />}
                    >
                      {draftAvatarDataUrl ? 'Change' : 'Upload'}
                    </Button>
                    {draftAvatarDataUrl && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setDraftAvatarDataUrl(undefined);
                          setDraftAvatarStyle('monogram');
                        }}
                        aria-label="Remove profile photo"
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  fullWidth
                  size="small"
                  label="Full name"
                  value={draftName}
                  error={Boolean(profileError)}
                  helperText={profileError || undefined}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    if (profileError) setProfileError('');
                  }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Username"
                  value={draftUsername}
                  onChange={(e) => setDraftUsername(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">@</InputAdornment>,
                    },
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  fullWidth
                  size="small"
                  label="Role / Headline"
                  placeholder="e.g., Mobile Developer"
                  value={draftRole}
                  onChange={(e) => setDraftRole(e.target.value)}
                />
                <FormControl fullWidth size="small">
                  <InputLabel id="settings-focus-pillar">Focus pillar</InputLabel>
                  <Select
                    labelId="settings-focus-pillar"
                    label="Focus pillar"
                    value={draftPillar}
                    onChange={(e) => setDraftPillar(e.target.value as FocusPillar)}
                  >
                    {FOCUS_PILLARS.map((pillar) => (
                      <MenuItem key={pillar} value={pillar}>
                        {pillar}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Bio / Personal Motto"
                placeholder="Write a short daily intention or bio"
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextField
                  fullWidth
                  size="small"
                  label="Email"
                  type="email"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Phone"
                  value={draftPhone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="City / Location"
                  value={draftLocation}
                  onChange={(e) => setDraftLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#515864] dark:text-[#9EA6B6]">
                    Daily focus target
                  </span>
                  <span className="font-mono font-bold tabular-nums text-[#00639B] dark:text-[#8ACEFF]">
                    {formatDurationMinutes(draftFocusMinutes)} / day
                  </span>
                </div>
                <Slider
                  min={30}
                  max={480}
                  step={15}
                  value={draftFocusMinutes}
                  onChange={(_, val) => setDraftFocusMinutes(Number(val))}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setEditingProfileInline(false)}
                >
                  Discard
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveInlineProfile}
                  startIcon={<SaveRoundedIcon />}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Card 2: Local Users, Add Account & Sign Out */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-2xl bg-[#E6DEFF] dark:bg-[#3A2E66] text-[#5944A6] dark:text-[#CBBEFF] inline-flex items-center justify-center shrink-0">
                <GroupRoundedIcon />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-bold">
                  Local Users & Sign Out
                </h2>
                <p className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                  {localAccounts.length}{' '}
                  {localAccounts.length === 1 ? 'account' : 'accounts'} saved privately on this device
                </p>
              </div>
            </div>

            <Button
              size="small"
              variant="contained"
              onClick={() => {
                setNewUserError('');
                setAddUserOpen(true);
              }}
              startIcon={<PersonAddAlt1RoundedIcon sx={{ fontSize: 16 }} />}
            >
              Add User
            </Button>
          </div>

          {/* Active Signed-In Local User Row */}
          {activeAccount && (
            <div className="p-3.5 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ProfileAvatar
                  profile={{
                    name: activeAccount.name,
                    avatarStyle: activeAccount.avatarStyle,
                    avatarColor: activeAccount.avatarColor,
                    avatarDataUrl: activeAccount.avatarDataUrl,
                  }}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate flex items-center gap-1.5">
                    <span>{activeAccount.name}</span>
                    {activeAccount.pinHash && (
                      <LockRoundedIcon sx={{ fontSize: 14 }} className="text-[#00639B] dark:text-[#8ACEFF]" />
                    )}
                  </div>
                  <div className="text-xs text-[#0E7A56] dark:text-[#6DDBAC] font-medium truncate">
                    Signed in locally · @{activeAccount.username}
                  </div>
                </div>
              </div>

              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={onSignOutLocal}
                startIcon={<LogoutRoundedIcon sx={{ fontSize: 16 }} />}
              >
                Sign Out
              </Button>
            </div>
          )}

          {/* Other Saved Local Accounts */}
          {otherAccounts.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#515864] dark:text-[#9EA6B6]">
                Switch local user
              </div>
              <div className="divide-y divide-[#DDE3EE] dark:divide-[#2B313E]">
                {otherAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="py-2.5 flex items-center justify-between gap-3 first:pt-1 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProfileAvatar
                        profile={{
                          name: acc.name,
                          avatarStyle: acc.avatarStyle,
                          avatarColor: acc.avatarColor,
                          avatarDataUrl: acc.avatarDataUrl,
                        }}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate flex items-center gap-1">
                          <span>{acc.name}</span>
                          {acc.pinHash && (
                            <LockRoundedIcon sx={{ fontSize: 13 }} className="text-[#515864] dark:text-[#9EA6B6]" />
                          )}
                        </div>
                        <div className="text-xs text-[#515864] dark:text-[#9EA6B6] truncate">
                          @{acc.username} · {acc.role}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleRequestSwitchUser(acc)}
                        startIcon={<SwapHorizRoundedIcon sx={{ fontSize: 16 }} />}
                      >
                        Switch
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(acc)}
                        aria-label={`Remove ${acc.name}`}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
              Add additional local profiles (e.g., Personal, Work, or family members) — each profile keeps its own private offline goals, focus sessions, and budget.
            </p>
          )}
        </Card>

        {/* Card 3: Reminders & Alerts */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#CEE5FF] dark:bg-[#004B73] text-[#00639B] dark:text-[#8ACEFF] inline-flex items-center justify-center shrink-0">
              <NotificationsActiveRoundedIcon />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base sm:text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
                Reminders & Alerts
              </h2>
              <p className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                Permission: <span className="capitalize font-semibold">{permissionStatus}</span> ·
                Works offline locally
              </p>
            </div>
          </div>

          <div className={`grid gap-2.5 ${showPermissionCta ? 'grid-cols-2' : 'grid-cols-1 sm:w-fit'}`}>
            {showPermissionCta && (
              <Button
                variant="contained"
                onClick={onRequestPermission}
                startIcon={<NotificationsActiveRoundedIcon />}
              >
                Allow Alerts
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={onSendTestAlert}
              startIcon={<NotificationsRoundedIcon />}
            >
              Test Alert
            </Button>
          </div>

          <div className="divide-y divide-[#DDE3EE] dark:divide-[#2B313E]">
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Daily & unfinished reminders</div>
                <div className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                  Morning check-in and evening alert for incomplete targets.
                </div>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onChange={(e) => onUpdateSettings({ notificationsEnabled: e.target.checked })}
              />
            </div>

            <div className="py-3.5 grid grid-cols-2 gap-3">
              <TextField
                size="small"
                type="time"
                label="Morning check-in"
                disabled={!settings.notificationsEnabled}
                value={settings.morningReminderTime}
                onChange={(e) => onUpdateSettings({ morningReminderTime: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                type="time"
                label="Evening alert"
                disabled={!settings.notificationsEnabled}
                value={settings.eveningReminderTime}
                onChange={(e) => onUpdateSettings({ eveningReminderTime: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </div>

            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">100% Milestone celebrations</div>
                <div className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                  Instant alert when a goal completes.
                </div>
              </div>
              <Switch
                checked={settings.celebrateMilestones}
                onChange={(e) => onUpdateSettings({ celebrateMilestones: e.target.checked })}
              />
            </div>

            <div className="py-3.5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Daily budget limit warnings</div>
                  <div className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                    Warn before and when crossing your daily cap.
                  </div>
                </div>
                <Switch
                  checked={settings.budgetWarningsEnabled}
                  onChange={(e) => onUpdateSettings({ budgetWarningsEnabled: e.target.checked })}
                />
              </div>
              {settings.budgetWarningsEnabled && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[#515864] dark:text-[#9EA6B6]">
                    Early warning threshold
                  </span>
                  <TextField
                    size="small"
                    type="number"
                    value={settings.budgetWarningPercent}
                    onChange={(e) =>
                      onUpdateSettings({
                        budgetWarningPercent: Math.max(50, Math.min(95, Number(e.target.value) || 80)),
                      })
                    }
                    sx={{ width: 100 }}
                    slotProps={{
                      input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                      htmlInput: { min: 50, max: 95, step: 5 },
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Alert History */}
        <Card className="p-4 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold">Alert History</h2>
              <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
                {unreadCount} unread · {notifications.length} total
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <Button size="small" onClick={onMarkAllRead} startIcon={<DoneAllRoundedIcon />}>
                  Read all
                </Button>
              )}
              {notifications.length > 0 && (
                <Button size="small" onClick={onClearNotifications} startIcon={<DeleteSweepRoundedIcon />}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-[#515864] dark:text-[#9EA6B6] py-2">
              No notifications yet. Reminders and milestone alerts appear here.
            </p>
          ) : (
            <div className="divide-y divide-[#DDE3EE] dark:divide-[#2B313E]">
              {notifications.slice(0, 15).map((item) => (
                <div key={item.id} className="py-3 first:pt-1 last:pb-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm ${
                        item.read
                          ? 'font-medium text-[#191C20] dark:text-[#E3E5EC]'
                          : 'font-bold text-[#00639B] dark:text-[#8ACEFF]'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-[#515864] dark:text-[#9EA6B6] shrink-0">
                      {formatTimeFromISO(item.triggeredAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Right Column: Daily Preferences, Cloud Sync, Appearance & Storage */}
      <section className="lg:col-span-5 space-y-4 sm:space-y-6">
        {/* Daily Targets & Preferences */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#D3F4E5] dark:bg-[#0A3B2B] text-[#0E7A56] dark:text-[#6DDBAC] inline-flex items-center justify-center shrink-0">
              <TuneRoundedIcon />
            </span>
            <div>
              <h2 className="font-display text-base font-bold">Daily Targets & Preferences</h2>
              <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
                Configure budget cap, currency & streak criteria
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Daily budget cap"
              value={settings.dailyBudgetCap}
              onChange={(e) =>
                onUpdateSettings({ dailyBudgetCap: Math.max(1, Number(e.target.value) || 1) })
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">{settings.currencySymbol}</InputAdornment>
                  ),
                },
                htmlInput: { min: 1 },
              }}
            />
            <FormControl fullWidth size="small">
              <InputLabel id="settings-currency-select">Currency</InputLabel>
              <Select
                labelId="settings-currency-select"
                label="Currency"
                value={settings.currencySymbol}
                onChange={(e) => onUpdateSettings({ currencySymbol: String(e.target.value) })}
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#515864] dark:text-[#9EA6B6]">
                Goal streak pass threshold
              </span>
              <span className="font-mono font-bold tabular-nums text-[#00639B] dark:text-[#8ACEFF]">
                {settings.dailyGoalSuccessThreshold}%
              </span>
            </div>
            <Slider
              min={50}
              max={100}
              step={5}
              value={settings.dailyGoalSuccessThreshold}
              onChange={(_, val) => onUpdateSettings({ dailyGoalSuccessThreshold: Number(val) })}
            />
          </div>
        </Card>

        {/* Cloud Sync */}
        <Card className="p-4 sm:p-6 space-y-3.5">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#CEE5FF] dark:bg-[#004B73] text-[#00639B] dark:text-[#8ACEFF] inline-flex items-center justify-center shrink-0">
              <CloudDoneRoundedIcon />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold">Cloud Sync</h2>
              <p className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
                {cloudUserEmail
                  ? `Signed in as ${cloudUserEmail}`
                  : 'Sign in with Google to back up your data across devices.'}
              </p>
            </div>
          </div>

          {cloudUserEmail ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="contained"
                disabled={cloudSyncing}
                onClick={onForceCloudSync}
                startIcon={<SyncRoundedIcon />}
              >
                {cloudSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button
                variant="outlined"
                onClick={onGoogleSignOut}
                startIcon={<LogoutRoundedIcon />}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              variant="contained"
              fullWidth
              disabled={isSigningIn}
              onClick={onGoogleSignIn}
              startIcon={<CloudDoneRoundedIcon />}
            >
              {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
            </Button>
          )}
        </Card>

        {/* Theme */}
        <Card className="p-4 sm:p-6 space-y-3">
          <h2 className="font-display text-base font-bold">Appearance</h2>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={settings.themeMode}
            onChange={(_, val) => {
              if (val) onUpdateSettings({ themeMode: val as ThemeMode });
            }}
          >
            <ToggleButton value="light">
              <span className="inline-flex items-center gap-1.5">
                <LightModeRoundedIcon sx={{ fontSize: 16 }} /> Light
              </span>
            </ToggleButton>
            <ToggleButton value="dark">
              <span className="inline-flex items-center gap-1.5">
                <DarkModeRoundedIcon sx={{ fontSize: 16 }} /> Dark
              </span>
            </ToggleButton>
            <ToggleButton value="system">System</ToggleButton>
          </ToggleButtonGroup>
        </Card>

        {/* Offline Storage & Backup */}
        <Card className="p-4 sm:p-6 space-y-3.5">
          <div>
            <h2 className="font-display text-base font-bold">Offline Data & Install</h2>
            <p className="text-xs text-[#515864] dark:text-[#9EA6B6] mt-0.5">
              Saved locally · Last synced{' '}
              <span className="font-mono tabular-nums">{formatTimeFromISO(lastSyncedAt)}</span>
            </p>
          </div>

          <div className="space-y-2.5">
            <PWAInstallButton fullWidth />
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outlined"
                onClick={onExportBackup}
                startIcon={<DownloadRoundedIcon />}
              >
                Export
              </Button>
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<UploadRoundedIcon />}
              >
                Import
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="pt-3 border-t border-[#DDE3EE] dark:border-[#2B313E]">
            <Button
              variant="outlined"
              color="error"
              fullWidth
              size="small"
              onClick={() => setConfirmResetOpen(true)}
            >
              Reset Current User Data
            </Button>
          </div>
        </Card>

        {/* Native Android Build Reference */}
        <Card className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PhoneAndroidRoundedIcon className="text-[#00639B] dark:text-[#8ACEFF]" fontSize="small" />
              <h2 className="font-display text-base font-bold">Android APK Project</h2>
            </div>
            <Button size="small" onClick={handleCopyCommands} startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 15 }} />}>
              {copiedCmd ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="p-3 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B] text-[11px] font-mono overflow-x-auto leading-relaxed">
            {RN_COMMANDS}
          </pre>
        </Card>
      </section>

      {/* Dialog 1: Add Local User */}
      <Dialog open={addUserOpen} onClose={() => setAddUserOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-display font-bold">Add Local User</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <div className="space-y-3.5">
            <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
              Each local user has an isolated offline workspace on this device with zero shared data.
            </p>
            <TextField
              fullWidth
              size="small"
              label="Full name"
              placeholder="e.g., Alex"
              value={newUserName}
              error={Boolean(newUserError)}
              helperText={newUserError || undefined}
              onChange={(e) => {
                setNewUserName(e.target.value);
                if (newUserError) setNewUserError('');
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Username"
              placeholder={normalizeUsername(newUserName || 'alex', 'user')}
              value={newUserHandle}
              onChange={(e) => setNewUserHandle(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">@</InputAdornment>,
                },
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Role (optional)"
              placeholder="e.g., Designer, Student"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
            />
            <FormControl fullWidth size="small">
              <InputLabel id="new-user-pillar">Primary focus</InputLabel>
              <Select
                labelId="new-user-pillar"
                label="Primary focus"
                value={newUserPillar}
                onChange={(e) => setNewUserPillar(e.target.value as FocusPillar)}
              >
                {FOCUS_PILLARS.map((pillar) => (
                  <MenuItem key={pillar} value={pillar}>
                    {pillar}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <div className="p-3 rounded-2xl bg-[#F0F4FA] dark:bg-[#1E222B] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">4-digit local sign-in PIN</span>
                <Switch
                  size="small"
                  checked={newUserUsePin}
                  onChange={(e) => setNewUserUsePin(e.target.checked)}
                />
              </div>
              {newUserUsePin && (
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  placeholder="••••"
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  slotProps={{
                    htmlInput: { inputMode: 'numeric', maxLength: 4 },
                  }}
                />
              )}
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
          <Button variant="text" onClick={() => setAddUserOpen(false)}>
            Cancel
          </Button>
          <Button variant="outlined" onClick={() => handleCreateLocalUser(false)}>
            Add Only
          </Button>
          <Button variant="contained" onClick={() => handleCreateLocalUser(true)}>
            Create & Switch
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Manage Active User Local PIN */}
      <Dialog open={pinDialogOpen} onClose={() => setPinDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-display font-bold">
          {activeAccount?.pinHash ? 'Manage Local PIN' : 'Set 4-Digit Local PIN'}
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <div className="space-y-3">
            <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
              Protect this local profile when signing in or switching accounts on this device.
            </p>
            <TextField
              fullWidth
              size="small"
              type="password"
              label="New 4-digit PIN"
              placeholder="••••"
              value={newPinValue}
              error={Boolean(pinDialogError)}
              helperText={pinDialogError || undefined}
              onChange={(e) => {
                setNewPinValue(e.target.value.replace(/\D/g, '').slice(0, 4));
                if (pinDialogError) setPinDialogError('');
              }}
              slotProps={{
                htmlInput: { inputMode: 'numeric', maxLength: 4 },
              }}
            />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          {activeAccount?.pinHash && (
            <Button
              color="error"
              onClick={() => {
                onUpdateActiveLocalPin(undefined);
                setPinDialogOpen(false);
              }}
            >
              Remove PIN
            </Button>
          )}
          <Button variant="outlined" onClick={() => setPinDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSavePin}>
            Save PIN
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 3: Verify PIN to Switch Local User */}
      <Dialog open={Boolean(switchTarget)} onClose={() => setSwitchTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-display font-bold">
          Unlock {switchTarget?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField
            fullWidth
            size="small"
            type="password"
            label="4-digit passcode"
            placeholder="••••"
            value={switchPin}
            error={Boolean(switchPinError)}
            helperText={switchPinError || 'Enter this user’s local passcode to switch workspaces.'}
            onChange={(e) => {
              setSwitchPin(e.target.value.replace(/\D/g, '').slice(0, 4));
              if (switchPinError) setSwitchPinError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmSwitchPin();
            }}
            slotProps={{
              htmlInput: { inputMode: 'numeric', maxLength: 4 },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setSwitchTarget(null)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirmSwitchPin}>
            Switch User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 4: Confirm Delete Local Account */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-display font-bold">
          Remove local account?
        </DialogTitle>
        <DialogContent>
          <p className="text-sm text-[#515864] dark:text-[#9EA6B6]">
            Remove “{deleteTarget?.name}” (@{deleteTarget?.username}) and its local offline goals,
            sessions, and expenses from this device?
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (deleteTarget) onDeleteLocalAccount(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 5: Reset Current User Local Data */}
      <Dialog open={confirmResetOpen} onClose={() => setConfirmResetOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-display font-bold">Reset current user data?</DialogTitle>
        <DialogContent>
          <p className="text-sm text-[#515864] dark:text-[#9EA6B6]">
            This clears all goals, focus sessions, expenses, and alert history for {profile.name || 'this user'} on this device.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setConfirmResetOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              onResetEmpty();
              setConfirmResetOpen(false);
            }}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
