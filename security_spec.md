# Daymark Firestore Security Specification (Phase 0 TDD)

## 1. Core Data Invariants
1. **Strict Private Tenancy**: Every collection (`goals`, `sessions`, `expenses`, `notifications`) lives under `/users/{userId}` and belongs exclusively to the verified user whose `request.auth.uid == userId`. No cross-user reads, listings, or writes are permitted.
2. **Parent Existence Master Gate**: No subcollection document (`goals`, `sessions`, `expenses`, `notifications`) may be created or updated unless the parent `/users/{userId}` document exists.
3. **Verified Identity**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
4. **Immutable Ownership & Timestamps**: `uid`, `ownerId`, and `createdAt` can never change after creation. Server time (`request.time`) is strictly enforced on `createdAt` (create) and `updatedAt` (create/update).
5. **Bounded Payloads & Anti-Shadow Keys**: Every entity validates exact required and allowed key sets (`hasAll` + `hasOnly`), string `.size()` limits, bounded `subtasks` array (`<= 25`), and regex ID guards (`^[a-zA-Z0-9_\-]+$`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Goal Creation**: Anonymous/signed-out request attempting `create` on `/users/u1/goals/g1` -> `PERMISSION_DENIED`.
2. **Cross-User Profile Read (PII/Private Isolation)**: User `u2` attempting `get` on `/users/u1` -> `PERMISSION_DENIED`.
3. **Unverified Email Write Spoofing**: Authenticated user with `email_verified: false` attempting `create` on `/users/u1` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on User Profile**: User `u1` creating `/users/u1` with extra ghost field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Identity Spoofing in Subcollection**: User `u1` creating `/users/u1/goals/g1` with `ownerId: "u2"` -> `PERMISSION_DENIED`.
6. **Orphaned Subcollection Write (Master Gate)**: User `u1` creating `/users/u1/expenses/e1` when parent `/users/u1` does not exist -> `PERMISSION_DENIED`.
7. **ID Poisoning Attack**: User `u1` writing a goal with document ID containing invalid characters or length > 128 -> `PERMISSION_DENIED`.
8. **Value Poisoning / Oversized String**: User `u1` updating `title` to a 500-character string (limit 140) -> `PERMISSION_DENIED`.
9. **Array Exhaustion Attack**: User `u1` creating a goal with 30 subtasks (limit 25) or non-map element at index 0 -> `PERMISSION_DENIED`.
10. **Immutable Field Tampering**: User `u1` updating `/users/u1/expenses/e1` to alter `createdAt` or `ownerId` -> `PERMISSION_DENIED`.
11. **Client Timestamp Forgery**: User `u1` creating an expense with a backdated client timestamp instead of `request.time` -> `PERMISSION_DENIED`.
12. **Cross-User Collection Listing**: User `u2` executing `list` on `/users/u1/expenses` or `/users` -> `PERMISSION_DENIED`.
