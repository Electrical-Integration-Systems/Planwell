# Credential Encryption and Production Migration

## Objective

Encrypt credential contents at the application layer before they are stored in
Convex. Migrate every existing production credential from plaintext to the same
encrypted format without downtime or lost edits.

This proposal encrypts these fields together:

- `name`
- `type`
- `username`
- `endpoint`
- `secret`
- `notes`

Only document identity and operational metadata remain readable in the database:
`projectId`, `createdBy`, `createdAt`, and `updatedAt`.

Application-layer encryption reduces exposure through database browsing,
exports, backups, and accidental operational access. It does not protect data
from a compromised application runtime, a stolen encryption key, or an
authorized Planwell user who can request decrypted credentials.

## Cryptographic Design

Use AES-256-GCM through the Web Crypto API. Convex's default runtime supports
Web Crypto, including in queries, while actions can safely generate random
nonces without query/mutation determinism constraints.

Each encryption operation must use:

- A 256-bit deployment key.
- A fresh, cryptographically random 96-bit IV.
- The default 128-bit GCM authentication tag, included in the ciphertext
  returned by Web Crypto.
- Authenticated additional data (AAD) binding the ciphertext to its credential,
  project, payload version, and key version.

The encrypted plaintext is a UTF-8 JSON payload:

```ts
type CredentialPayloadV1 = {
  schemaVersion: 1;
  name: string;
  type: string;
  username?: string;
  endpoint?: string;
  secret?: string;
  notes?: string;
};
```

Store binary values as base64url strings. A proposed envelope is:

```ts
type CredentialEnvelope = {
  version: 1;
  keyId: "v1";
  encryptionId: string;
  iv: string;
  ciphertext: string;
};
```

`encryptionId` is a random 128-bit base64url value generated once when the
credential is created. It is not secret. Construct AAD exactly as:

```text
planwell/projectCredentials/<projectId>/<encryptionId>/payload-v1/key-v1
```

Decryption must reject an unsupported payload version, unknown key ID, malformed
base64url, failed GCM authentication, mismatched AAD, missing required field, or
invalid decoded field type. Return a generic application error and never return
partial plaintext.

## Key Management

Create a random 32-byte key outside the application and store its base64url
encoding as a Convex deployment environment variable:

```text
CREDENTIAL_ENCRYPTION_KEY_V1
```

Use a different key for development, preview, and production. Set the key in
the Convex dashboard so it does not appear in shell history. Restrict deployment
settings access and keep a separately protected recovery copy in the
organization's password manager or secrets manager.

Do not commit the key, put it in `.env.local`, send it to the browser, log it,
or store it in a Convex table. Convex backups do not include environment
variables, so a database restore is unusable without the matching historical
key.

The encryption helper must select keys by an explicit `keyId`; it must not use a
single unnamed key. For rotation:

1. Add `CREDENTIAL_ENCRYPTION_KEY_V2` while retaining V1.
2. Deploy readers that accept V1 and V2 and writers that produce V2.
3. Run the same migration framework to re-encrypt V1 documents as V2.
4. Verify no live document uses V1.
5. Retain V1 in protected offline recovery storage for as long as any backup
   containing V1 ciphertext may need to be restored.

For a stronger key custody boundary, replace the environment-held key with a
cloud KMS and envelope encryption. That requires action-based reads and gives up
the current reactive query behavior, so it is not the recommended first phase.

## Schema Evolution

Use an expand-migrate-contract rollout. Never deploy a strict encrypted-only
schema before production plaintext has been migrated.

### Expanded Transitional Schema

During migration, make current plaintext fields optional and add an optional
envelope:

```ts
projectCredentials: defineTable({
  projectId: v.id("projects"),
  name: v.optional(v.string()),
  type: v.optional(v.string()),
  username: v.optional(v.string()),
  secret: v.optional(v.string()),
  endpoint: v.optional(v.string()),
  notes: v.optional(v.string()),
  encrypted: v.optional(v.object({
    version: v.literal(1),
    keyId: v.string(),
    encryptionId: v.string(),
    iv: v.string(),
    ciphertext: v.string(),
  })),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_project", ["projectId"]),
```

The transitional schema cannot express "exactly plaintext or encrypted." Every
read and write function must enforce this invariant:

- Legacy document: no `encrypted` envelope and required plaintext `name` and
  `type` are present.
- Encrypted document: `encrypted` is present and every plaintext credential
  field is absent.
- Any mixed or incomplete document is invalid and must be reported by the
  verification query without exposing values.

### Final Schema

After migration verification and the rollback window, remove all six plaintext
fields and require `encrypted`:

```ts
projectCredentials: defineTable({
  projectId: v.id("projects"),
  encrypted: v.object({
    version: v.literal(1),
    keyId: v.string(),
    encryptionId: v.string(),
    iv: v.string(),
    ciphertext: v.string(),
  }),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_project", ["projectId"]),
```

## Code Structure

Add these files:

```text
convex/credentialCrypto.ts                 Web Crypto encode/decode helpers
convex/credentialActions.ts                Public encrypted create/update actions
convex/credentialEncryptionMigration.ts    Resumable migration action
convex/credentialEncryptionInternal.ts     Internal DB operations and verification
```

`credentialCrypto.ts` must use only APIs supported by the default Convex
runtime so both queries and actions can import it. Do not add `"use node"` or
import `node:crypto`; the existing `crypto.subtle`, `crypto.getRandomValues`,
`TextEncoder`, and `TextDecoder` APIs are sufficient.

### Reads

Keep `credentials.listByProject` as an authenticated query to preserve reactive
UI updates:

1. Call `getWhitelistedUserId` as it does today.
2. Fetch credential documents by project.
3. For encrypted documents, decrypt and validate the payload.
4. During migration only, normalize legacy plaintext documents into the same
   returned shape.
5. Return only the existing client shape. Never return `encrypted`, IVs,
   ciphertext, key IDs, or legacy storage fields.

After migration, remove the legacy plaintext read branch.

### Creates

Change `credentials.create` from a mutation to an action and update the client
from `useMutation` to `useAction` for this operation. The action must:

1. Require an authenticated identity before doing encryption work.
2. Validate and normalize the complete payload.
3. Generate `encryptionId` and a fresh IV with `crypto.getRandomValues`.
4. Encrypt the payload and call one internal mutation with ciphertext only.
5. Let the internal mutation call `requireWhitelistedUser`, insert the document,
   and write a value-free audit event.

Do not pass plaintext from the action to a mutation. Convex function arguments
and explicit logs must never contain plaintext beyond the public action request
that necessarily receives it over TLS.

### Updates

Change `credentials.update` to an action. Because the current editor submits a
complete credential form, prefer sending a complete normalized payload rather
than applying a partial encrypted patch.

The action should read the current document through an internal query, decrypt
legacy or encrypted data, apply the submitted values, encrypt the complete new
payload with a fresh IV, and call an internal mutation with:

```ts
{
  id,
  expectedUpdatedAt,
  encrypted,
}
```

The mutation calls `requireWhitelistedUser`, rereads the document, and rejects a
write conflict when `updatedAt !== expectedUpdatedAt`. It then atomically writes
the new envelope, clears all legacy plaintext fields, and updates `updatedAt`.
The client should reload and ask the user to retry after a conflict instead of
silently overwriting a concurrent edit.

Every update must use a new IV. Never reuse an IV with the same AES-GCM key,
including when plaintext did not change.

### Deletes and Project Deletion

Credential deletion does not require decryption. Keep it as an authenticated
mutation, but stop reading names or types for audit metadata. Project deletion
can continue deleting encrypted credential documents by ID.

### Search, Copy, and UI

The query returns decrypted values in the same shape, so current project search,
whole-entry copy, secret-only copy, reveal, and edit controls can remain
unchanged except for using actions for create and update.

Decrypted credentials exist in browser memory after a successful query. Do not
persist them in local storage, session storage, IndexedDB, analytics, error
reports, or offline caches. Retain the existing authenticated route protection
and use `Cache-Control: no-store` on credential-bearing server responses.

## Audit Log Remediation

The existing audit implementation masks `secret`, but credential create/delete
metadata contains `name` and `type`, and update `changes` can contain plaintext
`username`, `endpoint`, `notes`, `name`, and `type`. Encrypting only the
`projectCredentials` table would leave those historical copies exposed.

Change new credential audit events to record only:

- Credential document ID, which already exists as `entityId`.
- Action (`create`, `update`, or `delete`).
- Project ID when operationally useful.
- Names of changed fields, not old or new values.
- Timestamp and acting user.

Add a separate production audit scrub migration that finds audit records with
`entityType === "credential"` and:

- Replaces `changes` with a value-free field-name summary or clears it.
- Replaces `metadata` with non-sensitive identifiers only or clears it.
- Never parses and writes sensitive values to logs.

The audit scrub is destructive and cannot restore historical display names.
Verify that `AuditHistoryList` and `ProjectUpdatesTab` use a generic label such as
"credential entry" when names are unavailable before running it.

## Existing Production Credential Migration

Implement a custom cursor-based online migration because encryption requires an
action for random IV generation. The migration must be idempotent, resumable,
bounded, and safe while users continue editing credentials.

### Migration State

Add a small migration state table:

