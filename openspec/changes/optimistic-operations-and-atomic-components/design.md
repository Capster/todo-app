# Design

## Context

See `proposal.md` for motivation and `specs/` for the behavior contract.

Today `src/tasks/taskService.ts` owns a module-level state object and a `runExclusive` guard. Every mutation updates `status` to `creating`/`saving`/`deleting`, awaits `pushRepository()`, and rejects any overlapping operation with `TaskOperationBusyError`. `HomeScreen` disables rows, the FAB, and refresh for the whole duration, so the user waits for the network and cannot act on anything else. The repository layer already separates local git work (`createTaskFile`, `saveTaskFile`, `deleteTaskFile`, `moveTaskFile`) from `pushRepository()`, which makes a background queue feasible without rewriting git behavior.

The components are large: `HomeScreen` contains data loading, service calls, sheet orchestration, and rendering; `TaskFormSheet` contains animation, draft state, submission, and markup. There is no `src/hooks/` or `src/utils/` yet, and the `app-shell` spec only requires reusable components to live in `src/components/`.

Constraints:

- `isomorphic-git` and lightning-fs share one working tree and index; concurrent writes/commits are not safe.
- The repository layer's restore logic assumes it owns the file and index for the duration of one operation.
- Browser storage is IndexedDB; mobile storage is Expo document storage. Both persist across restarts, so unsent local commits survive.
- Clone and pull change the whole checkout and must stay foreground.
- No test runner is configured; verification relies on `npm run typecheck` and manual platform checks.

## Goals / Non-Goals

**Goals:**

- Make task mutations feel instant and keep the list interactive while git and network work runs.
- Preserve every existing safety property: local failure rolls back, push failure keeps the local commit, refresh retries pushes before pulling, tokens stay redacted.
- Queue overlapping mutations instead of rejecting them, while keeping git work serialized.
- Avoid redundant pushes when several mutations are queued.
- Split current UI into shallow presentational components backed by focused hooks and utilities.
- Encode the atomicity/decoupling rule so future changes follow it.

**Non-Goals:**

- Changing repository URLs, branch, authentication, or git semantics.
- Making clone or pull optimistic.
- Adding undo, conflict-resolution UI, or background sync while the app is closed.
- Introducing new runtime dependencies or a test framework.
- Redesigning the visual UI or sheet behavior beyond closing earlier and removing busy locks.

## Decisions

### 1. Optimistic state with a background mutation worker

The task service applies the intended result to `state.tasks` synchronously, notifies subscribers (so the list rerenders), and enqueues a mutation record. A single worker drains the queue in trigger order. Each record carries the intended outcome, not a diff against stale state:

- toggle: `{ kind: "completion", fileName, completed }`
- create: `{ kind: "create", task, draft }`
- edit: `{ kind: "edit", original, next, draft }`
- delete: `{ kind: "delete", task }`

The worker derives the git action from the actual file location at execution time, calls the existing repository function, then asks the push scheduler to flush. If the file/commit phase fails, it invokes a rollback that restores the optimistic list state; if the push fails, the optimistic state and local commit stay.

Why an absolute outcome instead of "apply diff": if an earlier queued mutation fails and rolls back, later mutations still converge on the user's latest intent instead of compounding a stale diff. It also makes double-toggles and edit-then-delete behave predictably.

Why not run mutations concurrently: git index and working-tree writes are global, so parallel mutations can corrupt state or interleave commits. The queue is the simplest correct concurrency model.

Alternative considered: keep `runExclusive` but return before push. Rejected because it still rejects the second user action and does not satisfy queued mutations.

### 2. Compute optimistic names against the current list plus reservations

Creation and rename need a final file name before the background commit. The service reuses `pickAvailableTaskFileName` against current optimistic tasks plus names reserved by pending create/edit mutations. The reserved name is stored in the mutation record and reused by the background `createTaskFile`/`saveTaskFile` call, so the row the user sees and the file that is written agree.

Creation timestamps for optimistic tasks use the current time. This also removes the current per-mutation `listTrackedFiles` + per-file `git log` rebuild, which is the main avoidable latency source besides the network. Creation timestamps are recomputed from git on the next successful load/refresh.

### 3. Split "local commit" from "push", and coalesce pushes

The worker performs local writes and commits sequentially, then schedules a push. If more mutations are queued when a push is about to start, the scheduler waits for the queue to drain or debounces briefly and pushes once, covering all local commits. A failed push marks the sync as pending, shows one readable error, and does not stop later mutations; a later mutation or refresh retries the push.

Alternatives considered: pushing after every mutation (current behavior, many round trips) and pushing only on refresh (too much unsynced time for the common case).

### 4. Refresh is a queue barrier; load/refresh keep their busy state

`refresh()` records a barrier that waits for the current queue and in-flight push to settle, then runs the existing "push pending, pull, rebuild" flow. New mutations triggered during load/refresh are rejected as today because the list is showing loading/refreshing and rows are disabled. This avoids pulling a checkout while optimistic changes are still being written. The existing `syncInFlight` dedupe in `repository.ts` stays.

