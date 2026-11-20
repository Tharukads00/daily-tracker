import React, { useRef, useState } from 'react';
import {
  Button,
  InputNumber,
  Popconfirm,
  Segmented,
  Switch,
} from 'antd';
import {
  Bell,
  BellRing,
  CheckCheck,
  Copy,
  Download,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  NotificationRecord,
  ThemeMode,
  UserProfile,
  UserSettings,
} from '../types/daymark';
import type { BrowserNotificationPermission } from '../services/notifications';
import { formatDurationMinutes, formatTimeFromISO } from '../utils/dateUtils';
import { PWAInstallButton } from './PWAInstallButton';
import { ProfileAvatar } from './ProfileAvatar';

interface AlertsSettingsViewProps {
  profile: UserProfile;
  settings: UserSettings;
  notifications: NotificationRecord[];
  permissionStatus: BrowserNotificationPermission;
  lastSyncedAt: string;
  onEditProfile: () => void;
  onReplayOnboarding: () => void;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onRequestPermission: () => void;
  onSendTestAlert: () => void;
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonText: string) => void;
  onResetEmpty: () => void;
  onRestoreDemoData: () => void;
}

const RN_COMMANDS = `cd react-native-app
npm install
npx expo start --android
# Build installable Android APK:
npx eas build -p android --profile preview`;