```ts
credentialEncryptionMigrations: defineTable({
  name: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  cursor: v.optional(v.string()),
  scanned: v.number(),
  encrypted: v.number(),
  skipped: v.number(),
  conflicts: v.number(),
  lastError: v.optional(v.string()),
  startedAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
}).index("by_name", ["name"]),
```

Use a fixed migration name such as `encrypt-project-credentials-v1`. Store only
counts, cursor, status, and sanitized error categories. Never store a credential
value in migration state.

### Batch Algorithm

`credentialEncryptionMigration.start` is an `internalAction` run explicitly
from the CLI. Each invocation processes at most 25 documents:

1. An internal paginated query reads the next page of credential documents.
2. Already encrypted documents are counted as skipped.
3. Every legacy document is validated and encrypted in action memory with a new
   `encryptionId` and IV.
4. One internal mutation receives only encrypted envelopes plus each document's
   `id` and `expectedUpdatedAt`.
5. For each item, the mutation rereads the document. If it is already encrypted,
   it skips it. If `updatedAt` changed, it records a conflict and does not patch.
6. Otherwise, the mutation atomically sets `encrypted` and unsets `name`,
   `type`, `username`, `endpoint`, `secret`, and `notes` in the same patch.
7. The mutation persists the next cursor and counters.
8. The action schedules the next batch with `ctx.scheduler.runAfter(0, ...)`.

Never temporarily store both ciphertext and plaintext in a document after a
successful batch patch. Never pass plaintext in scheduled function arguments.

Normal create and update operations must produce encrypted documents before the
migration begins. Therefore, a concurrent user edit either wins first and makes
the migration skip that now-encrypted document, or changes `updatedAt` and makes
the batch report a conflict. Run another scan from the beginning until the
verification query reports zero legacy or mixed documents.

If a batch fails, set the state to `failed` with a sanitized category. A `resume`
internal action continues from the persisted cursor. A `restartScan` action
resets only the cursor, retains cumulative counts, and finds records skipped by
earlier conflicts. None of these operations may decrypt an already encrypted
document unless performing an explicit key rotation.

### Verification Functions

Add internal queries that return counts only:

```ts
{
  total,
  encryptedV1,
  legacyPlaintext,
  mixed,
  malformedEnvelope,
  unknownKeyId,
}
```

Add a separate authenticated canary query that decrypts selected records and
returns only success/failure plus IDs. Functional verification through the
normal Credentials UI remains required; do not create a verification endpoint
that returns bulk plaintext.

## Production Runbook

### Phase 0: Preparation

1. Inventory the number of production credentials and credential audit records.
2. Create a manual production backup in the Convex dashboard and confirm the
   restore procedure. The backup contains plaintext and must be access-restricted.
3. Record the currently deployed application revision and Convex environment
   configuration. Backups do not include code or environment variables.
4. Generate the production V1 key outside Planwell, store its recovery copy in
   the approved secrets manager, and set `CREDENTIAL_ENCRYPTION_KEY_V1` in the
   production Convex deployment.
5. Exercise the complete rollout against a cloned or preview deployment using a
   sanitized production-shaped dataset.

### Phase 1: Expand and Dual Read

Deploy the transitional schema, encryption helpers, encrypted create/update
actions, dual-read query, value-free audit events, migration state, verification
functions, and audit UI fallback together:

```bash
npm run lint
npm run build
npx convex deploy
```

Immediately verify that new credentials and edits create encrypted-only
documents and that legacy credentials still display correctly.

Do not proceed if any new write stores a plaintext credential field.

### Phase 2: Migrate Production Credentials

Start the internal migration against production:

```bash
npx convex run --prod credentialEncryptionMigration:start '{"batchSize":25}'
```

Monitor the persisted migration state and Convex function failures. Do not print
documents, action arguments, decrypted payloads, keys, or ciphertext to the
terminal. If the migration reports conflicts, allow normal writes to settle and
run a new scan:

```bash
npx convex run --prod credentialEncryptionMigration:restartScan '{}'
```

Run the count-only verification after every full pass:

```bash
npx convex run --prod credentialEncryptionInternal:verifyMigration '{}'
```

The required gate is:

```text
legacyPlaintext = 0
mixed = 0
malformedEnvelope = 0
unknownKeyId = 0
encryptedV1 = total
```

Manually open, edit, reveal, copy, create, and delete representative credentials
from multiple projects before continuing.

### Phase 3: Scrub Credential Audit Records

Deploy and run the resumable audit scrub only after the audit UI no longer
depends on credential values:

```bash
npx convex run --prod credentialAuditMigration:start '{"batchSize":50}'
```