The `status` union shrinks to `idle | loading | refreshing | reading`; per-mutation statuses disappear. `pendingFileName` is replaced by a pending-key set used only for a subtle "syncing" affordance, not for disabling interaction.

### 5. Rollback is owned by the service, not the sheet

Each mutation records the task list snapshot it replaced. On local failure the service restores that snapshot (or removes/re-adds only the affected task, preserving other concurrent optimistic changes) and sets the error. Sheets close at acceptance time and no longer render background errors inline; only synchronous validation errors stay in the sheet. Background failures surface in the existing error banner.

Trade-off considered: reopening the sheet with the user's draft on a local failure would preserve typing. Rejected for this change to keep rollback deterministic; local file/commit failures are rare compared with push failures, which are not rolled back.

### 6. Extract hooks and utilities; make the JSX shallow

Proposed structure (names are indicative; follow existing naming style):

```
src/hooks/
  useTaskList.ts        // useSyncExternalStore + load/refresh/mutations
  useTaskSheets.ts      // create/edit sheet state, draft loading
  useTaskForm.ts        // draft text, validation result, name-field height
  useSheetAnimation.ts  // animated backdrop/sheet values and dismiss
  useLatestRef.ts       // tiny shared ref helper if needed
src/utils/
  errors.ts             // messageOf and token-safe formatting helpers
  platform.ts           // small platform predicates used by components
src/components/
  HomeScreen.tsx        // composition only
  TaskList.tsx
  TaskListHeader.tsx
  EmptyState.tsx
  ErrorBanner.tsx
  CreateTaskButton.tsx
  TaskRow.tsx
  Checkbox.tsx
  TaskFormSheet.tsx     // thin composition
  TaskFormFields.tsx
  TaskFormFooter.tsx
  TaskSheetChrome.tsx   // backdrop, animation shell, close control
  CreateTaskSheet.tsx   // config-only wrapper
  EditTaskSheet.tsx     // config-only wrapper
```

Rules applied:

- `HomeScreen` calls one hook and returns at most three visual children.
- `TaskFormSheet` passes props to `TaskSheetChrome`, `TaskFormFields`, and `TaskFormFooter`; no animation or submit logic.
- Hooks stay single-purpose; validation and name resolution stay pure in `src/tasks/`.
- Lists and rows keep stable keys and avoid inline object allocation in render where practical.
- Deeper-than-three JSX is allowed only inside `TaskSheetChrome`/`TaskFormFields` where `Modal`/`KeyboardAvoidingView`/accessibility require it.

Alternative considered: one "god hook" for the whole screen. Rejected because it would recreate the coupling in a different file.

### 7. Document the rule where future agents look

Add the architecture contract to `openspec/config.yaml` under `context` (guiding future proposals, specs, and apply work) and to the README's project-structure section (guiding humans). Keep the wording aligned with the `app-shell` requirement so the two do not drift.

## Risks / Trade-offs

- **[Remote divergence looks like success]** → The list shows a change before the push confirms it. If another device changed the same file, the push may be rejected while the user believes it saved. Mitigation: keep the local commit, show a clear "saved locally, could not push" error, and retry on refresh. Conflict resolution is out of scope.
- **[Rollback after failure can briefly flicker]** → An optimistic row may appear and then disappear. Mitigation: rollback only the affected task, keep other queued changes intact, and surface one error.
- **[Rapid operations on one task]** → Toggle-then-toggle or edit-then-delete can produce awkward intermediate files. Mitigation: enqueue absolute outcomes and derive each git action from actual filesystem state at execution time; coalesce pushes.
- **[Unbounded queue while offline]** → Many offline mutations could queue long pushes. Mitigation: commit each mutation locally, coalesce pushes, and let refresh retry; queue size is bounded by user actions in one session.
- **[Refresh and mutation races]** → Pulling while local writes are pending could overwrite optimistic state. Mitigation: refresh waits for the queue barrier; load/refresh keeps rows disabled as today.
- **[Error surfacing regresses for create/edit]** → Local failure no longer keeps the sheet open, so the draft is lost. Mitigation: validation errors remain inline; background errors use the banner. This is an accepted trade-off for deterministic rollback.
- **[Deployment is manual]** → No test runner exists, so regressions may slip through. Mitigation: `npm run typecheck` after each step and a manual matrix covering web, Android/Expo Go, offline push failure, and rapid queued mutations.

## Migration Plan

No data migration is required; on-disk checkouts and pending commits keep their format.

1. Extract hooks/utilities and shrink components with behavior unchanged; verify with `npm run typecheck` in the browser.
2. Change the task service to optimistic state plus queue, keeping repository APIs intact; add rollback handlers.
3. Split push scheduling out of the per-mutation path and add the refresh barrier.
4. Update README and project context with the architecture rule.
5. Manual verification on web and Android, including offline and rapid-action cases.

Rollback: revert the task-service commit to restore the synchronous exclusive flow; the component extraction is behavior-preserving and can stay.

## Open Questions

None blocking. The exact debounce window for push coalescing and whether to show a per-row syncing dot are cosmetic and can be settled during implementation without changing the specs or task breakdown.
