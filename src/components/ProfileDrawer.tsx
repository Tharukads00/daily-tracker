import React, { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Input, Segmented, Slider } from 'antd';
import { Camera, RotateCcw } from 'lucide-react';
import type { AvatarStyle, FocusPillar, UserProfile } from '../types/daymark';
import { formatDurationMinutes } from '../utils/dateUtils';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileDrawerProps {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: UserProfile) => void;
  onReplayOnboarding: () => void;
}

const FOCUS_PILLARS: FocusPillar[] = [
  'Work & Projects',
  'Study & Learning',
  'Health & Routine',
  'Financial Discipline',
];

const AVATAR_SWATCHES = ['#1677FF', '#0F766E', '#1D4ED8', '#475569', '#B45309'];

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  open,
  profile,
  onClose,
  onSave,
  onReplayOnboarding,
}) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [focusPillar, setFocusPillar] = useState<FocusPillar>(profile.focusPillar);
  const [dailyFocusTargetMinutes, setDailyFocusTargetMinutes] = useState(
    profile.dailyFocusTargetMinutes
  );
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(profile.avatarStyle);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(profile.avatarDataUrl);
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
    setRole(profile.role);
    setFocusPillar(profile.focusPillar);
    setDailyFocusTargetMinutes(profile.dailyFocusTargetMinutes);
    setAvatarStyle(profile.avatarStyle);
    setAvatarColor(profile.avatarColor);
    setAvatarDataUrl(profile.avatarDataUrl);
    setError('');
  }, [open, profile]);

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

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your display name.');
      return;
    }
    onSave({
      ...profile,
      name: trimmed,
      role: role.trim() || 'Daily Achiever',
      focusPillar,
      dailyFocusTargetMinutes,
      avatarStyle,
      avatarColor,
      avatarDataUrl,
      onboardingCompleted: true,
    });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '86vh' : undefined}
      width={isMobile ? undefined : 440}
      title={<span className="font-display text-base font-semibold">Edit Personal Profile</span>}
      footer={
        <div className="flex items-center gap-3 py-1">
          <Button onClick={onClose} className="min-h-[44px] flex-1">
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit} className="min-h-[44px] flex-[2]">
            Save Profile
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {isMobile && (
          <div className="w-10 h-1 rounded-full bg-[#CBD5E1] dark:bg-[#334155] mx-auto -mt-2 mb-1" />
        )}

        {/* Live Avatar Preview & Style Switch */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <ProfileAvatar
            profile={{ name: name || 'You', avatarStyle, avatarColor, avatarDataUrl }}
            size="xl"
          />
          <Segmented
            value={avatarStyle}
            onChange={(val) => setAvatarStyle(val as AvatarStyle)}
            options={[
              { label: 'Editorial Art', value: 'art' },
              { label: 'Monogram', value: 'monogram' },
              { label: 'Photo', value: 'photo' },
            ]}
          />

          {avatarStyle === 'monogram' && (
            <div className="flex items-center gap-2.5 pt-1">
              {AVATAR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Select color ${swatch}`}
                  onClick={() => setAvatarColor(swatch)}
                  style={{ backgroundColor: swatch }}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    avatarColor === swatch
                      ? 'ring-2 ring-offset-2 ring-[#1677FF] dark:ring-offset-[#131A26] scale-110'
                      : ''
                  }`}
                />
              ))}
            </div>
          )}

          {avatarStyle === 'photo' && (
            <div>
              <Button
                onClick={() => photoInputRef.current?.click()}
                icon={<Camera className="w-4 h-4" />}
                className="min-h-[40px]"
              >
                {avatarDataUrl ? 'Change Local Photo' : 'Choose Photo from Device'}
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

        <div>
          <label className="block text-sm font-medium mb-1.5">Your name</label>
          <Input
            size="large"
            placeholder="e.g., Rukshan De Silva"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
          />
          {error && <p className="mt-1.5 text-xs text-[#DC2626] dark:text-[#F87171]">{error}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Role or daily focus headline</label>
          <Input
            size="large"
            placeholder="e.g., Software Engineer, Graduate Student"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Primary focus pillar</label>
          <div className="grid grid-cols-2 gap-2">
            {FOCUS_PILLARS.map((pillar) => {
              const selected = focusPillar === pillar;
              return (
                <button
                  key={pillar}
                  type="button"
                  onClick={() => setFocusPillar(pillar)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-left text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-[#1677FF] border-[#1677FF] text-white'
                      : 'bg-white dark:bg-[#0B0F17] border-[#E5E7EB] dark:border-[#222C3E] text-[#111827] dark:text-[#F3F6FA] hover:border-[#1677FF]'
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
            <span className="font-medium">Daily focus work goal</span>
            <span className="font-mono tabular-nums font-semibold text-[#1677FF]">
              {formatDurationMinutes(dailyFocusTargetMinutes)}
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

        <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#222C3E]">
          <Button
            block
            onClick={() => {
              onClose();
              onReplayOnboarding();
            }}
            icon={<RotateCcw className="w-4 h-4" />}
            className="min-h-[44px]"
          >
            Replay Initial Setup Screens
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