Verify no credential audit `changes` or `metadata` contains `name`, `type`,
`username`, `endpoint`, `secret`, or `notes` values. Inspect only keys and counts
during verification; do not print historical values.

### Phase 4: Contract

After a monitoring window, remove legacy read support, remove plaintext fields
from the schema, and require the encrypted envelope. Deploy and rerun lint,
build, migration counts, and manual credential workflows.

Do not delete the production V1 key. It is required for current data and for any
restored backup containing V1 ciphertext.

### Phase 5: Plaintext Retention Cleanup

Existing pre-migration Convex backups and downloaded exports still contain
plaintext. Application migration cannot rewrite them.

- Keep the pre-migration backup only for the minimum approved rollback window.
- Delete downloaded exports securely after that window.
- Allow provider-managed backups containing plaintext to expire according to
  Convex retention, or contact Convex support if policy requires earlier removal.
- Record the date after which all retained backups are ciphertext-only.
- Review error monitoring, analytics, browser session replay, support exports,
  and manually captured logs for prior credential leakage.

## Failure and Rollback Strategy

The migration is roll-forward by default:

- Before a document is migrated, dual-read code handles plaintext.
- After it is migrated, the same code handles ciphertext.
- A failed batch leaves unprocessed documents untouched and can resume.
- A concurrent edit cannot be overwritten because `expectedUpdatedAt` is checked.

Do not roll application code back to a revision that cannot decrypt envelopes
after migration starts. If the new write path is defective, disable credential
create/update in the UI, keep dual-read code deployed, fix forward, and resume.

Emergency full restore is the last resort. Restoring the pre-migration backup is
destructive, loses writes made after the backup, and restores plaintext. It also
requires redeploying compatible code and restoring the matching environment
configuration. Take another backup before any destructive restore.

Do not implement an automatic decrypt-back-to-plaintext migration. It would
unnecessarily recreate the exposure this work removes.

## Shared Link Integration

The design in `SHARED_CREDENTIAL_LINKS.md` proposes immutable credential
snapshots. Those snapshots must also be encrypted at rest before shared links
ship. Reuse the AES-GCM helper but use a distinct AAD namespace and preferably a
separate key ID, for example:

```text
planwell/credentialShareItems/<shareId>/<itemId>/payload-v1/key-v1
```

The one-time redemption mutation cannot call nondeterministic encryption, but it
only needs to atomically read ciphertext, mark the share consumed, and delete
the snapshot documents. Decryption can occur in the calling action after the
atomic mutation returns the ciphertext. The action must return plaintext once
and never persist it again.

## Security Rules

- Never log plaintext credential data, encryption keys, decrypted payloads,
  migration source records, or action arguments.
- Never reuse an AES-GCM IV with the same key.
- Never accept an IV, AAD, key ID, or ciphertext generated by the browser.
- Never expose encryption envelopes through public queries.
- Validate authorization again in internal write mutations; an action is not a
  substitute for database authorization.
- Keep key selection explicit and reject unknown versions.
- Keep encryption and plaintext removal in one atomic document patch.
- Treat decryption failures as security/integrity events, but log only document
  ID and a sanitized error category.
- Maintain HTTPS, authenticated route protection, and the existing email
  allowlist. Encryption at rest does not replace access control.

## Manual Verification

This repository has no automated test runner. Before production migration,
manually verify:

1. New and updated documents contain no plaintext credential field.
2. Every encrypted credential can be listed, searched, edited, revealed, and
   copied without changing current UI behavior.
3. Empty optional fields survive create/update correctly.
4. A modified ciphertext, IV, AAD input, payload version, or key ID fails closed.
5. Two concurrent edits produce a conflict rather than a lost update or IV reuse.
6. Migration restart and retry do not double-encrypt documents.
7. A concurrent edit during migration is preserved.
8. Count verification reaches zero legacy, mixed, malformed, and unknown-key
   documents.
9. Credential audit records contain no credential values after scrubbing.
10. Production logs, browser storage, analytics, and error reports contain no
    plaintext values or keys.
11. A backup restore in an isolated deployment works only when the matching key
    is restored and all credentials decrypt successfully.
12. Project and credential deletion remove encrypted documents normally.

## Acceptance Criteria

- All six credential fields are authenticated and encrypted with AES-256-GCM at
  rest.
- Production contains zero plaintext or mixed credential documents after the
  migration.
- Current credential workflows continue to work for authorized users.
- Migration is resumable, idempotent, bounded, observable through counts, and
  safe against concurrent edits.
- New audit events and historical credential audit records contain no credential
  values.
- Keys are deployment-specific, versioned, recoverable, and absent from source,
  database documents, logs, and browser code.
- Pre-migration plaintext backups and exports have an explicit restricted
  retention and deletion plan.