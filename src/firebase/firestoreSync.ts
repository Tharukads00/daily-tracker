import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  DailyGoal,
  DaymarkStoreState,
  ExpenseEntry,
  NotificationRecord,
  UserProfile,
  UserSettings,
  WorkSession,
} from '../types/daymark';
import { db, handleFirestoreError, OperationType } from './firebase';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const TIME_HHMM_RE = /^[0-2][0-9]:[0-5][0-9]$/;
const DATE_KEY_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const VALID_ID_RE = /^[a-zA-Z0-9_-]+$/;

function sanitizeId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  if (cleaned.length > 0 && VALID_ID_RE.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`;
}

function clampStr(value: string | undefined, maxLen: number, fallback = ''): string {
  const trimmed = (value ?? '').trim();
  const safe = trimmed.length > 0 ? trimmed : fallback;
  return safe.slice(0, maxLen);
}

function safeTimeHHMM(value: string | undefined, fallback: string): string {
  if (value && TIME_HHMM_RE.test(value)) return value;
  return fallback;
}

function safeDateKey(value: string): string {
  if (DATE_KEY_RE.test(value)) return value;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function timestampToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.length > 0) {
    return val;
  }
  return new Date().toISOString();
}

function buildUserAccountFields(
  uid: string,
  profile: UserProfile,
  settings: UserSettings
) {
  return {
    uid,
    name: clampStr(profile.name, 80, 'Explorer'),
    role: clampStr(profile.role, 80, 'Daily Achiever'),
    focusPillar: profile.focusPillar,
    dailyFocusTargetMinutes: Math.min(720, Math.max(15, Math.round(profile.dailyFocusTargetMinutes || 150))),
    avatarStyle: profile.avatarStyle,
    avatarColor: HEX_COLOR_RE.test(profile.avatarColor) ? profile.avatarColor : '#1677FF',
    onboardingCompleted: Boolean(profile.onboardingCompleted),
    themeMode: settings.themeMode,
    currencySymbol: clampStr(settings.currencySymbol, 6, '$'),
    dailyBudgetCap: Math.min(10_000_000, Math.max(1, Number(settings.dailyBudgetCap) || 45)),
    budgetWarningPercent: Math.min(100, Math.max(50, Math.round(settings.budgetWarningPercent || 80))),
    dailyGoalSuccessThreshold: Math.min(
      100,
      Math.max(10, Math.round(settings.dailyGoalSuccessThreshold || 80))
    ),
    notificationsEnabled: Boolean(settings.notificationsEnabled),
    morningReminderTime: safeTimeHHMM(settings.morningReminderTime, '08:30'),
    eveningReminderTime: safeTimeHHMM(settings.eveningReminderTime, '20:30'),
    celebrateMilestones: Boolean(settings.celebrateMilestones),
    budgetWarningsEnabled: Boolean(settings.budgetWarningsEnabled),
  };
}

export async function ensureUserAccountDoc(
  uid: string,
  profile: UserProfile,
  settings: UserSettings
): Promise<boolean> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return false; // Already exists in cloud
    }
    const fields = buildUserAccountFields(uid, profile, settings);
    await setDoc(ref, {
      ...fields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true; // Newly created
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncUserAccountToCloud(
  uid: string,
  profile: UserProfile,
  settings: UserSettings
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  const fields = buildUserAccountFields(uid, profile, settings);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const { uid: _ignoredUid, ...updatable } = fields;
      await updateDoc(ref, {
        ...updatable,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function buildGoalFields(uid: string, goal: DailyGoal) {
  const base: Record<string, unknown> = {
    ownerId: uid,
    dateKey: safeDateKey(goal.dateKey),
    title: clampStr(goal.title, 140, 'Untitled Target'),
    category: goal.category,
    trackingMode: goal.trackingMode,
    progressPercent: Math.min(100, Math.max(0, Math.round(goal.progressPercent || 0))),
    currentValue: Math.min(100_000, Math.max(0, Number(goal.currentValue) || 0)),
    targetValue: Math.min(100_000, Math.max(1, Number(goal.targetValue) || 1)),
    unitLabel: clampStr(goal.unitLabel, 24, 'units'),
    targetMinutes: Math.min(1440, Math.max(1, Math.round(goal.targetMinutes || 25))),
    loggedMinutes: Math.min(1440, Math.max(0, Math.round(goal.loggedMinutes || 0))),
    subtasks: (goal.subtasks || []).slice(0, 25).map((st) => ({
      id: sanitizeId(st.id, 'st'),
      title: clampStr(st.title, 120, 'Sub-task'),
      weight: Math.min(10, Math.max(1, Math.round(st.weight || 1))),
      completed: Boolean(st.completed),
    })),
    milestoneNotified: Boolean(goal.milestoneNotified),
  };

  if (goal.reminderTime && TIME_HHMM_RE.test(goal.reminderTime)) {
    base.reminderTime = goal.reminderTime;
  }
  if (goal.completedAt) {
    base.completedAt = goal.completedAt.slice(0, 40);
  }
  return base;
}

export async function syncGoalToCloud(uid: string, goal: DailyGoal): Promise<void> {
  const safeGoalId = sanitizeId(goal.id, 'goal');
  const path = `users/${uid}/goals/${safeGoalId}`;
  const ref = doc(db, 'users', uid, 'goals', safeGoalId);
  const fields = buildGoalFields(uid, goal);
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const { ownerId: _o, dateKey: _d, ...updatable } = fields;
      await updateDoc(ref, {
        ...updatable,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteGoalFromCloud(uid: string, goalId: string): Promise<void> {
  const safeGoalId = sanitizeId(goalId, 'goal');
  const path = `users/${uid}/goals/${safeGoalId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'goals', safeGoalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncSessionToCloud(uid: string, session: WorkSession): Promise<void> {
  const safeSessionId = sanitizeId(session.id, 'sess');
  const path = `users/${uid}/sessions/${safeSessionId}`;
  const ref = doc(db, 'users', uid, 'sessions', safeSessionId);
  const payload: Record<string, unknown> = {
    ownerId: uid,
    dateKey: safeDateKey(session.dateKey),
    goalId: sanitizeId(session.goalId || 'general-focus', 'goal'),
    goalTitle: clampStr(session.goalTitle, 140, 'Focused Work Block'),
    mode: session.mode,
    durationMinutes: Math.min(600, Math.max(1, Math.round(session.durationMinutes || 1))),
    startedAt: clampStr(session.startedAt, 40, new Date().toISOString()),
    endedAt: clampStr(session.endedAt, 40, new Date().toISOString()),
    createdAt: serverTimestamp(),
  };
  if (session.note && session.note.trim().length > 0) {
    payload.note = clampStr(session.note, 240);
  }
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteSessionFromCloud(uid: string, sessionId: string): Promise<void> {
  const safeSessionId = sanitizeId(sessionId, 'sess');
  const path = `users/${uid}/sessions/${safeSessionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'sessions', safeSessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncExpenseToCloud(uid: string, expense: ExpenseEntry): Promise<void> {
  const safeExpenseId = sanitizeId(expense.id, 'exp');
  const path = `users/${uid}/expenses/${safeExpenseId}`;
  const ref = doc(db, 'users', uid, 'expenses', safeExpenseId);
  const amount = Math.min(10_000_000, Math.max(0.01, Number(expense.amount) || 0.01));
  const note = clampStr(expense.note, 160, `${expense.category} expense`);
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ownerId: uid,
        dateKey: safeDateKey(expense.dateKey),
        amount: Number(amount.toFixed(2)),
        category: expense.category,
        note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        amount: Number(amount.toFixed(2)),
        category: expense.category,
        note,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteExpenseFromCloud(uid: string, expenseId: string): Promise<void> {
  const safeExpenseId = sanitizeId(expenseId, 'exp');
  const path = `users/${uid}/expenses/${safeExpenseId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'expenses', safeExpenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncNotificationToCloud(
  uid: string,
  notif: NotificationRecord
): Promise<void> {
  const safeNotifId = sanitizeId(notif.id, 'notif');
  const path = `users/${uid}/notifications/${safeNotifId}`;
  const ref = doc(db, 'users', uid, 'notifications', safeNotifId);
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ownerId: uid,
        type: notif.type,
        title: clampStr(notif.title, 120, 'Daymark Alert'),
        body: clampStr(notif.body, 320, 'Notification triggered.'),
        read: Boolean(notif.read),
        triggeredAt: clampStr(notif.triggeredAt, 40, new Date().toISOString()),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        read: Boolean(notif.read),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteNotificationFromCloud(
  uid: string,
  notificationId: string
): Promise<void> {
  const safeNotifId = sanitizeId(notificationId, 'notif');
  const path = `users/${uid}/notifications/${safeNotifId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'notifications', safeNotifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedCloudFromLocalState(
  uid: string,
  localState: DaymarkStoreState
): Promise<void> {
  await ensureUserAccountDoc(uid, localState.profile, localState.settings);
  await Promise.all([
    ...localState.goals.map((g) => syncGoalToCloud(uid, g)),
    ...localState.sessions.map((s) => syncSessionToCloud(uid, s)),
    ...localState.expenses.map((e) => syncExpenseToCloud(uid, e)),
    ...localState.notifications.slice(0, 20).map((n) => syncNotificationToCloud(uid, n)),
  ]);
}

export interface CloudSubscriptionCallbacks {
  onAccount: (profilePatch: Partial<UserProfile>, settingsPatch: Partial<UserSettings>) => void;
  onGoals: (goals: DailyGoal[]) => void;
  onSessions: (sessions: WorkSession[]) => void;
  onExpenses: (expenses: ExpenseEntry[]) => void;
  onNotifications: (notifications: NotificationRecord[]) => void;
}

export function subscribeUserCloudData(
  uid: string,
  callbacks: CloudSubscriptionCallbacks
): () => void {
  const unsubs: Unsubscribe[] = [];

  // 1. User Account Document
  const userPath = `users/${uid}`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        callbacks.onAccount(
          {
            name: typeof d.name === 'string' ? d.name : 'Explorer',
            role: typeof d.role === 'string' ? d.role : 'Daily Achiever',
            focusPillar: d.focusPillar,
            dailyFocusTargetMinutes: Number(d.dailyFocusTargetMinutes) || 150,
            avatarStyle: d.avatarStyle || 'art',
            avatarColor: typeof d.avatarColor === 'string' ? d.avatarColor : '#1677FF',
            onboardingCompleted: Boolean(d.onboardingCompleted),
            createdAt: timestampToIso(d.createdAt),
          },
          {
            themeMode: d.themeMode || 'light',
            currencySymbol: typeof d.currencySymbol === 'string' ? d.currencySymbol : '$',
            dailyBudgetCap: Number(d.dailyBudgetCap) || 45,
            budgetWarningPercent: Number(d.budgetWarningPercent) || 80,
            dailyGoalSuccessThreshold: Number(d.dailyGoalSuccessThreshold) || 80,
            notificationsEnabled: Boolean(d.notificationsEnabled),
            morningReminderTime: typeof d.morningReminderTime === 'string' ? d.morningReminderTime : '08:30',
            eveningReminderTime: typeof d.eveningReminderTime === 'string' ? d.eveningReminderTime : '20:30',
            celebrateMilestones: Boolean(d.celebrateMilestones),
            budgetWarningsEnabled: Boolean(d.budgetWarningsEnabled),
          }
        );
      },
      (error) => handleFirestoreError(error, OperationType.GET, userPath)
    )
  );

  // 2. Daily Goals Subcollection (explicit ownerId query filter matching security rule)
  const goalsPath = `users/${uid}/goals`;
  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'goals'), where('ownerId', '==', uid)),
      (snap) => {
        const items: DailyGoal[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            dateKey: String(d.dateKey || ''),
            title: String(d.title || ''),
            category: d.category,
            trackingMode: d.trackingMode,
            progressPercent: Number(d.progressPercent) || 0,
            currentValue: Number(d.currentValue) || 0,
            targetValue: Number(d.targetValue) || 1,
            unitLabel: String(d.unitLabel || 'units'),
            targetMinutes: Number(d.targetMinutes) || 30,
            loggedMinutes: Number(d.loggedMinutes) || 0,
            subtasks: Array.isArray(d.subtasks) ? d.subtasks : [],
            reminderTime: typeof d.reminderTime === 'string' ? d.reminderTime : undefined,
            completedAt: typeof d.completedAt === 'string' ? d.completedAt : undefined,
            milestoneNotified: Boolean(d.milestoneNotified),
            createdAt: timestampToIso(d.createdAt),
          };
        });
        callbacks.onGoals(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, goalsPath)
    )
  );

  // 3. Work Sessions Subcollection
  const sessionsPath = `users/${uid}/sessions`;
  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'sessions'), where('ownerId', '==', uid)),
      (snap) => {
        const items: WorkSession[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            dateKey: String(d.dateKey || ''),
            goalId: String(d.goalId || ''),
            goalTitle: String(d.goalTitle || ''),
            mode: d.mode || 'pomodoro',
            durationMinutes: Number(d.durationMinutes) || 0,
            startedAt: String(d.startedAt || timestampToIso(d.createdAt)),
            endedAt: String(d.endedAt || timestampToIso(d.createdAt)),
            note: typeof d.note === 'string' ? d.note : undefined,
          };
        });
        callbacks.onSessions(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, sessionsPath)
    )
  );

  // 4. Expenses Subcollection
  const expensesPath = `users/${uid}/expenses`;
  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'expenses'), where('ownerId', '==', uid)),
      (snap) => {
        const items: ExpenseEntry[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            dateKey: String(d.dateKey || ''),
            amount: Number(d.amount) || 0,
            category: d.category,
            note: String(d.note || ''),
            createdAt: timestampToIso(d.createdAt),
          };
        });
        callbacks.onExpenses(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, expensesPath)
    )
  );

  // 5. Notifications Subcollection
  const notifsPath = `users/${uid}/notifications`;
  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'notifications'), where('ownerId', '==', uid)),
      (snap) => {
        const items: NotificationRecord[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              type: d.type || 'reminder',
              title: String(d.title || ''),
              body: String(d.body || ''),
              read: Boolean(d.read),
              triggeredAt: String(d.triggeredAt || timestampToIso(d.createdAt)),
            };
          })
          .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));
        callbacks.onNotifications(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, notifsPath)
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}
