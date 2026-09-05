# Shared Credential Links: Implementation Proposal

## Goal

Allow an authenticated Planwell user to select specific credential entries and
create a PIN-protected share link. A share must use exactly one access mode:

- **Time limited:** reusable with the PIN until a selected expiration time, with
  a hard maximum of 24 hours from creation.
- **One time:** the first successful PIN redemption returns the credentials and
  atomically consumes the share. It can never be redeemed again.

The recipient does not need a Planwell or Google account.

## Recommended User Flow

1. From a project's Credentials tab, select one or more entries and choose
   **Share credentials**.
2. Choose **One time** or **Time limited**. For time-limited links, choose a
   duration no longer than 24 hours.
3. Planwell generates both the link and an 8-digit numeric PIN. The creator can
   copy each separately and should send them through different channels.
4. The recipient opens the link, enters the PIN, and sees only the selected
   credential snapshots.
5. The creator can revoke an active share from the project at any time.

Use a URL fragment instead of a path or query parameter:

```text
https://planwell.example/share#<256-bit-random-token>
```

Fragments are not sent in HTTP requests, reverse-proxy logs, referrer headers,
or link previews. The share page reads the token into memory and immediately
removes the fragment from the address bar with `history.replaceState`. The raw
token must never be stored in the database, browser storage, analytics, or
application logs.

## Data Model

Add two tables to `convex/schema.ts`.

```ts
credentialShares: defineTable({
  projectId: v.id("projects"),
  label: v.optional(v.string()),
  createdBy: v.id("users"),
  mode: v.union(v.literal("timed"), v.literal("one_time")),
  tokenHash: v.string(),
  pinHash: v.string(),
  pinSalt: v.string(),
  expiresAt: v.optional(v.number()),
  usedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
  failedAttempts: v.number(),
  lockedUntil: v.optional(v.number()),
  lastAccessedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_token_hash", ["tokenHash"])
  .index("by_project", ["projectId"])
  .index("by_expires_at", ["expiresAt"]),

credentialShareItems: defineTable({
  shareId: v.id("credentialShares"),
  sourceCredentialId: v.id("projectCredentials"),
  order: v.number(),
  name: v.string(),
  type: v.string(),
  username: v.optional(v.string()),
  endpoint: v.optional(v.string()),
  secret: v.optional(v.string()),
  notes: v.optional(v.string()),
}).index("by_share", ["shareId"]),
```

Share items are immutable snapshots. Later edits, additions, or deletions in the
project must not silently alter an existing share or expand what it exposes.
The snapshot also allows a one-time redemption to read and delete the sensitive
items in the same transaction before returning them.

This follows the current storage model, where credential secrets already exist
as plaintext Convex fields. Encrypting all credential secrets at rest should be
a separate migration; encrypting only share snapshots would not address the
larger at-rest exposure.

## Backend Structure

Add these files:

```text
convex/credentialShares.ts          Public authenticated management functions
convex/credentialShareActions.ts   Node actions for token/PIN hashing
convex/credentialShareInternal.ts  Internal queries and atomic mutations
```

Only the minimum entry points should be public. Database functions that can
read snapshot values must use `internalQuery` or `internalMutation` and must not
be callable directly by a client.

### Cryptography

Use Node's built-in `crypto` APIs in `credentialShareActions.ts`, which starts
with `"use node"`:

- Generate the URL token with `randomBytes(32)` and base64url encoding.
- Store only `SHA-256(token)` as `tokenHash`.
- Generate the PIN server-side using unbiased random integer generation.
- Hash the PIN with `scrypt` using a unique random salt and a deployment secret
  named `CREDENTIAL_SHARE_PEPPER`.
- Compare derived hashes in constant time.

Set a different high-entropy pepper in every Convex deployment. Never return or
log hashes, salts, the pepper, mutation arguments, raw tokens, or PINs. The PIN
is returned once to the creator alongside the link and cannot be recovered.

An 8-digit PIN is recommended because a numeric PIN has low entropy. The random
URL token is the primary unguessable factor; the separately delivered PIN is a
second factor. PIN rate limiting remains mandatory.