export const AlertsSettingsView: React.FC<AlertsSettingsViewProps> = ({
  profile,
  settings,
  notifications,
  permissionStatus,
  lastSyncedAt,
  onEditProfile,
  onReplayOnboarding,
  onUpdateSettings,
  onRequestPermission,
  onSendTestAlert,
  onMarkAllRead,
  onClearNotifications,
  onExportBackup,
  onImportBackup,
  onResetEmpty,
  onRestoreDemoData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Push Notification Rules & Triggers */}
      <section className="lg:col-span-7 space-y-6">
        <div className="rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-[#111827] dark:text-[#F3F6FA]">
                Push Notifications & Reminders
              </h1>
              <p className="text-xs text-[#525B6B] dark:text-[#94A3B8] mt-1">
                Device status: <span className="capitalize font-medium">{permissionStatus}</span> ·
                Works locally offline via Service Worker & in-app alerts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
                <Button
                  type="primary"
                  onClick={onRequestPermission}
                  icon={<BellRing className="w-4 h-4" />}
                  className="min-h-[44px]"
                >
                  Allow Alerts
                </Button>
              )}
              <Button
                onClick={onSendTestAlert}
                icon={<Bell className="w-4 h-4" />}
                className="min-h-[44px]"
              >
                Send Test Alert
              </Button>
            </div>
          </div>

          <div className="divide-y divide-[#E5E7EB] dark:divide-[#222C3E]">
            {/* Master Reminder Switch */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#111827] dark:text-[#F3F6FA]">
                  Scheduled daily & unfinished goal reminders
                </div>
                <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                  Sends morning planning check-in and evening alert if goals remain incomplete.
                </div>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onChange={(checked) => onUpdateSettings({ notificationsEnabled: checked })}
              />
            </div>

            {/* Morning & Evening Time Pickers */}
            <div className="py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#525B6B] dark:text-[#94A3B8] mb-1.5">
                  Morning target check-in
                </label>
                <input
                  type="time"
                  value={settings.morningReminderTime}
                  disabled={!settings.notificationsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ morningReminderTime: e.target.value })
                  }
                  className="w-full h-[44px] px-3 rounded-xl border border-[#D9D9D9] dark:border-[#2C374B] bg-white dark:bg-[#0B0F17] text-sm font-mono tabular-nums text-[#111827] dark:text-[#F3F6FA] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#525B6B] dark:text-[#94A3B8] mb-1.5">
                  Evening unfinished-goal alert
                </label>
                <input
                  type="time"
                  value={settings.eveningReminderTime}
                  disabled={!settings.notificationsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ eveningReminderTime: e.target.value })
                  }
                  className="w-full h-[44px] px-3 rounded-xl border border-[#D9D9D9] dark:border-[#2C374B] bg-white dark:bg-[#0B0F17] text-sm font-mono tabular-nums text-[#111827] dark:text-[#F3F6FA] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Milestone Celebration Switch */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#111827] dark:text-[#F3F6FA]">
                  Instant milestone celebration alerts
                </div>
                <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                  Notify immediately whenever a target hits 100% or all daily goals are done.
                </div>
              </div>
              <Switch
                checked={settings.celebrateMilestones}
                onChange={(checked) => onUpdateSettings({ celebrateMilestones: checked })}
              />
            </div>

            {/* Budget Cap Warning Switch + Threshold */}
            <div className="py-3.5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[#111827] dark:text-[#F3F6FA]">
                    Daily budget limit warnings
                  </div>
                  <div className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                    Warn when spending reaches your warning threshold or crosses 100% of cap.
                  </div>
                </div>
                <Switch
                  checked={settings.budgetWarningsEnabled}
                  onChange={(checked) =>
                    onUpdateSettings({ budgetWarningsEnabled: checked })
                  }
                />
              </div>
              {settings.budgetWarningsEnabled && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                    Early warning trigger threshold
                  </span>
                  <InputNumber
                    min={50}
                    max={95}
                    step={5}
                    value={settings.budgetWarningPercent}
                    onChange={(val) =>
                      onUpdateSettings({ budgetWarningPercent: Number(val) || 80 })
                    }
                    addonAfter="%"
                    className="w-28 font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification History Log */}
        <div className="rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#F3F6FA]">
                Alert History
              </h2>
              <p className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
                {unreadCount} unread · {notifications.length} total recorded
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  size="small"
                  onClick={onMarkAllRead}
                  icon={<CheckCheck className="w-3.5 h-3.5" />}
                  className="min-h-[36px]"
                >
                  Mark read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  size="small"
                  onClick={onClearNotifications}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  className="min-h-[36px]"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-[#525B6B] dark:text-[#94A3B8] py-4">
              No notifications fired yet. Tap “Send Test Alert” above to test push delivery.
            </p>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#222C3E]">
              {notifications.slice(0, 15).map((item) => (
                <div key={item.id} className="py-3 first:pt-1 last:pb-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm ${
                        item.read
                          ? 'font-medium text-[#111827] dark:text-[#F3F6FA]'
                          : 'font-bold text-[#1677FF]'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-[#525B6B] dark:text-[#94A3B8] shrink-0">
                      {formatTimeFromISO(item.triggeredAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[#525B6B] dark:text-[#94A3B8]">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Right Column: Profile, Dark Mode, Offline Storage, PWA Install & React Native Android Project */}
      <section className="lg:col-span-5 space-y-6">
        {/* Personal Profile Card */}
        <div className="rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3.5">
            <ProfileAvatar profile={profile} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#F3F6FA] truncate">
                {profile.name || 'Explorer'}
              </h2>
              <p className="text-xs text-[#525B6B] dark:text-[#94A3B8] truncate">
                {profile.role} · {profile.focusPillar}
              </p>
              <p className="text-xs font-mono tabular-nums text-[#1677FF] mt-0.5">
                Daily focus goal: {formatDurationMinutes(profile.dailyFocusTargetMinutes)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <Button type="primary" onClick={onEditProfile} className="min-h-[42px] flex-1">
              Edit Profile
            </Button>
            <Button onClick={onReplayOnboarding} className="min-h-[42px] flex-1">
              Replay Setup
            </Button>
          </div>
        </div>

        {/* Theme & Appearance */}
        <div className="rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#F3F6FA]">
            Appearance & Dark Mode
          </h2>
          <Segmented
            block
            size="large"
            value={settings.themeMode}
            onChange={(val) => onUpdateSettings({ themeMode: val as ThemeMode })}
            options={[
              {
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5" /> Light
                  </span>
                ),
                value: 'light',
              },
              {
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5" /> Dark
                  </span>
                ),
                value: 'dark',
              },
              { label: 'System', value: 'system' },
            ]}
          />
          <p className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
            Synchronizes Ant Design theme algorithms, OLED dark surfaces, and Android status bar color.
          </p>
        </div>

        {/* Local Offline Sync & Backup */}
        <div className="rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#F3F6FA]">
              Offline Storage & Mobile Install
            </h2>
            <p className="text-xs text-[#525B6B] dark:text-[#94A3B8] mt-1">
              Stored locally in IndexedDB · Last synced{' '}
              <span className="font-mono tabular-nums">{formatTimeFromISO(lastSyncedAt)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <PWAInstallButton />
            <Button
              onClick={onExportBackup}
              icon={<Download className="w-4 h-4" />}
              className="min-h-[44px]"
            >
              Export JSON
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload className="w-4 h-4" />}
              className="min-h-[44px]"
            >
              Import JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#222C3E] flex flex-wrap items-center gap-2">
            <Popconfirm
              title="Clear all goals, sessions, and expenses to start fresh?"
              okText="Start Fresh"
              okType="danger"
              onConfirm={onResetEmpty}
            >
              <Button danger size="small" className="min-h-[38px]">
                Start Fresh (Empty)
              </Button>
            </Popconfirm>
            <Button
              size="small"
              onClick={onRestoreDemoData}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              className="min-h-[38px]"
            >
              Restore 7-Day Sample
            </Button>
          </div>
        </div>

        {/* Native React Native Android Project Reference */}
        <div className="rounded-2xl bg-white dark:bg-[#131A26] border border-[#E5E7EB] dark:border-[#222C3E] p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#1677FF]" />
              <h2 className="font-display text-base font-bold text-[#111827] dark:text-[#F3F6FA]">
                React Native Android Build
              </h2>
            </div>
            <Button
              size="small"
              onClick={handleCopyCommands}
              icon={<Copy className="w-3.5 h-3.5" />}
              className="min-h-[34px]"
            >
              {copiedCmd ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-[#525B6B] dark:text-[#94A3B8]">
            A complete standalone React Native + Expo Android project using{' '}
            <span className="font-mono">@ant-design/react-native</span>,{' '}
            <span className="font-mono">AsyncStorage</span> offline sync, and{' '}
            <span className="font-mono">expo-notifications</span> is included in{' '}
            <span className="font-mono">react-native-app/</span>.
          </p>
          <pre className="p-3 rounded-xl bg-[#F6F7F9] dark:bg-[#0B0F17] border border-[#E5E7EB] dark:border-[#222C3E] text-[11px] font-mono text-[#111827] dark:text-[#F3F6FA] overflow-x-auto leading-relaxed">
            {RN_COMMANDS}
          </pre>
        </div>
      </section>
    </div>
  );
};
