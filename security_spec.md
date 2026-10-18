# MADHAVAN AI — Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Global Default-Deny**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity**: All standard writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **PII Isolation (`/users/{userId}`)**: User profile documents contain `email` (PII) and may only be read (`get`) by the document owner (`request.auth.uid == userId`) or a verified administrator (`isAdmin()`). Blanket `list` is restricted strictly to `isAdmin()`.
4. **Master Gate Relational Sync (`/conversations/{conversationId}/messages/{messageId}`)**: A message in a subcollection cannot be read, created, updated, or deleted unless the parent `/conversations/{conversationId}` document exists and its `ownerId` equals `request.auth.uid` (or `isAdmin()`).
5. **Strict Key & Type Blueprints**: Every `create` and `update` operation calls `isValid[Entity](incoming())`, enforcing exact `hasAll` and `hasOnly` keys, string length boundaries (`maxLength`), regex ID patterns (`^[a-zA-Z0-9_\-]+$`), and enum constraints.
6. **Action-Based Updates & Immortality**: Every `update` block starts with `isValid[Entity](incoming())`, restricts modified fields via `incoming().diff(existing()).affectedKeys().hasOnly(...)`, preserves immutable fields (`uid`, `id`, `ownerId`, `conversationId`, `createdAt`), and enforces `incoming().updatedAt == request.time`.
7. **Privilege Escalation Prevention**: Users can never write to `/admins/{adminId}`, cannot spoof `ownerId`, and cannot create a `UserProfile` with `plan == 'pro'` directly (must start as `'free'` unless updated via authorized action or admin).
8. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid` (or `isAdmin()`) without calling `get()` or `exists()` inside `list`.

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection on UserProfile**:
   `{ uid: "user_1", displayName: "Ada", email: "ada@example.com", language: "en", theme: "light", memoryEnabled: true, plan: "free", isAdmin: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected by `hasOnly()`.
2. **Unverified Email Spoofing on Admin Access**:
   Auth token `{ uid: "attacker", email: "senthilarts7@gmail.com", email_verified: false }` attempting to read `/users/victim_1` -> Rejected by `request.auth.token.email_verified == true`.
3. **Cross-User PII Read on `/users/{userId}`**:
   Authenticated `user_2` attempting `get(/users/user_1)` -> Rejected by `isOwner(userId) || isAdmin()`.
4. **Identity Spoofing on Conversation Create**:
   Authenticated `user_1` creating `/conversations/conv_1` with `{ ownerId: "user_2", ... }` -> Rejected by `data.ownerId == request.auth.uid`.
5. **Orphaned Subcollection Message Create**:
   Authenticated `user_1` creating `/conversations/nonexistent_conv/messages/msg_1` -> Rejected by Master Gate `exists(/conversations/nonexistent_conv)` and owner check.
6. **Cross-Tenant Subcollection Message Injection**:
   Authenticated `user_2` creating `/conversations/conv_owned_by_user_1/messages/msg_1` -> Rejected by Master Gate parent `ownerId == request.auth.uid`.
7. **ID Poisoning Attack**:
   Creating `/conversations/invalid$id!with*spaces` -> Rejected by `isValidId(conversationId)`.
8. **Denial-of-Wallet Oversized String Payload**:
   Creating a message with `content` length > 50,000 chars or conversation `title` > 200 chars -> Rejected by `.size() <= maxLength`.
9. **Immortal Field Mutation on Update**:
   Updating `/conversations/conv_1` to change `ownerId` or `createdAt` -> Rejected by `incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt` and `affectedKeys().hasOnly(...)`.
10. **Client Timestamp Forgery**:
    Creating `/memories/mem_1` with `createdAt: Timestamp(2020, 1, 1)` instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
11. **Unauthorized Admin Self-Promotion**:
    Authenticated `user_1` attempting `setDoc(/admins/user_1, { uid: "user_1" })` -> Rejected by `allow write: if false;`.
12. **Unscoped List Scraping on `/conversations`**:
    Authenticated `user_1` running unconstrained `getDocs(collection(db, 'conversations'))` without `where('ownerId', '==', 'user_1')` -> Rejected by `allow list: if isSignedIn() && (resource.data.ownerId == request.auth.uid || isAdmin());`.