### Create Share

Expose an authenticated `createShare` action with:

```ts
{
  projectId,
  credentialIds,
  mode,
  durationMinutes?,
  label?,
}
```

The action generates and hashes the token and PIN, then calls one internal
mutation. That mutation must atomically:

1. Call `requireWhitelistedUser`.
2. Require between 1 and a conservative maximum, such as 20, unique credential
   IDs.
3. Verify every credential exists and belongs to `projectId`.
4. Validate the mode and reject timed durations outside 1 minute to 24 hours.
5. Insert the share and snapshots of exactly those credentials.
6. Write an audit event containing IDs, count, mode, and expiration only.

The action returns `{ url, pin, expiresAt }`. Neither the raw token nor PIN is
stored. Creation must fail completely if any selected credential is invalid.

### Inspect Share

Expose an unauthenticated `getShareStatus` action that accepts the raw token and
returns only generic metadata needed before PIN entry:

```ts
{ status: "available", mode: "timed" | "one_time", expiresAt?: number }
```

For unknown, expired, used, revoked, or locked shares, return a generic
unavailable response. Do not return the project name, creator, credential names,
PIN salt, or the reason a share is unavailable.

### Redeem Share

Expose an unauthenticated `redeemShare` Node action accepting `{ token, pin }`.
It hashes the token, obtains the PIN salt through an internal query, derives the
candidate PIN hash with `scrypt`, and calls one internal redemption mutation.

The internal mutation must perform all authorization and state changes in one
transaction:

1. Find the share by `tokenHash`.
2. Reject revoked, expired, consumed, or currently locked shares.
3. Compare the candidate PIN hash in constant time.
4. On failure, increment `failedAttempts`, apply rate limiting, and return the
   same generic error used for all failures.
5. On success, reset failed-attempt state and read the ordered snapshots.
6. For a timed share, set `lastAccessedAt` and return the snapshots.
7. For a one-time share, set `usedAt`, delete every snapshot, and return the
   snapshots read earlier in that same transaction.

Convex mutation transactions serialize conflicting writes. Because every
one-time redemption writes the same share document and checks `usedAt`, two
concurrent requests cannot both successfully consume it.

Do not split the state check and one-time consumption across separate
transactions. An action may derive hashes, but the final comparison, state
check, snapshot read, and consumption must be one internal mutation.

### Abuse Controls

Use share-level throttling persisted in `credentialShares`:

- Allow 5 failed PIN attempts in 15 minutes.
- Lock for 15 minutes after the threshold, with increasing lock periods for
  repeated bursts.
- Return one generic message such as "This share is unavailable or the PIN is
  incorrect." Do not reveal whether the token exists or the PIN was wrong.
- Apply a maximum PIN length before hashing to avoid resource abuse.
- Add platform-level rate limiting by IP at Vercel or an edge firewall as a
  second layer. A global share lock alone can be abused for denial of service.

Hash a dummy PIN for unknown tokens so obvious timing differences do not become
an existence oracle. The 256-bit token already makes enumeration impractical,
but consistent behavior is still preferable.

### Revoke and List

Authenticated functions should provide:

- `listByProject`: metadata only; never return `pinHash`, `pinSalt`, or snapshot
  values.
- `revoke`: verify the caller is whitelisted, set `revokedAt`, and immediately
  delete all share items.

The Credentials tab can show active shares with mode, item count, creation time,
expiration, last access, and status. It cannot display the PIN again.

## Public Route and UI

Add `app/share/page.tsx` as a minimal client page using shadcn/ui controls. It
must not render the authenticated application header, navigation, project data,
or settings. The page should have these states:

- Invalid or missing token
- PIN entry
- Submitting
- Credentials revealed
- Unavailable, expired, revoked, locked, or consumed

Render each returned credential as a compact entry with whole-entry and
secret-only copy actions. Omit empty fields, matching the existing credential
copy format.

Update `proxy.ts` with an `isSharePage` matcher and bypass authentication for
`/share` before checking `ALLOWED_EMAILS` or Convex Auth. All other routes remain
protected. The public Convex functions still enforce their own narrow access
rules; middleware is not a backend authorization boundary.

