# Design

## Context

See `proposal.md` for motivation and the delta specs for behavior contracts. The
app is an Expo SDK 58 / React Native 0.88 TypeScript app. `HomeScreen` owns one
boolean sheet state, `CreateTaskSheet` contains the entire animated bottom-sheet
implementation, `taskService` serializes load/refresh/create/completion through
one in-flight guard, and `repository.ts` owns the `isomorphic-git` checkout,
commit, push, rollback, and token-redaction paths.

Facts that shape this design:

- `CreateTaskSheet` already has the modal frame, half-height layout, backdrop
  dismissal, name auto-growth, error area, busy handling, and create footer.
  Duplicating that for edit would create two drifting copies.
- `TaskRow` currently uses `Pressable.onPress` only. React Native `Pressable`
  supports `onLongPress`; the handler must not also toggle completion.
- Task contents are not needed for list derivation, but reading a file from the
  local checkout is already possible through `gitFileSystem.readFile`.
- The existing service's `runExclusive` guard and `hasPendingPush` refresh path
  already give offline durability for any local commit.
- There is no test framework; `npm run typecheck`, web, and Android manual checks
  are the verification tools.

## Goals / Non-Goals

**Goals:**

- Add an edit sheet with Save and Delete by reusing one task-form implementation
  for both creation and editing.
- Keep the existing create behavior, accessibility, animation, and offline
  guarantees intact through the refactor.
- Make reads, saves, renames, and deletions atomic enough to roll back before a
  commit, and durable after a commit even when the network is unavailable.
- Keep all mutations on the existing single-flight path so no two task
  operations can interleave.

**Non-Goals:**

- Preserving a task's creation date across a rename; file-path-based history
  starts at the rename commit.
- Delete confirmation, undo, or a trash area.
- Editing completion state from the sheet, manual reordering, or editing file
  extensions independently of the description.
- Reading task content for list display or ordering.
- Conflict resolution, background sync, or changing the fixed repository and
  branch.

## Decisions

### Shared task-form sheet with thin create/edit adapters

Replace the all-in-one `CreateTaskSheet` internals with one reusable component:

- `TaskFormSheet.tsx` owns the transparent `Modal`, backdrop, half-height sheet,
  slide/fade animation, `KeyboardAvoidingView`, header, auto-growing name field,
  description field, inline error area, and footer. It also owns draft state
  (`name`, `description`, `nameHeight`, `error`, closing state) and resets it
  from props each time the sheet opens.
- Props distinguish the two uses: `title`, `submitLabel`, `busyLabel`,
  `initialName`, `initialDescription`, `onSubmit`, `onDelete`, and
  `deleteBusyLabel`. When `onDelete` is absent the footer is one full-width
  primary button; when present it is a row with an outlined destructive Delete
  and a primary Save.
- `CreateTaskSheet.tsx` becomes a thin adapter: New task / Create / no delete /
  empty initials, calling `taskService.createTask`.
- `EditTaskSheet.tsx` is the other adapter: Edit task / Save / Delete, prefilled
  values, calling `taskService.saveTask` and `taskService.deleteTask`.
- The shared component closes itself on a result with status `success` or
  `saved_locally`/`deleted_locally`, and keeps itself open with an inline error
  for `invalid`/`failed`. A local `pendingAction` controls whether the Save or
  Delete label shows progress.
- Dismissal stays disabled while an operation is running, matching creation.

Alternatives rejected: copying `CreateTaskSheet` into an edit variant (the
duplication the request explicitly forbids), a single 600-line component with
mode branches everywhere (harder to keep create and edit semantics separate),
and a form/state-management dependency (two fields do not justify one).

### Long-press without toggle side effects

`TaskRow` adds an `onEdit` prop and uses `onLongPress` with the default 500 ms
delay. To avoid a release also toggling completion:

- `onPressIn` clears a `longPressTriggered` ref.
- `onLongPress` sets the ref and calls `onEdit`.
- `onPress` toggles only when the ref is false.

The ref is reset on every press-in, so a platform that suppresses `onPress`
after a long press cannot leave a stale flag. Long press is disabled whenever
the row is disabled or pending, and the row's accessibility hint becomes
"Tap to toggle completion, hold to edit". An accessibility action for editing
is added so the feature is reachable without a touch hold.

