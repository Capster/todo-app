# Tasks

## 1. Extract atomic components, hooks, and utilities (behavior unchanged)

- [ ] 1.1 Create `src/hooks/` and `src/utils/`, add `src/utils/errors.ts` with the shared `messageOf`/token-safe formatting helpers, and verify `npm run typecheck` passes.
- [ ] 1.2 Extract the data-loading and action wiring from `HomeScreen` into `src/hooks/useTaskList.ts` and verify the task list still loads and refreshes in the web app.
- [ ] 1.3 Extract sheet state and draft loading into `src/hooks/useTaskSheets.ts`, form draft/validation/name-height state into `src/hooks/useTaskForm.ts`, and animation/dismiss state into `src/hooks/useSheetAnimation.ts`; verify create and edit sheets still open, submit, and dismiss on web.
- [ ] 1.4 Split `HomeScreen` into `TaskList`, `TaskListHeader`, `EmptyState`, `ErrorBanner`, and `CreateTaskButton`, leaving `HomeScreen` as composition only; verify the web screen renders and `npm run typecheck` passes.
- [ ] 1.5 Split `TaskFormSheet` into `TaskSheetChrome`, `TaskFormFields`, and `TaskFormFooter`; verify both create and edit sheets render, validate, and close on web.
- [ ] 1.6 Review every `src/components/*.tsx` file for leftover orchestration and JSX deeper than about three levels, move remaining logic to hooks/utilities, and verify by inspection plus `npm run typecheck`.

## 2. Add optimistic task state and the mutation queue

- [ ] 2.1 Replace `runExclusive`/`TaskOperationBusyError` in `src/tasks/taskService.ts` with an ordered mutation queue and single background worker, keeping the existing repository calls; verify two mutations can be triggered in a row without a busy rejection.
- [ ] 2.2 Make completion toggles optimistic with a rollback handler and verify the checkbox flips before the push finishes and returns to its original state when the local move/commit is forced to fail.
- [ ] 2.3 Make creation optimistic with file-name reservation from current optimistic tasks and pending names; verify the new row appears before the commit and the committed file name matches the row, including duplicate suffixes.
- [ ] 2.4 Make edits optimistic for content and renames, with rollback of the original name/location/content; verify a rename updates the row immediately and the committed path matches after sync.
- [ ] 2.5 Make deletion optimistic, restoring the task at its original path on local failure; verify the row disappears immediately and returns if the local delete/commit is forced to fail.
- [ ] 2.6 Simplify the service `status` union and replace `pendingFileName` with a pending-key set that does not disable rows or the FAB; verify a second mutation can be started while the first is still syncing.
- [ ] 2.7 Use the optimistic current time for new-task ordering and stop rebuilding the list from git after each mutation; verify a newly created task stays at the top before and after refresh.

## 3. Background commits, coalesced pushes, and refresh coordination

- [ ] 3.1 Split the worker's local file/commit phase from push scheduling and coalesce pushes while mutations are still queued; verify rapid toggles finish without blocking the list and produce a single success path.
- [ ] 3.2 Add a refresh barrier that waits for queued mutations and the in-flight push before pushing pending commits and pulling; verify refresh immediately after rapid toggles leaves no duplicated or missing tasks.
- [ ] 3.3 Keep optimistic state and the local commit on push failure, show one readable sync error, and continue processing later queued mutations; verify by creating, toggling, and editing while offline and then refreshing after reconnecting.
- [ ] 3.4 Confirm clone and pull remain foreground with the existing loading/refresh indicators; verify a cold web load and a refresh still show their progress states and block overlapping loads.

## 4. Document and enforce the atomicity convention

- [ ] 4.1 Add the component/hook/utility atomicity and shallow-JSX rule to the `context` field in `openspec/config.yaml`; verify it appears in `openspec context --json`.
- [ ] 4.2 Add a "Code organization" section to `README.md` stating the same rule with a short example; verify the README describes where logic belongs and the JSX depth expectation.
- [ ] 4.3 Spot-check the refactored source against the documented rule and record any intentional exception (for example modal/accessibility nesting) in the relevant component; verify by inspection and `npm run typecheck`.

## 5. Integration verification

- [ ] 5.1 Run `npm run typecheck` on the final tree and verify it exits successfully.
- [ ] 5.2 On the web, verify create, toggle, edit, rename, and delete are optimistic and survive a reload, including an offline push failure and a later refresh that pushes the pending commit.
- [ ] 5.3 On Android/Expo Go, verify the same mutation flows, pull-to-refresh, and that the list stays interactive while a push is running.
- [ ] 5.4 Verify error messages for offline and authentication failures remain readable and never include the GitHub token.
