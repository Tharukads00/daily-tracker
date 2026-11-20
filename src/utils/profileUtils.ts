import type {
  ProfileCompletionTask,
  UserProfile,
  UserSettings,
} from '../types/daymark';

export function normalizeUsername(raw: string, fallback = 'user'): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 24);
  return cleaned || fallback;
}

export function hashLocalPin(pin: string): string {
  const normalized = pin.trim();
  if (!normalized) return '';
  let hash = 2166136261;
  const salted = `daymark_local_pin::${normalized}::v1`;
  for (let i = 0; i < salted.length; i += 1) {
    hash ^= salted.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `pin_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function verifyLocalPin(pin: string, pinHash?: string): boolean {
  if (!pinHash) return true;
  return hashLocalPin(pin) === pinHash;
}

export interface ProfileCompletionSummary {
  percent: number;
  completedCount: number;
  totalCount: number;
  tasks: ProfileCompletionTask[];
}

export function computeProfileCompletion(
  profile: UserProfile,
  settings: UserSettings
): ProfileCompletionSummary {
  const hasName = Boolean(profile.name && profile.name.trim().length >= 2 && profile.name !== 'Explorer');
  const hasUsername = Boolean(profile.username && profile.username.trim().length >= 2);
  const hasCustomRole = Boolean(
    profile.role && profile.role.trim().length > 0 && profile.role.trim() !== 'Daily Achiever'
  );
  const hasBio = Boolean(profile.bio && profile.bio.trim().length >= 4);
  const hasContact = Boolean(
    (profile.email && profile.email.trim().length > 0) ||
      (profile.phone && profile.phone.trim().length > 0) ||
      (profile.location && profile.location.trim().length > 0)
  );
  const hasAvatar = Boolean(
    profile.avatarCustomized ||
      (profile.avatarStyle === 'photo' && Boolean(profile.avatarDataUrl)) ||
      profile.avatarStyle === 'monogram' ||
      profile.avatarColor !== '#00639B'
  );
  const hasTargets = Boolean(
    profile.dailyTargetsConfigured ||
      profile.dailyFocusTargetMinutes !== 150 ||
      settings.dailyBudgetCap !== 45 ||
      settings.currencySymbol !== '$'
  );

  const tasks: ProfileCompletionTask[] = [
    {
      id: 'identity',
      label: 'Name & @handle',
      description: 'Set your display name and local username',
      completed: hasName && hasUsername,
    },
    {
      id: 'role_bio',
      label: 'Role & bio',
      description: 'Add your headline role and a short personal motto',
      completed: hasCustomRole && hasBio,
    },
    {
      id: 'contact',
      label: 'Contact or city',
      description: 'Add email, phone, or location to your profile card',
      completed: hasContact,
    },
    {
      id: 'avatar',
      label: 'Personalize avatar',
      description: 'Choose initials color, art badge, or upload a photo',
      completed: hasAvatar,
    },
    {
      id: 'targets',
      label: 'Focus & budget targets',
      description: 'Calibrate your daily focus goal and spending cap',
      completed: hasTargets,
    },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  return {
    percent,
    completedCount,
    totalCount,
    tasks,
  };
}