Alternatives rejected: a separate edit button on every row (the request says
hold the row), using a timer to distinguish tap from hold (Pressable already
provides long-press semantics), and opening the sheet from `onPress` when a
long press was detected (fragile and still risks a toggle).

### Edit draft loading goes through the service

`HomeScreen` tracks one discriminated sheet state:

- `null`
- `{ mode: "create" }`
- `{ mode: "edit", task, initialDescription }`

Holding a row calls `taskService.loadTaskDraft(task)`. The service uses
`runExclusive`, sets a `reading` status so the FAB and rows remain disabled, and
asks the repository for the file content. On success the sheet opens with the
task's display name and exact content; on failure the sheet stays closed and the
existing error banner shows a readable message. Rendering the edit sheet with a
`key` based on the task file name prevents stale draft state when different
tasks are opened in sequence.

Alternatives rejected: letting the sheet read git directly (the sheet would need
token/error handling), and opening immediately with an empty description while
loading (the user could save before the real content arrived).

### Repository read, save, and delete operations

Extend `repository.ts` with task-location-aware helpers:

- `TaskLocation = { fileName, completed }`; path resolution is the root for an
  open task and `archived/` for a completed task.
- `readTaskFile(location)` requires the checkout, verifies the file exists,
  reads bytes through `gitFileSystem`, and decodes UTF-8 with `Buffer`. Errors
  pass through the existing token-sanitizing wrapper.
- `saveTaskFile(current, nextFileName, content, message)` handles both content
  updates and renames in one commit:
  - require the checkout and verify the source exists;
  - if the destination differs, reject an existing destination;
  - read the original bytes first;
  - write the destination (creating `archived/` when needed), remove the source
    when the path changes, stage the add/remove pair, and commit on `master`
    with `AUTHOR`;
  - on any failure, rewrite the original source bytes, remove a partially
    written destination, reset both index entries, invalidate the creation-date
    cache, and rethrow a sanitized error.
- `deleteTaskFile(location, message)` reads the original bytes, unlinks the file,
  stages the removal, and commits. On failure it restores the bytes, resets the
  index entry, and rethrows.
- Both success paths invalidate the creation-date cache. Neither pushes; the
  service keeps local durability separate from network outcome, as creation
  already does.

The service performs filename selection before calling the repository, but the
repository still refuses to overwrite a destination to protect against a stale
tracked-file snapshot.

Alternatives rejected: implementing edit as delete-then-create (two commits,
observable intermediate state, harder rollback), and overwriting files directly
without staging (working tree and index would diverge).

### Edit naming and no-op behavior

Saving reuses `normalizeTaskDraft`, then calls
`pickAvailableTaskFileName(baseName, hasContent, trackedFiles, currentFileName)`.
The optional current-file argument excludes the task being edited from duplicate
detection, so saving an unchanged name never suffixes itself. A name that
collides with a different task still receives ` 2`, ` 3`, ... like creation.

The destination is derived from the description, not the old extension:

- non-whitespace description -> `<base>.md`;
- empty or whitespace-only description -> plain `<base>`.

A completed task keeps the `archived/` directory; an open task keeps the root.
If the resolved file name and content are unchanged, Save closes the sheet and
creates no commit. A plain task receiving a description, or a `.md` task losing
one, becomes the other form while keeping its display name.

Alternatives rejected: rejecting duplicate edit names (inconsistent with
creation), preserving arbitrary old extensions (the app's naming contract only
distinguishes `.md` and plain files), and always committing even with no changes
(noisy history).

### Service save/delete workflow and offline behavior

Extend `TaskServiceState.status` with `reading`, `saving`, and `deleting`.
Because `HomeScreen` already derives `isBusy` from `status !== "idle"`, all rows,
the FAB, refresh, and toggles stay disabled during any edit operation.

Result unions:

- `LoadTaskDraftResult`: `loaded` or `failed`.
- `SaveTaskResult`: `success`, `saved_locally`, `invalid`, or `failed`.
- `DeleteTaskResult`: `success`, `deleted_locally`, or `failed`.

`saveTask(task, name, description)`:

1. Normalize and validate. Return `invalid` without touching git.
2. Set `saving`; list tracked files; choose a unique name excluding the current
   file; read the current content to detect a no-op.
