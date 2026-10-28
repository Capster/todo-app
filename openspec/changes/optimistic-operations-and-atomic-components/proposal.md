# Proposal

## Why

Task mutations currently block the whole list while a local git commit and a remote push run, so checking a box, saving an edit, or creating a task can freeze the UI for seconds and rejects any overlapping action. The UI also mixes data orchestration, animation state, and markup in large components, which makes each new behavior harder to test and change safely.

## What Changes

- Make task creation, completion toggling, editing, and deletion optimistic: the task list and open sheet update immediately, while the local git commit and remote push run in a background queue.
- Keep the previous behavior safe on failure: a failed local commit rolls the affected task back and shows a readable error; a failed push keeps the local commit and is retried on the next refresh.
- Allow multiple task mutations to be queued instead of rejected while one is running, while still serializing the underlying git operations.
- Do not apply optimistic backgrounding to clone and pull; loading and refresh remain foreground operations that report progress and prevent overlap.
- Apply the same background-first pattern to future operations that wait on the remote, except clone and pull.
- Introduce an architecture rule: components, hooks, and utilities stay atomic, decoupled, and shallow. Components own presentation and minimal boolean/callback glue; data orchestration lives in hooks, pure logic lives in `src/tasks/` or `src/utils/`, and JSX nesting stays around two to three levels unless the platform genuinely requires more.
- Refactor the current home screen, task row, sheets, and task service to follow that rule with no intended change to user-visible behavior beyond the optimistic timing above.
- Document the architecture rule as a project convention so future changes follow it.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `todo-list`: task toggle, create, edit, and delete apply to the list immediately, sheets close on local acceptance rather than after push, concurrent mutations are queued, and failures roll back the affected optimistic change.
- `git-sync`: task commits and pushes run in a serialized background queue that does not block the UI; push failures stay pending for refresh; clone and pull remain foreground.
- `app-shell`: source organization now requires atomic, decoupled components, logic in hooks/utilities, and shallow JSX trees.

## Impact

- `src/components/HomeScreen.tsx`, `TaskRow.tsx`, `TaskFormSheet.tsx`, `CreateTaskSheet.tsx`, and `EditTaskSheet.tsx` are split into presentational components plus hooks.
- `src/tasks/taskService.ts` is restructured around optimistic state transitions and a background mutation queue.
- New hooks and utilities under `src/hooks/` and `src/utils/` (or the closest existing convention), with pure task logic staying in `src/tasks/`.
- `src/git/repository.ts` gains (or exposes) serialized commit/push execution and mutation result reporting without changing its git semantics.
- Existing specs for `todo-list`, `git-sync`, and `app-shell` change; README and project context gain the architecture convention.
- No new runtime dependencies are expected; `isomorphic-git` concurrency constraints drive the queue design.
