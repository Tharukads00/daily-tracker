import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Drawer,
  IconButton,
  InputAdornment,
  LinearProgress,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import type { AvatarStyle, FocusPillar, UserProfile, UserSettings } from '../types/daymark';
import { formatDurationMinutes } from '../utils/dateUtils';
import { computeProfileCompletion, normalizeUsername } from '../utils/profileUtils';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileDrawerProps {
  open: boolean;
  profile: UserProfile;
  settings: UserSettings;
  onClose: () => void;
  onSave: (updated: UserProfile) => void;
  onReplayOnboarding: () => void;
  onSignOutLocal?: () => void;
}

const FOCUS_PILLARS: FocusPillar[] = [
  'Work & Projects',
  'Study & Learning',
  'Health & Routine',
  'Financial Discipline',
];

const ROLE_PRESETS = ['Engineer', 'Student', 'Founder', 'Designer', 'Freelancer'];
const AVATAR_SWATCHES = ['#00639B', '#0E7A56', '#5944A6', '#4E6075', '#A15C00'];

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  open,
  profile,
  settings,
  onClose,
  onSave,
  onReplayOnboarding,
  onSignOutLocal,
}) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username || '');
  const [role, setRole] = useState(profile.role);
  const [bio, setBio] = useState(profile.bio || '');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [location, setLocation] = useState(profile.location || '');
  const [focusPillar, setFocusPillar] = useState<FocusPillar>(profile.focusPillar);
  const [dailyFocusTargetMinutes, setDailyFocusTargetMinutes] = useState(
    profile.dailyFocusTargetMinutes
  );
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(profile.avatarStyle);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(profile.avatarDataUrl);
  const [avatarCustomized, setAvatarCustomized] = useState(Boolean(profile.avatarCustomized));
  const [error, setError] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    setName(profile.name);
    setUsername(profile.username || normalizeUsername(profile.name, 'user'));
    setRole(profile.role);
    setBio(profile.bio || '');
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
    setLocation(profile.location || '');
    setFocusPillar(profile.focusPillar);
    setDailyFocusTargetMinutes(profile.dailyFocusTargetMinutes);
    setAvatarStyle(profile.avatarStyle);
    setAvatarColor(profile.avatarColor);
    setAvatarDataUrl(profile.avatarDataUrl);
    setAvatarCustomized(Boolean(profile.avatarCustomized));
    setError('');
  }, [open, profile]);

  const draftProfile: UserProfile = useMemo(
    () => ({
      ...profile,
      name: name.trim(),
      username: normalizeUsername(username || name, 'user'),
      role: role.trim() || 'Daily Achiever',
      bio: bio.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      location: location.trim() || undefined,
      focusPillar,
      dailyFocusTargetMinutes,
      avatarStyle,
      avatarColor,
      avatarDataUrl,
      avatarCustomized,
      dailyTargetsConfigured:
        Boolean(profile.dailyTargetsConfigured) ||
        dailyFocusTargetMinutes !== profile.dailyFocusTargetMinutes,
      onboardingCompleted: true,
    }),
    [
      avatarColor,
      avatarCustomized,
      avatarDataUrl,
      avatarStyle,
      bio,
      dailyFocusTargetMinutes,
      email,
      focusPillar,
      location,
      name,
      phone,
      profile,
      role,
      username,
    ]
  );

  const completion = useMemo(
    () => computeProfileCompletion(draftProfile, settings),
    [draftProfile, settings]
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

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }
    onSave({
      ...draftProfile,
      name: trimmed,
      dailyTargetsConfigured: true,
    });
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
                maxHeight: '90vh',
              }
            : {
                width: 460,
                borderTopLeftRadius: 24,
                borderBottomLeftRadius: 24,
              },
        },
      }}
    >
      <div className="flex flex-col h-full max-h-[90vh] md:max-h-screen">
        {/* Header */}
        <div className="px-5 pt-3 pb-3 border-b border-[#DDE3EE] dark:border-[#2B313E]">
          {isMobile && (
            <div className="w-10 h-1 rounded-full bg-[#C4CBD8] dark:bg-[#3F4756] mx-auto mb-3" />
          )}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-[#191C20] dark:text-[#E3E5EC]">
                Personal Profile
              </h2>
              <p className="text-xs text-[#515864] dark:text-[#9EA6B6]">
                {completion.percent}% complete ({completion.completedCount}/{completion.totalCount} tasks)
              </p>
            </div>
            <IconButton onClick={onClose} aria-label="Close drawer" size="small">
              <CloseRoundedIcon />
            </IconButton>
          </div>
          <LinearProgress
            variant="determinate"
            value={completion.percent}
            color={completion.percent >= 100 ? 'success' : 'primary'}
            sx={{ height: 5, mt: 1.5 }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="flex flex-col items-center gap-3">
            <ProfileAvatar
              profile={{ name: name || 'You', avatarStyle, avatarColor, avatarDataUrl }}
              size="xl"
            />
            <ToggleButtonGroup
              exclusive
              size="small"
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
              <div className="flex items-center gap-2.5 pt-0.5">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => photoInputRef.current?.click()}
                  startIcon={<PhotoCameraRoundedIcon />}
                >
                  {avatarDataUrl ? 'Change Photo' : 'Choose Photo'}
                </Button>
                {avatarDataUrl && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setAvatarDataUrl(undefined);
                      setAvatarStyle('monogram');
                    }}
                    aria-label="Remove photo"
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
              placeholder="e.g., Rukshan"
              value={name}
              error={Boolean(error)}
              helperText={error || undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              label="Role or headline"
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
                  className={`min-h-[30px] px-2.5 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
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
            multiline
            minRows={2}
            label="Bio / personal motto"
            placeholder="What drives your daily targets?"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              fullWidth
              size="small"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              label="Phone"
              placeholder="+94 77 ..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <TextField
            fullWidth
            size="small"
            label="Location / City"
            placeholder="e.g., Colombo, Sri Lanka"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#515864] dark:text-[#9EA6B6]">
              Primary focus pillar
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_PILLARS.map((pillar) => {
                const selected = focusPillar === pillar;
                return (
                  <button
                    key={pillar}
                    type="button"
                    onClick={() => setFocusPillar(pillar)}
                    className={`min-h-[42px] px-3 py-2 rounded-2xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      selected
                        ? 'bg-[#CEE5FF] dark:bg-[#004B73] border-[#00639B] dark:border-[#8ACEFF] text-[#001D32] dark:text-[#CEE5FF]'
                        : 'border-[#DDE3EE] dark:border-[#2B313E] text-[#191C20] dark:text-[#E3E5EC]'
                    }`}
                  >
                    {pillar}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Daily focus goal</span>
              <span className="font-mono tabular-nums font-bold text-[#00639B] dark:text-[#8ACEFF]">
                {formatDurationMinutes(dailyFocusTargetMinutes)}
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

          {completion.percent >= 100 && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#D3F4E5]/60 dark:bg-[#0A3B2B]/60 text-xs font-semibold text-[#0E7A56] dark:text-[#6DDBAC]">
              <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
              All profile completion tasks finished!
            </div>
          )}

          <div className="pt-3 border-t border-[#DDE3EE] dark:border-[#2B313E] grid grid-cols-2 gap-2.5">
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                onClose();
                onReplayOnboarding();
              }}
              startIcon={<ReplayRoundedIcon />}
            >
              Setup Wizard
            </Button>
            {onSignOutLocal && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => {
                  onClose();
                  onSignOutLocal();
                }}
                startIcon={<LogoutRoundedIcon />}
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 pb-safe border-t border-[#DDE3EE] dark:border-[#2B313E] flex items-center gap-3">
          <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ flex: 2 }}>
            Save Profile
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
