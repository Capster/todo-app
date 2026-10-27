# Design

## Context

See `proposal.md` for motivation and the delta specs for behavior contracts. The
current app is an Expo SDK 58 / React Native 0.88 TypeScript app with one
`HomeScreen`, an `isomorphic-git` checkout in `<document>/todo-repo`, and a
promise-style `expo-file-system` adapter. There is no test framework; `npm run
typecheck` and on-device checks are the verification tools.

Facts established while planning:

- `git.listFiles` already returns tracked paths only, so task derivation can
  ignore `.git` and untracked files for free.
- `isomorphic-git` provides `log`, `add`, `remove`, `commit`, `push`,
  `resetIndex`, `statusMatrix`, and `resolveRef`, but no file-level rename API.
- `git.log` accepts `filepath`, `follow`, and `force`, and each result includes
  `commit.author.timestamp` and `commit.committer.timestamp` in seconds.
- `git.push` resolves a `PushResult` with an `errors` array instead of always
  throwing, so the caller must inspect it.
- The existing token has push permission, but it is embedded in the bundle.
- The repository is tiny (six files, one commit today), so per-task history
  queries are acceptable for now.

## Goals / Non-Goals

**Goals:**

- Keep task semantics (which files are tasks, naming, ordering) separate from
  git mechanics.
- Make completion changes durable locally even when the network is unavailable,
  and resumable on the next refresh.
- Serialize all checkout-mutating operations so the index cannot be corrupted
  by two checkbox taps or a refresh racing a toggle.
- Preserve the existing web guard and token redaction.

**Non-Goals:**

- Creating, editing, renaming, or deleting tasks from the app.
- Reading task file contents.
- Merge-conflict resolution, force pushing, or background sync.
- Multi-repository, multi-branch, or per-user auth.
- Adding a test framework or new dependencies.

## Decisions

### Module boundaries

- `src/git/repository.ts` owns checkout lifecycle and git operations: sync
  (clone/pull), listing tracked files, moving a file, staging, committing, and
  pushing.
- `src/tasks/tasks.ts` owns task semantics as pure functions: filtering tracked
  paths into tasks, stripping extensions, and sorting by creation timestamp.
- `src/tasks/taskService.ts` orchestrates load, refresh, and completion using
  both modules.
- `src/components/HomeScreen.tsx` owns screen state; `TaskRow` and `Checkbox`
  are presentational components under `src/components/`.

This keeps `tasks.ts` testable with plain data and prevents the UI from knowing
about git paths or commit timestamps.

### Task derivation and naming

After each successful clone or pull, call `git.listFiles({ ref: 'master' })` and
filter:

- `name` with no `/` → open task at `name`.
- `archived/name` with no further `/` → completed task at `archived/name`.
- Anything else is ignored.

The display name strips the final extension using last-dot semantics: if the
basename contains a dot at index greater than 0, remove from the last dot onward;
otherwise keep the name unchanged. The original file name plus completion state
identifies the task. Contents are never read for display.

Alternative rejected: treating every tracked file as a task, because the
repository can hold unrelated files and the spec only defines root and
`archived/` children.

### Creation-date ordering

For each task file name, query `git.log({ filepath: 'name', ref: 'master',
force: true })` and `git.log({ filepath: 'archived/name', ref: 'master', force:
true })`, then take the oldest `commit.author.timestamp` across both non-empty
results. Using both paths avoids depending on rename detection; the earliest of
the root creation commit and the archive-move commit is the creation time.
Fallback to the current HEAD commit timestamp if neither path has history. Sort
descending by timestamp, then ascending by display name using plain string
comparison (not locale-sensitive) for deterministic ties.

Cache creation dates in memory keyed by local HEAD oid plus task file name.
Invalidate the cache after a commit or pull, since HEAD changes. Cache only the
timestamp, not rendered tasks.

Alternatives rejected: filesystem mtime (reset by checkout), latest commit date
(would reorder completed tasks), and a single full-history walk (more complex
than the tiny repository justifies).

### Sync lifecycle

Refactor the existing `cloneOrUpdateRepository` internals into:

- `ensureCheckout(onProgress)` — clone when `.git/HEAD` is missing, otherwise
  pull `master` with `fastForwardOnly: true` so divergence surfaces as an error
  instead of creating merge state.
- `pushPendingIfNeeded()` — compare the local `master` oid with
  `refs/remotes/origin/master` via `git.resolveRef`; when they differ, push
  before pulling. Attempt the push even if the tracking ref is stale; an
  up-to-date push is a harmless no-op.
- `syncRepository({ retryPendingPush, onProgress })` — when retrying, push first
  and stop on failure; otherwise ensure the checkout, then list files.