For `/share`, set:

```text
Cache-Control: no-store
Referrer-Policy: no-referrer
X-Robots-Tag: noindex, nofollow, noarchive
Content-Security-Policy: a route-appropriate restrictive policy
```

Do not load analytics, error-session replay, advertising, or third-party assets
on this route. Ensure production uses HTTPS only.

### One-Time Tab Semantics

After successful one-time redemption, keep the returned credentials only in
React memory. Do not use cookies, local storage, session storage, URL state, or
client caches. Clear the credential state on both `visibilitychange` when the
document becomes hidden and `pagehide` when the user navigates away or closes
the tab.

Because the backend has already marked the share used and deleted its snapshots,
returning to the tab, refreshing, reopening the original link, or submitting the
PIN again cannot fetch the credentials. Clearing on visibility change strictly
interprets leaving the tab; briefly switching tabs will end access.

No web application can revoke information after a recipient has viewed, copied,
screenshotted, saved, or recorded it. The UI should state this limitation to the
creator before generating a one-time link.

## Expiration and Cleanup

Authorization checks must compare `expiresAt` with the current time on every
status and redemption call. Cleanup jobs are for retention, not enforcement.

Add an internal cleanup mutation and register it in the existing
`convex/crons.ts`:

- Delete snapshots for expired timed shares.
- Remove old consumed, expired, and revoked share metadata after a retention
  period such as 30 days.
- Keep audit logs but never include credential values, tokens, PINs, or hashes.

If a project is permanently deleted, delete its share snapshots and share
records in the same project-removal workflow before deleting the project.

## Audit Events

Add audit events for:

- Share created
- Share successfully redeemed
- Share revoked
- Share expired or cleaned up

Record share ID, project ID, creator where applicable, access mode, selected
credential IDs or count, and timestamps. Do not audit failed PIN values, raw
tokens, PINs, hashes, salts, or credential field values. Consider aggregating
failed attempts rather than creating one audit document per attack request.

## Manual Verification

This repository has no automated test runner, so verify these cases manually:

1. A share contains exactly the selected entries and preserves their creation
   snapshots after source credentials are edited.
2. A timed share works repeatedly with the correct PIN before expiration and
   fails at and after expiration.
3. The API rejects a duration over 24 hours even if the UI is bypassed.
4. A one-time share succeeds exactly once under two simultaneous submissions.
5. Hiding, closing, navigating away from, refreshing, or reopening a one-time
   share does not reveal it again.
6. Wrong PIN attempts trigger throttling without exposing whether the link or
   PIN was valid.
7. Revocation immediately blocks access and removes snapshots.
8. Unauthenticated users can access only `/share`; protected routes still
   redirect to sign-in.
9. Empty fields are omitted and long secrets do not overlap copy controls on
   desktop or mobile.
10. Browser history, Vercel request logs, Convex logs, audit history, analytics,
    and referrer headers contain no raw token, PIN, or credential value.

Run these checks after implementation:

```bash
npm run lint
npm run build
npx convex dev --once
```

## Suggested Delivery Order

1. Add tables, internal functions, cryptographic actions, expiration checks,
   throttling, audit events, and cleanup.
2. Add authenticated create/list/revoke controls to the project Credentials tab.
3. Add the isolated public `/share` route and middleware exception.
4. Validate one-time concurrency, tab-clearing behavior, headers, responsive
   layout, and log redaction.
5. Deploy the Convex pepper and edge rate-limit configuration independently for
   development, preview, and production environments.

## Acceptance Criteria

- A creator can share one or more explicitly selected credentials only.
- Every share requires a PIN and reveals no metadata before successful entry.
- Timed shares cannot be configured beyond 24 hours and stop working exactly at
  expiration.
- One-time shares return secrets in only one successful atomic redemption and
  cannot reveal them after the page is left.
- Raw tokens, PINs, hashes, and credential values do not appear in logs or audit
  records.
- Shares can be listed and revoked by authenticated Planwell users.
- Existing authentication and credential-management behavior remains unchanged.