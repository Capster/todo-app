# Proposal

## Why

The todo repository already stores one task per file, and the app can clone it,
but it only renders a raw file tree. Users need an actual checklist where open
and completed tasks appear together and completion can be toggled from the app.

## What Changes

- Replace the raw text tree with a single mixed checklist of tasks.
- Derive tasks from tracked files: direct children of the repository root are
  open, direct children of `archived/` are complete, and the display name is the
  file name without its final extension. File contents are ignored.
- Sort the mixed list newest first using each task's creation date (the earliest
  commit that introduced the task in either location), with a deterministic
  tie-break.
- Clone on first launch and pull on later launches automatically, then render
  the list.
- Add pull-to-refresh that pushes any pending local commit first, then pulls the
  latest `master`.
- Add a checkbox per task. Marking complete moves the file from the root to
  `archived/`, commits with the fixed app identity, and pushes `master`;
  unmarking reverses the move.
- If the push fails, keep the local commit and show a readable error; a later
  refresh retries the push before pulling.
- Keep the feature mobile-only and keep the web unsupported message.
- **Out of scope**: creating, renaming, editing, or deleting tasks; reading or
  changing file contents; resolving remote conflicts; multiple repositories or
  branches; authentication UI; background sync.

## Capabilities

### New Capabilities

- `todo-list`: Deriving open and completed tasks from repository files,
  presenting one date-ordered checklist, refreshing from the remote, and
  toggling completion through local moves, commits, and pushes.

### Modified Capabilities

- `git-sync`: Clone and pull now run automatically on screen load and
  pull-to-refresh instead of through a clone control; the raw text tree
  requirement is removed; authentication and mobile-only requirements extend to
  push.

## Impact

- Extend `src/git/repository.ts` with task listing, creation-date lookup, file
  moves, commits, and pushes using the existing `isomorphic-git` and filesystem
  adapter.
- Add task derivation and ordering logic under `src/tasks/`.
- Rework `src/components/HomeScreen.tsx` into a checklist with loading, refresh,
  error, and per-task pending states; add small list-row/checkbox components
  under `src/components/`.
- No new dependencies: use React Native `FlatList`/`RefreshControl` and a
  drawn checkbox instead of adding a checkbox package.
- The build-time GitHub token now also needs push permission; it is already
  embedded in the bundle, so the existing prototype-only security constraint
  remains.
- Web keeps its unsupported message and performs no filesystem or git work.
