# Proposal

## Why

Tasks can be created and marked complete, but their name and description cannot
be corrected and a task cannot be removed from inside the app. Users currently
have to edit the repository by hand, and the creation sheet already implements
the form, validation, and offline commit behavior that an edit flow needs.

## What Changes

- Refactor the existing creation sheet into reusable task-form components so the
  creation and edit sheets share one modal frame, one auto-growing name field,
  one description field, validation display, and footer layout. Neither sheet
  duplicates the other's UI or state logic.
- Add an edit sheet that opens when the user holds (long-presses) a task row.
  A normal tap continues to toggle completion. Every task, open or completed,
  can be edited.
- Prefill the edit sheet with the task's display name and its file content.
  Opening the sheet reads the local task file; file contents remain unused for
  displaying or ordering the list.
- Add **Save** and **Delete** actions at the bottom of the edit sheet:
  - Save applies the same name trimming, validation, `.md`/plain naming, and
    duplicate-name suffixing rules as creation. It updates the file content
    and/or renames the file, keeps an open task in the repository root and a
    completed task in `archived/`, commits with the configured app identity,
    and pushes `master`.
  - Delete removes the task file, commits the removal with the configured app
    identity, and pushes `master`.
- If a save or delete is committed but the push fails (for example, while
  offline), keep the local commit, update the list immediately, close the
  sheet, and show a readable sync error. The next refresh pushes the pending
  commit before pulling.
- If reading, writing, renaming, or committing fails, leave the repository
  unchanged, keep the edit sheet open, and show an inline error. No partial
  file, staged entry, or commit shall remain.
- **Out of scope**: reordering tasks manually, editing file extensions
  independently of the description, delete confirmation or undo, merge-conflict
  resolution, background sync, and changing the fixed repository or branch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `todo-list`: Adds holding a task row to open an edit sheet, loading task
  content into editable fields, saving name/description changes, deleting a
  task, offline retention of edits and deletions, rollback behavior, and a
  clarification that contents are read only for editing rather than for list
  display.
- `git-sync`: Adds reading a task file for editing, atomically saving content
  and/or renaming an existing task file, deleting a task file, and pushing or
  retrying the resulting commits.

## Impact

- `src/components/HomeScreen.tsx`: holds create/edit sheet state, handles row
  long-press, loads an edit draft, and routes save/delete results.
- `src/components/TaskRow.tsx`: adds long-press handling without triggering the
  completion toggle and exposes the edit affordance to assistive technology.
- New/refactored `src/components/` modules: a shared bottom-sheet frame, shared
  task form fields and footer, and thin create/edit sheet adapters.
- `src/tasks/taskService.ts`: serialized load-draft, save-task, and delete-task
  operations with inline, saved-locally, and rollback outcomes.
- `src/tasks/taskDraft.ts`: reuse of normalization/naming helpers and support
  for duplicate resolution that excludes the task being edited.
- `src/git/repository.ts`: read a task file as UTF-8, save content and/or rename
  in one commit with rollback, and delete a file in one commit with rollback.
- `README.md`: document holding a row to edit, saving, deleting, and offline
  behavior.
- No new dependencies; reuse React Native `Modal`, `TextInput`, `Pressable`,
  and the existing git/push paths.
