import React, { useState } from 'react';
import type { UserProfile } from '../types/daymark';

export const DEFAULT_AVATAR_ART =
  '/src/assets/images/profile_avatar_minimal_1795155438910.jpg';

interface ProfileAvatarProps {
  profile: Pick<UserProfile, 'name' | 'avatarStyle' | 'avatarColor' | 'avatarDataUrl'>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ProfileAvatarProps['size']>, string> = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profile,
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  const imageSrc =
    profile.avatarStyle === 'photo' && profile.avatarDataUrl
      ? profile.avatarDataUrl
      : profile.avatarStyle === 'art'
        ? DEFAULT_AVATAR_ART
        : null;

  if (imageSrc && !imgFailed) {
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden shrink-0 border border-[#E5E7EB] dark:border-[#222C3E] bg-[#EFF2F6] dark:bg-[#1B2434] ${className}`}
      >
        <img
          src={imageSrc}
          alt={profile.name ? `${profile.name} avatar` : 'Profile avatar'}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: profile.avatarColor || '#1677FF' }}
      className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center font-display font-bold text-white tracking-tight select-none ${className}`}
      aria-label={profile.name ? `${profile.name} initials` : 'User initials'}
    >
      {getInitials(profile.name)}
    </div>
  );
};