On screen load, run sync without the pending-push step. On pull-to-refresh, run
sync with it. This matches the chosen failure behavior: a push that failed after
a commit is retried on the next refresh, and the refresh reports the error and
skips the pull if the retry fails. `fastForwardOnly` plus a clean push keeps
refreshes conflict-free; genuine divergence is reported, not resolved.

Alternative rejected: always pulling then pushing, which could create local
merge commits and complicate the index/worktree.

### Toggle flow

Use `src/tasks/taskService.ts` to move a task and record it:

1. Compute source `name` or `archived/name` and the opposite destination. If the
   destination already exists, fail before touching anything.
2. Ensure `archived/` exists (`mkdir` with intermediates/idempotent through the
   adapter or Expo `Directory`).
3. Move the file by reading bytes with the adapter and writing to the
   destination, then unlinking the source. The file name and bytes are preserved.
4. Stage with `git.add({ filepath: destination })` and
   `git.remove({ filepath: source })`.
5. Commit with the existing fixed `AUTHOR` identity and a message such as
   `Complete "Buy groceries"` or `Reopen "Buy groceries"`.
6. Push `master` with the existing `onAuth` callback and inspect the returned
   `errors` array. A non-empty `errors` array is treated as a push failure.

Failure handling:

- If reading, writing, deleting, staging, or committing fails, best-effort move
  the file back, reset both index entries with
  `git.resetIndex({ filepath })` against HEAD, and report an error. The list is
  re-derived from the unchanged HEAD.
- If only the push fails, keep the commit and file move, report the push error,
  and leave the task in its new state. The next refresh pushes the pending
  commit.

There is no `git.rename` file API, so copy-then-delete is required. The copy is
written before the source is removed so a failed delete leaves the destination
present; the rollback path removes it and restores the source.

### Serialization and UI state

Use one module-level operation queue/single-flight guard in the task service for
sync, refresh, and completion. The screen derives `isLoading`, `isRefreshing`,
and per-task `isPending` from that service state and disables checkboxes while
any operation runs. This prevents concurrent index writes and satisfies the
no-overlapping-loads requirement.

`HomeScreen` renders a `FlatList` of mixed tasks. `RefreshControl` drives
pull-to-refresh. Each row uses a `Pressable` with `accessibilityRole="checkbox"`
and `accessibilityState={{ checked }}`, drawing a square and a check mark with
`Text`/`View` rather than adding `expo-checkbox`. Errors appear in a persistent
banner above the list; a failed load or refresh leaves the current `tasks` state
untouched. The web branch keeps the existing unsupported message and never calls
the service.

The initial mount effect calls the non-refresh load once. The empty list renders
an explicit empty state, not an error.

### Error handling and security

Reuse the existing token redaction around every git operation, including commit
and push, so authentication errors never expose the token. Readable messages
are surfaced in the banner; raw errors are not rendered. The token now needs
write access, which is already the case; the existing warning that the token is
embedded in the bundle remains in the README.

## Risks / Trade-offs

- **Two history queries per task grow with task count** → Cache timestamps by
  HEAD oid and revisit with a single history walk if the repository grows large.
- **Copy-then-delete is not atomic** → Write the destination before unlinking the
  source, roll back on failure, and accept a small crash window where both files
  exist; the next load would show a duplicate rather than lose a task.
- **Push failure leaves local state ahead of the remote** → Keep the commit,
  surface the error, and retry on refresh as chosen. A read-only or expired token
  blocks the retry until the token is fixed.
- **Diverged remote** → `fastForwardOnly` reports the failure instead of
  resolving conflicts; conflict resolution stays out of scope.
- **Commit timestamps have second granularity** → Tie-break by name so ordering
  is deterministic.
- **`isomorphic-git` rename detection is unreliable across a move** → Query both
  the root and archived paths and take the earliest timestamp.
- **All operations are serialized** → A slow network call blocks toggles; this is
  accepted to protect the index, and progress is visible.

## Migration Plan

1. Refactor `src/git/repository.ts` to expose sync, list, move/stage/commit, and
   push helpers while preserving the existing clone/pull and web guard.
2. Add `src/tasks/tasks.ts` and `src/tasks/taskService.ts`.
3. Replace the `HomeScreen` tree UI with the list, checkbox row, loading,
   refresh, and error states.
4. Verify with `npm run typecheck`, the web build's unsupported message, and
   device flows: first load, restart/pull, refresh, complete, uncomplete, and
   offline push failure followed by refresh retry.
5. Rollback: restore the previous `HomeScreen` and remove `src/tasks/`. No data
   migration is needed; completion toggles already created commits, so rolling
   back the UI does not undo them.