3. Return success without a commit when nothing changed.
4. Commit the content/rename through `saveTaskFile`.
5. Rebuild the list through `listTrackedFiles` + `buildView`. If rebuilding
   fails after a successful commit, apply an optimistic in-memory rename/content
   update instead of reporting a failed save.
6. Push. On success clear busy/error; on failure keep the local task list, set
   the global error banner ("Saved ... locally, but could not push"), and return
   `saved_locally`.

`deleteTask(task)` follows the same shape: set `deleting`, delete and commit,
rebuild (or optimistically filter the task), push, then return `success` or
`deleted_locally`. A repository failure before commit returns `failed` with the
message inline and leaves the global banner untouched. A `TaskOperationBusyError`
from a second submission becomes `failed` with the busy message.

A successful local commit is durable: refresh already pushes a pending branch
tip before pulling, so offline edits and deletions reach the remote without
duplicates or resurrection.

Alternatives rejected: a separate offline queue (commit history already is the
queue), pushing inside the repository (the service must distinguish an inline
failure from a saved-locally error), and editing only the view model without
re-reading the checkout (the path-based list must reflect the committed files).

### UI and UX details

- The edit sheet shows the task name without its extension and the file content
  in the description field.
- Save remains enabled with invalid input so the inline validation error is
  reachable; it is disabled only while an operation is running.
- Delete is a permanent, immediate action with no confirmation or undo. It uses
  the destructive style and is disabled while busy.
- Close control, backdrop, and Android back discard edits without committing.
- The existing error banner is used for saved-but-not-pushed results because the
  sheet closes; pre-commit failures stay inline in the sheet.
- The create sheet's labels and behavior remain unchanged from the user's point
  of view.

Alternatives rejected: a full-screen edit page (the request calls for a sheet
like creation), a confirmation dialog for delete (not requested and adds another
component/flow), and swipe-to-delete (long press is already the edit gesture).

## Risks / Trade-offs

- **Renaming changes the task's creation date** -> Git path history for the new
  file starts at the rename commit, so the renamed task can move in the newest-
  first list. Content-only edits keep the path and position. This is accepted
  because adding persistent task IDs or rename-following history is out of scope;
  the behavior is documented as a trade-off.
- **Long press is less discoverable than a button** -> Add an accessibility hint
  and accessibility edit action; keep tap-to-toggle unchanged.
- **A long press might leak into a completion toggle** -> Reset the guard on
  press-in and check it in `onPress`; verify on web and Android.
- **Delete is irreversible** -> The request asks for a delete button, and undo
  is out of scope. The destructive styling and busy lock reduce accidents.
- **Duplicate edit names are auto-suffixed silently** -> Consistent with
  creation and prevents overwrites; the list and sheet close reveal the final
  name.
- **Reading arbitrary task content can be large or non-text** -> Existing tasks
  are small text files; UTF-8 decoding with replacement characters is acceptable
  and failures are reported rather than crashing.
- **A commit can succeed and list rebuilding can fail** -> Fall back to an
  optimistic local rename/content update or filtering instead of reporting a
  failed save/delete.
- **A push failure leaves the branch ahead of the remote** -> Keep the commit and
  retry on refresh, matching creation and completion.
- **No automated tests exist** -> Validate naming and rollback by type-checking
  and manual web/Android flows, including offline save/delete and reconnect.
- **Sheet state can go stale between tasks** -> Key the edit sheet by the task
  file name and reset the shared draft only on open.

## Migration Plan

1. Extract `TaskFormSheet` from `CreateTaskSheet`, add `CreateTaskSheet` and
   `EditTaskSheet` adapters, and confirm creation behavior is unchanged.
2. Add the repository read/save/delete helpers with rollback and cache
   invalidation.
3. Add the service draft-load, save, and delete operations plus statuses and
   result unions.
4. Add long-press handling to `TaskRow` and edit sheet state/actions to
   `HomeScreen`.
5. Update `README.md` with hold-to-edit, Save, Delete, and offline behavior.
6. Verify with `npm run typecheck`, web, and Android: edit name/description for
   open and completed tasks, no-op save, duplicate names, invalid names,
   plain/`.md` transitions, delete, offline save/delete plus reconnect refresh,
   and every dismissal path.
7. Rollback: remove the edit sheet/action and repository/service edit paths; the
   shared form refactor can stay or be reverted independently. Tasks already
   edited or deleted remain committed repository content; no data migration is
   needed.
