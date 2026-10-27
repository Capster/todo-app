# Proposal

## Why

The checklist is read-only today: a task can only be created by editing the
repository outside the app. Users need to capture a task directly from the list
screen, including when the device is offline, and have it commit and sync to the
remote as soon as the network is available again.

## What Changes

- Add a sticky round plus button at the bottom-right of the list screen.
- Tapping it opens a bottom-sheet modal that occupies the bottom half of the
  screen and contains:
  - a task-name field that stays single-line but grows in height to wrap long
    names;
  - a multiline description field;
  - a Create button at the bottom of the sheet.
- Create a new open task file at the repository root:
  - trim the entered name and reject empty or path-like names;
  - when the description has non-whitespace content, name the file
    `<name>.md`; when it is empty, create a plain file named `<name>`;
  - if the name conflicts with an existing task file in the root or in
    `archived/`, append a numeric suffix (` 2`, ` 3`, ...) to produce a unique
    task name instead of overwriting anything.
- Write the file, stage it, commit it with the configured app identity, and
  push `master`.
- If the push fails (for example, no internet), keep the local commit, create
  the task locally, close the sheet, show the task at the top of the list, and
  show a readable sync error. The next refresh retries the pending push.
- If validation, writing, staging, or committing fails, do not leave a file or
  commit behind, keep the sheet open, and show an inline error.
- On a successful local creation (pushed or saved for later), close the sheet
  and re-render the list with the new task. A close control, backdrop tap, or
  Android back action dismisses the sheet without creating anything.
- **Out of scope**: editing or deleting existing tasks, reading task contents
  for display, merge-conflict resolution, background sync, repository or branch
  selection, and creating a first checkout while offline.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `todo-list`: Adds app-driven task creation, including the plus button, the
  bottom sheet, naming and duplicate rules, local creation, and creation
  failure behavior.
- `git-sync`: Adds writing a new task file into the checkout, committing it,
  pushing `master`, and retaining a pending creation commit for later retry.

## Impact

- `src/components/HomeScreen.tsx`: hosts the floating action button, owns sheet
  visibility, and surfaces creation results.
- New `src/components/CreateTaskSheet.tsx`: sheet UI, fields, validation
  feedback, and create/close actions.
- `src/tasks/tasks.ts`: pure helpers for name normalization, markdown/plain file
  naming, unique-name selection, and display-name conflict checks.
- `src/tasks/taskService.ts`: a serialized `createTask` operation with distinct
  success, saved-locally, validation, and rollback outcomes.
- `src/git/repository.ts`: write/stage/commit a new task file, list local
  tracked files without a network round trip, and reuse the existing push and
  pending-push retry paths.
- `README.md`: document creating tasks, offline behavior, and naming rules.
- No new dependencies; use React Native `Modal`, `TextInput`, `Pressable`, and
  `KeyboardAvoidingView`. The existing GitHub token already has push access.
