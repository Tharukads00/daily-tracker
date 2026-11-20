/**
 * Phase 0 Security TDD Specification & Dirty Dozen Verification Matrix
 * Maps each adversarial payload against Daymark's Firestore security rules invariants.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; emailVerified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
  enforcedByPillar: string;
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Goal Creation',
    operation: 'create',
    path: '/users/user1/goals/goal1',
    auth: null,
    payload: { ownerId: 'user1', title: 'Unauthorized goal' },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 4 & Denial-of-Wallet Auth Gate',
  },
  {
    id: 2,
    name: 'Cross-User Private Profile Read',
    operation: 'get',
    path: '/users/user1',
    auth: { uid: 'user2', emailVerified: true },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 6 (PII Isolation)',
  },
  {
    id: 3,
    name: 'Unverified Email Write Spoofing',
    operation: 'create',
    path: '/users/user1',
    auth: { uid: 'user1', emailVerified: false },
    payload: { uid: 'user1', name: 'Spoofed' },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Verified User Enforcement',
  },
  {
    id: 4,
    name: 'Shadow Field Injection (Ghost isAdmin)',
    operation: 'create',
    path: '/users/user1',
    auth: { uid: 'user1', emailVerified: true },
    payload: { uid: 'user1', name: 'Rukshan', isAdmin: true },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 2 (Strict hasOnly Validation Blueprint)',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Goal Owner',
    operation: 'create',
    path: '/users/user1/goals/goal2',
    auth: { uid: 'user1', emailVerified: true },
    payload: { ownerId: 'user2', dateKey: '2026-11-19', title: 'Hijack' },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 2 (Identity Integrity)',
  },
  {
    id: 6,
    name: 'Orphaned Subcollection Write Without Parent User',
    operation: 'create',
    path: '/users/ghostUser/expenses/exp1',
    auth: { uid: 'ghostUser', emailVerified: true },
    payload: { ownerId: 'ghostUser', amount: 15, category: 'Food', note: 'Lunch' },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 1 (Master Gate exists check)',
  },
  {
    id: 7,
    name: 'Document ID Poisoning',
    operation: 'create',
    path: '/users/user1/goals/bad$id!with*symbols',
    auth: { uid: 'user1', emailVerified: true },
    payload: { ownerId: 'user1', title: 'Bad ID' },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 3 (Path Variable Hardening)',
  },
  {
    id: 8,
    name: 'Oversized Title Value Poisoning',
    operation: 'update',
    path: '/users/user1/goals/goal1',
    auth: { uid: 'user1', emailVerified: true },
    payload: { title: 'A'.repeat(250) },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 2 (Mandatory .size() Bounds)',
  },
  {
    id: 9,
    name: 'Subtasks Array Exhaustion (> 25 items)',
    operation: 'create',
    path: '/users/user1/goals/goal3',
    auth: { uid: 'user1', emailVerified: true },
    payload: { ownerId: 'user1', subtasks: Array.from({ length: 30 }, () => ({ title: 'x' })) },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 5 (Total Array Guarding)',
  },
  {
    id: 10,
    name: 'Immutable createdAt / ownerId Modification',
    operation: 'update',
    path: '/users/user1/expenses/exp1',
    auth: { uid: 'user1', emailVerified: true },
    payload: { ownerId: 'user2', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Immortal Field & Action-Based Update Rule',
  },
  {
    id: 11,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/users/user1/expenses/exp2',
    auth: { uid: 'user1', emailVerified: true },
    payload: { ownerId: 'user1', amount: 10, createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Temporal Integrity (request.time)',
  },
  {
    id: 12,
    name: 'Cross-User Expense Collection Listing',
    operation: 'list',
    path: '/users/user1/expenses',
    auth: { uid: 'user2', emailVerified: true },
    expected: 'PERMISSION_DENIED',
    enforcedByPillar: 'Pillar 8 (Secure List Queries)',
  },
];
