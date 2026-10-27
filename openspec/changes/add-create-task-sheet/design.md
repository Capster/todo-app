# Design

## Context

See `proposal.md` for motivation and the delta specs for behavior contracts. The
current app is an Expo SDK 58 / React Native 0.88 TypeScript app with one
`HomeScreen`, a serialized `taskService`, an `isomorphic-git` checkout in
persistent platform storage, and a promise-style filesystem adapter. There is no
test framework; `npm run typecheck` and manual web/device checks are the
verification tools.

Facts that shape this design:

- `taskService` already has one single-flight guard for load, refresh, and
  completion, so creation must join the same serialization rather than introduce
  a second mutation path.
- `git.listFiles` returns tracked paths only; a new root file becomes an open
  task through the existing derivation rules.
- Task creation dates come from `git.log` on the local branch, so a task created
  offline still gets its commit timestamp and ordering without network access.
- `pushRepository` already commits-and-pushes with token redaction, and refresh
  already pushes a pending local commit before pulling.
- The adapter writes `Uint8Array`; `Buffer` is already a dependency and is
  installed on `globalThis` by `index.ts`.
- React Native and react-native-web provide `Modal`, `KeyboardAvoidingView`, and
  `TextInput.onContentSizeChange`, so no new dependency is needed.
- The entered name is the task name, not the literal repository file name. The
  description determines whether the file gets a `.md` extension.

## Goals / Non-Goals

**Goals:**

- Add task creation without weakening the existing single-flight, rollback,
  token-redaction, and pending-push guarantees.
- Keep naming, validation, and duplicate resolution as pure functions that can
  be type-checked and reasoned about without React Native or git.
- Make the sheet usable on Android, iOS, and web with the same source.
- Make offline creation durable through ordinary local commits and the existing
  refresh retry.

**Non-Goals:**

- Editing or deleting existing tasks.
- Reading task contents for display.
- Resolving remote divergence, conflicts, or force pushes.
- Background sync while the app is idle.
- Creating an initial checkout while offline.
- Adding a test framework or form/state-management dependency.
- Changing the repository URL, branch, or author identity.

## Decisions

### Naming and validation module

Add `src/tasks/taskDraft.ts` with pure functions that turn the two field values
into a file name and content:

- `normalizeTaskDraft(name, description)` trims the name, rejects an empty
  result, `/`, `\`, `.`, and `..`, and reports whether the description contains
  non-whitespace text.
- The base name removes a trailing `.md` (case-insensitive) from the trimmed
  name so `Buy groceries.md` is not doubled.
- When the description has non-whitespace content, the file name is
  `<base>.md`; otherwise it is `<base>` and the content is written as an empty
  string. Non-empty descriptions are written exactly as entered, including line
  breaks and trailing whitespace.
- `pickAvailableTaskFileName(base, hasContent, existingFileNames)` appends
  ` 2`, ` 3`, ... before the extension until the name is free. A name is taken
  when an existing root or `archived/` file name, after removing its final
  extension, equals the candidate base name ignoring case. This treats
  `Buy groceries` and `Buy groceries.md` as the same task name.

Keeping this module pure avoids depending on filesystem state and mirrors the
existing split where `tasks.ts` owns task semantics. The service supplies the
current tracked file list.

Alternatives rejected: using the raw input as the literal file name (the user
chose a content-dependent extension), overwriting duplicates (chosen behavior is
to suffix), and validating against every tracked path (only root and `archived/`
children can conflict with a new task).

### Repository creation operation

Extend `src/git/repository.ts` with:

- `listTrackedFiles()` — require the checkout and return `git.listFiles` paths
  without a network round trip. Used for duplicate resolution and to rebuild the
  list after a local commit.
- `createTaskFile(fileName, content, message)` — require the checkout, reject a
  file that already exists at the root or `archived/`, encode the content with
  `Buffer.from(content, "utf8")`, write it at the repository root, stage it with
  `git.add`, and commit on `master` with the existing `AUTHOR` identity.
- A shared path-availability check so the repository still refuses to overwrite
  even if the service's tracked-file snapshot is stale.
- Failure handling: if anything fails after the write, best-effort unlink the new
  file, reset its index entry with `git.resetIndex`, invalidate the creation-date
  cache, and rethrow a token-sanitized error. A failed creation therefore leaves
  no file or commit.

The repository does not push; the service calls the existing `pushRepository`
after a successful commit. This keeps local durability and network outcome
separate, matching the completion flow.

Alternatives rejected: adding a general text-write helper to the filesystem
adapter (the existing byte-oriented API plus `Buffer` is enough) and committing
and pushing inside one repository function (the service needs to distinguish a
local save from a push failure).

### Service creation workflow

Extend `TaskServiceState.status` with `"creating"` so the existing `isBusy`
derivation already disables toggles, refresh, and the plus button while creation
runs. Add `createTask(name, description): Promise<CreateTaskResult>` through
`runExclusive` with four outcomes:

- `success` — file committed and pushed.
- `saved_locally` — file committed, push failed; the task is in the list and the
  service error banner describes the pending sync.
- `invalid` — name validation failed; nothing was touched, and the sheet shows
  the message inline.
- `failed` — missing checkout or write/stage/commit failure; the repository
  rolled back, and the sheet shows the message inline.

The workflow:

1. Normalize and validate the draft. Return `invalid` without calling git.
2. Read `listTrackedFiles()` and choose an available file name.
3. Commit with a message such as `Create "Buy groceries"`.
4. Re-read the tracked files and rebuild the view through the existing
   `buildView`, so creation-date ordering stays authoritative. If rebuilding
   fails after a successful commit, insert the new task at the top
   optimistically rather than reporting a creation failure.
5. Call `pushRepository()`. On success clear busy/error; on failure keep the
   local task state and set a readable `Created "... " locally, but could not
   push` error.

A `TaskOperationBusyError` from a second submission is converted to `failed`
with the busy message rather than escaping to the UI. Validation and rollback
results leave the global error banner alone; only `saved_locally` writes it,
because the sheet is closing and there is no inline place for the error.

Alternatives rejected: a separate offline queue (ordinary local commits already
express pending work and refresh already retries them) and updating only the
view model without re-reading the checkout (creation dates and typo-free task
names come from the same derivation path as every other load).

### Bottom sheet UI

Add `src/components/CreateTaskSheet.tsx` and render it from `HomeScreen`. It uses
a transparent React Native `Modal` with `animationType="slide"`:

- A full-screen backdrop `Pressable` dims the list and dismisses the sheet.
- `KeyboardAvoidingView` wraps a sheet anchored to the bottom with `height:
  "50%"`, rounded top corners, a header with title and close control, the two
  fields, an inline error area, and the Create button.
- The name field is a `TextInput` with `multiline`, `scrollEnabled={false}` while
  it fits, and a height tracked from `onContentSizeChange` and clamped to a small
  maximum; newline characters are replaced with spaces on change so the value
  stays single-line while long names wrap and grow visually.
- The description field is multiline, fills the remaining sheet space, and
  scrolls internally.
- Create stays enabled for an empty name so the specified inline validation
  error is reachable; it is disabled only while `creating`, where it shows a
  progress label. Repeated taps therefore cannot enqueue a second submission.
- Dismissal is disabled while `creating`, so the user cannot hide an in-flight
  operation; close control, backdrop, and Android back all reset the draft.
- The sheet owns only transient draft/error/height state. It calls an `onCreate`
  prop that returns a `CreateTaskResult`; `success` and `saved_locally` close the
  sheet, while `invalid` and `failed` keep it open and display the message.

`HomeScreen` adds a 56×56 round `Pressable` with a drawn plus at the bottom-right,
above the list, with a button accessibility role and label. It is disabled while
any operation is busy and hidden behind the modal while the sheet is open. The
existing error banner continues to show service-level errors, so the
`saved_locally` message remains visible after the sheet closes.

Alternatives rejected: a full-screen modal (the request specifies the bottom
half), a separate screen (unnecessary navigation and state loss), and a form
library (two fields do not justify a dependency).

### Offline and pending push behavior

Creation while offline relies on an existing checkout. The file and commit are
local; `hasPendingPush` detects the divergence on the next refresh and pushes the
branch tip before pulling, so any number of offline creations are pushed without
duplicates. If no checkout exists (first launch with no network), creation fails
with a readable message and the sheet stays open; inventing a partial checkout is
out of scope.

### Error handling and security

All repository creation errors pass through the existing `sanitizeError` with the
token, and push errors already do. The service composes user-facing messages
without raw git output. Validation errors never contain filesystem paths. The
existing web proxy check remains on the push path.

## Risks / Trade-offs

- **Name auto-growth behaves differently across platforms** → Clamp the height,
  strip newlines, and verify web plus Android; the field remains usable even if
  growth is imperfect.
- **Half-height sheet plus keyboard can squeeze the form** → Wrap in
  `KeyboardAvoidingView`, let the description scroll internally, and keep the
  Create button outside the scrolling area.
- **Duplicate detection uses the last local tracked-file snapshot** → The
  repository re-checks root and `archived/` existence before writing; a remote
  file created after the last pull can still collide on push and surfaces as a
  pending local commit, the same accepted limitation as completion toggles.
- **A push failure leaves the local branch ahead of the remote** → Keep the
  commit and retry on refresh, consistent with the existing completion flow.
- **Rebuilding the list after a commit can fail** → Fall back to inserting the
  new task at the top rather than claiming the committed creation failed.
- **Invalid characters beyond `/`, `\`, `.`, and `..` are not rejected up front**
  → The filesystem write fails and rolls back with a readable error; adding a
  platform-specific allowlist is deferred.
- **Creation order has second-granularity commit timestamps** → Existing
  ordering already tie-breaks by name; two creations in the same second may not
  show in tap order but remain deterministic.
- **The sheet cannot be dismissed during creation** → A slow push keeps the user
  on the sheet; the operation is serialized and a result always arrives.
- **No automated tests exist** → Verify naming helpers by type-checking and
  manual cases, and verify the full flow on web and Android.

## Migration Plan

1. Add `src/tasks/taskDraft.ts` with normalization, naming, and duplicate
   resolution helpers.
2. Add `listTrackedFiles` and `createTaskFile` to `src/git/repository.ts`,
   reusing the existing commit, push, redaction, and pending-push paths.
3. Extend `src/tasks/taskService.ts` with the `creating` status, the four
   outcomes, and the offline/push-failure behavior.
4. Add `src/components/CreateTaskSheet.tsx` and wire the plus button into
   `src/components/HomeScreen.tsx`.
5. Update `README.md` with creation, naming, duplicate, and offline behavior.
6. Verify with `npm run typecheck`, the web build, and device flows: create with
   and without a description, long and duplicate names, invalid input, offline
   create plus reconnect refresh, and dismissal paths.
7. Rollback: remove the sheet and plus button and the creation service/repository
   paths. Tasks and commits already created remain valid repository content; no
   data migration is needed.
